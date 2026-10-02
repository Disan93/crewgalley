import { describe, expect, it } from 'vitest'
import {
  KASSE,
  abrechnung,
  anteile,
  entferneAusgabe,
  entferneEinzahlung,
  fuegeEinzahlungHinzu,
  pruefeAusgabe,
  setzeUeberweisungErledigt,
  speichereAusgabe,
  standardModus,
  ueberweisungsVorschlag,
  verteile,
} from './kosten'
import { erstelleTrip, fuegeTeilnehmerHinzu, setzeAnwesenheit } from './trip'
import type { Aufteilung, Ausgabe, Trip } from './typen'

/** Hütten-Trip über 3 Tage (6 aktive Mahlzeiten) mit den Personen A, B und Kind K (Faktor 0,5) */
function gruppe(): Trip {
  let trip = erstelleTrip(
    { name: 'Hütte', vorlageId: 'huette', startdatum: '2026-10-02', anzahlTage: 3 },
    { grundausstattung: [], ersterTerminName: 'Tag 1' },
  )
  trip = fuegeTeilnehmerHinzu(trip, { id: 'A', portionsfaktor: 1 })
  trip = fuegeTeilnehmerHinzu(trip, { id: 'B', portionsfaktor: 1 })
  return fuegeTeilnehmerHinzu(trip, { id: 'K', portionsfaktor: 0.5 })
}

let zaehler = 0
function ausgabe(betrag: number, bezahltVon: string, aufteilung: Aufteilung, extra: Partial<Ausgabe> = {}): Ausgabe {
  zaehler += 1
  return {
    id: `a${zaehler}`,
    betrag,
    waehrung: 'EUR',
    beschreibung: 'Test',
    kategorie: 'lebensmittel',
    bezahltVon,
    aufteilung,
    datum: '2026-10-02',
    ...extra,
  }
}

const alle = ['A', 'B', 'K']
const salden = (trip: Trip) => Object.fromEntries(abrechnung(trip).personen.map((p) => [p.personId, p.saldo]))

describe('verteile (9.2, Methode des größten Rests)', () => {
  it('Testfall 9: 100,00 € nach Gewichten 3, 3, 1,5 → 40,00 / 40,00 / 20,00 €', () => {
    expect(verteile(10000, [3, 3, 1.5])).toEqual([4000, 4000, 2000])
  })

  it('Testfall 10: 100,00 € gleich auf 3 Personen → 33,34 / 33,33 / 33,33', () => {
    expect(verteile(10000, [1, 1, 1])).toEqual([3334, 3333, 3333])
  })

  it('die Summe stimmt immer exakt', () => {
    for (const [betrag, gewichte] of [
      [1, [1, 1, 1]],
      [9999, [6, 6, 3, 4.5, 1]],
      [12345, [0.5, 0.5, 0.5, 1, 1, 1, 1]],
      [100, [1, 2, 3, 4, 5, 6, 7]],
    ] as const) {
      expect(verteile(betrag, [...gewichte]).reduce((s, a) => s + a, 0)).toBe(betrag)
    }
  })

  it('übrige Cent gehen an die größten Reste', () => {
    // exakt 0,5 / 0,25 / 0,25 Cent-Reste: 100 × 3/8 = 37,5; 100 × 2,5/8 = 31,25
    expect(verteile(100, [3, 2.5, 2.5])).toEqual([38, 31, 31])
  })

  it('teilt gleich, wenn niemand ein Gewicht hat', () => {
    expect(verteile(900, [0, 0, 0])).toEqual([300, 300, 300])
  })
})

describe('anteile (9.1)', () => {
  it('„essen“ teilt nach Portionsfaktor × Mahlzeiten: Kind zahlt die Hälfte (Testfall 9)', () => {
    const anteil = anteile(gruppe(), ausgabe(10000, 'A', { modus: 'essen', personIds: alle }))
    expect(anteil).toEqual([
      { personId: 'A', betrag: 4000 },
      { personId: 'B', betrag: 4000 },
      { personId: 'K', betrag: 2000 },
    ])
  })

  it('„essen“ berücksichtigt, wer wann anwesend ist', () => {
    // B ist nur bei 3 von 6 Mahlzeiten dabei: Gewichte 6, 3, 3
    const trip = setzeAnwesenheit(gruppe(), 'B', ['t1-abend', 't2-fruehstueck', 't2-mittag'], false)
    expect(anteile(trip, ausgabe(12000, 'A', { modus: 'essen', personIds: alle })).map((a) => a.betrag)).toEqual([
      6000, 3000, 3000,
    ])
  })

  it('„gleich“ teilt unabhängig vom Portionsfaktor (Testfall 10)', () => {
    expect(anteile(gruppe(), ausgabe(10000, 'A', { modus: 'gleich', personIds: alle })).map((a) => a.betrag)).toEqual([
      3334, 3333, 3333,
    ])
  })

  it('der Personenkreis lässt sich einschränken (z. B. Wein nur für die Trinkenden)', () => {
    expect(anteile(gruppe(), ausgabe(1800, 'A', { modus: 'gleich', personIds: ['A', 'B'] }))).toEqual([
      { personId: 'A', betrag: 900 },
      { personId: 'B', betrag: 900 },
    ])
  })

  it('„individuell“ übernimmt feste Beträge', () => {
    const aufteilung: Aufteilung = { modus: 'individuell', personIds: ['A', 'K'], betraege: { A: 700, K: 300 } }
    expect(anteile(gruppe(), ausgabe(1000, 'A', aufteilung)).map((a) => a.betrag)).toEqual([700, 300])
  })

  it('Standard: Lebensmittel und Getränke nach Essen, alles andere gleich', () => {
    expect(standardModus('lebensmittel')).toBe('essen')
    expect(standardModus('getraenke')).toBe('essen')
    expect(standardModus('hafen')).toBe('gleich')
    expect(standardModus('sonstiges')).toBe('gleich')
  })
})

