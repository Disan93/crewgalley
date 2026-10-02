import { describe, expect, it } from 'vitest'
import {
  bestaetigeNachkauf,
  einkaufsliste,
  entferneZusatz,
  essensGewichte,
  fuegeZusatzHinzu,
  grundausstattungBedarfe,
  kostenschaetzung,
  personentage,
  rezeptBedarfe,
  rundeEinkauf,
  setzeAbgehakt,
  setzeVorhanden,
  setzeZusatzAbgehakt,
} from './einkauf'
import { fuegeRezeptHinzu, setzeZweitgericht } from './plan'
import { erstelleTrip, fuegeTeilnehmerHinzu, setzeAnwesenheit, setzeMahlzeitAktiv } from './trip'
import type { Rezept, Trip, Zutat } from './typen'

const STAND = '2026-10-02T00:00:00.000Z'
const SLOT = 't2-abend'

function zutat(id: string, extra: Partial<Zutat> = {}): Zutat {
  return {
    id,
    createdAt: STAND,
    updatedAt: STAND,
    name: id,
    einheit: 'g',
    abteilung: 'trockenwaren',
    packungsgroesse: null,
    richtpreis: null,
    kuehlpflichtig: false,
    haltbarkeitUngekuehlt: null,
    haltbarkeitGekuehlt: null,
    quelle: 'eigen',
    ...extra,
  }
}

function rezept(id: string, zutaten: Record<string, number>): Rezept {
  return {
    id,
    createdAt: STAND,
    updatedAt: STAND,
    name: id,
    kategorie: 'hauptgericht',
    ernaehrungsstufe: 'vegan',
    merkmale: [],
    zutaten: Object.entries(zutaten).map(([zutatId, mengeProPortion]) => ({ zutatId, mengeProPortion })),
    zubereitung: '',
    flammen: 1,
    brauchtOfen: false,
    brauchtGrill: false,
    zubereitungszeitMin: 20,
    quelle: 'eigen',
  }
}

const nudeln = zutat('nudeln', { packungsgroesse: 500, richtpreis: 129 })
const tomaten = zutat('tomaten', { richtpreis: 349 })
const paprika = zutat('paprika', { einheit: 'stk', richtpreis: 99 })
const salz = zutat('salz', { packungsgroesse: 500, richtpreis: 59 })
const kaffee = zutat('kaffee', { packungsgroesse: 500 })
const zutaten = [nudeln, tomaten, paprika, salz, kaffee]

const pasta = rezept('pasta', { nudeln: 125, tomaten: 100, paprika: 0.3 })
const rezepte = [pasta]

/** 6 Erwachsene + 2 Kinder (Konzept Testfall 1), ohne Grundausstattung */
function gruppe(): Trip {
  let trip = erstelleTrip(
    { name: 'Test', vorlageId: 'huette', startdatum: '2026-10-02', anzahlTage: 3 },
    { grundausstattung: [], ersterTerminName: 'Tag 1' },
  )
  for (const n of [1, 2, 3, 4, 5, 6]) trip = fuegeTeilnehmerHinzu(trip, { id: `e${n}`, portionsfaktor: 1 })
  for (const n of [1, 2]) trip = fuegeTeilnehmerHinzu(trip, { id: `k${n}`, portionsfaktor: 0.5 })
  return trip
}

function mitPasta(trip: Trip = gruppe(), slot = SLOT): Trip {
  const variante = trip.slots.find((s) => s.id === slot)!.varianten[0]
  return fuegeRezeptHinzu(trip, slot, variante.id, 'pasta')
}

function eintrag(trip: Trip, zutatId: string) {
  return einkaufsliste(trip, rezepte, zutaten).find((e) => e.zutat.id === zutatId)!
}

