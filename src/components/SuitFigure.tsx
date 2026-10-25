import { useEffect, useRef, useState } from 'react'

import { REST_PITCH, REST_YAW, buildFigureScene, loadGeo, loadTexture } from '../lib/figureScene'

interface SuitFigureProps {
  geoPath: string
  texturePath: string
  shinyTexturePath?: string
  hiddenBones?: string[]
  name: string
  className?: string
  /** Called once if the geo or texture can't be loaded or parsed; the component then renders nothing. */
  onError?: (error: unknown) => void
}

const MAX_PITCH = 60
const MIN_ZOOM = 0.6
const MAX_ZOOM = 3

// Handle the three.js scene needs from the effect, so the toggle can swap textures without rebuilding it.
interface Stage {
  setShiny(on: boolean): void
}

export default function SuitFigure({ geoPath, texturePath, shinyTexturePath, hiddenBones, name, className = 'aspect-[3/4] w-full', onError }: SuitFigureProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const [shiny, setShiny] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let teardown: (() => void) | undefined
    setFailed(false)
    stageRef.current = null

    ;(async () => {
      const THREE = await import('three')
      const [geoJson, tex, shinyTex] = await Promise.all([
        loadGeo(geoPath),
        loadTexture(THREE, texturePath),
        shinyTexturePath ? loadTexture(THREE, shinyTexturePath).catch(() => null) : Promise.resolve(null),
      ])
      if (disposed) {
        tex.dispose()
        shinyTex?.dispose()
        return
      }
      const fig = buildFigureScene(THREE, geoJson, [tex, shinyTex], hiddenBones)

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: true })
      renderer.setClearColor(0x000000, 0)
      renderer.autoClear = false
      renderer.outputColorSpace = THREE.SRGBColorSpace
      const canvas = renderer.domElement
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab'
      canvas.setAttribute('role', 'img')
      canvas.setAttribute('aria-label', `${name} suit, drag to rotate`)
      host.prepend(canvas)

      let yaw = REST_YAW
      let pitch = REST_PITCH
      let zoom = 1
      let width = 1
      let height = 1
      let frame = 0

      const draw = () => {
        frame = 0
        fig.draw(renderer, width, height, yaw, pitch, zoom)
      }
      const requestRender = () => {
        if (!frame && !disposed) frame = requestAnimationFrame(draw)
      }

      const resize = () => {
        const rect = host.getBoundingClientRect()
        width = Math.max(1, Math.round(rect.width))
        height = Math.max(1, Math.round(rect.height))
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.setSize(width, height, false)
        fig.frame(width, height)
        requestRender()
      }
      const observer = new ResizeObserver(resize)
      observer.observe(host)
      resize()

      let dragging = false
      let lastX = 0
      let lastY = 0
      const onDown = (e: PointerEvent) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return
        dragging = true
        lastX = e.clientX
        lastY = e.clientY
        canvas.setPointerCapture(e.pointerId)
        canvas.style.cursor = 'grabbing'
      }
      const onMove = (e: PointerEvent) => {
        if (!dragging) return
        yaw -= (e.clientX - lastX) * 0.6
        pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch + (e.clientY - lastY) * 0.4))
        lastX = e.clientX
        lastY = e.clientY
        requestRender()
      }
      const onUp = (e: PointerEvent) => {
        dragging = false
        canvas.style.cursor = 'grab'
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
      }
      const onWheel = (e: WheelEvent) => {
        e.preventDefault() // only fires over the canvas, so page scroll is untouched elsewhere
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * Math.exp(-e.deltaY * 0.0015)))
        requestRender()
      }
      const reset = (e: Event) => {
        e.preventDefault()
        yaw = REST_YAW
        pitch = REST_PITCH
        zoom = 1
        requestRender()
      }
      canvas.addEventListener('pointerdown', onDown)
      canvas.addEventListener('pointermove', onMove)
      canvas.addEventListener('pointerup', onUp)
      canvas.addEventListener('pointercancel', onUp)
      canvas.addEventListener('wheel', onWheel, { passive: false })
      canvas.addEventListener('dblclick', reset)
      canvas.addEventListener('contextmenu', reset)

      stageRef.current = {
        setShiny(on) {
          fig.setTexture(on && shinyTex ? shinyTex : tex)
          requestRender()
        },
      }

      teardown = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        canvas.removeEventListener('pointerdown', onDown)
        canvas.removeEventListener('pointermove', onMove)
        canvas.removeEventListener('pointerup', onUp)
        canvas.removeEventListener('pointercancel', onUp)
        canvas.removeEventListener('wheel', onWheel)
        canvas.removeEventListener('dblclick', reset)
        canvas.removeEventListener('contextmenu', reset)
        canvas.remove()
        fig.dispose()
        tex.dispose()
        shinyTex?.dispose()
        renderer.dispose()
        renderer.forceContextLoss()
      }
      if (disposed) teardown()
    })().catch((error) => {
      if (disposed) return
      setFailed(true)
      onErrorRef.current?.(error)
    })

    return () => {
      disposed = true
      teardown?.()
      stageRef.current = null
    }
  }, [geoPath, texturePath, shinyTexturePath, hiddenBones, name])

  useEffect(() => {
    stageRef.current?.setShiny(shiny)
  }, [shiny])

  if (failed) return null
  return (
    <div ref={hostRef} className={`relative ${className}`}>
      {shinyTexturePath && (
        <button
          type="button"
          aria-pressed={shiny}
          onClick={() => setShiny((s) => !s)}
          className="absolute right-2 top-2 z-10 border-2 border-ink-black bg-newsprint px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ink-black aria-pressed:bg-caption"
        >
          Shiny
        </button>
      )}
    </div>
  )
}
