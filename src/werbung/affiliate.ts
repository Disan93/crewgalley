// Affiliate-Links ("Werbelinks") für Ausrüstung. Vorbereitet, aber ausgeschaltet.
// Ein Affiliate-Link führt zu einem Händler; kauft jemand darüber ein, bekommst du
// eine kleine Provision. Solche Links müssen als Werbung gekennzeichnet sein.

/** Hauptschalter. Solange er auf false steht, erscheint nirgends ein Werbelink. */
export const AFFILIATE_AKTIV = false

export interface AffiliateLink {
  /** Kennung, unter der ein Bildschirm den Link anfordert, z. B. "segeln" oder "huette" */
  id: string
  /** Vollständige Adresse inklusive deiner Partner-Kennung */
  url: string
}

export const AFFILIATE_LINKS: AffiliateLink[] = [
  // Beispiel (noch nicht aktiv):
  // { id: 'huette', url: 'https://www.beispiel-haendler.at/huettenausruestung?partner=[PARTNER-ID EINTRAGEN]' },
]

/** Liefert den Link nur, wenn Affiliate eingeschaltet ist und eine echte Adresse eingetragen wurde */
export function affiliateLink(
  id: string,
  aktiv: boolean = AFFILIATE_AKTIV,
  links: AffiliateLink[] = AFFILIATE_LINKS,
): AffiliateLink | null {
  if (!aktiv) return null
  const link = links.find((l) => l.id === id)
  return link && link.url.startsWith('https://') && !link.url.includes('[') ? link : null
}