describe('Bedarf aus Rezepten (7.2)', () => {
  it('Testfall 1: 7 Portionen × 125 g = 875 g; mit Puffer 10 % = 962,5 g → 2 Packungen à 500 g', () => {
    const trip = mitPasta()
    expect(rezeptBedarfe(trip, rezepte).find((b) => b.zutatId === 'nudeln')).toEqual({
      zutatId: 'nudeln',
      tag: 2,
      menge: 875,
      pauschal: false,
    })
    expect(eintrag(trip, 'nudeln')).toMatchObject({ bedarf: 962.5, menge: 962.5, packungen: 2, kaufMenge: 1000, rest: 37.5 })
  })

  it('zählt nur aktive Mahlzeiten', () => {
    const trip = mitPasta(gruppe(), 't1-fruehstueck')
    expect(rezeptBedarfe(trip, rezepte)).toEqual([])
    expect(rezeptBedarfe(setzeMahlzeitAktiv(trip, 1, 'fruehstueck', true), rezepte)).toHaveLength(3)
  })

  it('rechnet den Aktivfaktor ein', () => {
    const trip = { ...mitPasta(), aktivfaktor: 1.2 }
    expect(rezeptBedarfe(trip, rezepte).find((b) => b.zutatId === 'nudeln')?.menge).toBeCloseTo(1050)
  })

  it('summiert dieselbe Zutat über mehrere Mahlzeiten und Varianten', () => {
    let trip = mitPasta(mitPasta(), 't2-mittag')
    trip = setzeZweitgericht(trip, SLOT, null, ['e1'])
    trip = fuegeRezeptHinzu(trip, SLOT, trip.slots.find((s) => s.id === SLOT)!.varianten[1].id, 'pasta')
    // Mittag 7 Portionen + Abend 6 Standard + 1 Zweitgericht = 14 Portionen
    expect(eintrag({ ...trip, puffer: 0 }, 'nudeln').bedarf).toBe(1750)
  })

  it('ignoriert Varianten, bei denen niemand mitisst', () => {
    let trip = mitPasta()
    for (const tn of trip.teilnehmer) trip = setzeAnwesenheit(trip, tn.personId, [SLOT], false)
    expect(einkaufsliste(trip, rezepte, zutaten)).toEqual([])
  })
})

describe('Bedarf aus Grundausstattung (7.3)', () => {
  const kaffeePosten = { id: 'g1', zutatId: 'kaffee', modus: 'proPersonTag' as const, menge: 15 }
  const salzPosten = { id: 'g2', zutatId: 'salz', modus: 'pauschal' as const, menge: 500 }

  it('Personentage: jeder Tag mit mindestens einer Mahlzeit zählt, gewichtet mit dem Portionsfaktor', () => {
    let trip = gruppe()
    expect(personentage(trip)).toEqual([7, 7, 7])
    // e1 kommt erst an Tag 2 mittags: Tag 1 zählt nicht, Tag 2 zählt
    trip = setzeAnwesenheit(trip, 'e1', ['t1-abend', 't2-fruehstueck'], false)
    expect(personentage(trip)).toEqual([6, 7, 7])
  })

  it('proPersonTag: Menge × Personentage, je Tag; pauschal: einmalig an Tag 1', () => {
    const trip = { ...gruppe(), grundausstattung: [kaffeePosten, salzPosten] }
    expect(grundausstattungBedarfe(trip)).toEqual([
      { zutatId: 'kaffee', tag: 1, menge: 105, pauschal: false },
      { zutatId: 'kaffee', tag: 2, menge: 105, pauschal: false },
      { zutatId: 'kaffee', tag: 3, menge: 105, pauschal: false },
      { zutatId: 'salz', tag: 1, menge: 500, pauschal: true },
    ])
  })

  it('der Puffer gilt nicht für pauschale Posten', () => {
    const trip = { ...gruppe(), grundausstattung: [kaffeePosten, salzPosten] }
    expect(eintrag(trip, 'kaffee').bedarf).toBe(346.5)
    expect(eintrag(trip, 'salz')).toMatchObject({ bedarf: 500, packungen: 1, rest: 0 })
  })
})

