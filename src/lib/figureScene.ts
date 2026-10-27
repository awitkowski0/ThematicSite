// The suit figure's scene and its inked draw, shared by the live viewer and the still images.
import type * as ThreeNS from 'three'

import { bakeGeo } from './geo'
import type { SuitCape } from './suits'

export type Three = typeof ThreeNS

export const REST_YAW = -22 // the book's panel pose, in the game's sign convention (negative turns toward screen right)
export const REST_PITCH = -8
export const INK_PX = 1.5 // CSS pixels the black outline copies are offset by

export interface FigureScene {
  scene: ThreeNS.Scene
  camera: ThreeNS.OrthographicCamera
  setTexture(t: ThreeNS.Texture): void
  setCapeTexture(t: ThreeNS.Texture): void
  /** Frames the camera for a w x h (CSS px) target. */
  frame(width: number, height: number): void
  draw(renderer: ThreeNS.WebGLRenderer, width: number, height: number, yaw: number, pitch: number, zoom: number): void
  dispose(): void
}

export function loadTexture(THREE: Three, url: string) {
  return new Promise<ThreeNS.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.magFilter = THREE.NearestFilter
        t.minFilter = THREE.NearestFilter
        t.generateMipmaps = false
        t.colorSpace = THREE.SRGBColorSpace
        resolve(t)
      },
      undefined,
      () => reject(new Error(`texture ${url} failed to load`)),
    )
  })
}

export async function loadGeo(url: string) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`geo ${url}: ${r.status}`)
  return r.json()
}

export interface FigureCape {
  spec: SuitCape
  texture: ThreeNS.Texture
}

export function buildFigureScene(THREE: Three, geoJson: any, textures: (ThreeNS.Texture | null)[], hiddenBones: string[] = [], cape?: FigureCape): FigureScene {
  const baked = bakeGeo(geoJson, new Set(hiddenBones))
  const desc = geoJson['minecraft:geometry'][0].description as { texture_width?: number; texture_height?: number }
  for (const t of textures) if (t) cropToFirstFrame(THREE, t, (desc.texture_width ?? 64) / (desc.texture_height ?? 64))

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(baked.positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(baked.uvs, 2))
  geometry.setIndex(new THREE.BufferAttribute(baked.indices, 1))

  const material = new THREE.MeshBasicMaterial({ map: textures[0], alphaTest: 0.5, side: THREE.DoubleSide })
  const inkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, map: textures[0], alphaTest: 0.5, side: THREE.DoubleSide })
  const figure = new THREE.Mesh(geometry, material)
  const ink = new THREE.Mesh(geometry, inkMaterial)

  // Cape.render draws two one-sided quads, so these cull; the cape is thin enough that double-sided ones would z-fight.
  const capeGeometry = cape && capeGeo(THREE, cape.spec)
  const capeMaterial = cape && new THREE.MeshBasicMaterial({ map: cape.texture, alphaTest: 0.5 })
  const capeInkMaterial = cape && new THREE.MeshBasicMaterial({ color: 0x000000, map: cape.texture, alphaTest: 0.5 })
  if (capeGeometry && capeMaterial && capeInkMaterial) {
    figure.add(new THREE.Mesh(capeGeometry, capeMaterial))
    ink.add(new THREE.Mesh(capeGeometry, capeInkMaterial))
  }

  // Fit to the humanoid frame: stray cubes far from the body are drawn but don't stretch the framing.
  const fit = fitBounds(baked.positions)
  const center = new THREE.Vector3((fit.min[0] + fit.max[0]) / 2, (fit.min[1] + fit.max[1]) / 2, (fit.min[2] + fit.max[2]) / 2)
  const fitW = fit.max[0] - fit.min[0]
  const fitH = fit.max[1] - fit.min[1]

  // Bedrock x is mirrored in the game (GeckoLib negates it); the camera looks at the model's front, which faces -z.
  const inner = new THREE.Group()
  inner.scale.x = -1
  inner.position.set(center.x, -center.y, -center.z) // S*center + position = 0 with S = (-1, 1, 1)
  inner.add(figure, ink)
  const pivot = new THREE.Group()
  pivot.add(inner)
  const scene = new THREE.Scene()
  scene.add(pivot)

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000)
  camera.position.set(0, 0, -100)
  camera.lookAt(0, 0, 0)

  return {
    scene,
    camera,
    setTexture(t) {
      material.map = t
      inkMaterial.map = t
      material.needsUpdate = true
      inkMaterial.needsUpdate = true
    },
    setCapeTexture(t) {
      if (!capeMaterial || !capeInkMaterial) return
      capeMaterial.map = t
      capeInkMaterial.map = t
      capeMaterial.needsUpdate = true
      capeInkMaterial.needsUpdate = true
    },
    frame(width, height) {
      // Pad for the ink and the 3/4 turn; the limiting axis decides the scale.
      const aspect = width / height
      const halfH = Math.max(fitH, fitW / aspect) * 0.56
      camera.left = -halfH * aspect
      camera.right = halfH * aspect
      camera.top = halfH
      camera.bottom = -halfH
    },
    draw(renderer, width, height, yaw, pitch, zoom) {
      // yaw about the figure's own axis, then pitch toward the viewer, as the book's turntable
      pivot.rotation.set((pitch * Math.PI) / 180, (-yaw * Math.PI) / 180, 0, 'XYZ')
      camera.zoom = zoom
      camera.updateProjectionMatrix()
      renderer.clear()
      figure.visible = false
      ink.visible = true
      for (const [dx, dy] of [[-INK_PX, 0], [INK_PX, 0], [0, -INK_PX], [0, INK_PX]]) {
        camera.setViewOffset(width, height, dx, dy, width, height)
        renderer.render(scene, camera)
      }
      camera.setViewOffset(width, height, 0, 0, width, height)
      renderer.clearDepth()
      ink.visible = false
      figure.visible = true
      renderer.render(scene, camera)
    },
    dispose() {
      geometry.dispose()
      material.dispose()
      inkMaterial.dispose()
      capeGeometry?.dispose()
      capeMaterial?.dispose()
      capeInkMaterial?.dispose()
    },
  }
}

