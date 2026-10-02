import { describe, expect, it } from 'vitest'
import { portionen, teilnehmerDerVariante } from './mengen'
import { entferneRezept, entferneZweitgericht, fuegeRezeptHinzu, setzeZweitgericht } from './plan'
import { kuechenGruende, passtFuer, passtNichtFuer, slotHinweise } from './pruefungen'
import { filtereRezepte } from './rezepte'
import { erstelleTrip, fuegeTeilnehmerHinzu, setzeAnwesenheit } from './trip'
import type { Person, Rezept, Slot, Trip } from './typen'

const STAND = '2026-10-02T00:00:00.000Z'
const SLOT = 't2-abend'

function person(id: string, extra: Partial<Person> = {}): Person {
  return {
    id,
    createdAt: STAND,
    updatedAt: STAND,
    name: id,
    portionsfaktor: 1,
    ernaehrung: 'alles',
    unvertraeglichkeiten: [],
    notiz: '',
    ...extra,
  }
}

function rezept(id: string, extra: Partial<Rezept> = {}): Rezept {
  return {
    id,
    createdAt: STAND,
    updatedAt: STAND,
    name: id,
    kategorie: 'hauptgericht',
    ernaehrungsstufe: 'alles',
    merkmale: [],
    zutaten: [],
    zubereitung: '',
    flammen: 1,
    brauchtOfen: false,
    brauchtGrill: false,
    zubereitungszeitMin: 30,
    quelle: 'eigen',
    ...extra,
  }
}

/** Trip mit 6 Erwachsenen (e1–e6) und 2 Kindern (k1, k2) wie in Konzept Testfall 1 */
function gruppe(vorlageId = 'huette'): { trip: Trip; personen: Person[] } {
  const personen = [
    ...[1, 2, 3, 4, 5, 6].map((n) => person(`e${n}`)),
    person('k1', { portionsfaktor: 0.5 }),
    person('k2', { portionsfaktor: 0.5 }),
  ]
  let trip = erstelleTrip(
    { name: 'Test', vorlageId, startdatum: '2026-10-02', anzahlTage: 3 },
    { grundausstattung: [], ersterTerminName: 'Tag 1' },
  )
  for (const p of personen) trip = fuegeTeilnehmerHinzu(trip, p)
  return { trip, personen }
}

const slotVon = (trip: Trip, id = SLOT): Slot => trip.slots.find((s) => s.id === id)!
const standard = (trip: Trip, id = SLOT) => slotVon(trip, id).varianten[0]

describe('Portionen (Konzept 7.1)', () => {
  it('Testfall 1: 6 Erwachsene + 2 Kinder, alle anwesend → 7 Portionen', () => {
    const { trip } = gruppe()
    expect(portionen(trip, slotVon(trip), standard(trip))).toBe(7)
  })

  it('Testfall 2: zwei Personen bekommen ein Zweitgericht → Standard 6 Portionen, Zweitgericht 2', () => {
    let { trip } = gruppe()
    trip = setzeAnwesenheit(trip, 'k1', [SLOT], true)
    // 8 Anwesende mit Faktor 1: Kinder hier als volle Esser
    trip = { ...trip, teilnehmer: trip.teilnehmer.map((tn) => ({ ...tn, portionsfaktor: 1 })) }
    trip = setzeZweitgericht(trip, SLOT, null, ['e1', 'e2'])

    const slot = slotVon(trip)
    expect(portionen(trip, slot, slot.varianten[0])).toBe(6)
    expect(portionen(trip, slot, slot.varianten[1])).toBe(2)
  })

  it('Testfall 3: wer bei einer Mahlzeit fehlt, zählt dort nicht mit', () => {
    let { trip } = gruppe()
    trip = setzeAnwesenheit(trip, 'e1', ['t2-fruehstueck'], false)
    expect(portionen(trip, slotVon(trip, 't2-fruehstueck'), standard(trip, 't2-fruehstueck'))).toBe(6)
    expect(portionen(trip, slotVon(trip, 't2-mittag'), standard(trip, 't2-mittag'))).toBe(7)
  })

  it('abwesende Personen zählen auch beim Zweitgericht nicht', () => {
    let { trip } = gruppe()
    trip = setzeZweitgericht(trip, SLOT, null, ['e1', 'k1'])
    trip = setzeAnwesenheit(trip, 'e1', [SLOT], false)
    const slot = slotVon(trip)
    expect(teilnehmerDerVariante(trip, slot, slot.varianten[1]).map((tn) => tn.personId)).toEqual(['k1'])
    expect(portionen(trip, slot, slot.varianten[1])).toBe(0.5)
    expect(portionen(trip, slot, slot.varianten[0])).toBe(5.5)
  })
})

