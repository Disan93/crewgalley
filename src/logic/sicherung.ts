import { ABTEILUNGEN, type Basis, type Datenbestand, type Einstellungen } from './typen'

/** Version des Datenformats; wird erhöht, sobald sich das Datenmodell ändert */
export const SCHEMA_VERSION = 1

const TAG_MS = 24 * 60 * 60 * 1000
const ERINNERUNG_NACH_TAGEN = 30

/** Inhalt der Sicherungsdatei (Konzept 10.2) */
export interface Sicherung {
  app: 'CrewGalley'
  art: 'sicherung'
  schemaVersion: number
  erstelltAm: string
  daten: Datenbestand
}

export type SicherungsFehler = 'keinJson' | 'fremdeDatei' | 'zuNeu' | 'beschaedigt'

export type LeseErgebnis =
  | { ok: true; sicherung: Sicherung }
  | { ok: false; fehler: SicherungsFehler }

export function neueBasis(jetzt: Date = new Date()): Basis {
  const zeit = jetzt.toISOString()
  return { id: crypto.randomUUID(), createdAt: zeit, updatedAt: zeit }
}

export function standardEinstellungen(jetzt: Date = new Date()): Einstellungen {
  return {
    id: 'app',
    abteilungsReihenfolge: [...ABTEILUNGEN],
    standardGrundausstattung: [],
    design: 'system',
    ersterStart: jetzt.toISOString(),
    letzteSicherung: null,
  }
}

export function baueSicherung(daten: Datenbestand, jetzt: Date = new Date()): Sicherung {
  return {
    app: 'CrewGalley',
    art: 'sicherung',
    schemaVersion: SCHEMA_VERSION,
    erstelltAm: jetzt.toISOString(),
    daten,
  }
}

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istListeMitIds(wert: unknown): boolean {
  return Array.isArray(wert) && wert.every((e) => istObjekt(e) && typeof e.id === 'string')
}

/**
 * Prüft den Text einer Sicherungsdatei und gibt die Sicherung zurück.
 * Geprüft wird nur die grobe Form, nicht jedes einzelne Feld.
 */
export function leseSicherung(text: string): LeseErgebnis {
  let roh: unknown
  try {
    roh = JSON.parse(text)
  } catch {
    return { ok: false, fehler: 'keinJson' }
  }
  if (!istObjekt(roh) || roh.app !== 'CrewGalley' || roh.art !== 'sicherung') {
    return { ok: false, fehler: 'fremdeDatei' }
  }
  if (typeof roh.schemaVersion !== 'number' || typeof roh.erstelltAm !== 'string') {
    return { ok: false, fehler: 'beschaedigt' }
  }
  if (roh.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, fehler: 'zuNeu' }
  }
  const daten = roh.daten
  if (
    !istObjekt(daten) ||
    !istListeMitIds(daten.personen) ||
    !istListeMitIds(daten.zutaten) ||
    !istListeMitIds(daten.rezepte) ||
    !istListeMitIds(daten.trips) ||
    !istObjekt(daten.einstellungen)
  ) {
    return { ok: false, fehler: 'beschaedigt' }
  }
  // Hier werden später ältere Schema-Versionen auf die aktuelle umgebaut (Migration).
  const sicherung = roh as unknown as Sicherung
  return {
    ok: true,
    sicherung: {
      ...sicherung,
      daten: {
        ...sicherung.daten,
        einstellungen: { ...standardEinstellungen(), ...sicherung.daten.einstellungen, id: 'app' },
      },
    },
  }
}

/** Erinnerung, wenn Daten vorhanden sind und länger als 30 Tage nicht gesichert wurde */
export function sicherungFaellig(
  einstellungen: Pick<Einstellungen, 'ersterStart' | 'letzteSicherung'>,
  hatDaten: boolean,
  jetzt: Date = new Date(),
): boolean {
  if (!hatDaten) return false
  const bezug = new Date(einstellungen.letzteSicherung ?? einstellungen.ersterStart)
  return jetzt.getTime() - bezug.getTime() > ERINNERUNG_NACH_TAGEN * TAG_MS
}
