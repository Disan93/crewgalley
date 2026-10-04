// Erzeugt die Vorlagen für App-Icon und Startbildschirm der Android-App im Ordner assets/.
// Daraus baut "@capacitor/assets" alle Größen, die Android braucht.
// Aufruf: npm run app-assets   (macht beides hintereinander)

import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const HELL = '#2E6B4A'
const DUNKEL = '#1F4A33'

const master = await readFile(new URL('../public/icons/icon.svg', import.meta.url), 'utf8')
const ziel = new URL('../assets/', import.meta.url)
await mkdir(ziel, { recursive: true })
const pfad = (name) => fileURLToPath(new URL(name, ziel))

// Das Motiv ohne den grünen Hintergrund (erstes <rect>)
const kopf = master.match(/<svg[^>]*>/)[0]
const motiv = master.replace(kopf, '').replace('</svg>', '').replace(/<rect width="100" height="100"[^>]*\/>/, '')
if (motiv.includes('width="100" height="100"')) throw new Error('Hintergrund im Master-Icon nicht gefunden')

/** Motiv um den Mittelpunkt verkleinert, optional auf farbigem Hintergrund */
function svg(skalierung, hintergrund) {
  const flaeche = hintergrund ? `<rect width="100" height="100" fill="${hintergrund}"/>` : ''
  return `${kopf}${flaeche}<g transform="translate(50 50) scale(${skalierung}) translate(-50 -50)">${motiv}</g></svg>`
}

async function schreibe(name, quelle, groesse) {
  await sharp(Buffer.from(quelle), { density: 72 * (groesse / 100) * 2 })
    .resize(groesse, groesse)
    .png()
    .toFile(pfad(name))
  console.log(`assets/${name} (${groesse}×${groesse})`)
}

// Icon für ältere Android-Versionen: das komplette Master-Icon
await schreibe('icon-only.png', master, 1024)
// Adaptives Icon (Android 8+): Hintergrund und Motiv getrennt. @capacitor/assets rückt beide
// Bilder selbst um 16,7 % ein, sodass das ganze Bild im sichtbaren Bereich liegt. Das Motiv ist
// wie beim maskierbaren Web-Icon auf 80 % verkleinert, damit runde Icons nichts abschneiden.
await schreibe('icon-foreground.png', svg(0.8, null), 1024)
await schreibe('icon-background.png', `${kopf}<rect width="100" height="100" fill="${HELL}"/></svg>`, 1024)
// Startbildschirm: kleines Motiv auf grüner Fläche, hell und dunkel
await schreibe('splash.png', svg(0.22, HELL), 2732)
await schreibe('splash-dark.png', svg(0.22, DUNKEL), 2732)