describe('pruefeAusgabe', () => {
  const trip = gruppe()

  it('akzeptiert eine gültige Ausgabe', () => {
    expect(pruefeAusgabe(ausgabe(1000, 'A', { modus: 'essen', personIds: alle }), trip)).toEqual([])
    expect(pruefeAusgabe(ausgabe(1000, KASSE, { modus: 'gleich', personIds: ['A'] }), trip)).toEqual([])
  })

  it('verlangt Betrag über 0, bekannten Zahler und mindestens eine Person', () => {
    expect(pruefeAusgabe(ausgabe(0, 'X', { modus: 'gleich', personIds: [] }), trip)).toEqual([
      'betragUngueltig',
      'zahlerFehlt',
      'niemand',
    ])
  })

  it('bei „individuell“ muss die Summe dem Betrag entsprechen', () => {
    const falsch: Aufteilung = { modus: 'individuell', personIds: ['A', 'B'], betraege: { A: 700, B: 200 } }
    expect(pruefeAusgabe(ausgabe(1000, 'A', falsch), trip)).toEqual(['summeFalsch'])
    const richtig: Aufteilung = { modus: 'individuell', personIds: ['A', 'B'], betraege: { A: 700, B: 300 } }
    expect(pruefeAusgabe(ausgabe(1000, 'A', richtig), trip)).toEqual([])
  })
})

describe('Salden (9.4)', () => {
  it('saldo = bezahlt + eingezahlt − Anteil; die Summe aller Salden samt Kasse ist 0', () => {
    let trip = gruppe()
    trip = speichereAusgabe(trip, ausgabe(10000, 'A', { modus: 'essen', personIds: alle }))
    trip = speichereAusgabe(trip, ausgabe(3000, 'B', { modus: 'gleich', personIds: alle }))
    expect(salden(trip)).toEqual({ A: 10000 - 4000 - 1000, B: 3000 - 4000 - 1000, K: -2000 - 1000 })

    const ergebnis = abrechnung(trip)
    expect(ergebnis.gesamt).toBe(13000)
    expect(ergebnis.personen.reduce((s, p) => s + p.saldo, 0) - ergebnis.kassenstand).toBe(0)
  })

  it('ändert und entfernt Ausgaben', () => {
    const erste = ausgabe(10000, 'A', { modus: 'gleich', personIds: ['A', 'B'] })
    let trip = speichereAusgabe(gruppe(), erste)
    trip = speichereAusgabe(trip, { ...erste, betrag: 6000 })
    expect(trip.ausgaben).toHaveLength(1)
    expect(salden(trip)).toEqual({ A: 3000, B: -3000, K: 0 })
    expect(entferneAusgabe(trip, erste.id).ausgaben).toEqual([])
  })
})

