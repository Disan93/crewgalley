import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GrundausstattungsPosten, Zutat } from '../logic/typen'
import { formatZahl, parseZahl } from '../logic/zahlen'
import { sucheZutaten } from '../logic/zutaten'
import { Eingabe } from './Eingabe'

interface GrundausstattungEditorProps {
  posten: GrundausstattungsPosten[]
  zutaten: Zutat[]
  onAendern: (posten: GrundausstattungsPosten[]) => void
}

const MAX_VORSCHLAEGE = 6

/** Liste der Grundausstattung (Konzept 5.4): für einen Trip oder als Standardvorlage in den Einstellungen */
export function GrundausstattungEditor({ posten, zutaten, onAendern }: GrundausstattungEditorProps) {
  const { t } = useTranslation()
  const [suche, setSuche] = useState('')

  const vorschlaege =
    suche.trim() === ''
      ? []
      : sucheZutaten(zutaten, suche)
          .filter((z) => !posten.some((p) => p.zutatId === z.id))
          .slice(0, MAX_VORSCHLAEGE)

  function aendere(id: string, neu: Partial<GrundausstattungsPosten>) {
    onAendern(posten.map((p) => (p.id === id ? { ...p, ...neu } : p)))
  }

  function hinzufuegen(zutat: Zutat) {
    // Stückware eher pauschal (1 Flasche Spülmittel), der Rest pro Person und Tag
    const modus = zutat.einheit === 'stk' ? 'pauschal' : 'proPersonTag'
    onAendern([...posten, { id: crypto.randomUUID(), zutatId: zutat.id, modus, menge: 1 }])
    setSuche('')
  }

  return (
    <>
      {posten.length === 0 && <p className="hinweis">{t('grundausstattung.leer')}</p>}
      {posten.map((p) => {
        const zutat = zutaten.find((z) => z.id === p.zutatId)
        const name = zutat?.name ?? '?'
        return (
          <div key={p.id} className="grund-zeile">
            <span className="zutat-name">{name}</span>
            <button
              type="button"
              className="zweitrangig klein"
              aria-label={t('grundausstattung.entfernen', { name })}
              onClick={() => onAendern(posten.filter((x) => x.id !== p.id))}
            >
              <X size={20} aria-hidden="true" />
            </button>
            <span className="grund-menge">
              <Eingabe
                wert={formatZahl(p.menge)}
                inputMode="decimal"
                beschriftung={t('grundausstattung.mengeVon', { name })}
                pruefe={(text) => (parseZahl(text) ?? 0) > 0}
                onUebernehmen={(text) => aendere(p.id, { menge: parseZahl(text) ?? p.menge })}
              />
              <span className="zutat-einheit">{zutat ? t(`einheit.${zutat.einheit}`) : ''}</span>
            </span>
            <select
              value={p.modus}
              aria-label={t('grundausstattung.modusVon', { name })}
              onChange={(e) => aendere(p.id, { modus: e.target.value as GrundausstattungsPosten['modus'] })}
            >
              <option value="proPersonTag">{t('grundausstattung.proPersonTag')}</option>
              <option value="pauschal">{t('grundausstattung.pauschal')}</option>
            </select>
          </div>
        )
      })}

      <input
        className="suchfeld"
        type="search"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        placeholder={t('grundausstattung.suchen')}
        aria-label={t('grundausstattung.suchen')}
      />
      {suche.trim() !== '' && (
        <ul className="liste vorschlaege">
          {vorschlaege.length === 0 && <li className="hinweis">{t('allgemein.keineTreffer')}</li>}
          {vorschlaege.map((z) => (
            <li key={z.id}>
              <button type="button" className="eintrag" onClick={() => hinzufuegen(z)}>
                <span className="eintrag-titel">{z.name}</span>
                <span className="eintrag-unterzeile">{t(`abteilung.${z.abteilung}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
