import { describe, expect, it } from 'vitest'
import { pruefeRezept } from '../logic/rezepte'
import { ABTEILUNGEN } from '../logic/typen'
import { pruefeZutat } from '../logic/zutaten'
import { START_GRUNDAUSSTATTUNG, START_REZEPTE, START_ZUTATEN } from './startdaten'

// Diese Tests schützen vor Tippfehlern in den JSON-Dateien.

const zutatIds = new Set(START_ZUTATEN.map((z) => z.id))
const zutatenVon = (rezeptId: string) =>
  START_REZEPTE.find((r) => r.id === rezeptId)!.zutaten.map((z) => z.zutatId)

const FLEISCH = ['z-hackfleisch', 'z-haehnchenbrust', 'z-rindfleisch', 'z-speck', 'z-wuerstel', 'z-bratwurst', 'z-salami', 'z-schinken', 'z-kabanossi']
const FISCH = ['z-lachsfilet', 'z-raeucherlachs', 'z-thunfisch']
const TIERISCH = [
  'z-butter', 'z-milch', 'z-hmilch', 'z-sahne', 'z-creme-fraiche', 'z-sauerrahm', 'z-joghurt', 'z-topfen',
  'z-eier', 'z-gouda', 'z-bergkaese', 'z-parmesan', 'z-reibekaese', 'z-feta', 'z-mozzarella', 'z-frischkaese',
  'z-halloumi', 'z-gnocchi', 'z-tortellini', 'z-spaetzle', 'z-honig', 'z-pesto', 'z-nussnougatcreme',
  'z-schokolade', 'z-kekse', 'z-muesliriegel', 'z-mayonnaise',
]
const MILCH = ['z-butter', 'z-milch', 'z-hmilch', 'z-sahne', 'z-creme-fraiche', 'z-sauerrahm', 'z-joghurt', 'z-topfen', 'z-gouda', 'z-bergkaese', 'z-parmesan', 'z-reibekaese', 'z-feta', 'z-mozzarella', 'z-frischkaese', 'z-halloumi', 'z-pesto', 'z-schokolade']
const GLUTEN = ['z-brot', 'z-semmeln', 'z-toastbrot', 'z-baguette', 'z-wraps', 'z-knaeckebrot', 'z-aufbackbroetchen', 'z-burgerbrot', 'z-spaghetti', 'z-penne', 'z-lasagneplatten', 'z-spaetzle', 'z-couscous', 'z-mehl', 'z-haferflocken', 'z-muesli', 'z-gnocchi', 'z-tortellini', 'z-semmelbroesel', 'z-knoedelbrot', 'z-sojasauce', 'z-kekse', 'z-muesliriegel']
const NUESSE = ['z-muesli', 'z-pesto', 'z-nussnougatcreme', 'z-erdnussbutter', 'z-erdnuesse', 'z-nussmischung', 'z-studentenfutter', 'z-schokolade', 'z-muesliriegel', 'z-kekse']

describe('Start-Zutaten', () => {
  it('sind etwa 150 Einträge mit eindeutigen IDs und Namen', () => {
    expect(START_ZUTATEN.length).toBeGreaterThanOrEqual(140)
    expect(zutatIds.size).toBe(START_ZUTATEN.length)
    expect(new Set(START_ZUTATEN.map((z) => z.name.toLowerCase())).size).toBe(START_ZUTATEN.length)
  })

  it('haben gültige Werte', () => {
    for (const z of START_ZUTATEN) {
      expect(pruefeZutat(z, START_ZUTATEN), z.name).toEqual([])
      expect(['g', 'ml', 'stk'], z.name).toContain(z.einheit)
      expect(ABTEILUNGEN, z.name).toContain(z.abteilung)
      expect(z.richtpreis, z.name).not.toBeNull()
    }
  })

  it('haben als kühlpflichtige Ware immer eine Haltbarkeit', () => {
    for (const z of START_ZUTATEN.filter((z) => z.kuehlpflichtig)) {
      expect(z.haltbarkeitUngekuehlt, z.name).not.toBeNull()
      expect(z.haltbarkeitGekuehlt, z.name).not.toBeNull()
    }
  })
})

