import type { BillingProvider, KaufErgebnis } from './typen'

/**
 * Normaler Browser (oder Kauf noch nicht eingeschaltet): Hier kann man nichts kaufen.
 * Der Pro-Bildschirm zeigt dann "Pro ist in der Android-App erhältlich".
 */
export class WebFallbackProvider implements BillingProvider {
  readonly art = 'web'

  async preis(): Promise<string | null> {
    return null
  }

  async kaufen(): Promise<KaufErgebnis> {
    return 'fehler'
  }

  async wiederherstellen(): Promise<boolean> {
    return false
  }
}