// Animated-texture strips (a tall PNG of stacked frames) show their first frame, as the game does.
/**
 * The cape at rest, as Cape.renderDisplay hangs it with a still drape (MannequinCapeDrape with no wind): one flat
 * sheet from the shoulders, tipped back {@code 6 + height} degrees. Built in the game's space (GeckoLib's, x mirrored
 * from the file) and stored mirrored back, like the baked geo. The outer face takes the texture's left half, the
 * inner face its right half, v running shoulders to hem.
 */
function capeGeo(THREE: Three, { width: w, height: h, thickness: t }: SuitCape) {
  const b = ((6 + h) * Math.PI) / 180
  const [cb, sb] = [Math.cos(b), Math.sin(b)]
  // (x, y down the cape, z off the inner face) -> Bedrock-space position: T(0, 24.125/16, 2/16) * Rx(180) * Ry(180) * Rx(b) * Ry(180)
  const at = (x: number, y: number, z: number) => [-x, 24.125 / 16 - y * cb - z * sb, 2 / 16 + y * sb - z * cb]
  const pos: number[] = []
  const uv: number[] = []
  // Corners TL, TR, BR, BL as seen from outside, each [x, y, u, v] (v down); two triangles facing outward.
  const quad = (z: number, corners: number[][]) => {
    for (const [x, y, u, v] of corners) {
      pos.push(...at(x, y, z))
      uv.push(u, 1 - v)
    }
  }
  // Outer face, seen from behind: game x = w at u 0.5, x = -w at u 0.
  quad(-t, [[w, 0, 0.5, 0], [-w, 0, 0, 0], [-w, h, 0, 1], [w, h, 0.5, 1]])
  // Inner face, seen from the body: game x = w at u 0.5, x = -w at u 1.
  quad(0, [[-w, 0, 1, 0], [w, 0, 0.5, 0], [w, h, 0.5, 1], [-w, h, 1, 1]])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex([0, 3, 2, 0, 2, 1, 4, 7, 6, 4, 6, 5])
  return g
}

/** Shows frame {@code frame} of a texture {@link cropToFirstFrame} found to be a strip; a no-op on a single image. */
export function showFrame(t: ThreeNS.Texture, frame: number) {
  const count = Math.round(1 / t.repeat.y)
  if (count > 1) t.offset.y = 1 - ((frame % count) + 1) * t.repeat.y
}

