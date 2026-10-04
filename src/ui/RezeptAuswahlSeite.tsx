import { TriangleAlert, Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { speichereTrip } from '../db/trips'
import { teilnehmerDerVariante } from '../logic/mengen'
import { fuegeRezeptHinzu } from '../logic/plan'
import { kuechenGruende, passtNichtFuer } from '../logic/pruefungen'
import { filtereRezepte } from '../logic/rezepte'
import type { Mahlzeit, Rezept, RezeptKategorie, RezeptMerkmal } from '../logic/typen'
import { KATEGORIEN } from './auswahl'
import { Seite } from './Seite'
import { useTripDaten } from './tripDaten'
import { WerbePlatz } from './WerbePlatz'

/** Beim Frühstück und Snack ist die passende Kategorie vorgewählt */
const STARTKATEGORIE: Record<Mahlzeit, RezeptKategorie | null> = {
  fruehstueck: 'fruehstueck',
  mittag: null,
  abend: null,
  snack: 'snack',
}

/** Rezeptauswahl für eine Variante einer Mahlzeit (Konzept Kapitel 6) */
export function RezeptAuswahlSeite() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id, slotId, varianteId } = useParams()
  const daten = useTripDaten(id)
  const [suche, setSuche] = useState('')
  // undefined = noch nichts gewählt, dann gilt die Startkategorie der Mahlzeit
  const [gewaehlteKategorie, setKategorie] = useState<RezeptKategorie | null | undefined>(undefined)
  const [bordkueche, setBordkueche] = useState(false)
  const [kalt, setKalt] = useState(false)
  const [nurPassende, setNurPassende] = useState(false)

  if (daten === undefined) return null
  const zurueck = `/trips/${id}/plan/${slotId}`
  const slot = daten?.trip.slots.find((s) => s.id === slotId)
  const variante = slot?.varianten.find((v) => v.id === varianteId)
  if (!daten || !slot || !variante) {
    return (
      <Seite titel={t('plan.rezeptWaehlen')} zurueck={id ? `/trips/${id}/plan` : '/'}>
        <p className="hinweis">{t('allgemein.nichtGefunden')}</p>
      </Seite>
    )
  }

  const { trip, rezepte, personen } = daten
  const { kueche, kuechenpruefung } = trip.eigenschaften
  const esserIds = new Set(teilnehmerDerVariante(trip, slot, variante).map((tn) => tn.personId))
  const esser = personen.filter((p) => esserIds.has(p.id))
  const kategorie = gewaehlteKategorie === undefined ? STARTKATEGORIE[slot.mahlzeit] : gewaehlteKategorie
  const merkmale: RezeptMerkmal[] = [...(bordkueche ? ['bordkuechentauglich' as const] : []), ...(kalt ? ['kalt' as const] : [])]

  const treffer = filtereRezepte(rezepte, {
    suche,
    kategorie,
    merkmale,
    passendFuer: nurPassende ? esser : [],
  })

  function hinweise(rezept: Rezept): string[] {
    const texte: string[] = []
    const unpassend = passtNichtFuer(rezept, esser)
    if (unpassend.length > 0) {
      texte.push(t('plan.passtNicht', { rezept: rezept.name, personen: unpassend.map((p) => p.name).join(', ') }))
    }
    if (kuechenpruefung) {
      const gruende = kuechenGruende(rezept, kueche)
      if (gruende.includes('flammen')) {
        texte.push(t('plan.kuecheFlammen', { rezept: rezept.name, n: rezept.flammen, vorhanden: kueche.flammen }))
      }
      if (gruende.includes('ofen')) texte.push(t('plan.kuecheOfen', { rezept: rezept.name }))
      if (gruende.includes('grill')) texte.push(t('plan.kuecheGrill', { rezept: rezept.name }))
    }
    return texte
  }

  async function waehlen(rezept: Rezept) {
    await speichereTrip(fuegeRezeptHinzu(trip, slot!.id, variante!.id, rezept.id))
    navigate(zurueck, { replace: true })
  }

  return (
    <Seite titel={t('plan.rezeptWaehlen')} zurueck={zurueck}>
      <input
        className="suchfeld ohne-abstand"
        type="search"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        placeholder={t('allgemein.suche')}
        aria-label={t('allgemein.suche')}
      />
      <div className="chips">
        <button type="button" className="chip" aria-pressed={kategorie === null} onClick={() => setKategorie(null)}>
          {t('allgemein.alle')}
        </button>
        {KATEGORIEN.map((k) => (
          <button key={k} type="button" className="chip" aria-pressed={kategorie === k} onClick={() => setKategorie(k)}>
            {t(`kategorie.${k}`)}
          </button>
        ))}
      </div>
      <div className="chips">
        <button type="button" className="chip" aria-pressed={nurPassende} onClick={() => setNurPassende(!nurPassende)}>
          {t('plan.passtFuerAlle')}
        </button>
        <button type="button" className="chip" aria-pressed={bordkueche} onClick={() => setBordkueche(!bordkueche)}>
          {t('merkmal.bordkuechentauglich')}
        </button>
        <button type="button" className="chip" aria-pressed={kalt} onClick={() => setKalt(!kalt)}>
          {t('merkmal.kalt')}
        </button>
      </div>

      {treffer.length === 0 && <p className="hinweis">{t('allgemein.keineTreffer')}</p>}

      <ul className="liste">
        {treffer.map((rezept) => {
          const schonGewaehlt = variante.rezeptIds.includes(rezept.id)
          const texte = hinweise(rezept)
          return (
            <li key={rezept.id}>
              <button type="button" className="eintrag" disabled={schonGewaehlt} onClick={() => waehlen(rezept)}>
                <span className="eintrag-titel">{rezept.name}</span>
                <span className="eintrag-unterzeile">
                  {t(`kategorie.${rezept.kategorie}`)} · {t(`ernaehrung.${rezept.ernaehrungsstufe}`)} ·{' '}
                  {t('rezepte.minuten', { n: rezept.zubereitungszeitMin })}
                  {schonGewaehlt && ` · ${t('plan.schonGewaehlt')}`}
                </span>
                {texte.length === 0 ? (
                  <span className="gutzeile"><Check size={16} aria-hidden="true" /> {t('plan.passtFuerAlle')}</span>
                ) : (
                  texte.map((text) => (
                    <span key={text} className="warnzeile">
                      <TriangleAlert size={16} aria-hidden="true" /> {text}
                    </span>
                  ))
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <WerbePlatz />
    </Seite>
  )
}
