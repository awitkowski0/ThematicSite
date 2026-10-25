// Listing images drawn as SVG squares in a Minecraft-style pixel font, so they look the same wherever they are shown, with no font to load.

// Rows top to bottom, '/' between rows; 7 rows sit on the baseline, an 8th is the descender. Width is the row length.
const GLYPHS: Record<string, string> = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#', B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.###./#...#/#..../#..../#..../#...#/.###.', D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####', F: '#####/#..../#..../####./#..../#..../#....',
  G: '.####/#..../#..../#..##/#...#/#...#/.###.', H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '###/.#./.#./.#./.#./.#./###', J: '....#/....#/....#/....#/....#/#...#/.###.',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#', L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#...#/#...#/#...#/#...#', N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.', P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#...#/#..#./.##.#', R: '####./#...#/#...#/####./#..#./#...#/#...#',
  S: '.####/#..../#..../.###./....#/....#/####.', T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.', V: '#...#/#...#/#...#/#...#/.#.#./.#.#./..#..',
  W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#', X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..', Z: '#####/....#/...#./..#../.#.../#..../#####',
  a: '...../...../.###./....#/.####/#...#/.####', b: '#..../#..../#.##./##..#/#...#/#...#/####.',
  c: '...../...../.###./#...#/#..../#...#/.###.', d: '....#/....#/.##.#/#..##/#...#/#...#/.####',
  e: '...../...../.###./#...#/#####/#..../.####', f: '..##/.#../####/.#../.#../.#../.#..',
  g: '...../...../.####/#...#/#...#/.####/....#/####.', h: '#..../#..../#.##./##..#/#...#/#...#/#...#',
  i: '#/./#/#/#/#/#', j: '....#/...../....#/....#/....#/#...#/#...#/.###.',
  k: '#.../#.../#..#/#.#./##../#.#./#..#', l: '#./#./#./#./#./#./.#',
  m: '...../...../##.#./#.#.#/#.#.#/#...#/#...#', n: '...../...../####./#...#/#...#/#...#/#...#',
  o: '...../...../.###./#...#/#...#/#...#/.###.', p: '...../...../#.##./##..#/#...#/####./#..../#....',
  q: '...../...../.##.#/#..##/#...#/.####/....#/....#', r: '...../...../#.##./##..#/#..../#..../#....',
  s: '...../...../.####/#..../.###./....#/####.', t: '.#./.#./###/.#./.#./.#./..#',
  u: '...../...../#...#/#...#/#...#/#...#/.####', v: '...../...../#...#/#...#/#...#/.#.#./..#..',
  w: '...../...../#...#/#...#/#.#.#/#.#.#/.####', x: '...../...../#...#/.#.#./..#../.#.#./#...#',
  y: '...../...../#...#/#...#/#...#/.####/....#/####.', z: '...../...../#####/...#./..#../.#.../#####',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.', '1': '..#../.##../..#../..#../..#../..#../#####',
  '2': '.###./#...#/....#/..##./.#.../#..../#####', '3': '.###./#...#/....#/..##./....#/#...#/.###.',
  '4': '...##/..#.#/.#..#/#...#/#####/....#/....#', '5': '#####/#..../####./....#/....#/#...#/.###.',
  '6': '..##./.#.../#..../####./#...#/#...#/.###.', '7': '#####/#...#/....#/...#./..#../..#../..#..',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.', '9': '.###./#...#/#...#/.####/....#/...#./.##..',
  '.': '././././././#', ',': '././././././#/#',
  '·': './././#/./././.', "'": '#/#/./././././.', '!': '#/#/#/#/#/./#', '?': '.###./#...#/....#/...#./..#../...../..#..',
}
const SPACE = 3
const ROWS = (ch: string) => (GLYPHS[ch] ?? GLYPHS['?']).split('/')

/** Pixel width of {@code text} at one pixel per font pixel, with a pixel between glyphs. */
export function textWidth(text: string): number {
  let w = 0
  for (const ch of text) w += (ch === ' ' ? SPACE : ROWS(ch)[0].length) + 1
  return Math.max(0, w - 1)
}

function glyphRects(text: string, x: number, y: number, px: number): string {
  let out = ''
  let cx = x
  for (const ch of text) {
    if (ch === ' ') {
      cx += (SPACE + 1) * px
      continue
    }
    const rows = ROWS(ch)
    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] === '#') out += `<rect x="${cx + c * px}" y="${y + r * px}" width="${px}" height="${px}"/>`
    })
    cx += (rows[0].length + 1) * px
  }
  return out
}

