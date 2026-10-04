import { BESTAETIGUNGS_URL, PLAY_BILLING, PRODUKT_ID } from '../config'
import type { BillingProvider, DigitalGoodsService, KaufErgebnis, PlayUmgebung } from './typen'

/**
 * Google Play Billing in der Android-App (Trusted Web Activity).
 * - Digital Goods API: Preis abfragen und vorhandene Käufe auflisten
 * - Payment Request API: den Kauf-Dialog von Google Play öffnen
 */
export class PlayBillingProvider implements BillingProvider {
  readonly art = 'play'
  private readonly umgebung: PlayUmgebung
  private readonly bestaetigungsUrl: string

  constructor(umgebung: PlayUmgebung, bestaetigungsUrl: string = BESTAETIGUNGS_URL) {
    this.umgebung = umgebung
    this.bestaetigungsUrl = bestaetigungsUrl
  }

  /** Gibt es Google Play Billing in dieser Umgebung? (Nur in der Android-App aus dem Play Store) */
  static async verfuegbar(umgebung: PlayUmgebung): Promise<boolean> {
    if (typeof umgebung.getDigitalGoodsService !== 'function' || !umgebung.PaymentRequest) return false
    try {
      await umgebung.getDigitalGoodsService(PLAY_BILLING)
      return true
    } catch {
      return false
    }
  }

  private dienst(): Promise<DigitalGoodsService> {
    if (!this.umgebung.getDigitalGoodsService) throw new Error('Digital Goods API fehlt')
    return this.umgebung.getDigitalGoodsService(PLAY_BILLING)
  }

  async preis(): Promise<string | null> {
    try {
      const [artikel] = await (await this.dienst()).getDetails([PRODUKT_ID])
      if (!artikel) return null
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: artikel.price.currency }).format(
        Number(artikel.price.value),
      )
    } catch {
      return null
    }
  }

  async wiederherstellen(): Promise<boolean> {
    const kaeufe = await (await this.dienst()).listPurchases()
    return kaeufe.some((k) => k.itemId === PRODUKT_ID)
  }

  async kaufen(): Promise<KaufErgebnis> {
    if (!this.umgebung.PaymentRequest) return 'fehler'
    try {
      // Den Betrag bestimmt Google Play anhand der Produkt-ID; die Angabe hier ist nur ein Pflichtfeld
      const anfrage = new this.umgebung.PaymentRequest(
        [{ supportedMethods: PLAY_BILLING, data: { sku: PRODUKT_ID } }],
        { total: { label: 'Total', amount: { currency: 'EUR', value: '0' } } },
      )
      const antwort = await anfrage.show()
      const token = (antwort.details as { purchaseToken?: string }).purchaseToken
      const bestaetigt = token ? await this.bestaetige(token) : false
      await antwort.complete(token && bestaetigt ? 'success' : 'fail')
      return token && bestaetigt ? 'gekauft' : 'fehler'
    } catch (fehler) {
      // Die Person hat den Kauf-Dialog geschlossen
      if (fehler instanceof DOMException && fehler.name === 'AbortError') return 'abgebrochen'
      return 'fehler'
    }
  }

  /**
   * Meldet den Kauf an den Bestätigungs-Dienst, falls einer eingerichtet ist.
   * Ohne Dienst gilt der Kauf sofort; ob Google ihn dann nach drei Tagen erstattet,
   * zeigt der Abgleich beim nächsten App-Start (siehe PLAYSTORE-CHECKLISTE.md).
   */
  private async bestaetige(token: string): Promise<boolean> {
    if (this.bestaetigungsUrl === '' || !this.umgebung.fetch) return true
    try {
      const antwort = await this.umgebung.fetch(this.bestaetigungsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produktId: PRODUKT_ID, purchaseToken: token }),
      })
      return antwort.ok
    } catch {
      return false
    }
  }
}
