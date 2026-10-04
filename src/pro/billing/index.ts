import { BILLING_ENABLED } from '../config'
import { setzeGekauft } from '../entitlement'
import { PlayBillingProvider } from './PlayBillingProvider'
import type { BillingProvider, PlayUmgebung } from './typen'
import { WebFallbackProvider } from './WebFallbackProvider'

// Wählt die passende Kauf-Anbindung. Die Oberfläche ruft nur holeProvider() auf;
// eine weitere Anbindung (z. B. für iOS) wäre hier ein zusätzlicher Fall.

/** Wählt die Anbindung für eine Umgebung; "aktiv" ist BILLING_ENABLED */
export async function waehleProvider(umgebung: PlayUmgebung, aktiv: boolean): Promise<BillingProvider> {
  if (aktiv && (await PlayBillingProvider.verfuegbar(umgebung))) return new PlayBillingProvider(umgebung)
  return new WebFallbackProvider()
}

let gemerkt: Promise<BillingProvider> | null = null

export function holeProvider(): Promise<BillingProvider> {
  gemerkt ??= waehleProvider(window as unknown as PlayUmgebung, BILLING_ENABLED)
  return gemerkt
}

/**
 * Beim App-Start: Google Play fragen, ob der Einmalkauf vorhanden ist.
 * Klappt die Abfrage nicht (z. B. offline), bleibt der zuletzt gespeicherte Status gültig.
 */
export async function pruefeKaeufe(provider?: BillingProvider): Promise<void> {
  const anbindung = provider ?? (await holeProvider())
  if (anbindung.art !== 'play') return
  try {
    setzeGekauft(await anbindung.wiederherstellen())
  } catch {
    // gespeicherten Status behalten
  }
}
