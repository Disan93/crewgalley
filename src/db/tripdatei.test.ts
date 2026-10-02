import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { fuegeRezeptHinzu } from '../logic/plan'
import { baueSicherung, standardEinstellungen } from '../logic/sicherung'
import { erstelleTrip, fuegeTeilnehmerHinzu } from '../logic/trip'
import { leseTripDatei, tripDateiname } from '../logic/tripdatei'
import type { Person, Rezept, Trip, Zutat } from '../logic/typen'
import { CrewGalleyDB } from './datenbank'
import { erstelleTripDatei, importiereTrip, tripVorhanden } from './tripdatei'

const STAND = '2026-10-02T00:00:00.000Z'
const jetzt = new Date(STAND)

let zaehler = 0
function neueDb(): CrewGalleyDB {
  zaehler += 1
  return new CrewGalleyDB(`tripdatei-${zaehler}`)
}

function zutat(id: string): Zutat {
  return {
    id,
    createdAt: STAND,
    updatedAt: STAND,
    name: id,
    einheit: 'g',
    abteilung: 'trockenwaren',
    packungsgroesse: 500,
    richtpreis: 129,
    kuehlpflichtig: false,
    haltbarkeitUngekuehlt: null,
    haltbarkeitGekuehlt: null,
    quelle: 'eigen',
  }
}

function rezept(id: string, zutatIds: string[]): Rezept {
  return {
    id,
    createdAt: STAND,
    updatedAt: STAND,
    name: id,
    kategorie: 'hauptgericht',
    ernaehrungsstufe: 'vegan',
    merkmale: [],
    zutaten: zutatIds.map((zutatId) => ({ zutatId, mengeProPortion: 100 })),
    zubereitung: '',
    flammen: 1,
    brauchtOfen: false,
    brauchtGrill: false,
    zubereitungszeitMin: 20,
    quelle: 'eigen',
  }
}

function person(id: string): Person {
  return {
    id,
    createdAt: STAND,
    updatedAt: STAND,
    name: id,
    portionsfaktor: 1,
    ernaehrung: 'alles',
    unvertraeglichkeiten: [],
    notiz: '',
  }
}

/** Datenbank mit zwei Rezepten, vier Zutaten, zwei Personen und einem Trip, der nur einen Teil davon nutzt */
async function quelle(): Promise<{ db: CrewGalleyDB; trip: Trip }> {
  const db = neueDb()
  await db.zutaten.bulkAdd(['nudeln', 'tomaten', 'reis', 'kaffee'].map(zutat))
  await db.rezepte.bulkAdd([rezept('pasta', ['nudeln', 'tomaten']), rezept('risotto', ['reis'])])
  await db.personen.bulkAdd([person('anna'), person('ben')])

  let trip = erstelleTrip(
    { name: 'Törn Kroatien 2027', vorlageId: 'segeln', startdatum: '2027-06-05', anzahlTage: 3 },
    { grundausstattung: [{ id: 'g1', zutatId: 'kaffee', modus: 'proPersonTag', menge: 15 }], ersterTerminName: 'Tag 1' },
    jetzt,
  )
  trip = fuegeTeilnehmerHinzu(trip, { id: 'anna', portionsfaktor: 1 })
  trip = fuegeRezeptHinzu(trip, 't2-abend', trip.slots.find((s) => s.id === 't2-abend')!.varianten[0].id, 'pasta')
  await db.trips.add(trip)
  return { db, trip }
}

describe('Trip exportieren', () => {
  it('enthält nur die verwendeten Rezepte, Zutaten (auch aus der Grundausstattung) und Teilnehmer', async () => {
    const { db, trip } = await quelle()
    const datei = await erstelleTripDatei(db, trip, jetzt)
    expect(datei).toMatchObject({ app: 'CrewGalley', art: 'trip', schemaVersion: 1, erstelltAm: STAND })
    expect(datei.trip).toEqual(trip)
    expect(datei.rezepte.map((r) => r.id)).toEqual(['pasta'])
    expect(datei.zutaten.map((z) => z.id).sort()).toEqual(['kaffee', 'nudeln', 'tomaten'])
    expect(datei.personen.map((p) => p.id)).toEqual(['anna'])
  })

  it('bildet einen Dateinamen ohne Sonderzeichen', () => {
    expect(tripDateiname('Törn Kroatien 2027')).toBe('crewgalley-trip-toern-kroatien-2027.json')
    expect(tripDateiname('  Hütte / Spaß! ')).toBe('crewgalley-trip-huette-spass.json')
    expect(tripDateiname('???')).toBe('crewgalley-trip-export.json')
  })
})

