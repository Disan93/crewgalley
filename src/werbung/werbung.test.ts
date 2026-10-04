import { describe, expect, it } from 'vitest'
import { AFFILIATE_AKTIV, affiliateLink } from './affiliate'
import { ECHTE_ANZEIGEN, ECHTE_BANNER_ID, TEST_BANNER_ID, bannerId, istTestbetrieb, nurNichtPersonalisiert } from './config'

describe('Anzeigen-IDs', () => {
  it('im Projekt sind echte Anzeigen noch ausgeschaltet: es werden nur Test-Anzeigen gezeigt', () => {
    // Dieser Test erinnert daran, PLAYSTORE-CHECKLISTE.md zu befolgen, bevor der Schalter umgelegt wird
    expect(ECHTE_ANZEIGEN).toBe(false)
    expect(bannerId()).toBe(TEST_BANNER_ID)
  })

  it('die eingetragene echte ID ist eine Anzeigenblock-ID (mit /) und nicht die Test-ID', () => {
    expect(ECHTE_BANNER_ID).toMatch(/^ca-app-pub-\d{16}\/\d{10}$/)
    expect(ECHTE_BANNER_ID).not.toBe(TEST_BANNER_ID)
    // Mit eingeschaltetem Schalter würde genau diese ID verwendet
    expect(bannerId(true)).toBe(ECHTE_BANNER_ID)
  })

  it('die Test-ID ist die offizielle von Google für anpassungsfähige Banner', () => {
    expect(TEST_BANNER_ID).toBe('ca-app-pub-3940256099942544/9214589741')
  })

  it('ohne Schalter gibt es immer Test-Anzeigen, auch wenn eine echte ID eingetragen ist', () => {
    expect(bannerId(false, 'ca-app-pub-1234567890123456/1234567890')).toBe(TEST_BANNER_ID)
    expect(istTestbetrieb(false, 'ca-app-pub-1234567890123456/1234567890')).toBe(true)
  })

  it('mit Schalter, aber ohne gültige ID bleibt es bei Test-Anzeigen', () => {
    expect(bannerId(true, '[ECHTE ID EINTRAGEN]')).toBe(TEST_BANNER_ID)
    expect(bannerId(true, '')).toBe(TEST_BANNER_ID)
    // App-ID (mit ~) statt Anzeigenblock-ID (mit /) versehentlich eingetragen
    expect(bannerId(true, 'ca-app-pub-1234567890123456~1234567890')).toBe(TEST_BANNER_ID)
  })

  it('mit Schalter und gültiger ID wird die echte ID verwendet', () => {
    expect(bannerId(true, 'ca-app-pub-1234567890123456/1234567890')).toBe('ca-app-pub-1234567890123456/1234567890')
    expect(istTestbetrieb(true, 'ca-app-pub-1234567890123456/1234567890')).toBe(false)
  })
})

describe('Einwilligung', () => {
  it('ohne Entscheidung nur nicht-personalisierte Werbung', () => {
    expect(nurNichtPersonalisiert('REQUIRED')).toBe(true)
    expect(nurNichtPersonalisiert('UNKNOWN')).toBe(true)
  })

  it('nach einer Entscheidung oder ohne Einwilligungspflicht entscheidet Google nach der Wahl der Person', () => {
    expect(nurNichtPersonalisiert('OBTAINED')).toBe(false)
    expect(nurNichtPersonalisiert('NOT_REQUIRED')).toBe(false)
  })
})

describe('Affiliate-Links', () => {
  const links = [
    { id: 'huette', url: 'https://www.beispiel.invalid/huette?partner=abc' },
    { id: 'segeln', url: 'https://www.beispiel.invalid/segeln?partner=[PARTNER-ID EINTRAGEN]' },
  ]

  it('sind im Projekt ausgeschaltet', () => {
    expect(AFFILIATE_AKTIV).toBe(false)
    expect(affiliateLink('huette')).toBeNull()
  })

  it('erscheinen nur eingeschaltet und mit vollständig eingetragener Adresse', () => {
    expect(affiliateLink('huette', false, links)).toBeNull()
    expect(affiliateLink('huette', true, links)).toEqual(links[0])
    expect(affiliateLink('segeln', true, links)).toBeNull()
    expect(affiliateLink('kanu', true, links)).toBeNull()
  })
})