function cropToFirstFrame(THREE: Three, t: ThreeNS.Texture, descAspect: number) {
  const img = t.image as { width: number; height: number }
  const frameH = img.width / descAspect
  if (img.height > frameH * 1.5) {
    t.repeat.set(1, frameH / img.height)
    t.offset.set(0, 1 - frameH / img.height)
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  }
}

// Bounds of the vertices that lie in a generous humanoid window, falling back to everything.
function fitBounds(p: Float32Array): { min: [number, number, number]; max: [number, number, number] } {
  const lo: [number, number, number] = [Infinity, Infinity, Infinity]
  const hi: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2]
    if (Math.abs(x) > 3 || y < -0.5 || y > 3.2 || Math.abs(z) > 2.5) continue
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], p[i + k])
      hi[k] = Math.max(hi[k], p[i + k])
    }
  }
  if (lo[0] === Infinity) return { min: [-0.5, 0, -0.3], max: [0.5, 2, 0.3] }
  return { min: lo, max: hi }
}

let shared: Promise<{ THREE: Three; renderer: ThreeNS.WebGLRenderer }> | undefined
let queue: Promise<unknown> = Promise.resolve()
const STILL_CACHE = 'thematic-stills-v2'

function sharedRenderer() {
  shared ??= import('three').then((THREE) => {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true })
    renderer.setClearColor(0x000000, 0)
    renderer.autoClear = false
    renderer.outputColorSpace = THREE.SRGBColorSpace
    return { THREE, renderer }
  })
  return shared
}

async function cached(key: string): Promise<ImageBitmap | undefined> {
  try {
    const hit = await (await caches.open(STILL_CACHE)).match(key)
    return hit ? await createImageBitmap(await hit.blob()) : undefined
  } catch {
    return undefined
  }
}

// PNG encoding is the slow part, so it waits until the browser is idle and never holds up a figure.
function remember(key: string, canvas: HTMLCanvasElement) {
  const idle = window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 200))
  idle(() =>
    canvas.toBlob((blob) => {
      if (blob) caches.open(STILL_CACHE).then((c) => c.put(key, new Response(blob, { headers: { 'Content-Type': 'image/png' } }))).catch(() => undefined)
    }, 'image/png'),
  )
}

/**
 * One figure at rest pose as a bitmap. A copy kept from an earlier visit comes back at once; otherwise the files load in
 * parallel with every other figure's and only the draw waits its turn on the single shared renderer.
 */
export async function renderStill(geoPath: string, texturePath: string, width: number, height: number, hiddenBones: string[] = [], cape?: { spec: SuitCape; texturePath: string }): Promise<ImageBitmap> {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const key = `/__still/${encodeURIComponent(`${geoPath}|${texturePath}|${hiddenBones.join(',')}|${cape?.texturePath ?? ''}|${width}x${height}@${dpr}`)}`
  const hit = typeof caches !== 'undefined' ? await cached(key) : undefined
  if (hit) return hit
  const { THREE, renderer } = await sharedRenderer()
  const [geoJson, tex, capeTex] = await Promise.all([
    loadGeo(geoPath),
    loadTexture(THREE, texturePath),
    cape ? loadTexture(THREE, cape.texturePath).catch(() => null) : Promise.resolve(null),
  ])
  const job = queue.then(async () => {
    const fig = buildFigureScene(THREE, geoJson, [tex], hiddenBones, cape && capeTex ? { spec: cape.spec, texture: capeTex } : undefined)
    try {
      renderer.setPixelRatio(dpr)
      renderer.setSize(width, height, false)
      fig.frame(width, height)
      fig.draw(renderer, width, height, REST_YAW, REST_PITCH, 1)
      // a copy of this frame, so the next draw can reuse the renderer at once
      const copy = document.createElement('canvas')
      copy.width = renderer.domElement.width
      copy.height = renderer.domElement.height
      copy.getContext('2d')!.drawImage(renderer.domElement, 0, 0)
      if (typeof caches !== 'undefined') remember(key, copy)
      return await createImageBitmap(copy)
    } finally {
      fig.dispose()
      tex.dispose()
      capeTex?.dispose()
    }
  })
  queue = job.catch(() => undefined)
  return job
}
