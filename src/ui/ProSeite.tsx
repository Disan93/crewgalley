import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { holeProvider } from '../pro/billing'
import type { BillingProvider } from '../pro/billing/typen'
import { BILLING_ENABLED } from '../pro/config'
import { setzeGekauft } from '../pro/entitlement'
import { PRO_FUNKTIONEN } from '../pro/regeln'
import { usePro } from '../pro/usePro'
import { Seite } from './Seite'

interface Meldung {
  art: 'ok' | 'fehler'
  text: string
}

/**
 * Pro-Bildschirm (Paywall). Er erscheint nur, wenn jemand eine gesperrte Funktion
 * antippt oder ihn in den Einstellungen öffnet – nie von selbst.
 */
export function ProSeite() {
  const { t } = useTranslation()
  const { pro } = usePro()
  const [parameter] = useSearchParams()
  const [provider, setProvider] = useState<BillingProvider | null>(null)
  const [preis, setPreis] = useState<string | null>(null)
  const [beschaeftigt, setBeschaeftigt] = useState(false)
  const [meldung, setMeldung] = useState<Meldung | null>(null)

  useEffect(() => {
    let aktuell = true
    void holeProvider().then(async (p) => {
      const gefunden = await p.preis()
      if (!aktuell) return
      setProvider(p)
      setPreis(gefunden)
    })
    return () => {
      aktuell = false
    }
  }, [])

  const kaufMoeglich = BILLING_ENABLED && provider?.art === 'play'

  async function kaufen() {
    if (!provider) return
    setBeschaeftigt(true)
    const ergebnis = await provider.kaufen()
    if (ergebnis === 'gekauft') setzeGekauft(true)
    setMeldung({ art: ergebnis === 'gekauft' ? 'ok' : 'fehler', text: t(`pro.meldung.${ergebnis}`) })
    setBeschaeftigt(false)
  }

  async function wiederherstellen() {
    if (!provider || provider.art !== 'play') {
      setMeldung({ art: 'fehler', text: t('pro.meldung.wiederherstellenNurApp') })
      return
    }
    setBeschaeftigt(true)
    try {
      const gefunden = await provider.wiederherstellen()
      setzeGekauft(gefunden)
      setMeldung(
        gefunden
          ? { art: 'ok', text: t('pro.meldung.wiederhergestellt') }
          : { art: 'fehler', text: t('pro.meldung.nichtsGefunden') },
      )
    } catch {
      setMeldung({ art: 'fehler', text: t('pro.meldung.fehler') })
    }
    setBeschaeftigt(false)
  }

  return (
    <Seite titel={t('pro.titel')} zurueck={parameter.get('von') ?? '/'}>
      <section className="kopfkarte">
        <span className="kopfkarte-art">{t('pro.titel')}</span>
        <h2>{t('pro.ueberschrift')}</h2>
        <p>{t('pro.untertitel')}</p>
      </section>

      <section className="karte">
        <ul className="pro-liste">
          {/* Nur Funktionen, die es in der App schon gibt */}
          {PRO_FUNKTIONEN.filter((f) => f.vorhanden).map((f) => (
            <li key={f.id}>
              <Check size={20} aria-hidden="true" />
              <span>{t(`pro.funktion.${f.id}`)}</span>
            </li>
          ))}
        </ul>
        <p className="hinweis">{t('pro.kostenlosBleibt')}</p>
      </section>

      {pro ? (
        <p className="meldung ok">{t('pro.aktiv')}</p>
      ) : (
        <>
          <p className="pro-preis">
            <strong>{preis ?? t('pro.preisPlatzhalter')}</strong>
            <span>{t('pro.einmalkauf')}</span>
          </p>
          <div className="knoepfe">
            <button type="button" disabled={!kaufMoeglich || beschaeftigt} onClick={kaufen}>
              {BILLING_ENABLED && provider?.art === 'web' ? t('pro.nurInApp') : t('pro.freischalten')}
            </button>
            <button type="button" className="zweitrangig" disabled={beschaeftigt} onClick={wiederherstellen}>
              {t('pro.wiederherstellen')}
            </button>
          </div>
          {!BILLING_ENABLED && <p className="hinweis">{t('pro.nochNichtVerfuegbar')}</p>}
        </>
      )}

      {meldung && (
        <p className={`meldung ${meldung.art}`} role="status">
          {meldung.text}
        </p>
      )}
    </Seite>
  )
}
