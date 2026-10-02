import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router'
import { db } from '../db/datenbank'
import { pruefeRezept, type RezeptFehler } from '../logic/rezepte'
import { neueBasis } from '../logic/sicherung'
import type { Ernaehrung, Rezept, RezeptKategorie, RezeptMerkmal, Zutat } from '../logic/typen'
import { formatZahl, parseZahl } from '../logic/zahlen'
import { sucheZutaten } from '../logic/zutaten'
import { ERNAEHRUNGSSTUFEN, KATEGORIEN, MERKMALE } from './auswahl'
import { Seite } from './Seite'
import { ZutatFormular } from './ZutatFormular'

const MAX_VORSCHLAEGE = 8

export function RezeptBearbeiten() {
  const { t } = useTranslation()
  const { id } = useParams()
  const daten = useLiveQuery(
    async () => ({ rezept: id ? await db.rezepte.get(id) : undefined, zutaten: await db.zutaten.toArray() }),
    [id],
  )

  if (!daten) return null
  const titel = id ? t('rezepte.bearbeitenTitel') : t('rezepte.neuTitel')
  const zurueck = id ? `/rezepte/${id}` : '/rezepte'

  if (id && !daten.rezept) {
    return (
      <Seite titel={titel} zurueck="/rezepte">
        <p className="hinweis">{t('allgemein.nichtGefunden')}</p>
      </Seite>
    )
  }
  // Mitgelieferte Rezepte sind nur kopierbar (Konzept 5.3)
  if (daten.rezept?.quelle === 'mitgeliefert') return <Navigate to={zurueck} replace />

  return (
    <Seite titel={titel} zurueck={zurueck}>
      <RezeptFormular key={id ?? 'neu'} rezept={daten.rezept} zutaten={daten.zutaten} zurueck={zurueck} />
    </Seite>
  )
}

interface Zeile {
  zutatId: string
  menge: string
}

interface RezeptFormularProps {
  rezept?: Rezept
  zutaten: Zutat[]
  zurueck: string
}

