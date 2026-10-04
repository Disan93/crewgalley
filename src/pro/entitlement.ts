import { BILLING_ENABLED } from './config'
import {
  istFreigeschaltet as regelFreigeschaltet,
  istPro as regelPro,
  sperrenAktiv as regelSperren,
  type DevModus,
  type ProZustand,
  type Umgebung,
} from './regeln'

// Die zentrale Stelle für den Pro-Status. Der Status wird lokal gespeichert,
// beim App-Start geladen (ladeProStatus) und danach mit Google Play abgeglichen
// (siehe billing/index.ts). Die Regeln selbst stehen in regeln.ts.

const SPEICHER = 'crewgalley-pro'

const umgebung: Umgebung = {
  billingAktiv: BILLING_ENABLED,
  // Vite setzt DEV nur bei "npm run dev" auf true; in der gebauten App ist es false
  entwicklung: import.meta.env.DEV,
}

let zustand: ProZustand = { gekauft: false, dev: 'normal' }
const beobachter = new Set<() => void>()

function speichere(): void {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(zustand))
  } catch {
    // Ohne Speicher gilt der Status nur bis zum Schließen der App
  }
  beobachter.forEach((melde) => melde())
}

/** Beim App-Start: den zuletzt bekannten Status laden, damit Pro auch offline gilt */
export function ladeProStatus(): void {
  try {
    const roh = JSON.parse(localStorage.getItem(SPEICHER) ?? '{}') as Partial<ProZustand>
    zustand = {
      gekauft: roh.gekauft === true,
      dev: roh.dev === 'pro' || roh.dev === 'kostenlos' ? roh.dev : 'normal',
    }
  } catch {
    zustand = { gekauft: false, dev: 'normal' }
  }
}

/** Hat diese Person Pro? */
export function isPro(): boolean {
  return regelPro(zustand, umgebung)
}

/** Werden Pro-Funktionen gerade überhaupt gesperrt? (Nein, solange der Kauf nicht möglich ist) */
export function sperrenAktiv(): boolean {
  return regelSperren(zustand, umgebung)
}

/** Darf diese Person Pro-Funktionen benutzen? */
export function istFreigeschaltet(): boolean {
  return regelFreigeschaltet(zustand, umgebung)
}

/** Wird von der Kauf-Anbindung aufgerufen, wenn Google Play den Kauf bestätigt oder nicht (mehr) kennt */
export function setzeGekauft(gekauft: boolean): void {
  if (zustand.gekauft === gekauft) return
  zustand = { ...zustand, gekauft }
  speichere()
}

export function devModus(): DevModus {
  return umgebung.entwicklung ? zustand.dev : 'normal'
}

/** Entwickler-Schalter; wirkt nur bei "npm run dev" */
export function setzeDevModus(dev: DevModus): void {
  zustand = { ...zustand, dev }
  speichere()
}

/** Für die Oberfläche: wird bei jeder Änderung des Status aufgerufen */
export function abonniere(melde: () => void): () => void {
  beobachter.add(melde)
  return () => beobachter.delete(melde)
}

export const IST_ENTWICKLUNG = umgebung.entwicklung
