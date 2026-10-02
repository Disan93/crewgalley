import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from '../db/datenbank'
import { neueBasis } from '../logic/sicherung'
import { ABTEILUNGEN, type AbteilungId, type Einheit, type Zutat } from '../logic/typen'
import { formatEuro, formatZahl, parseEuro, parseZahl } from '../logic/zahlen'
import { pruefeZutat, type ZutatFehler } from '../logic/zutaten'

interface ZutatFormularProps {
  /** vorhandene Zutat zum Bearbeiten; ohne Angabe wird eine neue angelegt */
  zutat?: Zutat
  /** Vorschlag für den Namen einer neuen Zutat */
  startName?: string
  alle: Zutat[]
  onFertig: (zutat: Zutat) => void
  onAbbrechen: () => void
}

const EINHEITEN: Einheit[] = ['g', 'ml', 'stk']

/** Leeres Feld → null; ungültiger Text → undefined */
function liesOptional(text: string, lies: (t: string) => number | null): number | null | undefined {
  if (text.trim() === '') return null
  return lies(text) ?? undefined
}

function alsText(zahl: number | null | undefined): string {
  return zahl === null || zahl === undefined ? '' : formatZahl(zahl)
}

export function ZutatFormular({ zutat, startName, alle, onFertig, onAbbrechen }: ZutatFormularProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(zutat?.name ?? startName ?? '')
  const [einheit, setEinheit] = useState<Einheit>(zutat?.einheit ?? 'g')
  const [abteilung, setAbteilung] = useState<AbteilungId>(zutat?.abteilung ?? 'trockenwaren')
  const [packung, setPackung] = useState(alsText(zutat?.packungsgroesse))
  const [preis, setPreis] = useState(zutat?.richtpreis != null ? formatEuro(zutat.richtpreis) : '')
  const [kuehlpflichtig, setKuehlpflichtig] = useState(zutat?.kuehlpflichtig ?? false)
  const [haltU, setHaltU] = useState(alsText(zutat?.haltbarkeitUngekuehlt))
  const [haltG, setHaltG] = useState(alsText(zutat?.haltbarkeitGekuehlt))
  const [fehler, setFehler] = useState<ZutatFehler[]>([])

  const einheitKurz = t(`einheit.${einheit}`)
  const preisLabel =
    packung.trim() !== ''
      ? t('zutaten.preisPackung')
      : einheit === 'stk'
        ? t('zutaten.preisStueck')
        : t('zutaten.preisKilo', { einheit: einheitKurz })

  async function speichern(ereignis: FormEvent) {
    ereignis.preventDefault()
    // Das Formular kann in einem anderen Formular liegen (Rezept); das soll nicht mit abgeschickt werden
    ereignis.stopPropagation()

    const packungsgroesse = liesOptional(packung, parseZahl)
    const richtpreis = liesOptional(preis, parseEuro)
    const haltbarkeitUngekuehlt = liesOptional(haltU, parseZahl)
    const haltbarkeitGekuehlt = liesOptional(haltG, parseZahl)

    const eingabeFehler: ZutatFehler[] = []
    if (packungsgroesse === undefined) eingabeFehler.push('packungUngueltig')
    if (richtpreis === undefined) eingabeFehler.push('preisUngueltig')
    if (haltbarkeitUngekuehlt === undefined || haltbarkeitGekuehlt === undefined) {
      eingabeFehler.push('haltbarkeitUngueltig')
    }

    const neu: Zutat = {
      ...(zutat ?? { ...neueBasis(), quelle: 'eigen' as const }),
      name: name.trim(),
      einheit,
      abteilung,
      packungsgroesse: packungsgroesse ?? null,
      richtpreis: richtpreis ?? null,
      kuehlpflichtig,
      haltbarkeitUngekuehlt: haltbarkeitUngekuehlt ?? null,
      haltbarkeitGekuehlt: haltbarkeitGekuehlt ?? null,
      updatedAt: new Date().toISOString(),
    }
    const alleFehler = [...new Set([...eingabeFehler, ...pruefeZutat(neu, alle)])]
    setFehler(alleFehler)
    if (alleFehler.length > 0) return

    await db.zutaten.put(neu)
    onFertig(neu)
  }

  return (
    <form className="formular" onSubmit={speichern} noValidate>
      <label className="feld">
        <span>{t('zutaten.name')}</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="feld">
        <span>{t('zutaten.einheit')}</span>
        <select value={einheit} disabled={zutat !== undefined} onChange={(e) => setEinheit(e.target.value as Einheit)}>
          {EINHEITEN.map((e) => (
            <option key={e} value={e}>
              {t(`einheitLang.${e}`)}
            </option>
          ))}
        </select>
        <small>{t('zutaten.einheitFest')}</small>
      </label>

      <label className="feld">
        <span>{t('zutaten.abteilung')}</span>
        <select value={abteilung} onChange={(e) => setAbteilung(e.target.value as AbteilungId)}>
          {ABTEILUNGEN.map((a) => (
            <option key={a} value={a}>
              {t(`abteilung.${a}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="feld">
        <span>{t('zutaten.packungsgroesse', { einheit: einheitKurz })}</span>
        <input type="text" inputMode="decimal" value={packung} onChange={(e) => setPackung(e.target.value)} />
      </label>

      <label className="feld">
        <span>{preisLabel}</span>
        <input type="text" inputMode="decimal" value={preis} onChange={(e) => setPreis(e.target.value)} />
      </label>

      <label className="haken">
        <input type="checkbox" checked={kuehlpflichtig} onChange={(e) => setKuehlpflichtig(e.target.checked)} />
        <span>{t('zutaten.kuehlpflichtig')}</span>
      </label>

      <label className="feld">
        <span>{t('zutaten.haltbarkeitUngekuehlt')}</span>
        <input type="text" inputMode="numeric" value={haltU} onChange={(e) => setHaltU(e.target.value)} />
      </label>

      <label className="feld">
        <span>{t('zutaten.haltbarkeitGekuehlt')}</span>
        <input type="text" inputMode="numeric" value={haltG} onChange={(e) => setHaltG(e.target.value)} />
        <small>{t('zutaten.haltbarkeitHinweis')}</small>
      </label>

      {fehler.length > 0 && (
        <ul className="meldung fehler" role="alert">
          {fehler.map((f) => (
            <li key={f}>{t(`zutaten.fehler.${f}`)}</li>
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
