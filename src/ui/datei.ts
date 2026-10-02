/** Bietet einen Text als Datei zum Herunterladen an */
export function ladeHerunter(dateiname: string, text: string, typ = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type: typ }))
  const link = document.createElement('a')
  link.href = url
  link.download = dateiname
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Gibt eine Datei über das Teilen-Menü des Handys weiter (z. B. per WhatsApp oder Mail).
 * Kann das Gerät keine Dateien teilen, wird sie heruntergeladen.
 */
export async function teileDatei(dateiname: string, text: string): Promise<'geteilt' | 'heruntergeladen' | 'abgebrochen'> {
  // Als Textdatei, weil viele Geräte .json-Dateien nicht teilen können; der Inhalt bleibt derselbe
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
