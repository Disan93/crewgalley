import { describe, expect, it } from 'vitest'
import { alleBedarfe, einkaufsliste, fuegeZusatzHinzu, setzeAbgehakt } from './einkauf'
import { effektiveHaltbarkeit, haltbarkeitsHinweise, tagesAmpel, terminFuer, terminFuerTag } from './haltbarkeit'
import { fuegeRezeptHinzu } from './plan'
import { aendereTermin, entferneTermin, fuegeTerminHinzu } from './termine'
import { erstelleTrip, fuegeTeilnehmerHinzu, setzeAnwesenheit } from './trip'
import type { Kuehlschrank, Rezept, Trip, Zutat } from './typen'
import { anwesendePersonen, wasserbedarf, wasserLiter } from './wasser'

const STAND = '2026-10-02T00:00:00.000Z'

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

// Beispielwerte aus Konzept 5.2
const hack = zutat('hack', { kuehlpflichtig: true, haltbarkeitUngekuehlt: 0, haltbarkeitGekuehlt: 1 })
const nudeln = zutat('nudeln')
const brot = zutat('brot', { haltbarkeitUngekuehlt: 2 })
const karotten = zutat('karotten', { haltbarkeitUngekuehlt: 7, haltbarkeitGekuehlt: 14 })
const zutaten = [hack, nudeln, brot, karotten]

const bolognese: Rezept = {
  id: 'bolognese',
  createdAt: STAND,
  updatedAt: STAND,
  name: 'Bolognese',
  kategorie: 'hauptgericht',
  ernaehrungsstufe: 'alles',
  merkmale: [],
  zutaten: [
    { zutatId: 'hack', mengeProPortion: 100 },
    { zutatId: 'nudeln', mengeProPortion: 125 },
    { zutatId: 'karotten', mengeProPortion: 40 },
  ],
  zubereitung: '',
  flammen: 2,
  brauchtOfen: false,
  brauchtGrill: false,
  zubereitungszeitMin: 40,
  quelle: 'eigen',
}
const rezepte = [bolognese]

/** Segel-Trip über 5 Tage mit 6 Personen und Einkaufsterminen an Tag 1 und Tag 3 (Konzept Testfall 6) */
function toern(kuehlschrank: Kuehlschrank = 'klein'): Trip {
  let trip = erstelleTrip(
    { name: 'Törn', vorlageId: 'segeln', startdatum: '2027-06-05', anzahlTage: 5 },
    { grundausstattung: [], ersterTerminName: 'Tag 1' },
  )
  for (const n of [1, 2, 3, 4, 5, 6]) trip = fuegeTeilnehmerHinzu(trip, { id: `p${n}`, portionsfaktor: 1 })
  trip = fuegeTerminHinzu(trip, 3, 'Tag 3 Hafen')
  return { ...trip, puffer: 0, eigenschaften: { ...trip.eigenschaften, kueche: { ...trip.eigenschaften.kueche, kuehlschrank } } }
}

function mitBolognese(trip: Trip, tag: number): Trip {
  const slot = `t${tag}-abend`
  return fuegeRezeptHinzu(trip, slot, trip.slots.find((s) => s.id === slot)!.varianten[0].id, 'bolognese')
}

const hinweise = (trip: Trip) => haltbarkeitsHinweise(trip, alleBedarfe(trip, rezepte), zutaten)

describe('effektiveHaltbarkeit (7.6)', () => {
  it('nimmt mit Kühlschrank den gekühlten Wert, sonst den ungekühlten', () => {
    expect(effektiveHaltbarkeit(hack, 'klein')).toBe(1)
    expect(effektiveHaltbarkeit(hack, 'keiner')).toBe(0)
  })

  it('nimmt den ungekühlten Wert, wenn kein gekühlter gesetzt ist', () => {
    expect(effektiveHaltbarkeit(brot, 'mittel')).toBe(2)
    expect(effektiveHaltbarkeit(nudeln, 'mittel')).toBeNull()
  })
})

