import type { Einheit } from './typen'

/**
 * Rundet eine Einkaufsmenge ohne Packungsgröße auf (Konzept 7.4):
 * g/ml: unter 100 → auf 10, unter 1000 → auf 50, sonst auf 100; Stück → auf ganze Zahl.
 */
export function rundeOhnePackung(menge: number, einheit: Einheit): number {
  if (menge <= 0) return 0
  if (einheit === 'stk') return Math.ceil(menge)
  const schritt = menge < 100 ? 10 : menge < 1000 ? 50 : 100
  return Math.ceil(menge / schritt) * schritt
}
