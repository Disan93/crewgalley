// Datenmodell (Konzept Kapitel 5).
// Zeitstempel sind ISO-Texte (z. B. "2026-10-02T16:00:00.000Z"), ein Datum ohne
// Uhrzeit ist "JJJJ-MM-TT". Geldbeträge sind immer ganze Cent.

/** Felder, die jedes eigenständige Objekt hat (Vorbereitung für spätere Synchronisation) */
export interface Basis {
  id: string
  createdAt: string
  updatedAt: string
}

// ---------- 5.1 Person ----------

export type Ernaehrung = 'alles' | 'pescetarisch' | 'vegetarisch' | 'vegan'
export type Unvertraeglichkeit = 'glutenfrei' | 'laktosefrei' | 'nussfrei'

export interface Person extends Basis {
  name: string
  portionsfaktor: number
  ernaehrung: Ernaehrung
  unvertraeglichkeiten: Unvertraeglichkeit[]
  notiz: string
}

// ---------- 5.2 Zutat ----------

/** Grundeinheit einer Zutat */
export type Einheit = 'g' | 'ml' | 'stk'

/** Supermarkt-Abteilungen in Standard-Reihenfolge (Konzept 7.5) */
export const ABTEILUNGEN = [
  'obstGemuese',
  'brotBackwaren',
  'kuehlregal',
  'fleischFisch',
  'trockenwaren',
  'gewuerzeOel',
  'getraenke',
  'tiefkuehl',
  'drogerieHaushalt',
] as const
export type AbteilungId = (typeof ABTEILUNGEN)[number]

export type Quelle = 'mitgeliefert' | 'eigen'

export interface Zutat extends Basis {
  name: string
  einheit: Einheit
  abteilung: AbteilungId
  /** in Grundeinheit */
  packungsgroesse: number | null
  /** Cent pro Packung, ohne Packungsgröße pro 1000 g/ml bzw. pro Stück */
  richtpreis: number | null
  kuehlpflichtig: boolean
  /** Tage nach Einkaufstag; null = unbegrenzt */
  haltbarkeitUngekuehlt: number | null
  haltbarkeitGekuehlt: number | null
  quelle: Quelle
}

// ---------- 5.3 Rezept ----------

export type RezeptKategorie = 'fruehstueck' | 'hauptgericht' | 'beilage' | 'salat' | 'snack'
export type RezeptMerkmal = Unvertraeglichkeit | 'kalt' | 'bordkuechentauglich'

export interface RezeptZutat {
  zutatId: string
  /** in Grundeinheit der Zutat */
  mengeProPortion: number
}

export interface Rezept extends Basis {
  name: string
  kategorie: RezeptKategorie
  ernaehrungsstufe: Ernaehrung
  merkmale: RezeptMerkmal[]
  zutaten: RezeptZutat[]
  zubereitung: string
  flammen: number
  brauchtOfen: boolean
  brauchtGrill: boolean
  zubereitungszeitMin: number
  quelle: Quelle
}

// ---------- 5.4 Grundausstattung ----------

export interface GrundausstattungsPosten {
  id: string
  zutatId: string
  modus: 'proPersonTag' | 'pauschal'
  /** in Grundeinheit der Zutat */
  menge: number
}

// ---------- 5.6 Ausgabe / Einzahlung ----------

export type AusgabeKategorie =
  | 'lebensmittel'
  | 'getraenke'
  | 'unterkunft'
  | 'hafen'
  | 'diesel'
  | 'sonstiges'

/** Eine Person (über ihre ID) oder die Bordkasse */
export type Zahler = string | 'kasse'

export interface Aufteilung {
  modus: 'essen' | 'gleich' | 'individuell'
  personIds: string[]
  /** nur bei "individuell": Cent pro Person-ID */
  betraege?: Record<string, number>
}

export interface Ausgabe {
  id: string
  /** Cent */
  betrag: number
  waehrung: string
  beschreibung: string
  kategorie: AusgabeKategorie
  bezahltVon: Zahler
  aufteilung: Aufteilung
  datum: string
}