describe('Runden (7.4)', () => {
  it('Testfall 4: ohne Packung auf runde Mengen, Stück auf ganze Zahl', () => {
    expect(rundeEinkauf(73, tomaten)).toEqual({ kaufMenge: 80, packungen: null })
    expect(rundeEinkauf(430, tomaten)).toEqual({ kaufMenge: 450, packungen: null })
    expect(rundeEinkauf(1230, tomaten)).toEqual({ kaufMenge: 1300, packungen: null })
    expect(rundeEinkauf(2.3, paprika)).toEqual({ kaufMenge: 3, packungen: null })
  })

  it('mit Packungsgröße auf ganze Packungen', () => {
    expect(rundeEinkauf(875, nudeln)).toEqual({ kaufMenge: 1000, packungen: 2 })
    expect(rundeEinkauf(500, nudeln)).toEqual({ kaufMenge: 500, packungen: 1 })
    expect(rundeEinkauf(0, nudeln)).toEqual({ kaufMenge: 0, packungen: 0 })
  })

  it('rundet nicht wegen winziger Rechenfehler eine Stufe zu hoch', () => {
    // 500 × 1,1 ergibt im Computer 550,0000000000001
    expect(rundeEinkauf(500 * 1.1, tomaten).kaufMenge).toBe(550)
    expect(rundeEinkauf(500 * 1.1, zutat('x', { packungsgroesse: 550 })).packungen).toBe(1)
  })

  it('die Liste ist nach Namen sortiert und enthält alle Zutaten des Rezepts', () => {
    const liste = einkaufsliste(mitPasta(), rezepte, zutaten)
    expect(liste.map((e) => [e.zutat.id, e.kaufMenge])).toEqual([
      ['nudeln', 1000],
      ['paprika', 3],
      ['tomaten', 800],
    ])
  })
})

describe('Vorhanden (7.4 Schritt 3)', () => {
  it('zieht die vorhandene Menge ab, aber nicht unter 0', () => {
    const trip = mitPasta()
    const termin = trip.einkaufstermine[0].id

    const teilweise = setzeVorhanden(trip, termin, 'nudeln', 500, 'e1')
    expect(eintrag(teilweise, 'nudeln')).toMatchObject({ vorhanden: 500, mitbringerId: 'e1', menge: 462.5, packungen: 1 })

    const komplett = setzeVorhanden(trip, termin, 'nudeln', 2000, null)
    expect(eintrag(komplett, 'nudeln')).toMatchObject({ menge: 0, kaufMenge: 0, packungen: 0, kosten: 0 })
  })

  it('wird wieder entfernt, wenn die Menge auf 0 gesetzt wird', () => {
    const trip = mitPasta()
    const termin = trip.einkaufstermine[0].id
    const zurueck = setzeVorhanden(setzeVorhanden(trip, termin, 'nudeln', 500, 'e1'), termin, 'nudeln', 0, 'e1')
    expect(zurueck.einkaufsstatus.eintraege).toEqual([])
  })
})

describe('Abhaken und Nachkaufen (7.7)', () => {
  it('speichert beim Abhaken die gekaufte Menge', () => {
    const trip = mitPasta()
    const abgehakt = setzeAbgehakt(trip, eintrag(trip, 'nudeln'), true)
    expect(eintrag(abgehakt, 'nudeln')).toMatchObject({ abgehakt: true, gekaufteMenge: 1000, nachkaufen: 0 })

    const zurueck = setzeAbgehakt(abgehakt, eintrag(abgehakt, 'nudeln'), false)
    expect(zurueck.einkaufsstatus.eintraege).toEqual([])
  })

  it('Testfall 13: 1.000 g gekauft, neuer Bedarf 1.250 g → „+250 g nachkaufen“', () => {
    let trip = { ...mitPasta(), puffer: 0 }
    trip = setzeAbgehakt(trip, eintrag(trip, 'nudeln'), true)
    expect(eintrag(trip, 'nudeln').gekaufteMenge).toBe(1000)

    // Plan wird erweitert: 3 zusätzliche Portionen → 10 × 125 g = 1.250 g
    for (const id of ['x1', 'x2', 'x3']) trip = fuegeTeilnehmerHinzu(trip, { id, portionsfaktor: 1 })
    expect(eintrag(trip, 'nudeln')).toMatchObject({ abgehakt: true, menge: 1250, nachkaufen: 250, nachkaufenKauf: 500 })
  })

  it('bleibt abgehakt und ohne Hinweis, wenn der Bedarf kleiner wird', () => {
    let trip = mitPasta()
    trip = setzeAbgehakt(trip, eintrag(trip, 'nudeln'), true)
    trip = setzeAnwesenheit(trip, 'e1', [SLOT], false)
    expect(eintrag(trip, 'nudeln')).toMatchObject({ abgehakt: true, nachkaufen: 0 })
  })

  it('nach bestätigtem Nachkauf verschwindet der Hinweis', () => {
    let trip = { ...mitPasta(), puffer: 0 }
    trip = setzeAbgehakt(trip, eintrag(trip, 'nudeln'), true)
    for (const id of ['x1', 'x2', 'x3']) trip = fuegeTeilnehmerHinzu(trip, { id, portionsfaktor: 1 })
    trip = bestaetigeNachkauf(trip, eintrag(trip, 'nudeln'))
    expect(eintrag(trip, 'nudeln')).toMatchObject({ abgehakt: true, gekaufteMenge: 1500, nachkaufen: 0 })
  })
})

