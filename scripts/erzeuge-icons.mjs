// Erzeugt alle PNG-Icons aus den drei SVG-Vorlagen in public/icons/:
//   icon.svg          – Master-Icon
//   icon-small.svg    – vereinfacht für winzige Größen (Favicons)
//   icon-maskable.svg – Motiv auf 80 % verkleinert für runde Android-Icons
// Aufruf: npm run icons
// Nur nötig, wenn sich eine Vorlage ändert; die PNG-Dateien liegen im Repository.

import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ordner = new URL('../public/icons/', import.meta.url)
const pfad = (name) => fileURLToPath(new URL(name, ordner))

const dateien = [
  { name: 'icon-192.png', groesse: 192, vorlage: 'icon.svg' },
  { name: 'icon-512.png', groesse: 512, vorlage: 'icon.svg' },
  { name: 'icon-maskable-512.png', groesse: 512, vorlage: 'icon-maskable.svg' },
  { name: 'apple-touch-icon.png', groesse: 180, vorlage: 'icon.svg' },
  { name: 'favicon-32.png', groesse: 32, vorlage: 'icon-small.svg' },
  { name: 'favicon-16.png', groesse: 16, vorlage: 'icon-small.svg' },
  // Der Play Store verlangt ein Icon ohne Transparenz
  { name: 'playstore-icon-512.png', groesse: 512, vorlage: 'icon.svg', ohneTransparenz: true },
]

for (const { name, groesse, vorlage, ohneTransparenz } of dateien) {
  // Hohe Dichte, damit das SVG scharf gerendert wird, bevor es auf die Zielgröße kommt
  let bild = sharp(pfad(vorlage), { density: 72 * (groesse / 100) * 4 }).resize(groesse, groesse)
  if (ohneTransparenz) bild = bild.flatten({ background: '#2E6B4A' }).removeAlpha()
  await bild.png().toFile(pfad(name))
  console.log(`${name} (${groesse}×${groesse}) aus ${vorlage}`)
}
