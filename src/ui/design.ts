import type { Design } from '../logic/typen'

const SPEICHER = 'crewgalley-design'

/**
 * Stellt Hell, Dunkel oder "wie das Gerät" ein. Die Farben selbst stehen in index.css
 * und hängen am Attribut data-theme des <html>-Elements.
 */
export function wendeDesignAn(design: Design): void {
  if (design === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = design
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
    if (gemerkt === 'hell' || gemerkt === 'dunkel') document.documentElement.dataset.theme = gemerkt
  } catch {
    // siehe oben
  }
}
