import { useEffect } from 'react'
import { IST_APP } from '../plattform'
import { versteckeBanner, zeigeBanner } from '../werbung/werbung'

/**
 * Platz für das Werbebanner am unteren Bildschirmrand. Nur in der Android-App und nur
 * auf Bildschirmen, die diese Komponente einbinden (Trip-Übersicht und Rezeptauswahl).
 * Der Platzhalter ist so hoch wie das Banner, damit es keine Bedienelemente verdeckt;
 * ohne Banner (offline, keine Anzeige) ist er 0 Pixel hoch.
 */
export function WerbePlatz() {
  useEffect(() => {
    zeigeBanner()
    return versteckeBanner
  }, [])

  return IST_APP ? <div className="werbeplatz" aria-hidden="true" /> : null
}
