// Zentrale Einstellungen für das Pro-Upgrade.

/**
 * Hauptschalter für den Kauf. Solange er auf false steht,
 * - kann niemand kaufen und
 * - ist NICHTS gesperrt: Alle Funktionen bleiben für alle frei nutzbar.
 * Erst auf true stellen, wenn das Produkt "pro_upgrade" in der Play Console
 * angelegt und aktiv ist (siehe PLAYSTORE-CHECKLISTE.md).
 */
export const BILLING_ENABLED = false

/** Produkt-ID des Einmalkaufs in der Play Console */
export const PRODUKT_ID = 'pro_upgrade'

/** Kennung von Google Play Billing für die Digital Goods API und die Payment Request API */
export const PLAY_BILLING = 'https://play.google.com/billing'

/**
 * Adresse eines kleinen Server-Dienstes, der einen Kauf bei Google bestätigt
 * ("acknowledge"). Laut Google wird ein unbestätigter Kauf nach drei Tagen
 * automatisch erstattet. Leer = kein Dienst eingerichtet.
 * Siehe PLAYSTORE-CHECKLISTE.md, Abschnitt "Kaufbestätigung".
 */
export const BESTAETIGUNGS_URL = ''

/** So viele aktive (noch nicht abgeschlossene) Trips erlaubt die kostenlose Version */
export const FREIE_AKTIVE_TRIPS = 1
