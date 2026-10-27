// Bakes a Bedrock geometry 1.12 file (as GeckoLib reads it) into flat vertex arrays at rest pose. No three.js dependency.

type V3 = [number, number, number]
type FaceName = 'north' | 'east' | 'south' | 'west' | 'up' | 'down'

interface RawFace {
  uv?: [number, number]
  uv_size?: [number, number]
  uv_rotation?: number
}
interface RawCube {
  origin: V3
  size: V3
  pivot?: V3
  rotation?: V3
  inflate?: number
  mirror?: boolean
  uv?: [number, number] | Partial<Record<FaceName, RawFace>>
}
interface RawBone {
  name: string
  parent?: string
  pivot?: V3
  rotation?: V3
  neverRender?: boolean
  cubes?: RawCube[]
}
interface RawGeo {
  'minecraft:geometry': { description: { texture_width?: number; texture_height?: number }; bones: RawBone[] }[]
}

export interface BakedGeo {
  positions: Float32Array // x,y,z in blocks, Bedrock (unmirrored) space, y up, front at -z
  uvs: Float32Array // normalised, v already flipped for three's default flipY texture
  indices: Uint32Array
  min: V3
  max: V3
  bones: number
  cubes: number
}

// Row-major 4x4 as 16 numbers; only affine transforms are ever built.
type M = number[]
const IDENT: M = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

function mul(a: M, b: M): M {
  const o = new Array<number>(16)
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) o[r * 4 + c] = a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c] + a[r * 4 + 3] * b[12 + c]
  return o
}

// Translate(p) * Rz*Ry*Rx * Translate(-p). Blockbench's scene is the file mirrored in x with angles (-x, -y, z); mirroring back flips y and z, so here (-x, y, -z).
function aboutPivot(p: V3, rot: V3 | undefined): M {
  const [px, py, pz] = p
  if (!rot || (rot[0] === 0 && rot[1] === 0 && rot[2] === 0)) return IDENT
  const d = Math.PI / 180
  const [ax, ay, az] = [-rot[0] * d, rot[1] * d, -rot[2] * d]
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay), Math.cos(az), Math.sin(az)]
  // R = Rz * Ry * Rx (three.js Euler order 'ZYX')
  const r00 = cz * cy, r01 = cz * sy * sx - sz * cx, r02 = cz * sy * cx + sz * sx
  const r10 = sz * cy, r11 = sz * sy * sx + cz * cx, r12 = sz * sy * cx - cz * sx
  const r20 = -sy, r21 = cy * sx, r22 = cy * cx
  return [
    r00, r01, r02, px - (r00 * px + r01 * py + r02 * pz),
    r10, r11, r12, py - (r10 * px + r11 * py + r12 * pz),
    r20, r21, r22, pz - (r20 * px + r21 * py + r22 * pz),
    0, 0, 0, 1,
  ]
}

// Per face: corners TL,TR,BR,BL as seen from outside (u right, v down), as [useX1, useY1, useZ1] selectors.
const FACE_CORNERS: Record<FaceName, [number, number, number][]> = {
  north: [[1, 1, 0], [0, 1, 0], [0, 0, 0], [1, 0, 0]],
  south: [[0, 1, 1], [1, 1, 1], [1, 0, 1], [0, 0, 1]],
  east: [[1, 1, 1], [1, 1, 0], [1, 0, 0], [1, 0, 1]],
  west: [[0, 1, 0], [0, 1, 1], [0, 0, 1], [0, 0, 0]],
  up: [[1, 1, 1], [0, 1, 1], [0, 1, 0], [1, 1, 0]],
  down: [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]],
}
const FACES = Object.keys(FACE_CORNERS) as FaceName[]

// Rect [u, v, w, h] in pixels for each face of a box-UV cube. GeckoLib floors the size first, so fractional cubes keep whole-pixel rects.
function boxUv(u: number, v: number, size: V3, mirror: boolean): Record<FaceName, [number, number, number, number]> {
  const [w, h, d] = size.map(Math.floor)
  const r: Record<FaceName, [number, number, number, number]> = {
    east: [u, v + d, d, h],
    north: [u + d, v + d, w, h],
    west: [u + d + w, v + d, d, h],
    south: [u + 2 * d + w, v + d, w, h],
    up: [u + d, v, w, d],
    down: [u + d + w, v + d, w, -d],
  }
  if (mirror) {
    const flip = (f: [number, number, number, number]): [number, number, number, number] => [f[0] + f[2], f[1], -f[2], f[3]]
    const e = flip(r.west)
    const w2 = flip(r.east)
    return { east: e, west: w2, north: flip(r.north), south: flip(r.south), up: flip(r.up), down: flip(r.down) }
  }
  return r
}

