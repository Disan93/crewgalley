import { useTranslation } from 'react-i18next'
import { affiliateLink } from '../werbung/affiliate'

/**
 * Dezenter Link "Ausrüstung ansehen" mit dem Hinweis "Werbelink". Erscheint nur, wenn
 * Affiliate-Links in src/werbung/affiliate.ts eingeschaltet sind und für diese Kennung
 * eine Adresse eingetragen ist. Noch auf keinem Bildschirm eingebunden.
 */
export function AffiliateHinweis({ id }: { id: string }) {
  const { t } = useTranslation()
  const link = affiliateLink(id)
  if (!link) return null

  return (
    <p className="affiliate">
      <a href={link.url} target="_blank" rel="sponsored noopener noreferrer">
        {t('werbung.ausruestung')}
      </a>
      <span className="affiliate-marke">{t('werbung.werbelink')}</span>
    </p>
  )
}
