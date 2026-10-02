import { describe, expect, it } from 'vitest'
import { formatEuro, formatZahl, parseEuro, parseZahl } from './zahlen'

describe('parseZahl', () => {
  it('liest Zahlen mit Komma oder Punkt', () => {
    expect(parseZahl('0,5')).toBe(0.5)
    expect(parseZahl('0.5')).toBe(0.5)
    expect(parseZahl(' 125 ')).toBe(125)
  })

  it('gibt null zurück, wenn der Text keine Zahl ist', () => {
    expect(parseZahl('')).toBeNull()
    expect(parseZahl('abc')).toBeNull()
    expect(parseZahl('-3')).toBeNull()
    expect(parseZahl('1,2,3')).toBeNull()
  })
})

describe('formatZahl', () => {
  it('schreibt mit Komma und ohne überflüssige Nullen', () => {
    expect(formatZahl(0.5)).toBe('0,5')
    expect(formatZahl(125)).toBe('125')
    expect(formatZahl(0.15)).toBe('0,15')
  })
})

describe('Euro und Cent', () => {
  it('rechnet Euro-Text in ganze Cent um', () => {
    expect(parseEuro('1,29')).toBe(129)
    expect(parseEuro('5')).toBe(500)
    expect(parseEuro('0,1')).toBe(10)
    expect(parseEuro('')).toBeNull()
  })

  it('schreibt Cent als Euro mit zwei Nachkommastellen', () => {
    expect(formatEuro(129)).toBe('1,29')
    expect(formatEuro(500)).toBe('5,00')
    expect(formatEuro(5)).toBe('0,05')
  })
})
