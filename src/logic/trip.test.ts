import { describe, expect, it } from 'vitest'
import { personVerwendung, pruefePerson } from './personen'
import {
  aktiveSlots,
  dupliziereTrip,
  entferneTeilnehmer,
  erstelleTrip,
  fuegeTeilnehmerHinzu,
  hatBuchungen,
  hatRezepteAbTag,
  istAnwesend,
  pruefeTripEingabe,
  setzeAnwesenheit,
  setzeAnzahlTage,
  setzeMahlzeitAktiv,
  setzePortionsfaktor,
  slotId,
  standardMahlzeiten,
  tagDatum,
} from './trip'
import type { GrundausstattungsPosten, Trip } from './typen'
import { TRIP_VORLAGEN, findeVorlage } from './vorlagen'

const jetzt = new Date('2026-10-02T12:00:00.000Z')
const kaffee: GrundausstattungsPosten = { id: 'g1', zutatId: 'z-kaffee', modus: 'proPersonTag', menge: 15 }
const optionen = { grundausstattung: [kaffee], ersterTerminName: 'Tag 1 – Großeinkauf' }

function neuerTrip(vorlageId = 'huette', anzahlTage = 3): Trip {
  return erstelleTrip({ name: ' Hütte 2026 ', vorlageId, startdatum: '2026-10-02', anzahlTage }, optionen, jetzt)
}

const anna = { id: 'anna', portionsfaktor: 1 }
const kind = { id: 'kind', portionsfaktor: 0.5 }

describe('Vorlagen', () => {
  it('setzen die Standardwerte aus Konzept Kapitel 4', () => {
    const huette = findeVorlage('huette').eigenschaften
    expect(huette.kueche).toEqual({ flammen: 4, ofen: true, kuehlschrank: 'mittel', grill: false })
    expect([huette.kuechenpruefung, huette.haltbarkeitspruefung, huette.wasserberechnung]).toEqual([false, false, false])

    const segeln = findeVorlage('segeln').eigenschaften
    expect(segeln.kueche).toEqual({ flammen: 2, ofen: false, kuehlschrank: 'klein', grill: false })
    expect([segeln.kuechenpruefung, segeln.haltbarkeitspruefung, segeln.wasserberechnung]).toEqual([true, true, true])
  })

  it('fallen bei unbekannter ID auf "Sonstiges" zurück', () => {
    expect(findeVorlage('kanu').id).toBe('sonstiges')
    expect(TRIP_VORLAGEN.map((v) => v.id)).toEqual(['huette', 'segeln', 'sonstiges'])
  })
})

describe('standardMahlzeiten', () => {
  it('Anreisetag nur Abendessen, Abreisetag Frühstück und Mittag, dazwischen alle drei', () => {
    expect(standardMahlzeiten(1, 3)).toEqual(['abend'])
    expect(standardMahlzeiten(2, 3)).toEqual(['fruehstueck', 'mittag', 'abend'])
    expect(standardMahlzeiten(3, 3)).toEqual(['fruehstueck', 'mittag'])
  })

  it('ein eintägiger Trip hat alle drei Hauptmahlzeiten', () => {
    expect(standardMahlzeiten(1, 1)).toEqual(['fruehstueck', 'mittag', 'abend'])
  })
})

describe('pruefeTripEingabe', () => {
  const gut = { name: 'Törn', vorlageId: 'segeln', startdatum: '2026-07-01', anzahlTage: 7 }

  it('akzeptiert gültige Eingaben', () => {
    expect(pruefeTripEingabe(gut)).toEqual([])
  })

  it('meldet fehlenden Namen, ungültiges Datum und ungültige Tageszahl', () => {
    expect(pruefeTripEingabe({ ...gut, name: ' ', startdatum: '01.07.2026', anzahlTage: 0 })).toEqual([
      'nameFehlt',
      'datumUngueltig',
      'tageUngueltig',
    ])
    expect(pruefeTripEingabe({ ...gut, anzahlTage: 2.5 })).toEqual(['tageUngueltig'])
    expect(pruefeTripEingabe({ ...gut, anzahlTage: 32 })).toEqual(['tageUngueltig'])
  })
})

