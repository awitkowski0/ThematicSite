import { useEffect, useRef, useState } from 'react'

import { renderStill } from '../lib/figureScene'
import type { SuitCape } from '../lib/suits'

const cache = new Map<string, Promise<ImageBitmap>>()

/** A suit's inked figure at rest pose, drawn when it scrolls near view; for pages that show many. */
export function SuitStill({ geoPath, texturePath, name, hiddenBones = [], cape, shiny = false, className = 'aspect-[3/4] w-full' }: { geoPath: string; texturePath: string; name: string; hiddenBones?: string[]; cape?: SuitCape; shiny?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const hidden = hiddenBones.join(',')
  const capeTexture = cape && ((shiny && cape.shinyTexturePath) || cape.texturePath)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let live = true
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        const width = Math.max(1, Math.round(el.getBoundingClientRect().width))
        const height = Math.max(1, Math.round(el.getBoundingClientRect().height))
        const key = `${geoPath}|${texturePath}|${hidden}|${capeTexture ?? ''}|${width}x${height}`
        let job = cache.get(key)
        if (!job) cache.set(key, (job = renderStill(geoPath, texturePath, width, height, hidden ? hidden.split(',') : [], cape && capeTexture ? { spec: cape, texturePath: capeTexture } : undefined)))
        job
          .then((bitmap) => {
            const canvas = canvasRef.current
            if (!live || !canvas) return
            canvas.width = bitmap.width
            canvas.height = bitmap.height
            canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
          })
          .catch(() => live && setFailed(true))
      },
      { rootMargin: '400px' },
    )
    io.observe(el)
    return () => {
      live = false
      io.disconnect()
    }
  }, [geoPath, texturePath, hidden, cape, capeTexture])

  if (failed) return null
  return (
    <div ref={ref} className={className}>
      <canvas ref={canvasRef} role="img" aria-label={name} className="h-full w-full" />
    </div>
  )
}