export interface Einzahlung {
  id: string
  personId: string
  /** Cent */
  betrag: number
  datum: string
}

export interface Ueberweisung {
  von: Zahler
  an: Zahler
  /** Cent */
  betrag: number
}

// ---------- 5.5 Trip ----------

export type Mahlzeit = 'fruehstueck' | 'mittag' | 'abend' | 'snack'
export type Kuehlschrank = 'keiner' | 'klein' | 'mittel'

export interface TripEigenschaften {
  kueche: {
    flammen: number
    ofen: boolean
    kuehlschrank: Kuehlschrank
    grill: boolean
  }
  kuechenpruefung: boolean
  haltbarkeitspruefung: boolean
  wasserberechnung: boolean
}

export interface TripTag {
  /** aktive Mahlzeiten dieses Tages */
  mahlzeiten: Mahlzeit[]
  heisserTag: boolean
}

export interface Teilnehmer {
  personId: string
  /** Kopie aus dem Adressbuch, pro Trip änderbar */
  portionsfaktor: number
  /** Slot-IDs, bei denen die Person anwesend ist */
  anwesenheit: string[]
}

export interface Variante {
  id: string
  rezeptIds: string[]
  /** "standard" oder die Person-IDs eines Zweitgerichts */
  fuer: 'standard' | string[]
}

export interface Slot {
  id: string
  /** 1 = erster Tag */
  tag: number
  mahlzeit: Mahlzeit
  varianten: Variante[]
}

export interface Einkaufstermin {
  id: string
  /** 1 = erster Tag */
  tag: number
  name: string
}

/** Status eines berechneten Listeneintrags (Zutat an einem Einkaufstermin) */
export interface EinkaufsEintragStatus {
  terminId: string
  zutatId: string
  abgehakt: boolean
  /** beim Abhaken gespeicherte Menge in Grundeinheit */
  gekaufteMenge: number | null
  /** "haben wir schon / bringt XY mit", in Grundeinheit */
  vorhandenMenge: number
  mitbringerId: string | null
}

export interface ZusatzEintrag {
  id: string
  terminId: string
  name: string
  abgehakt: boolean
}

export interface Einkaufsstatus {
  eintraege: EinkaufsEintragStatus[]
  zusatzeintraege: ZusatzEintrag[]
}

export interface WasserEinstellung {
  literProPersonTag: number
  zusatzHeisserTag: number
  gebindeLiter: number
}

export interface Trip extends Basis {
  name: string
  /** ID der Trip-Vorlage (Hütte, Segeln, …), setzt nur Standardwerte */
  vorlage: string
  startdatum: string
  anzahlTage: number
  waehrung: string
  eigenschaften: TripEigenschaften
  aktivfaktor: number
  /** Prozent */
  puffer: number
  tage: TripTag[]
  teilnehmer: Teilnehmer[]
  slots: Slot[]
  grundausstattung: GrundausstattungsPosten[]
  einkaufstermine: Einkaufstermin[]
  einkaufsstatus: Einkaufsstatus
  wasser: WasserEinstellung
  ausgaben: Ausgabe[]
  einzahlungen: Einzahlung[]
  ueberweisungenErledigt: Ueberweisung[]
}

// ---------- Einstellungen ----------

export type Design = 'hell' | 'dunkel' | 'system'

/** Es gibt genau einen Einstellungs-Datensatz mit der festen ID "app" */
export interface Einstellungen {
  id: 'app'
  abteilungsReihenfolge: AbteilungId[]
  standardGrundausstattung: GrundausstattungsPosten[]
  /** true, sobald die mitgelieferte Grundausstattung einmal übernommen wurde */
  startGrundausstattungGeladen: boolean
  design: Design
  ersterStart: string
  letzteSicherung: string | null
}

/** Alles, was die App speichert */
export interface Datenbestand {
  personen: Person[]
  zutaten: Zutat[]
  rezepte: Rezept[]
  trips: Trip[]
  einstellungen: Einstellungen
}