describe('Rezepte im Plan', () => {
  it('fügt Rezepte hinzu (nicht doppelt) und entfernt sie wieder', () => {
    let { trip } = gruppe()
    const id = standard(trip).id
    trip = fuegeRezeptHinzu(trip, SLOT, id, 'r-chili')
    trip = fuegeRezeptHinzu(trip, SLOT, id, 'r-salat')
    trip = fuegeRezeptHinzu(trip, SLOT, id, 'r-chili')
    expect(standard(trip).rezeptIds).toEqual(['r-chili', 'r-salat'])
    expect(standard(trip, 't2-mittag').rezeptIds).toEqual([])

    trip = entferneRezept(trip, SLOT, id, 'r-chili')
    expect(standard(trip).rezeptIds).toEqual(['r-salat'])
  })
})

describe('Zweitgerichte', () => {
  it('eine Person hat pro Mahlzeit höchstens ein Zweitgericht', () => {
    let { trip } = gruppe()
    trip = setzeZweitgericht(trip, SLOT, null, ['e1', 'e2'])
    trip = setzeZweitgericht(trip, SLOT, null, ['e2', 'e3'])
    expect(slotVon(trip).varianten.map((v) => v.fuer)).toEqual(['standard', ['e1'], ['e2', 'e3']])
  })

  it('ändert die Personen eines Zweitgerichts und behält dessen Rezepte', () => {
    let { trip } = gruppe()
    trip = setzeZweitgericht(trip, SLOT, null, ['e1'])
    const zweitId = slotVon(trip).varianten[1].id
    trip = fuegeRezeptHinzu(trip, SLOT, zweitId, 'r-dal')
    trip = setzeZweitgericht(trip, SLOT, zweitId, ['e1', 'e2'])
    expect(slotVon(trip).varianten[1]).toMatchObject({ id: zweitId, rezeptIds: ['r-dal'], fuer: ['e1', 'e2'] })
  })

  it('entfällt, wenn niemand mehr zugeordnet ist, und lässt sich entfernen', () => {
    let { trip } = gruppe()
    trip = setzeZweitgericht(trip, SLOT, null, ['e1'])
    trip = setzeZweitgericht(trip, SLOT, null, ['e1'])
    expect(slotVon(trip).varianten).toHaveLength(2)

    trip = entferneZweitgericht(trip, SLOT, slotVon(trip).varianten[1].id)
    expect(slotVon(trip).varianten.map((v) => v.fuer)).toEqual(['standard'])
  })

  it('die Standard-Variante kann nicht entfernt werden', () => {
    const { trip } = gruppe()
    const danach = entferneZweitgericht(trip, SLOT, standard(trip).id)
    expect(slotVon(danach).varianten).toHaveLength(1)
  })
})

describe('Ernährung (Konzept 8.1, Testfall 5)', () => {
  const vegetarierin = person('v', { ernaehrung: 'vegetarisch' })

  it('veganes Rezept passt für vegetarische Person', () => {
    expect(passtFuer(rezept('r', { ernaehrungsstufe: 'vegan' }), vegetarierin)).toBe(true)
  })

  it('pescetarisches Rezept passt nicht für vegetarische Person', () => {
    expect(passtFuer(rezept('r', { ernaehrungsstufe: 'pescetarisch' }), vegetarierin)).toBe(false)
  })

  it('Rezept ohne Merkmal „glutenfrei“ passt nicht für Person mit Glutenunverträglichkeit', () => {
    const zoeliakie = person('z', { unvertraeglichkeiten: ['glutenfrei'] })
    expect(passtFuer(rezept('r', { merkmale: ['nussfrei'] }), zoeliakie)).toBe(false)
    expect(passtFuer(rezept('r', { merkmale: ['nussfrei', 'glutenfrei'] }), zoeliakie)).toBe(true)
  })

  it('nennt die Personen, für die ein Rezept nicht passt', () => {
    const alle = [person('a'), vegetarierin, person('n', { unvertraeglichkeiten: ['nussfrei'] })]
    expect(passtNichtFuer(rezept('r'), alle).map((p) => p.id)).toEqual(['v', 'n'])
  })
})

describe('Küche (Konzept 8.2)', () => {
  const bordkueche = { flammen: 2, ofen: false, kuehlschrank: 'klein' as const, grill: false }

  it('warnt bei zu vielen Flammen, fehlendem Ofen und fehlendem Grill', () => {
    expect(kuechenGruende(rezept('r', { flammen: 2 }), bordkueche)).toEqual([])
    expect(kuechenGruende(rezept('r', { flammen: 3, brauchtOfen: true, brauchtGrill: true }), bordkueche)).toEqual([
      'flammen',
      'ofen',
      'grill',
    ])
    expect(kuechenGruende(rezept('r', { brauchtGrill: true }), { ...bordkueche, grill: true })).toEqual([])
  })
})

