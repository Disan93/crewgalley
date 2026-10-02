import { describe, expect, it } from 'vitest'
import {
  SCHEMA_VERSION,
  baueSicherung,
  leseSicherung,
  neueBasis,
  sicherungFaellig,
  standardEinstellungen,
} from './sicherung'
import type { Datenbestand, Person } from './typen'

const jetzt = new Date('2026-10-02T12:00:00.000Z')

function beispielDaten(): Datenbestand {
  const anna: Person = {
    ...neueBasis(jetzt),
    name: 'Anna',
    portionsfaktor: 1,
    ernaehrung: 'vegetarisch',
    unvertraeglichkeiten: ['glutenfrei'],
    notiz: '',
  }
  return {
    personen: [anna],
    zutaten: [],
    rezepte: [],
    trips: [],
    einstellungen: standardEinstellungen(jetzt),
  }
}

describe('leseSicherung', () => {
  it('liest eine selbst erzeugte Sicherung unverändert zurück', () => {
    const sicherung = baueSicherung(beispielDaten(), jetzt)
    const ergebnis = leseSicherung(JSON.stringify(sicherung))
    expect(ergebnis).toEqual({ ok: true, sicherung })
  })

  it('lehnt Text ab, der kein JSON ist', () => {
    expect(leseSicherung('Hallo')).toEqual({ ok: false, fehler: 'keinJson' })
  })

  it('lehnt fremde JSON-Dateien ab', () => {
    expect(leseSicherung('{"name":"etwas anderes"}')).toEqual({ ok: false, fehler: 'fremdeDatei' })
    expect(leseSicherung('[1,2,3]')).toEqual({ ok: false, fehler: 'fremdeDatei' })
  })

  it('lehnt Sicherungen aus einer neueren App-Version ab', () => {
    const sicherung = { ...baueSicherung(beispielDaten(), jetzt), schemaVersion: SCHEMA_VERSION + 1 }
    expect(leseSicherung(JSON.stringify(sicherung))).toEqual({ ok: false, fehler: 'zuNeu' })
  })

  it('lehnt Sicherungen mit fehlenden Listen ab', () => {
    const sicherung = baueSicherung(beispielDaten(), jetzt)
    const kaputt = { ...sicherung, daten: { ...sicherung.daten, trips: undefined } }
    expect(leseSicherung(JSON.stringify(kaputt))).toEqual({ ok: false, fehler: 'beschaedigt' })
  })

  it('lehnt Sicherungen mit Einträgen ohne ID ab', () => {
    const sicherung = baueSicherung(beispielDaten(), jetzt)
    const kaputt = { ...sicherung, daten: { ...sicherung.daten, personen: [{ name: 'Ben' }] } }
    expect(leseSicherung(JSON.stringify(kaputt))).toEqual({ ok: false, fehler: 'beschaedigt' })
  })

  it('ergänzt fehlende Einstellungen mit Standardwerten', () => {
    const sicherung = baueSicherung(beispielDaten(), jetzt)
    const alt = { ...sicherung, daten: { ...sicherung.daten, einstellungen: { design: 'dunkel' } } }
    const ergebnis = leseSicherung(JSON.stringify(alt))
    expect(ergebnis.ok).toBe(true)
    if (ergebnis.ok) {
      expect(ergebnis.sicherung.daten.einstellungen.design).toBe('dunkel')
      expect(ergebnis.sicherung.daten.einstellungen.abteilungsReihenfolge).toHaveLength(9)
    }
  })
})

describe('sicherungFaellig', () => {
  const start = { ersterStart: '2026-08-01T12:00:00.000Z', letzteSicherung: null }

  it('erinnert nicht, solange keine Daten vorhanden sind', () => {
    expect(sicherungFaellig(start, false, jetzt)).toBe(false)
  })

  it('erinnert, wenn nie gesichert wurde und der erste Start über 30 Tage her ist', () => {
    expect(sicherungFaellig(start, true, jetzt)).toBe(true)
  })

  it('erinnert nicht bei einer Sicherung vor genau 30 Tagen', () => {
    const einst = { ...start, letzteSicherung: '2026-09-02T12:00:00.000Z' }
    expect(sicherungFaellig(einst, true, jetzt)).toBe(false)
  })

  it('erinnert bei einer Sicherung vor 31 Tagen', () => {
    const einst = { ...start, letzteSicherung: '2026-09-01T12:00:00.000Z' }
    expect(sicherungFaellig(einst, true, jetzt)).toBe(true)
  })
})
