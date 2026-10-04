// Einstellungen für die Werbung (Google AdMob). Werbung gibt es nur in der
// Android-App, nie in der Web-Version, und nur als Banner.

/**
 * Hauptschalter für echte Anzeigen. Solange er auf false steht, zeigt die App
 * ausschließlich die offiziellen Test-Anzeigen von Google.
 *
 * WICHTIG: Tippe echte Anzeigen in deiner eigenen App niemals selbst an. Google
 * wertet das als Betrug und kann das AdMob-Konto sperren. Zum Ausprobieren
 * immer mit Test-Anzeigen arbeiten (Schalter auf false).
 */
export const ECHTE_ANZEIGEN = false

/** Offizielle Test-ID von Google für ein anpassungsfähiges Banner (Android) */
export const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/9214589741'

/** ID des Banner-Anzeigenblocks „Banner unten“ aus dem AdMob-Konto (Form: ca-app-pub-…/…) */
export const ECHTE_BANNER_ID = 'ca-app-pub-3383100757393216/1952862958'

// Die zweite ID, die AdMob braucht (die App-ID mit "~"), steht nicht hier, sondern in
// android/app/src/main/res/values/strings.xml unter "admob_app_id".

const ID_FORM = /^ca-app-pub-\d{16}\/\d{10}$/

/**
 * Welche Banner-ID wird verwendet? Die echte nur, wenn der Schalter an ist UND
 * eine gültige ID eingetragen wurde. Sonst immer die Test-ID.
 */
export function bannerId(echteAnzeigen: boolean = ECHTE_ANZEIGEN, echteId: string = ECHTE_BANNER_ID): string {
  return echteAnzeigen && ID_FORM.test(echteId) && echteId !== TEST_BANNER_ID ? echteId : TEST_BANNER_ID
}

/** Werden gerade Test-Anzeigen gezeigt? */
export function istTestbetrieb(echteAnzeigen: boolean = ECHTE_ANZEIGEN, echteId: string = ECHTE_BANNER_ID): boolean {
  return bannerId(echteAnzeigen, echteId) === TEST_BANNER_ID
}

/** Stand der Einwilligung, wie ihn Googles Einwilligungsabfrage (User Messaging Platform) meldet */
export type EinwilligungsStatus = 'NOT_REQUIRED' | 'OBTAINED' | 'REQUIRED' | 'UNKNOWN'

/**
 * Nur nicht-personalisierte Werbung anfordern? Ja, solange keine Entscheidung vorliegt.
 * Liegt eine vor (OBTAINED), richtet sich Google selbst nach dem, was die Person gewählt hat.
 * Außerhalb der Regionen mit Einwilligungspflicht (NOT_REQUIRED) ist keine Abfrage nötig.
 */
export function nurNichtPersonalisiert(status: EinwilligungsStatus): boolean {
  return status !== 'OBTAINED' && status !== 'NOT_REQUIRED'
}
