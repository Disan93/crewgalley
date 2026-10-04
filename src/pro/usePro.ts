import { useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { abonniere, devModus, isPro, istFreigeschaltet, sperrenAktiv } from './entitlement'

/** Adresse des Pro-Bildschirms; "von" ist die Seite, zu der der Zurück-Pfeil führt */
export function proPfad(von: string): string {
  return `/pro?von=${encodeURIComponent(von)}`
}

/** Pro-Status für Bildschirme; aktualisiert sich von selbst, wenn sich der Status ändert */
export function usePro() {
  // Ein Text als Momentaufnahme, damit React Änderungen zuverlässig erkennt
  const stand = useSyncExternalStore(abonniere, () => `${isPro()}|${sperrenAktiv()}|${devModus()}`)
  const navigate = useNavigate()
  const frei = istFreigeschaltet()

  return {
    stand,
    pro: isPro(),
    /** true, wenn Pro-Funktionen für diese Person gesperrt sind */
    gesperrt: !frei,
    /** Öffnet den Pro-Bildschirm; "von" ist die aktuelle Seite */
    zeigePro: (von: string) => navigate(proPfad(von)),
  }
}