describe('erstelleTrip', () => {
  it('übernimmt Vorlage, Standardwerte und eine Kopie der Grundausstattung', () => {
    const trip = neuerTrip('segeln')
    expect(trip.name).toBe('Hütte 2026')
    expect(trip.eigenschaften.kueche.flammen).toBe(2)
    expect(trip.puffer).toBe(10)
    expect(trip.waehrung).toBe('EUR')
    expect(trip.wasser).toEqual({ literProPersonTag: 3, zusatzHeisserTag: 1, gebindeLiter: 6 })
    expect(trip.einkaufstermine).toMatchObject([{ tag: 1, name: 'Tag 1 – Großeinkauf' }])
    expect(trip.grundausstattung).toEqual([kaffee])
    expect(trip.grundausstattung[0]).not.toBe(kaffee)
  })

  it('ändert beim Anpassen des Trips nicht die Vorlage', () => {
    const trip = neuerTrip('segeln')
    trip.eigenschaften.kueche.flammen = 9
    expect(findeVorlage('segeln').eigenschaften.kueche.flammen).toBe(2)
  })

  it('legt pro Tag vier Slots mit leerer Standard-Variante an, aktiv sind nur die Standard-Mahlzeiten', () => {
    const trip = neuerTrip()
    expect(trip.slots).toHaveLength(12)
    expect(trip.slots.every((s) => s.varianten.length === 1 && s.varianten[0].fuer === 'standard')).toBe(true)
    expect(aktiveSlots(trip).map((s) => s.id)).toEqual([
      't1-abend',
      't2-fruehstueck',
      't2-mittag',
      't2-abend',
      't3-fruehstueck',
      't3-mittag',
    ])
  })
})

describe('tagDatum', () => {
  it('zählt ab dem Startdatum, auch über Monatsgrenzen', () => {
    expect(tagDatum('2026-10-30', 1).toISOString()).toBe('2026-10-30T00:00:00.000Z')
    expect(tagDatum('2026-10-30', 4).toISOString()).toBe('2026-11-02T00:00:00.000Z')
  })
})

describe('setzeMahlzeitAktiv', () => {
  it('schaltet eine Mahlzeit ein und aus und hält die Tagesreihenfolge', () => {
    let trip = setzeMahlzeitAktiv(neuerTrip(), 1, 'fruehstueck', true)
    expect(trip.tage[0].mahlzeiten).toEqual(['fruehstueck', 'abend'])
    trip = setzeMahlzeitAktiv(trip, 1, 'snack', true)
    expect(trip.tage[0].mahlzeiten).toEqual(['fruehstueck', 'abend', 'snack'])
    trip = setzeMahlzeitAktiv(trip, 1, 'abend', false)
    expect(trip.tage[0].mahlzeiten).toEqual(['fruehstueck', 'snack'])
  })
})

