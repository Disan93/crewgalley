import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { START_GRUNDAUSSTATTUNG, START_REZEPTE, START_ZUTATEN } from '../daten/startdaten'
import { CrewGalleyDB } from './datenbank'
import { ladeEinstellungen } from './sicherung'
import { ladeStartdaten } from './startdaten'

let zaehler = 0
function neueDb(): CrewGalleyDB {
  zaehler += 1
  return new CrewGalleyDB(`start-${zaehler}`)
}

describe('ladeStartdaten', () => {
  it('füllt eine leere Datenbank mit Zutaten, Rezepten und Grundausstattung', async () => {
    const db = neueDb()
    await ladeStartdaten(db)
    expect(await db.zutaten.count()).toBe(START_ZUTATEN.length)
    expect(await db.rezepte.count()).toBe(START_REZEPTE.length)
    expect((await ladeEinstellungen(db)).standardGrundausstattung).toEqual(START_GRUNDAUSSTATTUNG)
  })

  it('legt beim zweiten Start nichts doppelt an', async () => {
    const db = neueDb()
    await ladeStartdaten(db)
    await ladeStartdaten(db)
    expect(await db.zutaten.count()).toBe(START_ZUTATEN.length)
    expect(await db.rezepte.count()).toBe(START_REZEPTE.length)
  })

  it('behält eigene Änderungen an Zutaten und Grundausstattung', async () => {
    const db = neueDb()
    await ladeStartdaten(db)
    await db.zutaten.update('z-spaghetti', { richtpreis: 199 })
    await db.einstellungen.update('app', { standardGrundausstattung: [] })

    await ladeStartdaten(db)
    expect((await db.zutaten.get('z-spaghetti'))?.richtpreis).toBe(199)
    expect((await ladeEinstellungen(db)).standardGrundausstattung).toEqual([])
  })

  it('lässt eigene Rezepte und Zutaten unberührt', async () => {
    const db = neueDb()
    await ladeStartdaten(db)
    const eigenes = { ...START_REZEPTE[0], id: 'mein-rezept', name: 'Mein Rezept', quelle: 'eigen' as const }
    await db.rezepte.add(eigenes)

    await ladeStartdaten(db)
    expect(await db.rezepte.get('mein-rezept')).toEqual(eigenes)
  })
})
