import type { Person, Trip } from './typen'

export type PersonFehler = 'nameFehlt' | 'faktorUngueltig'

/** Prüft eine Person vor dem Speichern; leere Liste = alles in Ordnung */
export function pruefePerson(person: Pick<Person, 'name' | 'portionsfaktor'>): PersonFehler[] {
  const fehler: PersonFehler[] = []
  if (person.name.trim() === '') fehler.push('nameFehlt')
  if (!(person.portionsfaktor > 0)) fehler.push('faktorUngueltig')
  return fehler
}

/** Namen der Trips, an denen die Person teilnimmt; nur unbeteiligte Personen dürfen gelöscht werden */
export function personVerwendung(personId: string, trips: Trip[]): string[] {
  return trips.filter((t) => t.teilnehmer.some((tn) => tn.personId === personId)).map((t) => t.name)
}
