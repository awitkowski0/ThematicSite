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
  pack: { rows: '.#####./#######/#.....#/#######/#.....#/#.....#/#######', fill: '#ffc93c' },
  suit: { rows: '##...##/###.###/#######/.#####./.#####./.#####./.#####.', fill: '#ffffff' },
}

const INK = '#000000'
const FACE = '#661911'
const FACE_LIT = '#8f2c20'
const FACE_DARK = '#3d0e09'
const WHITE = '#ffffff'
const SHADOW = '#3f3f3f'

/** A game-style button: black outline, red face with a lit top and a dark bottom lip, an optional icon, and shadowed white text. */
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

/** The cover: a screenshot with the white wordmark across the bottom on a dark fade, extruded like the game's title. */
export function coverSvg(image: string, w: number, h: number): string {
  const px = Math.round(w / 80)
  const word = 'THEMATIC'
  const ww = textWidth(word) * px
  const wx = Math.round((w - ww) / 2)
  const wy = Math.round(h - 7 * px - h * 0.08)
  const rects = glyphRects(word, wx, wy, px)
  // the extrusion: the word stacked down-right, darkest at the back
  let depth = ''
  for (let i = 6; i >= 1; i--) depth += `<g fill="${i > 3 ? INK : '#2b2b2b'}" transform="translate(${i * 2} ${i * 2})">${rects}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Thematic">
<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></linearGradient></defs>
<image width="${w}" height="${h}" xlink:href="${image}" href="${image}"/><rect width="${w}" height="${h}" fill="url(#fade)"/>
<g shape-rendering="crispEdges">${depth}<g fill="${WHITE}">${rects}</g></g>
</svg>`
}
