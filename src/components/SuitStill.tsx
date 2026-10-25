import { useEffect, useRef, useState } from 'react'

import { renderStill } from '../lib/figureScene'

const cache = new Map<string, Promise<ImageBitmap>>()

/** A suit's inked figure at rest pose, drawn when it scrolls near view; for pages that show many. */
export function SuitStill({ geoPath, texturePath, name, hiddenBones = [], className = 'aspect-[3/4] w-full' }: { geoPath: string; texturePath: string; name: string; hiddenBones?: string[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const hidden = hiddenBones.join(',')

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
        const key = `${geoPath}|${texturePath}|${hidden}|${width}x${height}`
        let job = cache.get(key)
        if (!job) cache.set(key, (job = renderStill(geoPath, texturePath, width, height, hidden ? hidden.split(',') : [])))
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
  }, [geoPath, texturePath, hidden])

  if (failed) return null
  return (
    <div ref={ref} className={className}>
      <canvas ref={canvasRef} role="img" aria-label={name} className="h-full w-full" />
    </div>
  )
}
