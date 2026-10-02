// Erzeugt alle PNG-Icons aus dem Master-Icon public/icons/icon.svg.
// Aufruf: npm run icons
// Nur nötig, wenn sich das Master-Icon ändert; die PNG-Dateien liegen im Repository.

import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

const ordner = new URL('../public/icons/', import.meta.url)
const master = await readFile(new URL('icon.svg', ordner), 'utf8')

// Für die winzigen Favicons: innerer Ring weg, Punkte größer, damit es lesbar bleibt
const klein = master
  .replace(/\s*<circle[^>]*fill="none"[^>]*\/>/, '')
  .replaceAll('r="6"', 'r="7"')
if (klein === master || klein.includes('fill="none"') || klein.includes('r="6"')) {
  throw new Error('Das Master-Icon hat sich geändert: Ring oder Punkte wurden nicht gefunden.')
}

const dateien = [
  { name: 'icon-192.png', groesse: 192, svg: master },
  { name: 'icon-512.png', groesse: 512, svg: master },
  // Gleiches Motiv: Es liegt bereits in der sicheren Zone für Android
  { name: 'icon-maskable-512.png', groesse: 512, svg: master },
  { name: 'apple-touch-icon.png', groesse: 180, svg: master },
  { name: 'favicon-32.png', groesse: 32, svg: klein },
  { name: 'favicon-16.png', groesse: 16, svg: klein },
]

for (const { name, groesse, svg } of dateien) {
  // Hohe Dichte, damit das SVG scharf gerendert wird, bevor es auf die Zielgröße kommt
  await sharp(Buffer.from(svg), { density: 72 * (groesse / 100) * 4 })
    .resize(groesse, groesse)
    .png()
    .toFile(new URL(name, ordner).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
  console.log(`${name} (${groesse}×${groesse})`)
}