describe('slotHinweise', () => {
  const chili = rezept('r-chili', { flammen: 2 })
  const dal = rezept('r-dal', { ernaehrungsstufe: 'vegan', flammen: 2 })
  const lasagne = rezept('r-lasagne', { brauchtOfen: true, flammen: 2 })
  const rezepte = [chili, dal, lasagne]

  function mitVegetarierin(vorlageId: string) {
    const { trip, personen } = gruppe(vorlageId)
    return { trip, personen: personen.map((p) => (p.id === 'e1' ? { ...p, ernaehrung: 'vegetarisch' as const } : p)) }
  }

  it('meldet, für wen ein Rezept nicht passt', () => {
    let { trip, personen } = mitVegetarierin('huette')
    trip = fuegeRezeptHinzu(trip, SLOT, standard(trip).id, 'r-chili')
    expect(slotHinweise(trip, slotVon(trip), rezepte, personen)).toEqual({
      rezepte: [{ varianteId: standard(trip).id, rezeptId: 'r-chili', passtNichtFuer: ['e1'], kueche: [] }],
      nacheinander: false,
    })
  })

  it('ein Zweitgericht behebt den Hinweis', () => {
    let { trip, personen } = mitVegetarierin('huette')
    trip = fuegeRezeptHinzu(trip, SLOT, standard(trip).id, 'r-chili')
    trip = setzeZweitgericht(trip, SLOT, null, ['e1'])
    trip = fuegeRezeptHinzu(trip, SLOT, slotVon(trip).varianten[1].id, 'r-dal')
    expect(slotHinweise(trip, slotVon(trip), rezepte, personen).rezepte).toEqual([])
  })

  it('abwesende Personen lösen keinen Hinweis aus', () => {
    let { trip, personen } = mitVegetarierin('huette')
    trip = fuegeRezeptHinzu(trip, SLOT, standard(trip).id, 'r-chili')
    trip = setzeAnwesenheit(trip, 'e1', [SLOT], false)
    expect(slotHinweise(trip, slotVon(trip), rezepte, personen).rezepte).toEqual([])
  })

  it('meldet Küchenprobleme nur bei aktiver Küchenprüfung', () => {
    const huette = gruppe('huette')
    const aufHuette = fuegeRezeptHinzu(huette.trip, SLOT, standard(huette.trip).id, 'r-lasagne')
    expect(slotHinweise(aufHuette, slotVon(aufHuette), rezepte, huette.personen).rezepte).toEqual([])

    const boot = gruppe('segeln')
    const anBord = fuegeRezeptHinzu(boot.trip, SLOT, standard(boot.trip).id, 'r-lasagne')
    expect(slotHinweise(anBord, slotVon(anBord), rezepte, boot.personen).rezepte).toMatchObject([
      { rezeptId: 'r-lasagne', kueche: ['ofen'] },
    ])
  })

  it('meldet „nacheinander kochen“, wenn alle Rezepte zusammen mehr Flammen brauchen als vorhanden', () => {
    let { trip, personen } = gruppe('segeln')
    trip = fuegeRezeptHinzu(trip, SLOT, standard(trip).id, 'r-chili')
    expect(slotHinweise(trip, slotVon(trip), rezepte, personen).nacheinander).toBe(false)

    trip = setzeZweitgericht(trip, SLOT, null, ['e1'])
    trip = fuegeRezeptHinzu(trip, SLOT, slotVon(trip).varianten[1].id, 'r-dal')
    expect(slotHinweise(trip, slotVon(trip), rezepte, personen)).toEqual({ rezepte: [], nacheinander: true })
  })
})

describe('Filter der Rezeptauswahl', () => {
  const liste = [
    rezept('Chili'),
    rezept('Dal', { ernaehrungsstufe: 'vegan', merkmale: ['bordkuechentauglich'] }),
    rezept('Obstteller', { ernaehrungsstufe: 'vegan', merkmale: ['kalt', 'bordkuechentauglich'], kategorie: 'snack' }),
  ]
  const namen = (filter: Parameters<typeof filtereRezepte>[1]) => filtereRezepte(liste, filter).map((r) => r.name)

  it('filtert nach Merkmalen (alle gewählten müssen zutreffen)', () => {
    expect(namen({ suche: '', kategorie: null, merkmale: ['bordkuechentauglich'] })).toEqual(['Dal', 'Obstteller'])
    expect(namen({ suche: '', kategorie: null, merkmale: ['bordkuechentauglich', 'kalt'] })).toEqual(['Obstteller'])
  })

  it('filtert auf „passt für alle“', () => {
    const esser = [person('a'), person('v', { ernaehrung: 'vegetarisch' })]
    expect(namen({ suche: '', kategorie: null, passendFuer: esser })).toEqual(['Dal', 'Obstteller'])
    expect(namen({ suche: '', kategorie: 'hauptgericht', passendFuer: esser })).toEqual(['Dal'])
  })
})
