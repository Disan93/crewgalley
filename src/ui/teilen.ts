import { IST_APP } from '../plattform'

export type TeilenErgebnis = 'geteilt' | 'kopiert' | 'abgebrochen' | 'fehler'

/**
 * Gibt einen Text über das Teilen-Menü des Handys weiter (z. B. an WhatsApp).
 * Gibt es kein Teilen-Menü, wird der Text in die Zwischenablage kopiert (Konzept 10.3).
 */
export async function teileText(titel: string, text: string): Promise<TeilenErgebnis> {
  if (IST_APP) {
    // In der Android-App läuft das Teilen über Capacitor; der Browser-Weg fehlt dort
    const { Share } = await import('@capacitor/share')
    try {
      await Share.share({ title: titel, text })
      return 'geteilt'
    } catch {
      return 'abgebrochen'
    }
  }

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: titel, text })
      return 'geteilt'
    } catch (fehler) {
      if (fehler instanceof DOMException && fehler.name === 'AbortError') return 'abgebrochen'
      // sonst: weiter mit der Zwischenablage
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'kopiert'
  } catch {
    return 'fehler'
  }
}