describe('Start-Rezepte', () => {
  it('sind 30–40 Rezepte mit eindeutigen IDs, mindestens 10 vegetarisch/vegan', () => {
    expect(START_REZEPTE.length).toBeGreaterThanOrEqual(30)
    expect(START_REZEPTE.length).toBeLessThanOrEqual(40)
    expect(new Set(START_REZEPTE.map((r) => r.id)).size).toBe(START_REZEPTE.length)
    const fleischlos = START_REZEPTE.filter((r) => r.ernaehrungsstufe === 'vegan' || r.ernaehrungsstufe === 'vegetarisch')
    expect(fleischlos.length).toBeGreaterThanOrEqual(10)
  })

  it('sind gültig und verwenden nur bekannte Zutaten', () => {
    for (const r of START_REZEPTE) {
      expect(pruefeRezept(r, START_ZUTATEN), r.name).toEqual([])
      expect(['fruehstueck', 'hauptgericht', 'beilage', 'salat', 'snack'], r.name).toContain(r.kategorie)
      expect(r.zubereitung.length, r.name).toBeGreaterThan(20)
    }
  })

  it('haben eine Ernährungsstufe, die zu den Zutaten passt', () => {
    for (const r of START_REZEPTE) {
      const ids = zutatenVon(r.id)
      const hatFleisch = ids.some((id) => FLEISCH.includes(id))
      const hatFisch = ids.some((id) => FISCH.includes(id))
      const hatTierisch = ids.some((id) => TIERISCH.includes(id))
      if (r.ernaehrungsstufe !== 'alles') expect(hatFleisch, r.name).toBe(false)
      if (r.ernaehrungsstufe === 'vegetarisch' || r.ernaehrungsstufe === 'vegan') expect(hatFisch, r.name).toBe(false)
      if (r.ernaehrungsstufe === 'vegan') expect(hatTierisch, r.name).toBe(false)
    }
  })

  it('tragen Unverträglichkeits-Merkmale nur, wenn keine passende Zutat enthalten ist', () => {
    for (const r of START_REZEPTE) {
      const ids = zutatenVon(r.id)
      if (r.merkmale.includes('laktosefrei')) expect(ids.filter((id) => MILCH.includes(id)), r.name).toEqual([])
      if (r.merkmale.includes('glutenfrei')) expect(ids.filter((id) => GLUTEN.includes(id)), r.name).toEqual([])
      if (r.merkmale.includes('nussfrei')) expect(ids.filter((id) => NUESSE.includes(id)), r.name).toEqual([])
    }
  })

  it('brauchen als kalte Gerichte weder Flamme noch Ofen oder Grill', () => {
    for (const r of START_REZEPTE.filter((r) => r.merkmale.includes('kalt'))) {
      expect([r.flammen, r.brauchtOfen, r.brauchtGrill], r.name).toEqual([0, false, false])
    }
  })

  it('sind als bordküchentauglich nur mit höchstens 2 Flammen und ohne Ofen markiert', () => {
    for (const r of START_REZEPTE.filter((r) => r.merkmale.includes('bordkuechentauglich'))) {
      expect(r.flammen, r.name).toBeLessThanOrEqual(2)
      expect(r.brauchtOfen, r.name).toBe(false)
    }
  })
})

describe('Start-Grundausstattung', () => {
  it('verweist nur auf bekannte Zutaten und hat positive Mengen', () => {
    expect(START_GRUNDAUSSTATTUNG.length).toBeGreaterThan(5)
    for (const p of START_GRUNDAUSSTATTUNG) {
      expect(zutatIds.has(p.zutatId), p.zutatId).toBe(true)
      expect(p.menge, p.zutatId).toBeGreaterThan(0)
      expect(['proPersonTag', 'pauschal'], p.zutatId).toContain(p.modus)
    }
  })
})