describe('Zuordnung zu Einkaufsterminen (7.6)', () => {
  it('Testfall 6: Hackfleisch an Tag 4 → Termin Tag 3', () => {
    expect(terminFuer(toern(), hack, { tag: 4, pauschal: false }).tag).toBe(3)
  })

  it('Testfall 7: Nudeln an Tag 4 → Termin Tag 1', () => {
    expect(terminFuer(toern(), nudeln, { tag: 4, pauschal: false }).tag).toBe(1)
  })

  it('haltbar ist auch, was mindestens so lange hält wie der Trip dauert', () => {
    // Karotten halten gekühlt 14 Tage, der Trip dauert 5
    expect(terminFuer(toern(), karotten, { tag: 4, pauschal: false }).tag).toBe(1)
    // ohne Kühlschrank 7 Tage: immer noch haltbar
    expect(terminFuer(toern('keiner'), karotten, { tag: 4, pauschal: false }).tag).toBe(1)
  })

  it('Verderbliches vor dem zweiten Termin kommt zum ersten', () => {
    expect(terminFuer(toern(), hack, { tag: 2, pauschal: false }).tag).toBe(1)
    expect(terminFuer(toern(), hack, { tag: 3, pauschal: false }).tag).toBe(3)
  })

  it('Pauschales kommt immer zum ersten Termin', () => {
    expect(terminFuer(toern(), hack, { tag: 1, pauschal: true }).tag).toBe(1)
  })

  it('ohne Haltbarkeitsprüfung oder mit nur einem Termin geht alles in den ersten Termin', () => {
    const trip = toern()
    const ohnePruefung = { ...trip, eigenschaften: { ...trip.eigenschaften, haltbarkeitspruefung: false } }
    expect(terminFuer(ohnePruefung, hack, { tag: 4, pauschal: false }).tag).toBe(1)

    const einTermin = entferneTermin(trip, trip.einkaufstermine[1].id)
    expect(terminFuer(einTermin, hack, { tag: 4, pauschal: false }).tag).toBe(1)
  })

  it('die Einkaufsliste verteilt die Zutaten eines Rezepts auf die Termine', () => {
    const trip = mitBolognese(toern(), 4)
    const [tag1, tag3] = [trip.einkaufstermine[0].id, trip.einkaufstermine[1].id]
    const liste = einkaufsliste(trip, rezepte, zutaten)
    expect(liste.map((e) => [e.zutat.id, e.terminId === tag1 ? 1 : e.terminId === tag3 ? 3 : 0, e.menge])).toEqual([
      ['hack', 3, 600],
      ['karotten', 1, 240],
      ['nudeln', 1, 750],
    ])
  })

  it('dieselbe verderbliche Zutat an zwei Tagen ergibt je Termin einen Eintrag', () => {
    const trip = mitBolognese(mitBolognese(toern(), 2), 4)
    const hackEintraege = einkaufsliste(trip, rezepte, zutaten).filter((e) => e.zutat.id === 'hack')
    expect(hackEintraege.map((e) => e.menge)).toEqual([600, 600])
    expect(new Set(hackEintraege.map((e) => e.terminId)).size).toBe(2)
    expect(einkaufsliste(trip, rezepte, zutaten).find((e) => e.zutat.id === 'nudeln')?.menge).toBe(1500)
  })
})

describe('Haltbarkeits-Ampel (8.3)', () => {
  it('Testfall 6: Hackfleisch an Tag 4, Termin Tag 3, mit Kühlschrank (H = 1) → gelb', () => {
    const trip = mitBolognese(toern('klein'), 4)
    expect(hinweise(trip)).toMatchObject([{ tag: 4, einkaufTag: 3, haltbarkeit: 1, stufe: 'gelb' }])
    expect(tagesAmpel(hinweise(trip), 4)).toBe('gelb')
  })

  it('Testfall 6: ohne Kühlschrank (H = 0) → rot', () => {
    const trip = mitBolognese(toern('keiner'), 4)
    expect(hinweise(trip)).toMatchObject([{ tag: 4, einkaufTag: 3, haltbarkeit: 0, stufe: 'rot' }])
    expect(tagesAmpel(hinweise(trip), 4)).toBe('rot')
  })

  it('am Einkaufstag verbraucht ist grün, auch bei Haltbarkeit 0', () => {
    const trip = mitBolognese(toern('keiner'), 3)
    expect(hinweise(trip)).toEqual([])
    expect(tagesAmpel(hinweise(trip), 3)).toBe('gruen')
  })

  it('Tage ohne Problem bleiben grün; haltbare Zutaten lösen nie einen Hinweis aus', () => {
    const trip = mitBolognese(toern(), 4)
    expect(tagesAmpel(hinweise(trip), 2)).toBe('gruen')
    expect(hinweise(trip).map((h) => h.zutat.id)).toEqual(['hack'])
  })

  it('mit nur einem Termin wird Frisches spät im Trip rot', () => {
    const basis = toern()
    const trip = mitBolognese(entferneTermin(basis, basis.einkaufstermine[1].id), 4)
    expect(hinweise(trip)).toMatchObject([{ tag: 4, einkaufTag: 1, stufe: 'rot' }])
  })

  it('ohne Haltbarkeitsprüfung gibt es keine Hinweise', () => {
    const trip = mitBolognese(toern('keiner'), 4)
    const aus = { ...trip, eigenschaften: { ...trip.eigenschaften, haltbarkeitspruefung: false } }
    expect(hinweise(aus)).toEqual([])
  })
})

