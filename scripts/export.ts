// Runs every export-*.ts script in sequence. This is what `npm run export` (and therefore
// `npm run dev` / `npm run build`, via their pre-hooks) actually invokes.
import { exportSuits } from './export-suits'
import { exportBook } from './export-book'
import { exportOres } from './export-ores'
import { exportBlog } from './export-blog'

exportSuits()
exportBook()
exportOres()
exportBlog()
