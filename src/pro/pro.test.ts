import { describe, expect, it } from 'vitest'
import { waehleProvider } from './billing'
import { PlayBillingProvider } from './billing/PlayBillingProvider'
import type { PlayUmgebung } from './billing/typen'
import { WebFallbackProvider } from './billing/WebFallbackProvider'
import { BILLING_ENABLED, PLAY_BILLING, PRODUKT_ID } from './config'
import {
  PRO_FUNKTIONEN,
  aktiveTrips,
  darfNeuenTripAnlegen,
  istAbgeschlossen,
  istFreigeschaltet,
  istPro,
  sperrenAktiv,
  type ProZustand,
} from './regeln'

const kunde = { billingAktiv: true, entwicklung: false }
const vorVerkaufsstart = { billingAktiv: false, entwicklung: false }
const entwicklung = { billingAktiv: false, entwicklung: true }
const zustand = (z: Partial<ProZustand> = {}): ProZustand => ({ gekauft: false, dev: 'normal', ...z })

describe('Pro-Status', () => {
  it('der Kauf ist im Projekt noch ausgeschaltet', () => {
    // Dieser Test erinnert daran, PLAYSTORE-CHECKLISTE.md zu befolgen, bevor der Schalter umgelegt wird
    expect(BILLING_ENABLED).toBe(false)
    expect(PRODUKT_ID).toBe('pro_upgrade')
  })

  it('solange der Kauf nicht möglich ist, ist nichts gesperrt', () => {
    expect(sperrenAktiv(zustand(), vorVerkaufsstart)).toBe(false)
    expect(istFreigeschaltet(zustand(), vorVerkaufsstart)).toBe(true)
    expect(istPro(zustand(), vorVerkaufsstart)).toBe(false)
  })

  it('mit aktivem Kauf sind Pro-Funktionen ohne Kauf gesperrt und mit Kauf frei', () => {
    expect(istFreigeschaltet(zustand(), kunde)).toBe(false)
    expect(istFreigeschaltet(zustand({ gekauft: true }), kunde)).toBe(true)
    expect(istPro(zustand({ gekauft: true }), kunde)).toBe(true)
  })

  it('der Entwickler-Schalter wirkt nur in der Entwicklung', () => {
    expect(istPro(zustand({ dev: 'pro' }), entwicklung)).toBe(true)
    expect(istFreigeschaltet(zustand({ dev: 'kostenlos' }), entwicklung)).toBe(false)

    // In der veröffentlichten App wird ein gespeicherter Schalter ignoriert
    expect(istPro(zustand({ dev: 'pro' }), kunde)).toBe(false)
    expect(istFreigeschaltet(zustand({ dev: 'pro' }), kunde)).toBe(false)
    expect(sperrenAktiv(zustand({ dev: 'kostenlos' }), vorVerkaufsstart)).toBe(false)
  })

  it('kennt alle sechs Pro-Funktionen und welche davon es schon gibt', () => {
    expect(PRO_FUNKTIONEN.map((f) => f.id)).toEqual([
      'unbegrenzteTrips',
      'duplizieren',
      'bordkasse',
      'eigeneRezepte',
      'pdfExport',
      'kochdienste',
    ])
    expect(PRO_FUNKTIONEN.filter((f) => !f.vorhanden).map((f) => f.id)).toEqual(['pdfExport', 'kochdienste'])
  })
})

describe('Limit aktiver Trips', () => {
  const heute = '2026-10-04'
  const vergangen = { startdatum: '2026-09-01', anzahlTage: 3 }
  const laufend = { startdatum: '2026-10-02', anzahlTage: 3 }
  const kommend = { startdatum: '2027-06-05', anzahlTage: 7 }

  it('ein Trip ist abgeschlossen, wenn sein letzter Tag vor heute liegt', () => {
    expect(istAbgeschlossen(vergangen, heute)).toBe(true)
    // letzter Tag ist heute: noch aktiv
    expect(istAbgeschlossen(laufend, heute)).toBe(false)
    expect(istAbgeschlossen(kommend, heute)).toBe(false)
    expect(istAbgeschlossen({ startdatum: '2026-10-01', anzahlTage: 3 }, heute)).toBe(true)
  })

  it('abgeschlossene Trips zählen nicht als aktiv', () => {
    expect(aktiveTrips([vergangen, laufend, kommend], heute)).toEqual([laufend, kommend])
  })

  it('kostenlos: ein aktiver Trip ist erlaubt, ein zweiter nicht', () => {
    expect(darfNeuenTripAnlegen([], heute, false, 1)).toBe(true)
    expect(darfNeuenTripAnlegen([vergangen, vergangen], heute, false, 1)).toBe(true)
    expect(darfNeuenTripAnlegen([vergangen, kommend], heute, false, 1)).toBe(false)
  })

  it('Pro: beliebig viele aktive Trips', () => {
    expect(darfNeuenTripAnlegen([laufend, kommend, kommend], heute, true, 1)).toBe(true)
  })
})

