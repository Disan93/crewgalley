import { ChevronUp, ChevronDown } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { version } from '../../package.json'
import { db } from '../db/datenbank'
import { SCHEMA_VERSION } from '../logic/sicherung'
import type { AbteilungId, Design } from '../logic/typen'
import { IST_ENTWICKLUNG, devModus, setzeDevModus } from '../pro/entitlement'
import type { DevModus } from '../pro/regeln'
import { proPfad, usePro } from '../pro/usePro'
import { DatenBereich } from './DatenBereich'
import { GrundausstattungEditor } from './GrundausstattungEditor'
import { Seite } from './Seite'

const DESIGNS: Design[] = ['system', 'hell', 'dunkel']
const DEV_MODI: DevModus[] = ['normal', 'pro', 'kostenlos']

export function EinstellungenSeite() {
  const { t } = useTranslation()
  const { pro, gesperrt } = usePro()
  const daten = useLiveQuery(async () => ({
    einstellungen: await db.einstellungen.get('app'),
    zutaten: await db.zutaten.toArray(),
  }))
  const einstellungen = daten?.einstellungen

  function verschiebe(reihenfolge: AbteilungId[], index: number, richtung: -1 | 1) {
    const neu = [...reihenfolge]
    const ziel = index + richtung
    ;[neu[index], neu[ziel]] = [neu[ziel], neu[index]]
    void db.einstellungen.update('app', { abteilungsReihenfolge: neu })
  }

  return (
    <Seite titel={t('einstellungen.titel')} zurueck="/">
      {einstellungen && (
        <section className="karte">
          <h2>{t('einstellungen.design')}</h2>
          <div className="chips ohne-rand umbruch">
            {DESIGNS.map((d) => (
              <button
                key={d}
                type="button"
                className="chip"
                aria-pressed={einstellungen.design === d}
                onClick={() => void db.einstellungen.update('app', { design: d })}
              >
                {t(`einstellungen.designWahl.${d}`)}
              </button>
            ))}
          </div>
        </section>
      )}

      <Link className="knopf zweitrangig abstand" to="/zutaten">
        {t('einstellungen.zutatenVerwalten')}
      </Link>

      {einstellungen && (
        <section className="karte">
          <h2>{t('einstellungen.abteilungen')}</h2>
          <p className="hinweis">{t('einstellungen.abteilungenHinweis')}</p>
          {einstellungen.abteilungsReihenfolge.map((abteilung, index, liste) => {
            const name = t(`abteilung.${abteilung}`)
            return (
              <div key={abteilung} className="sortier-zeile">
                <span>
                  {index + 1}. {name}
                </span>
                <button
                  type="button"
                  className="zweitrangig klein"
                  aria-label={t('einstellungen.nachOben', { name })}
                  disabled={index === 0}
                  onClick={() => verschiebe(liste, index, -1)}
                >
                  <ChevronUp size={20} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="zweitrangig klein"
                  aria-label={t('einstellungen.nachUnten', { name })}
                  disabled={index === liste.length - 1}
                  onClick={() => verschiebe(liste, index, 1)}
                >
                  <ChevronDown size={20} aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </section>
      )}

      {einstellungen && daten && (
        <section className="karte">
          <h2>{t('grundausstattung.standardTitel')}</h2>
          <p className="hinweis">{t('grundausstattung.standardHinweis')}</p>
          <GrundausstattungEditor
            posten={einstellungen.standardGrundausstattung}
            zutaten={daten.zutaten}
            onAendern={(standardGrundausstattung) =>
              void db.einstellungen.update('app', { standardGrundausstattung })
            }
          />
        </section>
      )}

      <section className="karte">
        <h2>{t('pro.titel')}</h2>
        <p className="hinweis">{pro ? t('pro.statusAktiv') : gesperrt ? t('pro.statusKostenlos') : t('pro.statusNochFrei')}</p>
        <Link className="knopf zweitrangig" to={proPfad('/einstellungen')}>
          {t('pro.ansehen')}
        </Link>
        {/* Entwickler-Schalter: gibt es nur bei "npm run dev", nie in der veröffentlichten App */}
        {IST_ENTWICKLUNG && (
          <>
            <h3>{t('pro.dev.titel')}</h3>
            <div className="chips ohne-rand umbruch">
              {DEV_MODI.map((m) => (
                <button key={m} type="button" className="chip" aria-pressed={devModus() === m} onClick={() => setzeDevModus(m)}>
                  {t(`pro.dev.${m}`)}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <DatenBereich />

      <section className="karte">
        <h2>{t('einstellungen.info')}</h2>
        <p>{t('einstellungen.infoVersion', { version, schema: SCHEMA_VERSION })}</p>
        <p className="hinweis">{t('einstellungen.infoDaten')}</p>
        <a className="knopf zweitrangig" href="datenschutz/">
          {t('einstellungen.datenschutz')}
        </a>
      </section>
    </Seite>
  )
}
