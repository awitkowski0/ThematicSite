// Writes public/listing/cover.jpg: the listing's cover screenshot with the THEMATIC wordmark over it.
// Usage: tsx scripts/make-cover.ts <screenshot.png>   (needs rsvg-convert, and sips on macOS for the JPEG)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { coverSvg } from '../src/lib/pixelBadge'

const src = process.argv[2]
if (!src) throw new Error('Pass the screenshot to put the wordmark on')
const size = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src], { encoding: 'utf8' })
const [w, h] = ['pixelWidth', 'pixelHeight'].map((k) => Number(size.match(new RegExp(`${k}: (\\d+)`))![1]))
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cover-'))
fs.writeFileSync(path.join(tmp, 'cover.svg'), coverSvg(`data:image/png;base64,${fs.readFileSync(src).toString('base64')}`, w, h))
execFileSync('rsvg-convert', [path.join(tmp, 'cover.svg'), '-o', path.join(tmp, 'cover.png')])
const out = path.resolve(import.meta.dirname, '../public/listing/cover.jpg')
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '88', path.join(tmp, 'cover.png'), '--out', out], { stdio: 'ignore' })
console.log(`wrote ${out} (${w}x${h})`)