describe('Kauf-Anbindung', () => {
  /** Attrappe von Google Play in der Android-App */
  function playUmgebung(optionen: { kaeufe?: string[]; token?: string | null; abbruch?: boolean; serverOk?: boolean } = {}) {
    const aufrufe = { methode: '', sku: '', abschluss: '', server: [] as string[] }
    class FalschePaymentRequest {
      constructor(methoden: { supportedMethods: string; data: { sku: string } }[]) {
        aufrufe.methode = methoden[0].supportedMethods
        aufrufe.sku = methoden[0].data.sku
      }
      async show() {
        if (optionen.abbruch) throw new DOMException('abgebrochen', 'AbortError')
        return {
          details: optionen.token === null ? {} : { purchaseToken: optionen.token ?? 'token-123' },
          complete: async (status: string) => {
            aufrufe.abschluss = status
          },
        }
      }
    }
    const umgebung: PlayUmgebung = {
      getDigitalGoodsService: async () => ({
        getDetails: async (ids) => ids.map((itemId) => ({ itemId, title: 'Pro', price: { currency: 'EUR', value: '4.99' } })),
        listPurchases: async () => (optionen.kaeufe ?? []).map((itemId) => ({ itemId, purchaseToken: 't' })),
      }),
      PaymentRequest: FalschePaymentRequest as unknown as typeof PaymentRequest,
      fetch: (async (_url: string, init: { body: string }) => {
        aufrufe.server.push(init.body)
        return { ok: optionen.serverOk ?? true }
      }) as unknown as typeof fetch,
    }
    return { umgebung, aufrufe }
  }

  it('im normalen Browser oder bei ausgeschaltetem Kauf gibt es nur die Web-Anbindung', async () => {
    expect(await waehleProvider({}, true)).toBeInstanceOf(WebFallbackProvider)
    expect(await waehleProvider(playUmgebung().umgebung, false)).toBeInstanceOf(WebFallbackProvider)
    expect(await waehleProvider(playUmgebung().umgebung, true)).toBeInstanceOf(PlayBillingProvider)
  })

  it('fällt auf die Web-Anbindung zurück, wenn Google Play Billing nicht antwortet', async () => {
    const kaputt: PlayUmgebung = {
      getDigitalGoodsService: async () => {
        throw new Error('unsupported context')
      },
      PaymentRequest: class {} as unknown as typeof PaymentRequest,
    }
    expect(await waehleProvider(kaputt, true)).toBeInstanceOf(WebFallbackProvider)
  })

  it('die Web-Anbindung kann weder kaufen noch wiederherstellen', async () => {
    const web = new WebFallbackProvider()
    expect([await web.preis(), await web.kaufen(), await web.wiederherstellen()]).toEqual([null, 'fehler', false])
  })

  it('zeigt den Preis aus Google Play', async () => {
    // Geschütztes Leerzeichen zwischen Zahl und Währung vereinheitlichen
    const preis = await new PlayBillingProvider(playUmgebung().umgebung).preis()
    expect(preis?.replace(/\s/g, ' ')).toBe('4,99 €')
  })

  it('erkennt beim Wiederherstellen nur das Pro-Produkt', async () => {
    expect(await new PlayBillingProvider(playUmgebung({ kaeufe: [PRODUKT_ID] }).umgebung).wiederherstellen()).toBe(true)
    expect(await new PlayBillingProvider(playUmgebung({ kaeufe: ['anderes'] }).umgebung).wiederherstellen()).toBe(false)
    expect(await new PlayBillingProvider(playUmgebung().umgebung).wiederherstellen()).toBe(false)
  })

  it('kauft über die Payment Request API mit der Produkt-ID', async () => {
    const { umgebung, aufrufe } = playUmgebung()
    expect(await new PlayBillingProvider(umgebung, '').kaufen()).toBe('gekauft')
    expect(aufrufe).toMatchObject({ methode: PLAY_BILLING, sku: 'pro_upgrade', abschluss: 'success', server: [] })
  })

  it('meldet den Kauf an den Bestätigungs-Dienst, wenn einer eingerichtet ist', async () => {
    const { umgebung, aufrufe } = playUmgebung()
    expect(await new PlayBillingProvider(umgebung, 'https://beispiel.invalid/bestaetigen').kaufen()).toBe('gekauft')
    expect(JSON.parse(aufrufe.server[0])).toEqual({ produktId: 'pro_upgrade', purchaseToken: 'token-123' })
  })

  it('schaltet nicht frei, wenn die Bestätigung fehlschlägt oder kein Kaufbeleg kommt', async () => {
    const abgelehnt = playUmgebung({ serverOk: false })
    expect(await new PlayBillingProvider(abgelehnt.umgebung, 'https://beispiel.invalid/bestaetigen').kaufen()).toBe('fehler')
    expect(abgelehnt.aufrufe.abschluss).toBe('fail')

    expect(await new PlayBillingProvider(playUmgebung({ token: null }).umgebung, '').kaufen()).toBe('fehler')
  })

  it('unterscheidet einen abgebrochenen Kauf von einem Fehler', async () => {
    expect(await new PlayBillingProvider(playUmgebung({ abbruch: true }).umgebung, '').kaufen()).toBe('abgebrochen')
  })
})