describe('Teilnehmer und Anwesenheit', () => {
  it('neue Teilnehmer sind bei allen Mahlzeiten dabei und bekommen eine Kopie des Portionsfaktors', () => {
    const trip = fuegeTeilnehmerHinzu(neuerTrip(), kind)
    expect(trip.teilnehmer).toHaveLength(1)
    expect(trip.teilnehmer[0].portionsfaktor).toBe(0.5)
    expect(trip.slots.every((s) => istAnwesend(trip.teilnehmer[0], s.id))).toBe(true)
  })

  it('fügt dieselbe Person nicht doppelt hinzu', () => {
    const trip = fuegeTeilnehmerHinzu(fuegeTeilnehmerHinzu(neuerTrip(), anna), anna)
    expect(trip.teilnehmer).toHaveLength(1)
  })

  it('Person kommt erst Samstagmittag: zählt beim Samstagsfrühstück nicht mit (Konzept Testfall 3)', () => {
    let trip = fuegeTeilnehmerHinzu(fuegeTeilnehmerHinzu(neuerTrip(), anna), kind)
    trip = setzeAnwesenheit(trip, 'anna', [slotId(1, 'abend'), slotId(2, 'fruehstueck')], false)

    const anwesendBei = (slot: string) => trip.teilnehmer.filter((tn) => istAnwesend(tn, slot)).map((tn) => tn.personId)
    expect(anwesendBei('t2-fruehstueck')).toEqual(['kind'])
    expect(anwesendBei('t2-mittag')).toEqual(['anna', 'kind'])

    trip = setzeAnwesenheit(trip, 'anna', ['t2-fruehstueck'], true)
    expect(anwesendBei('t2-fruehstueck')).toEqual(['anna', 'kind'])
    expect(trip.teilnehmer[0].anwesenheit.filter((id) => id === 't2-fruehstueck')).toHaveLength(1)
  })

  it('ändert den Portionsfaktor nur im Trip', () => {
    const trip = setzePortionsfaktor(fuegeTeilnehmerHinzu(neuerTrip(), anna), 'anna', 1.5)
    expect(trip.teilnehmer[0].portionsfaktor).toBe(1.5)
    expect(anna.portionsfaktor).toBe(1)
  })

  it('entfernt Teilnehmer samt ihrer Zweitgerichte', () => {
    let trip = fuegeTeilnehmerHinzu(fuegeTeilnehmerHinzu(neuerTrip(), anna), kind)
    trip.slots[0].varianten.push(
      { id: 'v-anna', rezeptIds: ['r-dal'], fuer: ['anna'] },
      { id: 'v-beide', rezeptIds: ['r-dal'], fuer: ['anna', 'kind'] },
    )
    trip = entferneTeilnehmer(trip, 'anna')
    expect(trip.teilnehmer.map((tn) => tn.personId)).toEqual(['kind'])
    expect(trip.slots[0].varianten.map((v) => v.fuer)).toEqual(['standard', ['kind']])
  })

  it('erkennt Personen mit Buchungen', () => {
    const trip = fuegeTeilnehmerHinzu(neuerTrip(), anna)
    expect(hatBuchungen(trip, 'anna')).toBe(false)
    trip.einzahlungen.push({ id: 'e1', personId: 'anna', betrag: 10000, datum: '2026-10-02' })
    expect(hatBuchungen(trip, 'anna')).toBe(true)
  })
})

describe('setzeAnzahlTage', () => {
  it('verlängert: bisheriger Abreisetag wird normaler Tag, neue Slots, alle sind dabei', () => {
    const trip = setzeAnzahlTage(fuegeTeilnehmerHinzu(neuerTrip(), anna), 4)
    expect(trip.anzahlTage).toBe(4)
    expect(trip.tage.map((t) => t.mahlzeiten)).toEqual([
      ['abend'],
      ['fruehstueck', 'mittag', 'abend'],
      ['fruehstueck', 'mittag', 'abend'],
      ['fruehstueck', 'mittag'],
    ])
    expect(trip.slots).toHaveLength(16)
    expect(istAnwesend(trip.teilnehmer[0], 't4-fruehstueck')).toBe(true)
  })

  it('lässt von Hand geänderte Tage beim Verlängern unberührt', () => {
    const geaendert = setzeMahlzeitAktiv(neuerTrip(), 3, 'snack', true)
    const trip = setzeAnzahlTage(geaendert, 4)
    expect(trip.tage[2].mahlzeiten).toEqual(['fruehstueck', 'mittag', 'snack'])
  })

  it('verkürzt: Slots, Anwesenheit und Einkaufstermine der gestrichenen Tage entfallen', () => {
    const lang = fuegeTeilnehmerHinzu(neuerTrip('segeln', 5), anna)
    lang.einkaufstermine.push({ id: 'hafen', tag: 4, name: 'Hafen' })
    const trip = setzeAnzahlTage(lang, 2)

    expect(trip.tage.map((t) => t.mahlzeiten)).toEqual([['abend'], ['fruehstueck', 'mittag']])
    expect(trip.slots.every((s) => s.tag <= 2)).toBe(true)
    expect(trip.teilnehmer[0].anwesenheit).toHaveLength(8)
    expect(trip.einkaufstermine.map((t) => t.tag)).toEqual([1])
  })

  it('erkennt geplante Rezepte in den Tagen, die wegfallen würden', () => {
    const trip = neuerTrip()
    expect(hatRezepteAbTag(trip, 3)).toBe(false)
    trip.slots.find((s) => s.id === 't3-mittag')!.varianten[0].rezeptIds.push('r-dal')
    expect(hatRezepteAbTag(trip, 3)).toBe(true)
    expect(hatRezepteAbTag(trip, 4)).toBe(false)
  })
})

