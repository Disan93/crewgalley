import type { CapacitorConfig } from '@capacitor/cli'

// Einstellungen der Android-App. Capacitor packt den Ordner "dist" (die gebaute
// Web-App) in die App; sie läuft dadurch vollständig offline.
const config: CapacitorConfig = {
  appId: 'app.crewgalley',
  appName: 'CrewGalley',
  webDir: 'dist',
  // Farbe hinter der Web-Ansicht, sichtbar beim Start, bevor die App geladen ist
  backgroundColor: '#2E6B4A',
}

export default config
