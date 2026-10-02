import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { leseSicherung, neueBasis } from '../logic/sicherung'
import type { Person, Zutat } from '../logic/typen'
import { CrewGalleyDB } from './datenbank'
import { erstelleSicherung, ladeEinstellungen, merkeSicherung, stelleWiederHer } from './sicherung'

const jetzt = new Date('2026-10-02T12:00:00.000Z')

let zaehler = 0
function neueDb(): CrewGalleyDB {
  zaehler += 1
  return new CrewGalleyDB(`test-${zaehler}`)
}

function person(name: string): Person {
  return {
    ...neueBasis(jetzt),
    name,
    portionsfaktor: 1,
    ernaehrung: 'alles',
    unvertraeglichkeiten: [],
    notiz: '',
  }
}

const nudeln: Zutat = {
  ...neueBasis(jetzt),
  name: 'Nudeln',
  einheit: 'g',
  abteilung: 'trockenwaren',
  packungsgroesse: 500,
  richtpreis: 129,
  kuehlpflichtig: false,
  haltbarkeitUngekuehlt: null,
  haltbarkeitGekuehlt: null,
  quelle: 'mitgeliefert',
}

describe('Einstellungen', () => {
  it('werden beim ersten Laden mit Standardwerten angelegt und danach beibehalten', async () => {
    const db = neueDb()
    const erste = await ladeEinstellungen(db, jetzt)
    expect(erste.ersterStart).toBe(jetzt.toISOString())
    expect(erste.letzteSicherung).toBeNull()

    const zweite = await ladeEinstellungen(db, new Date('2027-01-01T00:00:00.000Z'))
    expect(zweite).toEqual(erste)
  })

  it('merken sich den Zeitpunkt der letzten Sicherung', async () => {
    const db = neueDb()
    await merkeSicherung(db, jetzt.toISOString())
    expect((await ladeEinstellungen(db)).letzteSicherung).toBe(jetzt.toISOString())
  })
})

describe('Sichern und Wiederherstellen', () => {
  it('überträgt alle Daten über die Sicherungsdatei in eine leere Datenbank', async () => {
    const quelle = neueDb()
    const anna = person('Anna')
    await quelle.personen.add(anna)
    await quelle.zutaten.add(nudeln)

    const datei = JSON.stringify(await erstelleSicherung(quelle, jetzt))
    const gelesen = leseSicherung(datei)
    expect(gelesen.ok).toBe(true)
    if (!gelesen.ok) return

    const ziel = neueDb()
    await stelleWiederHer(ziel, gelesen.sicherung)
    expect(await ziel.personen.toArray()).toEqual([anna])
    expect(await ziel.zutaten.toArray()).toEqual([nudeln])
    expect((await ladeEinstellungen(ziel)).letzteSicherung).toBe(jetzt.toISOString())
  })

  it('ersetzt vorhandene Daten vollständig', async () => {
    const quelle = neueDb()
    await quelle.personen.add(person('Anna'))
    const sicherung = await erstelleSicherung(quelle, jetzt)

    const ziel = neueDb()
    await ziel.personen.bulkAdd([person('Ben'), person('Clara')])
    await ziel.zutaten.add(nudeln)
    await stelleWiederHer(ziel, sicherung)

    expect((await ziel.personen.toArray()).map((p) => p.name)).toEqual(['Anna'])
    expect(await ziel.zutaten.count()).toBe(0)
  })

  it('lässt den alten Stand unverändert, wenn die Sicherung nicht eingespielt werden kann', async () => {
    const quelle = neueDb()
    const anna = person('Anna')
    await quelle.personen.add(anna)
    const sicherung = await erstelleSicherung(quelle, jetzt)
    // Zwei Einträge mit gleicher ID lassen das Einspielen scheitern
    sicherung.daten.personen = [anna, anna]

    const ziel = neueDb()
    await ziel.personen.add(person('Ben'))
    await expect(stelleWiederHer(ziel, sicherung)).rejects.toThrow()
    expect((await ziel.personen.toArray()).map((p) => p.name)).toEqual(['Ben'])
  })
})
