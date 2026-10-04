// Schaltet Google Play Billing in der Bubblewrap-Konfiguration ein.
// Aufruf (im Projektordner crewgalley):
//   node scripts/twa-billing-aktivieren.mjs "C:\Pfad\zum\Android-Ordner"
// Danach im Android-Ordner: bubblewrap update  und  bubblewrap build

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ordner = process.argv[2]
if (!ordner) {
  console.error('Bitte den Ordner angeben, in dem twa-manifest.json liegt.')
  process.exit(1)
}

const datei = join(ordner, 'twa-manifest.json')
const manifest = JSON.parse(await readFile(datei, 'utf8'))

// Laut Chrome-Dokumentation braucht Play Billing diese beiden Einträge
manifest.features = { ...manifest.features, playBilling: { enabled: true } }
manifest.alphaDependencies = { enabled: true }

await writeFile(datei, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Play Billing ist in ${datei} eingeschaltet.`)
console.log('Jetzt im Android-Ordner ausführen: bubblewrap update   und danach   bubblewrap build')
