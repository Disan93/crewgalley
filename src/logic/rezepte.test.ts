import { describe, expect, it } from 'vitest'
import { filtereRezepte, kopiereRezept, pruefeRezept, rezeptVerwendung } from './rezepte'
import type { Rezept, Trip, Zutat } from './typen'
import { istUnbenutzt, pruefeZutat, sucheZutaten, zutatVerwendung } from './zutaten'

const STAND = '2026-10-02T00:00:00.000Z'

function zutat(id: string, name: string, extra: Partial<Zutat> = {}): Zutat {
  return {
    id,
    createdAt: STAND,
    updatedAt: STAND,
    name,
    einheit: 'g',
    abteilung: 'trockenwaren',
    packungsgroesse: 500,
    richtpreis: 129,
    kuehlpflichtig: false,
    haltbarkeitUngekuehlt: null,
    haltbarkeitGekuehlt: null,
    quelle: 'eigen',
    ...extra,
  }
}

function rezept(id: string, name: string, extra: Partial<Rezept> = {}): Rezept {
  return {
    id,
    createdAt: STAND,
    updatedAt: STAND,
    name,
    kategorie: 'hauptgericht',
    ernaehrungsstufe: 'vegan',
    merkmale: ['nussfrei'],
    zutaten: [{ zutatId: 'nudeln', mengeProPortion: 125 }],
    zubereitung: '',
    flammen: 1,
    brauchtOfen: false,
    brauchtGrill: false,
    zubereitungszeitMin: 20,
    quelle: 'mitgeliefert',
    ...extra,
  }
}

const nudeln = zutat('nudeln', 'Nudeln')
const oel = zutat('oel', 'Öl')
const alleZutaten = [nudeln, oel]

describe('pruefeZutat', () => {
  it('akzeptiert eine gültige Zutat', () => {
    expect(pruefeZutat(nudeln, alleZutaten)).toEqual([])
  })

  it('verlangt einen Namen', () => {
    expect(pruefeZutat(zutat('x', '  '), alleZutaten)).toEqual(['nameFehlt'])
  })

  it('erkennt doppelte Namen unabhängig von Groß-/Kleinschreibung', () => {
    expect(pruefeZutat(zutat('x', 'nudeln '), alleZutaten)).toEqual(['nameDoppelt'])
  })

  it('erlaubt, eine Zutat unter ihrem eigenen Namen erneut zu speichern', () => {
    expect(pruefeZutat({ ...nudeln, richtpreis: 149 }, alleZutaten)).toEqual([])
  })

  it('lehnt ungültige Zahlen ab', () => {
    const kaputt = zutat('x', 'Test', { packungsgroesse: 0, richtpreis: -1, haltbarkeitUngekuehlt: 1.5 })
    expect(pruefeZutat(kaputt, alleZutaten)).toEqual(['packungUngueltig', 'preisUngueltig', 'haltbarkeitUngueltig'])
  })
})

describe('sucheZutaten', () => {
  it('findet Teiltexte und sortiert nach deutschem Alphabet', () => {
    const liste = [zutat('1', 'Zucker'), zutat('2', 'Äpfel'), zutat('3', 'Butter')]
    expect(sucheZutaten(liste, '').map((z) => z.name)).toEqual(['Äpfel', 'Butter', 'Zucker'])
    expect(sucheZutaten(liste, 'UT').map((z) => z.name)).toEqual(['Butter'])
  })
})

describe('zutatVerwendung', () => {
  const trip = { name: 'Hütte 2026', grundausstattung: [{ id: 'g1', zutatId: 'oel', modus: 'pauschal', menge: 500 }] } as Trip
  const daten = {
    rezepte: [rezept('r1', 'Pasta')],
    trips: [trip],
    einstellungen: { standardGrundausstattung: [] },
  }

  it('nennt Rezepte und Trips, die die Zutat verwenden', () => {
    expect(zutatVerwendung('nudeln', daten)).toEqual({ rezepte: ['Pasta'], trips: [], standardGrundausstattung: false })
    expect(zutatVerwendung('oel', daten).trips).toEqual(['Hütte 2026'])
  })

  it('erkennt unbenutzte Zutaten', () => {
    expect(istUnbenutzt(zutatVerwendung('salz', daten))).toBe(true)
    expect(istUnbenutzt(zutatVerwendung('nudeln', daten))).toBe(false)
  })
})

