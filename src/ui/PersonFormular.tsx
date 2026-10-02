import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from '../db/datenbank'
import { pruefePerson, type PersonFehler } from '../logic/personen'
import { neueBasis } from '../logic/sicherung'
import type { Ernaehrung, Person, Unvertraeglichkeit } from '../logic/typen'
import { formatZahl, parseZahl } from '../logic/zahlen'
import { ERNAEHRUNGSSTUFEN, UNVERTRAEGLICHKEITEN } from './auswahl'

interface PersonFormularProps {
  /** vorhandene Person zum Bearbeiten; ohne Angabe wird eine neue angelegt */
  person?: Person
  onFertig: (person: Person) => void
  onAbbrechen: () => void
}

export function PersonFormular({ person, onFertig, onAbbrechen }: PersonFormularProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(person?.name ?? '')
  const [faktor, setFaktor] = useState(formatZahl(person?.portionsfaktor ?? 1))
  const [ernaehrung, setErnaehrung] = useState<Ernaehrung>(person?.ernaehrung ?? 'alles')
  const [unvertraeglichkeiten, setUnvertraeglichkeiten] = useState<Unvertraeglichkeit[]>(
    person?.unvertraeglichkeiten ?? [],
  )
  const [notiz, setNotiz] = useState(person?.notiz ?? '')
  const [fehler, setFehler] = useState<PersonFehler[]>([])

  async function speichern(ereignis: FormEvent) {
    ereignis.preventDefault()
    ereignis.stopPropagation()
    const neu: Person = {
      ...(person ?? neueBasis()),
      name: name.trim(),
      // Ungültige Eingaben werden zu 0 und fallen damit in der Prüfung auf
      portionsfaktor: parseZahl(faktor) ?? 0,
      ernaehrung,
      unvertraeglichkeiten,
      notiz: notiz.trim(),
      updatedAt: new Date().toISOString(),
    }
    const gefunden = pruefePerson(neu)
    setFehler(gefunden)
    if (gefunden.length > 0) return

    await db.personen.put(neu)
    onFertig(neu)
  }

  return (
    <form className="formular" onSubmit={speichern} noValidate>
      <label className="feld">
        <span>{t('personen.name')}</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="feld">
        <label htmlFor="person-faktor">
          <span>{t('personen.portionsfaktor')}</span>
        </label>
        <input
          id="person-faktor"
          type="text"
          inputMode="decimal"
          value={faktor}
          onChange={(e) => setFaktor(e.target.value)}
        />
        <div className="chips ohne-rand">
          <button type="button" className="chip" aria-pressed={faktor === '1'} onClick={() => setFaktor('1')}>
            {t('personen.erwachsen')}
          </button>
          <button type="button" className="chip" aria-pressed={faktor === '0,5'} onClick={() => setFaktor('0,5')}>
            {t('personen.kind')}
          </button>
        </div>
        {person && <small>{t('personen.faktorHinweis')}</small>}
      </div>

      <label className="feld">
        <span>{t('personen.ernaehrung')}</span>
        <select value={ernaehrung} onChange={(e) => setErnaehrung(e.target.value as Ernaehrung)}>
          {[...ERNAEHRUNGSSTUFEN].reverse().map((s) => (
            <option key={s} value={s}>
              {s === 'alles' ? t('personen.ernaehrungAlles') : t(`ernaehrung.${s}`)}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="feldgruppe">
        <legend>{t('personen.unvertraeglichkeiten')}</legend>
        {UNVERTRAEGLICHKEITEN.map((u) => (
          <label key={u} className="haken">
            <input
              type="checkbox"
              checked={unvertraeglichkeiten.includes(u)}
              onChange={(e) =>
                setUnvertraeglichkeiten((alt) => (e.target.checked ? [...alt, u] : alt.filter((x) => x !== u)))
              }
            />
            <span>{t(`unvertraeglichkeit.${u}`)}</span>
          </label>
        ))}
      </fieldset>

      <label className="feld">
        <span>{t('personen.notiz')}</span>
        <textarea rows={2} value={notiz} onChange={(e) => setNotiz(e.target.value)} />
      </label>

      {fehler.length > 0 && (
        <ul className="meldung fehler" role="alert">
          {fehler.map((f) => (
            <li key={f}>{t(`personen.fehler.${f}`)}</li>
          ))}
        </ul>
      )}

      <div className="knoepfe">
        <button type="submit">{t('allgemein.speichern')}</button>
        <button type="button" className="zweitrangig" onClick={onAbbrechen}>
          {t('allgemein.abbrechen')}
        </button>
      </div>
    </form>
  )
}