describe('Bordkasse (9.3)', () => {
  /** Konzept Testfall 11 */
  function mitKasse(): Trip {
    let trip = gruppe()
    trip = fuegeEinzahlungHinzu(trip, { id: 'e1', personId: 'A', betrag: 10000, datum: '2026-10-02' })
    trip = fuegeEinzahlungHinzu(trip, { id: 'e2', personId: 'B', betrag: 10000, datum: '2026-10-02' })
    return speichereAusgabe(trip, ausgabe(15000, KASSE, { modus: 'gleich', personIds: ['A', 'B'] }))
  }

  it('Testfall 11: Kassenstand 50 €; Salden A +25, B +25; Überweisungen Kasse → A 25 €, Kasse → B 25 €', () => {
    const ergebnis = abrechnung(mitKasse())
    expect(ergebnis.kassenstand).toBe(5000)
    expect(salden(mitKasse())).toEqual({ A: 2500, B: 2500, K: 0 })
    expect(ergebnis.ueberweisungen).toEqual([
      { von: KASSE, an: 'A', betrag: 2500 },
      { von: KASSE, an: 'B', betrag: 2500 },
    ])
  })

  it('der Kassenstand wird negativ, wenn mehr ausgegeben als eingezahlt wurde', () => {
    const trip = speichereAusgabe(gruppe(), ausgabe(3000, KASSE, { modus: 'gleich', personIds: alle }))
    const ergebnis = abrechnung(trip)
    expect(ergebnis.kassenstand).toBe(-3000)
    // Alle schulden der Kasse ihren Anteil
    expect(ergebnis.ueberweisungen.every((u) => u.an === KASSE)).toBe(true)
  })

  it('entfernt Einzahlungen', () => {
    expect(entferneEinzahlung(mitKasse(), 'e1').einzahlungen.map((e) => e.id)).toEqual(['e2'])
  })

  it('eine erledigte Auszahlung senkt den Kassenstand und verschwindet aus den Vorschlägen', () => {
    const trip = setzeUeberweisungErledigt(mitKasse(), { von: KASSE, an: 'A', betrag: 2500 }, true)
    const ergebnis = abrechnung(trip)
    expect(ergebnis.kassenstand).toBe(2500)
    expect(ergebnis.personen.find((p) => p.personId === 'A')).toMatchObject({ saldo: 2500, offen: 0 })
    expect(ergebnis.ueberweisungen).toEqual([{ von: KASSE, an: 'B', betrag: 2500 }])
  })
})

describe('Überweisungsvorschlag (9.5)', () => {
  it('Testfall 12: A +60, B −40, C −20 → B → A 40 €, C → A 20 €', () => {
    expect(
      ueberweisungsVorschlag([
        { wer: 'A', saldo: 6000 },
        { wer: 'B', saldo: -4000 },
        { wer: 'C', saldo: -2000 },
      ]),
    ).toEqual([
      { von: 'B', an: 'A', betrag: 4000 },
      { von: 'C', an: 'A', betrag: 2000 },
    ])
  })

  it('gleicht alle Salden mit höchstens n − 1 Überweisungen aus', () => {
    const start = [
      { wer: 'A', saldo: 5000 },
      { wer: 'B', saldo: 2500 },
      { wer: 'C', saldo: -1000 },
      { wer: 'D', saldo: -3000 },
      { wer: 'E', saldo: -3500 },
    ]
    const vorschlag = ueberweisungsVorschlag(start)
    expect(vorschlag.length).toBeLessThanOrEqual(4)
    const danach = Object.fromEntries(start.map((s) => [s.wer, s.saldo]))
    for (const u of vorschlag) {
      danach[u.von] += u.betrag
      danach[u.an] -= u.betrag
    }
    expect(Object.values(danach).every((s) => s === 0)).toBe(true)
  })

  it('schlägt nichts vor, wenn alles ausgeglichen ist', () => {
    expect(ueberweisungsVorschlag([{ wer: 'A', saldo: 0 }])).toEqual([])
    expect(abrechnung(gruppe()).ueberweisungen).toEqual([])
  })

  it('abgehakte Überweisungen zählen als Zahlung; der Haken lässt sich zurücknehmen', () => {
    let trip = speichereAusgabe(gruppe(), ausgabe(9000, 'A', { modus: 'gleich', personIds: alle }))
    expect(abrechnung(trip).ueberweisungen).toEqual([
      { von: 'B', an: 'A', betrag: 3000 },
      { von: 'K', an: 'A', betrag: 3000 },
    ])

    const bZahlt = { von: 'B', an: 'A', betrag: 3000 }
    trip = setzeUeberweisungErledigt(trip, bZahlt, true)
    expect(abrechnung(trip).ueberweisungen).toEqual([{ von: 'K', an: 'A', betrag: 3000 }])

    trip = setzeUeberweisungErledigt(trip, bZahlt, false)
    expect(trip.ueberweisungenErledigt).toEqual([])
    expect(abrechnung(trip).ueberweisungen).toHaveLength(2)
  })

  it('nach einer Änderung wird mit den erledigten Zahlungen neu gerechnet', () => {
    let trip = speichereAusgabe(gruppe(), ausgabe(9000, 'A', { modus: 'gleich', personIds: alle }))
    trip = setzeUeberweisungErledigt(trip, { von: 'B', an: 'A', betrag: 3000 }, true)
    // Neue Ausgabe von B: B hat jetzt zu viel gezahlt
    trip = speichereAusgabe(trip, ausgabe(3000, 'B', { modus: 'gleich', personIds: alle }))
    expect(abrechnung(trip).ueberweisungen).toEqual([
      { von: 'K', an: 'A', betrag: 2000 },
      { von: 'K', an: 'B', betrag: 2000 },
    ])
  })
})