describe('Trip-Datei lesen', () => {
  it('liest eine selbst erzeugte Datei unverändert zurück', async () => {
    const { db, trip } = await quelle()
    const datei = await erstelleTripDatei(db, trip, jetzt)
    expect(leseTripDatei(JSON.stringify(datei))).toEqual({ ok: true, datei })
  })

  it('lehnt Text ohne JSON, fremde Dateien und Gesamt-Sicherungen ab', () => {
    expect(leseTripDatei('Hallo')).toEqual({ ok: false, fehler: 'keinJson' })
    expect(leseTripDatei('{"a":1}')).toEqual({ ok: false, fehler: 'fremdeDatei' })
    const sicherung = baueSicherung(
      { personen: [], zutaten: [], rezepte: [], trips: [], einstellungen: standardEinstellungen(jetzt) },
      jetzt,
    )
    expect(leseTripDatei(JSON.stringify(sicherung))).toEqual({ ok: false, fehler: 'fremdeDatei' })
  })

  it('lehnt zu neue und beschädigte Dateien ab', async () => {
    const { db, trip } = await quelle()
    const datei = await erstelleTripDatei(db, trip, jetzt)
    expect(leseTripDatei(JSON.stringify({ ...datei, schemaVersion: 99 }))).toEqual({ ok: false, fehler: 'zuNeu' })
    expect(leseTripDatei(JSON.stringify({ ...datei, rezepte: undefined }))).toEqual({ ok: false, fehler: 'beschaedigt' })
    expect(leseTripDatei(JSON.stringify({ ...datei, trip: { name: 'ohne ID' } }))).toEqual({ ok: false, fehler: 'beschaedigt' })
  })
})

describe('Trip importieren', () => {
  it('legt in einer leeren Datenbank den Trip und alles Verwendete an', async () => {
    const { db, trip } = await quelle()
    const datei = await erstelleTripDatei(db, trip, jetzt)

    const ziel = neueDb()
    expect(await tripVorhanden(ziel, trip.id)).toBe(false)
    expect(await importiereTrip(ziel, datei)).toEqual({ rezepte: 1, zutaten: 3, personen: 1 })
    expect(await ziel.trips.get(trip.id)).toEqual(trip)
    expect(await ziel.rezepte.count()).toBe(1)
    expect(await ziel.zutaten.count()).toBe(3)
    expect(await tripVorhanden(ziel, trip.id)).toBe(true)
  })

  it('legt Vorhandenes mit gleicher ID nicht doppelt an und überschreibt es nicht', async () => {
    const { db, trip } = await quelle()
    const datei = await erstelleTripDatei(db, trip, jetzt)

    const ziel = neueDb()
    await ziel.zutaten.add({ ...zutat('nudeln'), richtpreis: 199 })
    await ziel.personen.add({ ...person('anna'), name: 'Anna Maier' })

    expect(await importiereTrip(ziel, datei)).toEqual({ rezepte: 1, zutaten: 2, personen: 0 })
    expect((await ziel.zutaten.get('nudeln'))?.richtpreis).toBe(199)
    expect((await ziel.personen.get('anna'))?.name).toBe('Anna Maier')
  })

  it('ersetzt einen Trip mit gleicher ID', async () => {
    const { db, trip } = await quelle()
    const datei = await erstelleTripDatei(db, { ...trip, name: 'Neuer Stand' }, jetzt)
    await importiereTrip(db, datei)
    expect(await db.trips.count()).toBe(1)
    expect((await db.trips.get(trip.id))?.name).toBe('Neuer Stand')
  })
})
