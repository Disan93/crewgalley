import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { DatenBereich } from './DatenBereich'
import { Seite } from './Seite'

export function EinstellungenSeite() {
  const { t } = useTranslation()

  return (
    <Seite titel={t('einstellungen.titel')} zurueck="/">
      <Link className="knopf zweitrangig" to="/zutaten">
        {t('einstellungen.zutatenVerwalten')}
      </Link>
      <DatenBereich />
    </Seite>
  )
}