/** {@code text} with its top-left at (x, y), each font pixel {@code px} square, with the game's drop shadow one font pixel down-right. */
export function pixelText(text: string, x: number, y: number, px: number, fill: string, shadow?: string): string {
  const rects = glyphRects(text, x, y, px)
  return `${shadow ? `<g fill="${shadow}" transform="translate(${px} ${px})">${rects}</g>` : ''}<g fill="${fill}">${rects}</g>`
}

// Small icons on a 2px grid, same row format as the glyphs.
const ICONS: Record<string, { rows: string; fill: string }> = {
  discord: { rows: '..#####../.#######./#########/##..#..##/##..#..##/#########/.##...##.', fill: '#ffffff' },
  online: { rows: '.###./#####/#####/#####/.###.', fill: '#55ff55' },
  suit: { rows: '##...##/###.###/#######/.#####./.#####./.#####./.#####.', fill: '#ffffff' },
}

const INK = '#000000'
const FACE = '#4a1d5c'
const FACE_LIT = '#7a3f94'
const FACE_DARK = '#2c0f38'
const WHITE = '#ffffff'
const SHADOW = '#3f3f3f'

/** A game-style button: black outline, purple face with a lit top and a dark bottom lip, an optional icon, and shadowed white text. */
export function badgeSvg(text: string, icon?: keyof typeof ICONS): string {
  const px = 2
  const h = 40
  const pad = 14
  const ic = icon ? ICONS[icon] : undefined
  const icRows = ic?.rows.split('/') ?? []
  const icW = ic ? icRows[0].length * px + 10 : 0
  const w = pad * 2 + icW + textWidth(text) * px
  const ty = Math.round((h - 4 - 7 * px) / 2)
  const iy = Math.round((h - 4 - icRows.length * px) / 2)
  let iconSvg = ''
  if (ic) icRows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] === '#') iconSvg += `<rect x="${pad + c * px}" y="${iy + r * px}" width="${px}" height="${px}"/>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" role="img" aria-label="${text}">
<rect width="${w}" height="${h}" fill="${INK}"/><rect x="2" y="2" width="${w - 4}" height="${h - 4}" fill="${FACE_DARK}"/><rect x="2" y="2" width="${w - 4}" height="${h - 8}" fill="${FACE}"/>
<rect x="2" y="2" width="${w - 4}" height="2" fill="${FACE_LIT}"/><rect x="2" y="2" width="2" height="${h - 8}" fill="${FACE_LIT}"/>
${ic ? `<g fill="${SHADOW}" transform="translate(${px} ${px})">${iconSvg}</g><g fill="${ic.fill}">${iconSvg}</g>` : ''}${pixelText(text, pad + icW, ty, px, WHITE, SHADOW)}
</svg>`
}

/** The header: the wordmark with a block-letter extrusion like the game's title, over halftone dots on a violet glow, and a gold line under it. */
export function bannerSvg(tagline: string): string {
  const w = 1200
  const h = 300
  const px = 16
  const word = 'THEMATIC'
  const ww = textWidth(word) * px
  const wx = Math.round((w - ww) / 2)
  const wy = 70
  let dots = ''
  for (let y = 6, row = 0; y < h; y += 12, row++) {
    for (let x = row % 2 ? 6 : 0; x < w; x += 12) {
      const d = Math.hypot((x - w / 2) / (w * 0.5), (y - h * 0.45) / (h * 0.7))
      const r = d < 0.45 ? 2.6 : d < 0.75 ? 1.8 : d < 1 ? 1 : 0
      if (r) dots += `<circle cx="${x}" cy="${y}" r="${r}"/>`
    }
  }
  const rects = glyphRects(word, wx, wy, px)
  // the extrusion: the word stacked down-right, darkest at the back
  let depth = ''
  for (let i = 7; i >= 1; i--) depth += `<g fill="${i === 7 ? INK : i > 3 ? '#1c0829' : '#2e0f44'}" transform="translate(${i * 2} ${i * 3})">${rects}</g>`
  const tpx = 7
  const tw = textWidth(tagline) * tpx
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" role="img" aria-label="Thematic. ${tagline}">
<defs><radialGradient id="glow" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#5a2d8a"/><stop offset="1" stop-color="#1f0a2e"/></radialGradient>
<linearGradient id="face" x1="0" y1="${wy}" x2="0" y2="${wy + 7 * px}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#ffffff"/><stop offset="0.56" stop-color="#e6d7f5"/><stop offset="1" stop-color="#c9b0e6"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#glow)"/><g fill="#a07ad6" fill-opacity="0.45" shape-rendering="auto">${dots}</g>
${depth}<g fill="url(#face)">${rects}</g>
${pixelText(tagline, Math.round((w - tw) / 2), wy + 7 * px + 40, tpx, '#ffaa00', '#3f2a00')}
</svg>`
}