describe('Manuelle Zusatzeinträge', () => {
  it('lassen sich hinzufügen, abhaken und entfernen', () => {
    let trip = gruppe()
    trip = fuegeZusatzHinzu(trip, trip.einkaufstermine[0].id, ' Eiswürfel ')
    const [zusatz] = trip.einkaufsstatus.zusatzeintraege
    expect(zusatz).toMatchObject({ name: 'Eiswürfel', abgehakt: false })

    trip = setzeZusatzAbgehakt(trip, zusatz.id, true)
    expect(trip.einkaufsstatus.zusatzeintraege[0].abgehakt).toBe(true)
    expect(entferneZusatz(trip, zusatz.id).einkaufsstatus.zusatzeintraege).toEqual([])
  })
})

describe('Kostenschätzung (7.8)', () => {
  it('Packungen × Preis, lose Ware nach Menge, Stück nach Anzahl', () => {
    const trip = mitPasta()
    // Nudeln 2 × 1,29 €; Tomaten 800 g × 3,49 €/kg = 2,79 €; Paprika 3 × 0,99 €
    expect(eintrag(trip, 'nudeln').kosten).toBe(258)
    expect(eintrag(trip, 'tomaten').kosten).toBe(279)
    expect(eintrag(trip, 'paprika').kosten).toBe(297)
    expect(kostenschaetzung(trip, einkaufsliste(trip, rezepte, zutaten))).toMatchObject({ summe: 834, ohnePreis: 0 })
  })

  it('zählt Artikel ohne Richtpreis', () => {
    const trip = { ...mitPasta(), grundausstattung: [{ id: 'g', zutatId: 'kaffee', modus: 'pauschal' as const, menge: 500 }] }
    expect(kostenschaetzung(trip, einkaufsliste(trip, rezepte, zutaten)).ohnePreis).toBe(1)
  })

  it('teilt nach Essensgewicht: Kinder zahlen die Hälfte', () => {
    const trip = mitPasta()
    expect(essensGewichte(trip).get('e1')).toBe(6)
    expect(essensGewichte(trip).get('k1')).toBe(3)
    // Summe 8,34 €, Gewichte 6 × 6 + 2 × 3 = 42
    expect(kostenschaetzung(trip, einkaufsliste(trip, rezepte, zutaten)).proPerson).toEqual({ von: 60, bis: 119 })
  })

  it('ohne Teilnehmer gibt es keinen Anteil pro Person', () => {
    const leer = erstelleTrip(
      { name: 'Leer', vorlageId: 'huette', startdatum: '2026-10-02', anzahlTage: 2 },
      { grundausstattung: [], ersterTerminName: 'Tag 1' },
    )
    expect(kostenschaetzung(leer, [])).toEqual({ summe: 0, ohnePreis: 0, proPerson: null })
  })
})