/** {@code hidden}: bones left out with everything under them, as the game hides a bone's children with it. */
export function bakeGeo(json: unknown, hidden: ReadonlySet<string> = new Set()): BakedGeo {
  const geo = (json as RawGeo)['minecraft:geometry']?.[0]
  if (!geo) throw new Error('no minecraft:geometry[0]')
  const tw = geo.description.texture_width ?? 64
  const th = geo.description.texture_height ?? 64
  const byName = new Map(geo.bones.map((b) => [b.name, b]))

  const worldCache = new Map<string, M>()
  const world = (b: RawBone, guard = 0): M => {
    const hit = worldCache.get(b.name)
    if (hit) return hit
    const parent = b.parent && guard < 64 ? byName.get(b.parent) : undefined
    const own = aboutPivot(b.pivot ?? [0, 0, 0], b.rotation)
    const m = parent ? mul(world(parent, guard + 1), own) : own
    worldCache.set(b.name, m)
    return m
  }

  const hiddenCache = new Map<string, boolean>()
  const isHidden = (b: RawBone, guard = 0): boolean => {
    const hit = hiddenCache.get(b.name)
    if (hit !== undefined) return hit
    const parent = b.parent && guard < 64 ? byName.get(b.parent) : undefined
    const out = hidden.has(b.name) || (!!parent && isHidden(parent, guard + 1))
    hiddenCache.set(b.name, out)
    return out
  }

  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const min: V3 = [Infinity, Infinity, Infinity]
  const max: V3 = [-Infinity, -Infinity, -Infinity]
  let cubes = 0

  for (const bone of geo.bones) {
    if (bone.neverRender || !bone.cubes?.length || isHidden(bone)) continue
    const bw = world(bone)
    for (const cube of bone.cubes) {
      cubes++
      const inf = cube.inflate ?? 0
      const lo: V3 = [cube.origin[0] - inf, cube.origin[1] - inf, cube.origin[2] - inf]
      const hi: V3 = [cube.origin[0] + cube.size[0] + inf, cube.origin[1] + cube.size[1] + inf, cube.origin[2] + cube.size[2] + inf]
      const m = mul(bw, aboutPivot(cube.pivot ?? bone.pivot ?? [0, 0, 0], cube.rotation))
      const rects = Array.isArray(cube.uv) ? boxUv(cube.uv[0], cube.uv[1], cube.size, !!cube.mirror) : undefined
      const faceUv = !Array.isArray(cube.uv) ? cube.uv : undefined

      for (const face of FACES) {
        let rect: [number, number, number, number]
        let rot = 0
        if (rects) rect = rects[face]
        else {
          const f = faceUv?.[face]
          if (!f?.uv) continue // face absent = not drawn
          rect = [f.uv[0], f.uv[1], f.uv_size?.[0] ?? 0, f.uv_size?.[1] ?? 0]
          rot = (((f.uv_rotation ?? 0) % 360) + 360) % 360
        }
        const [u0, v0, w, h] = rect
        const corners: [number, number][] = [[u0, v0], [u0 + w, v0], [u0 + w, v0 + h], [u0, v0 + h]]
        const base = pos.length / 3
        const shift = rot / 90
        FACE_CORNERS[face].forEach(([sx, sy, sz], i) => {
          const x = sx ? hi[0] : lo[0], y = sy ? hi[1] : lo[1], z = sz ? hi[2] : lo[2]
          const wx = m[0] * x + m[1] * y + m[2] * z + m[3]
          const wy = m[4] * x + m[5] * y + m[6] * z + m[7]
          const wz = m[8] * x + m[9] * y + m[10] * z + m[11]
          pos.push(wx / 16, wy / 16, wz / 16)
          const [cu, cv] = corners[(i - shift + 4) % 4]
          uv.push(cu / tw, 1 - cv / th)
          min[0] = Math.min(min[0], wx / 16); max[0] = Math.max(max[0], wx / 16)
          min[1] = Math.min(min[1], wy / 16); max[1] = Math.max(max[1], wy / 16)
          min[2] = Math.min(min[2], wz / 16); max[2] = Math.max(max[2], wz / 16)
        })
        // Corners go TL,TR,BR,BL as seen from outside; this winding faces outward (counter-clockwise).
        idx.push(base, base + 3, base + 2, base, base + 2, base + 1)
      }
    }
  }
  if (cubes === 0) throw new Error('geo has no cubes')
  return { positions: new Float32Array(pos), uvs: new Float32Array(uv), indices: new Uint32Array(idx), min, max, bones: geo.bones.length, cubes }
}
