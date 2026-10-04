// Gemeinsame Form aller Kauf-Anbindungen. Die Oberfläche kennt nur dieses
// Interface; welche Anbindung dahintersteckt, entscheidet billing/index.ts.

export type KaufErgebnis = 'gekauft' | 'abgebrochen' | 'fehler'

export interface BillingProvider {
  /** play = Google Play Billing in der Android-App, web = normaler Browser ohne Kaufmöglichkeit */
  art: 'play' | 'web'
  /** Preis fertig formatiert, z. B. "4,99 €"; null, wenn er nicht ermittelt werden kann */
  preis(): Promise<string | null>
  kaufen(): Promise<KaufErgebnis>
  /** Fragt Google Play, ob der Einmalkauf schon vorhanden ist */
  wiederherstellen(): Promise<boolean>
}

// ---------- Digital Goods API (gibt es nur in der Android-App als Trusted Web Activity) ----------

export interface ArtikelDetails {
  itemId: string
  title: string
  price: { currency: string; value: string }
}

export interface KaufDetails {
  itemId: string
  purchaseToken: string
}

export interface DigitalGoodsService {
  getDetails(itemIds: string[]): Promise<ArtikelDetails[]>
  listPurchases(): Promise<KaufDetails[]>
}

/** Der Teil von "window", den die Play-Anbindung braucht; in Tests durch eine Attrappe ersetzbar */
export interface PlayUmgebung {
  getDigitalGoodsService?: (methode: string) => Promise<DigitalGoodsService>
  PaymentRequest?: typeof PaymentRequest
  fetch?: typeof fetch
}