describe('pruefeRezept', () => {
  it('akzeptiert ein gültiges Rezept', () => {
    expect(pruefeRezept(rezept('r1', 'Pasta'), alleZutaten)).toEqual([])
  })

  it('verlangt Namen und mindestens eine Zutat', () => {
    expect(pruefeRezept(rezept('r1', '', { zutaten: [] }), alleZutaten)).toEqual(['nameFehlt', 'keineZutaten'])
  })

  it('lehnt Mengen von 0, doppelte und unbekannte Zutaten ab', () => {
    const kaputt = rezept('r1', 'Pasta', {
      zutaten: [
        { zutatId: 'nudeln', mengeProPortion: 0 },
        { zutatId: 'nudeln', mengeProPortion: 10 },
        { zutatId: 'gibtsnicht', mengeProPortion: 10 },
      ],
    })
    expect(pruefeRezept(kaputt, alleZutaten)).toEqual(['mengeUngueltig', 'zutatDoppelt', 'zutatUnbekannt'])
  })
})

describe('kopiereRezept', () => {
  it('erzeugt ein eigenes Rezept mit neuer ID, das vom Original unabhängig ist', () => {
    const original = rezept('r1', 'Pasta')
    const kopie = kopiereRezept(original, 'Pasta (Kopie)', new Date('2026-11-01T00:00:00.000Z'))

    expect(kopie.id).not.toBe(original.id)
    expect(kopie.quelle).toBe('eigen')
    expect(kopie.name).toBe('Pasta (Kopie)')
    expect(kopie.createdAt).toBe('2026-11-01T00:00:00.000Z')
    expect(kopie.zutaten).toEqual(original.zutaten)

    kopie.zutaten[0].mengeProPortion = 999
    kopie.merkmale.push('kalt')
    expect(original.zutaten[0].mengeProPortion).toBe(125)
    expect(original.merkmale).toEqual(['nussfrei'])
  })
})

describe('filtereRezepte', () => {
  const liste = [
    rezept('1', 'Porridge', { kategorie: 'fruehstueck' }),
    rezept('2', 'Chili sin Carne'),
    rezept('3', 'Obstteller', { kategorie: 'snack' }),
  ]

  it('zeigt ohne Filter alles nach Namen sortiert', () => {
    expect(filtereRezepte(liste, { suche: '', kategorie: null }).map((r) => r.name)).toEqual([
      'Chili sin Carne',
      'Obstteller',
      'Porridge',
    ])
  })

  it('filtert nach Kategorie und Suchtext', () => {
    expect(filtereRezepte(liste, { suche: '', kategorie: 'snack' }).map((r) => r.name)).toEqual(['Obstteller'])
    expect(filtereRezepte(liste, { suche: 'chili', kategorie: null }).map((r) => r.name)).toEqual(['Chili sin Carne'])
    expect(filtereRezepte(liste, { suche: 'chili', kategorie: 'snack' })).toEqual([])
  })
})

describe('rezeptVerwendung', () => {
  it('nennt die Trips, in deren Menüplan das Rezept steht', () => {
    const trip = {
      name: 'Törn Kroatien',
      slots: [{ id: 's1', tag: 1, mahlzeit: 'abend', varianten: [{ id: 'v1', rezeptIds: ['r1'], fuer: 'standard' }] }],
    } as Trip
    expect(rezeptVerwendung('r1', [trip])).toEqual(['Törn Kroatien'])
    expect(rezeptVerwendung('r2', [trip])).toEqual([])
  })
})
