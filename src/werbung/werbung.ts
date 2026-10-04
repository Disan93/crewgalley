import { IST_APP } from '../plattform'
import { bannerId, istTestbetrieb, nurNichtPersonalisiert, type EinwilligungsStatus } from './config'

// Banner-Werbung in der Android-App. Das Banner ist kein Teil der Webseite, sondern
// liegt als eigene Fläche am unteren Rand über der App. Damit es nichts verdeckt,
// reserviert <WerbePlatz /> genau so viel Platz, wie das Banner hoch ist
// (CSS-Variable --werbung-hoehe).

type AdMobModul = typeof import('@capacitor-community/admob')

/** Wird ein Banner gerade von einem Bildschirm gewünscht? */
let gewuenscht = false
let sichtbar = false
let vorbereitung: Promise<{ modul: AdMobModul; status: EinwilligungsStatus; erlaubt: boolean } | null> | null = null

function setzeHoehe(hoehe: number): void {
  document.documentElement.style.setProperty('--werbung-hoehe', `${Math.max(0, Math.round(hoehe))}px`)
}

/** Einmal pro App-Start: AdMob starten, Einwilligung abfragen, Ereignisse abonnieren */
function bereiteVor() {
  vorbereitung ??= (async () => {
    try {
      const modul = await import('@capacitor-community/admob')
      const { AdMob, AdmobConsentStatus, BannerAdPluginEvents } = modul

      await AdMob.initialize({ initializeForTesting: istTestbetrieb() })

      // Einwilligungsabfrage von Google (DSGVO). Sie erscheint nur, wo sie nötig ist.
      let einwilligung = await AdMob.requestConsentInfo()
      if (einwilligung.isConsentFormAvailable && einwilligung.status === AdmobConsentStatus.REQUIRED) {
        einwilligung = await AdMob.showConsentForm()
      }

      // Die Höhe des Banners steht erst fest, wenn es geladen ist
      await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (groesse) => {
        setzeHoehe(gewuenscht ? groesse.height : 0)
      })
      // Lädt keine Anzeige (z. B. kein Netz), bleibt kein leerer Platz stehen
      await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
        setzeHoehe(0)
        void AdMob.hideBanner().catch(() => undefined)
      })

      return {
        modul,
        status: einwilligung.status as EinwilligungsStatus,
        erlaubt: einwilligung.canRequestAds,
      }
    } catch {
      return null
    }
  })()
  return vorbereitung
}

async function blendeEin(): Promise<void> {
  const bereit = await bereiteVor()
  // Inzwischen kann der Bildschirm gewechselt oder das Netz weg sein
  if (!bereit || !bereit.erlaubt || !gewuenscht || !navigator.onLine || sichtbar) return
  const { AdMob, BannerAdPosition, BannerAdSize } = bereit.modul
  try {
    sichtbar = true
    await AdMob.showBanner({
      adId: bannerId(),
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: istTestbetrieb(),
      npa: nurNichtPersonalisiert(bereit.status),
    })
    // Der Bildschirm wurde verlassen, während das Banner geladen hat
    if (!gewuenscht) await blendeAus()
  } catch {
    sichtbar = false
    setzeHoehe(0)
  }
}

async function blendeAus(): Promise<void> {
  setzeHoehe(0)
  if (!sichtbar) return
  sichtbar = false
  const bereit = await bereiteVor()
  await bereit?.modul.AdMob.removeBanner().catch(() => undefined)
}

/** Ein Bildschirm mit Werbeplatz wurde geöffnet */
export function zeigeBanner(): void {
  if (!IST_APP) return
  gewuenscht = true
  void blendeEin()
}

/** Der Bildschirm mit Werbeplatz wurde verlassen */
export function versteckeBanner(): void {
  if (!IST_APP) return
  gewuenscht = false
  void blendeAus()
}

if (IST_APP) {
  // Offline: Bannerplatz ausblenden statt eine leere Fläche zu zeigen. Wieder online: neu laden.
  window.addEventListener('offline', () => void blendeAus())
  window.addEventListener('online', () => {
    if (gewuenscht) void blendeEin()
  })
}

/**
 * Für die Einstellungen: die Entscheidung zur Werbe-Einwilligung später ändern.
 * Gibt false zurück, wenn das Formular nicht geöffnet werden konnte.
 */
export async function oeffneEinwilligung(): Promise<boolean> {
  const bereit = await bereiteVor()
  if (!bereit) return false
  const { AdMob } = bereit.modul
  try {
    await AdMob.showPrivacyOptionsForm()
  } catch {
    // Wo Google kein Formular "Datenschutzoptionen" anbietet: Entscheidung zurücksetzen und neu fragen
    try {
      await AdMob.resetConsentInfo()
      const neu = await AdMob.requestConsentInfo()
      if (!neu.isConsentFormAvailable) return false
      await AdMob.showConsentForm()
    } catch {
      return false
    }
  }
  // Mit der neuen Entscheidung weiterarbeiten
  const stand = await AdMob.requestConsentInfo().catch(() => null)
  if (stand) vorbereitung = Promise.resolve({ ...bereit, status: stand.status as EinwilligungsStatus, erlaubt: stand.canRequestAds })
  return true
}