describe('Einkaufstermine verwalten', () => {
  it('ändert Tag und Name', () => {
    const trip = toern()
    const neu = aendereTermin(trip, trip.einkaufstermine[1].id, { tag: 4, name: 'Hafen Hvar' })
    expect(neu.einkaufstermine[1]).toMatchObject({ tag: 4, name: 'Hafen Hvar' })
    expect(terminFuerTag(neu, 3).tag).toBe(1)
  })

  it('entfernt nie den letzten Termin', () => {
    const trip = toern()
    const einer = entferneTermin(trip, trip.einkaufstermine[1].id)
    expect(entferneTermin(einer, einer.einkaufstermine[0].id).einkaufstermine).toHaveLength(1)
  })

  it('beim Entfernen entfällt der Abhak-Status, Zusatzeinträge wandern zum ersten Termin', () => {
    let trip = mitBolognese(toern(), 4)
    const [tag1, tag3] = [trip.einkaufstermine[0].id, trip.einkaufstermine[1].id]
    const hackEintrag = einkaufsliste(trip, rezepte, zutaten).find((e) => e.zutat.id === 'hack')!
    trip = setzeAbgehakt(trip, hackEintrag, true)
    trip = fuegeZusatzHinzu(trip, tag3, 'Eis')

    const danach = entferneTermin(trip, tag3)
    expect(danach.einkaufsstatus.eintraege).toEqual([])
    expect(danach.einkaufsstatus.zusatzeintraege).toMatchObject([{ name: 'Eis', terminId: tag1 }])
  })
})

describe('Trinkwasser (8.5)', () => {
  /** 6 Personen, 3 Tage, 3 L, Tag 2 heiß (+1 L) wie in Konzept Testfall 8 */
  function wasserTrip(): Trip {
    let trip = erstelleTrip(
      { name: 'Törn', vorlageId: 'segeln', startdatum: '2027-06-05', anzahlTage: 3 },
      { grundausstattung: [], ersterTerminName: 'Tag 1' },
    )
    for (const n of [1, 2, 3, 4, 5, 6]) trip = fuegeTeilnehmerHinzu(trip, { id: `p${n}`, portionsfaktor: n > 4 ? 0.5 : 1 })
    return { ...trip, tage: trip.tage.map((t, i) => ({ ...t, heisserTag: i === 1 })) }
  }

  it('Testfall 8: 18 + 24 + 18 = 60 L → 10 Gebinde à 6 L', () => {
    const trip = wasserTrip()
    expect([1, 2, 3].map((tag) => wasserLiter(trip, tag))).toEqual([18, 24, 18])
    expect(wasserbedarf(trip)).toMatchObject({ liter: 60, gebinde: 10 })
  })

  it('zählt Personen, nicht Portionen: Kinder trinken voll mit', () => {
    expect(anwesendePersonen(wasserTrip(), 1)).toBe(6)
  })

  it('wer an einem Tag bei keiner Mahlzeit dabei ist, zählt an diesem Tag nicht', () => {
    const trip = setzeAnwesenheit(wasserTrip(), 'p1', ['t1-abend'], false)
    expect(wasserLiter(trip, 1)).toBe(15)
  })

  it('rundet angebrochene Gebinde auf', () => {
    const trip = { ...wasserTrip(), wasser: { literProPersonTag: 3, zusatzHeisserTag: 1, gebindeLiter: 8 } }
    expect(wasserbedarf(trip)).toMatchObject({ liter: 60, gebinde: 8 })
  })

  it('verteilt das Wasser wie Verderbliches auf die Einkaufstermine', () => {
    const trip = fuegeTerminHinzu(wasserTrip(), 3, 'Hafen')
    expect(wasserbedarf(trip)?.proTermin.map((t) => [t.liter, t.gebinde])).toEqual([
      [42, 7],
      [18, 3],
    ])
  })

  it('ohne Wasserberechnung gibt es keinen Bedarf', () => {
    const trip = wasserTrip()
    expect(wasserbedarf({ ...trip, eigenschaften: { ...trip.eigenschaften, wasserberechnung: false } })).toBeNull()
  })
})