describe('dupliziereTrip', () => {
  it('kopiert alles außer Ausgaben, Einzahlungen, Überweisungen und Einkaufsstatus', () => {
    const original = fuegeTeilnehmerHinzu(neuerTrip(), anna)
    original.slots[0].varianten[0].rezeptIds.push('r-dal')
    original.ausgaben.push({
      id: 'a1',
      betrag: 5000,
      waehrung: 'EUR',
      beschreibung: 'Einkauf',
      kategorie: 'lebensmittel',
      bezahltVon: 'anna',
      aufteilung: { modus: 'essen', personIds: ['anna'] },
      datum: '2026-10-02',
    })
    original.einzahlungen.push({ id: 'e1', personId: 'anna', betrag: 10000, datum: '2026-10-02' })
    original.ueberweisungenErledigt.push({ von: 'kasse', an: 'anna', betrag: 100 })
    original.einkaufsstatus.zusatzeintraege.push({ id: 'z1', terminId: 't', name: 'Eis', abgehakt: true })

    const kopie = dupliziereTrip(original, 'Hütte 2027', new Date('2027-01-01T00:00:00.000Z'))

    expect(kopie.id).not.toBe(original.id)
    expect(kopie.name).toBe('Hütte 2027')
    expect(kopie.createdAt).toBe('2027-01-01T00:00:00.000Z')
    expect(kopie.teilnehmer).toEqual(original.teilnehmer)
    expect(kopie.slots).toEqual(original.slots)
    expect(kopie.grundausstattung).toEqual(original.grundausstattung)
    expect(kopie.ausgaben).toEqual([])
    expect(kopie.einzahlungen).toEqual([])
    expect(kopie.ueberweisungenErledigt).toEqual([])
    expect(kopie.einkaufsstatus).toEqual({ eintraege: [], zusatzeintraege: [] })
  })

  it('ist vom Original unabhängig', () => {
    const original = neuerTrip()
    const kopie = dupliziereTrip(original, 'Kopie', jetzt)
    kopie.slots[0].varianten[0].rezeptIds.push('r-dal')
    kopie.tage[0].mahlzeiten.push('snack')
    expect(original.slots[0].varianten[0].rezeptIds).toEqual([])
    expect(original.tage[0].mahlzeiten).toEqual(['abend'])
  })
})

describe('Personen', () => {
  it('brauchen einen Namen und einen Portionsfaktor über 0', () => {
    expect(pruefePerson({ name: 'Anna', portionsfaktor: 1 })).toEqual([])
    expect(pruefePerson({ name: '', portionsfaktor: 0 })).toEqual(['nameFehlt', 'faktorUngueltig'])
  })

  it('werden in den Trips gefunden, an denen sie teilnehmen', () => {
    const trip = fuegeTeilnehmerHinzu(neuerTrip(), anna)
    expect(personVerwendung('anna', [trip])).toEqual(['Hütte 2026'])
    expect(personVerwendung('ben', [trip])).toEqual([])
  })
})
