import type { Design } from '../logic/typen'

const SPEICHER = 'crewgalley-design'

/** Farbe der Statusleiste des Handys; entspricht --header-card in index.css */
const LEISTENFARBE = { hell: '#2E6B4A', dunkel: '#1F4A33' }

function setze(design: Design): void {
  if (design === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = design

  // In index.html gibt es je ein theme-color-Tag für helle und dunkle Geräte.
  // Bei fester Wahl bekommen beide dieselbe Farbe, bei "System" jedes seine eigene.
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    const fuerDunkel = meta.getAttribute('media')?.includes('dark') ?? false
    const modus = design === 'system' ? (fuerDunkel ? 'dunkel' : 'hell') : design
    meta.setAttribute('content', LEISTENFARBE[modus])
  })
}

/**
 * Stellt Hell, Dunkel oder "wie das Gerät" ein. Die Farben selbst stehen in index.css
 * und hängen am Attribut data-theme des <html>-Elements.
 */
export function wendeDesignAn(design: Design): void {
  setze(design)
  try {
    // Merken, damit die App beim nächsten Start sofort richtig aussieht, noch bevor die Datenbank geladen ist
    localStorage.setItem(SPEICHER, design)
  } catch {
    // Ohne Zwischenspeicher gilt beim Start kurz die Geräte-Einstellung
  }
}

export function wendeGemerktesDesignAn(): void {
  try {
    const gemerkt = localStorage.getItem(SPEICHER)
    if (gemerkt === 'hell' || gemerkt === 'dunkel') setze(gemerkt)
  } catch {
    // siehe oben
  }
}
