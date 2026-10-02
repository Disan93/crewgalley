import type {
  AbteilungId,
  Einheit,
  Ernaehrung,
  GrundausstattungsPosten,
  Rezept,
  RezeptKategorie,
  RezeptMerkmal,
  Zutat,
} from '../logic/typen'
import grundausstattungRoh from './grundausstattung.json'
import rezepteRoh from './rezepte.json'
import zutatenRoh from './zutaten.json'

// Die JSON-Dateien sind kürzer geschrieben als das Datenmodell: Felder mit
// Standardwert dürfen fehlen, und Rezept-Zutaten stehen als {Zutat-ID: Menge pro Portion}.
// Mitgelieferte Daten haben feste, lesbare IDs (z-…, r-…), damit sie auf jedem Gerät gleich sind.

interface ZutatRoh {
  id: string
  name: string
  einheit: string
  abteilung: string
  /** Packungsgröße in Grundeinheit */
  pack?: number
  /** Richtpreis in Cent */
  preis?: number
  kuehl?: boolean
  /** Haltbarkeit ungekühlt / gekühlt in Tagen; fehlt = unbegrenzt */
  haltU?: number
  haltG?: number
}

interface RezeptRoh {
  id: string
  name: string
  kategorie: string
  ernaehrungsstufe: string
  merkmale: string[]
  flammen: number
  ofen?: boolean
  grill?: boolean
  zeit: number
  zutaten: Record<string, number>
  zubereitung: string
}

const STAND = '2026-10-02T00:00:00.000Z'

export const START_ZUTATEN: Zutat[] = (zutatenRoh as ZutatRoh[]).map((z) => ({
  id: z.id,
  createdAt: STAND,
  updatedAt: STAND,
  name: z.name,
  einheit: z.einheit as Einheit,
  abteilung: z.abteilung as AbteilungId,
  packungsgroesse: z.pack ?? null,
  richtpreis: z.preis ?? null,
  kuehlpflichtig: z.kuehl ?? false,
  haltbarkeitUngekuehlt: z.haltU ?? null,
  haltbarkeitGekuehlt: z.haltG ?? null,
  quelle: 'mitgeliefert',
}))

export const START_REZEPTE: Rezept[] = (rezepteRoh as unknown as RezeptRoh[]).map((r) => ({
  id: r.id,
  createdAt: STAND,
  updatedAt: STAND,
  name: r.name,
  kategorie: r.kategorie as RezeptKategorie,
  ernaehrungsstufe: r.ernaehrungsstufe as Ernaehrung,
  merkmale: r.merkmale as RezeptMerkmal[],
  zutaten: Object.entries(r.zutaten).map(([zutatId, mengeProPortion]) => ({ zutatId, mengeProPortion })),
  zubereitung: r.zubereitung,
  flammen: r.flammen,
  brauchtOfen: r.ofen ?? false,
  brauchtGrill: r.grill ?? false,
  zubereitungszeitMin: r.zeit,
  quelle: 'mitgeliefert',
}))

export const START_GRUNDAUSSTATTUNG: GrundausstattungsPosten[] = grundausstattungRoh.map((p) => ({
  id: `g-${p.zutatId}`,
  zutatId: p.zutatId,
  modus: p.modus as GrundausstattungsPosten['modus'],
  menge: p.menge,
}))