function RezeptFormular({ rezept, zutaten, zurueck }: RezeptFormularProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [name, setName] = useState(rezept?.name ?? '')
  const [kategorie, setKategorie] = useState<RezeptKategorie>(rezept?.kategorie ?? 'hauptgericht')
  const [stufe, setStufe] = useState<Ernaehrung>(rezept?.ernaehrungsstufe ?? 'alles')
  const [merkmale, setMerkmale] = useState<RezeptMerkmal[]>(rezept?.merkmale ?? [])
  const [flammen, setFlammen] = useState(String(rezept?.flammen ?? 1))
  const [brauchtOfen, setBrauchtOfen] = useState(rezept?.brauchtOfen ?? false)
  const [brauchtGrill, setBrauchtGrill] = useState(rezept?.brauchtGrill ?? false)
  const [zeit, setZeit] = useState(String(rezept?.zubereitungszeitMin ?? 30))
  const [zubereitung, setZubereitung] = useState(rezept?.zubereitung ?? '')
  const [zeilen, setZeilen] = useState<Zeile[]>(
    rezept?.zutaten.map((z) => ({ zutatId: z.zutatId, menge: formatZahl(z.mengeProPortion) })) ?? [],
  )
  const [suche, setSuche] = useState('')
  const [neueZutatName, setNeueZutatName] = useState<string | null>(null)
  const [fehler, setFehler] = useState<RezeptFehler[]>([])

  const vorschlaege =
    suche.trim() === ''
      ? []
      : sucheZutaten(zutaten, suche)
          .filter((z) => !zeilen.some((zeile) => zeile.zutatId === z.id))
          .slice(0, MAX_VORSCHLAEGE)

  function zutatHinzufuegen(zutat: Zutat) {
    setZeilen((alt) => [...alt, { zutatId: zutat.id, menge: '' }])
    setSuche('')
  }

  function merkmalUmschalten(merkmal: RezeptMerkmal, an: boolean) {
    setMerkmale((alt) => (an ? [...alt, merkmal] : alt.filter((m) => m !== merkmal)))
  }

  async function speichern(ereignis: FormEvent) {
    ereignis.preventDefault()
    const neu: Rezept = {
      ...(rezept ?? { ...neueBasis(), quelle: 'eigen' as const }),
      name: name.trim(),
      kategorie,
      ernaehrungsstufe: stufe,
      merkmale,
      // Ungültige Eingaben werden zu 0 bzw. -1 und fallen damit in der Prüfung auf
      zutaten: zeilen.map((z) => ({ zutatId: z.zutatId, mengeProPortion: parseZahl(z.menge) ?? 0 })),
      zubereitung: zubereitung.trim(),
      flammen: parseZahl(flammen) ?? -1,
      brauchtOfen,
      brauchtGrill,
      zubereitungszeitMin: parseZahl(zeit) ?? -1,
      updatedAt: new Date().toISOString(),
    }
    const gefunden = pruefeRezept(neu, zutaten)
    setFehler(gefunden)
    if (gefunden.length > 0) return

    await db.rezepte.put(neu)
    navigate(`/rezepte/${neu.id}`, { replace: true })
  }

  return (
    <>
      <form className="formular" onSubmit={speichern} noValidate>
        <label className="feld">
          <span>{t('rezepte.name')}</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="feld">
          <span>{t('rezepte.kategorie')}</span>
          <select value={kategorie} onChange={(e) => setKategorie(e.target.value as RezeptKategorie)}>
            {KATEGORIEN.map((k) => (
              <option key={k} value={k}>
                {t(`kategorie.${k}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="feld">
          <span>{t('rezepte.ernaehrungsstufe')}</span>
          <select value={stufe} onChange={(e) => setStufe(e.target.value as Ernaehrung)}>
            {ERNAEHRUNGSSTUFEN.map((s) => (
              <option key={s} value={s}>
                {t(`ernaehrung.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="feldgruppe">
          <legend>{t('rezepte.merkmale')}</legend>
          {MERKMALE.map((m) => (
            <label key={m} className="haken">
              <input
                type="checkbox"
                checked={merkmale.includes(m)}
                onChange={(e) => merkmalUmschalten(m, e.target.checked)}
              />
              <span>{t(`merkmal.${m}`)}</span>
            </label>
          ))}
          <small>{t('rezepte.merkmaleHinweis')}</small>
        </fieldset>

        <fieldset className="feldgruppe">
          <legend>{t('rezepte.zutaten')}</legend>
          {zeilen.length === 0 && <p className="hinweis">{t('rezepte.nochKeineZutaten')}</p>}
          {zeilen.map((zeile, index) => {
            const zutat = zutaten.find((z) => z.id === zeile.zutatId)
            const zutatName = zutat?.name ?? '?'
            return (
              <div key={zeile.zutatId} className="zutat-zeile">
                <span className="zutat-name">{zutatName}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={zeile.menge}
                  aria-label={t('rezepte.mengeVon', { name: zutatName })}
                  onChange={(e) =>
                    setZeilen((alt) => alt.map((z, i) => (i === index ? { ...z, menge: e.target.value } : z)))
                  }
                />
                <span className="zutat-einheit">{zutat ? t(`einheit.${zutat.einheit}`) : ''}</span>
                <button
                  type="button"
                  className="zweitrangig klein"
                  aria-label={t('rezepte.zutatEntfernen', { name: zutatName })}
                  onClick={() => setZeilen((alt) => alt.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              </div>
            )
          })}

          <input
            className="suchfeld"
            type="search"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder={t('rezepte.zutatSuchen')}
            aria-label={t('rezepte.zutatSuchen')}
          />
          {suche.trim() !== '' && (
            <ul className="liste vorschlaege">
              {vorschlaege.map((z) => (
                <li key={z.id}>
                  <button type="button" className="eintrag" onClick={() => zutatHinzufuegen(z)}>
                    <span className="eintrag-titel">{z.name}</span>
                    <span className="eintrag-unterzeile">{t(`abteilung.${z.abteilung}`)}</span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className="eintrag" onClick={() => setNeueZutatName(suche.trim())}>
                  <span className="eintrag-titel">{t('rezepte.zutatNeu', { name: suche.trim() })}</span>
                </button>
              </li>
            </ul>
          )}
        </fieldset>

        <label className="feld">
          <span>{t('rezepte.flammenFeld')}</span>
          <input type="text" inputMode="numeric" value={flammen} onChange={(e) => setFlammen(e.target.value)} />
        </label>

        <label className="haken">
          <input type="checkbox" checked={brauchtOfen} onChange={(e) => setBrauchtOfen(e.target.checked)} />
          <span>{t('rezepte.brauchtOfen')}</span>
        </label>

        <label className="haken">
          <input type="checkbox" checked={brauchtGrill} onChange={(e) => setBrauchtGrill(e.target.checked)} />
          <span>{t('rezepte.brauchtGrill')}</span>
        </label>

        <label className="feld">
          <span>{t('rezepte.zeit')}</span>
          <input type="text" inputMode="numeric" value={zeit} onChange={(e) => setZeit(e.target.value)} />
        </label>

        <label className="feld">
          <span>{t('rezepte.zubereitung')}</span>
          <textarea rows={6} value={zubereitung} onChange={(e) => setZubereitung(e.target.value)} />
        </label>

        {fehler.length > 0 && (
          <ul className="meldung fehler" role="alert">
            {fehler.map((f) => (
              <li key={f}>{t(`rezepte.fehler.${f}`)}</li>
            ))}
          </ul>
        )}

        <div className="knoepfe">
          <button type="submit">{t('allgemein.speichern')}</button>
          <button type="button" className="zweitrangig" onClick={() => navigate(zurueck, { replace: true })}>
            {t('allgemein.abbrechen')}
          </button>
        </div>
      </form>

      {neueZutatName !== null && (
        <div className="ueberlagerung" role="dialog" aria-modal="true" aria-label={t('zutaten.neuTitel')}>
          <div className="ueberlagerung-inhalt">
            <h2>{t('zutaten.neuTitel')}</h2>
            <ZutatFormular
              startName={neueZutatName}
              alle={zutaten}
              onFertig={(zutat) => {
                zutatHinzufuegen(zutat)
                setNeueZutatName(null)
              }}
              onAbbrechen={() => setNeueZutatName(null)}
            />
          </div>
        </div>
      )}
    </>
  )
}
