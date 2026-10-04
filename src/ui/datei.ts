import { IST_APP } from '../plattform'

/** Bietet einen Text als Datei zum Herunterladen an (nur im Browser) */
export function ladeHerunter(dateiname: string, text: string, typ = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type: typ }))
  const link = document.createElement('a')
  link.href = url
  link.download = dateiname
  link.click()
  URL.revokeObjectURL(url)
}

export type DateiErgebnis = 'geteilt' | 'heruntergeladen' | 'abgebrochen'

/**
 * Android-App: Dort gibt es kein "Herunterladen". Die Datei wird zwischengespeichert
 * und über das Teilen-Menü weitergegeben (z. B. in "Dateien" sichern, per Mail oder WhatsApp).
 */
async function teileInDerApp(dateiname: string, text: string): Promise<DateiErgebnis> {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')
  const { uri } = await Filesystem.writeFile({
    path: dateiname,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  })
  try {
    await Share.share({ title: dateiname, files: [uri] })
    return 'geteilt'
  } catch {
    // Das Teilen-Menü wurde geschlossen, ohne etwas auszuwählen
    return 'abgebrochen'
  }
}

/** Sicherung speichern: im Browser herunterladen, in der Android-App über das Teilen-Menü */
export async function speichereDatei(dateiname: string, text: string): Promise<DateiErgebnis> {
  if (IST_APP) return teileInDerApp(dateiname, text)
  ladeHerunter(dateiname, text)
  return 'heruntergeladen'
}

/**
 * Gibt eine Datei über das Teilen-Menü des Handys weiter (z. B. per WhatsApp oder Mail).
 * Kann das Gerät keine Dateien teilen, wird sie heruntergeladen.
 */
export async function teileDatei(dateiname: string, text: string): Promise<DateiErgebnis> {
  if (IST_APP) return teileInDerApp(dateiname, text)

  const datei = new File([text], dateiname, { type: 'application/json' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [datei] })) {
    try {
      await navigator.share({ files: [datei], title: dateiname })
      return 'geteilt'
    } catch (fehler) {
      if (fehler instanceof DOMException && fehler.name === 'AbortError') return 'abgebrochen'
      // sonst: weiter mit dem Herunterladen
    }
  }
  ladeHerunter(dateiname, text)
  return 'heruntergeladen'
}
