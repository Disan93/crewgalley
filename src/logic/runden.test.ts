import { describe, expect, it } from 'vitest'
import { rundeOhnePackung } from './runden'

// Konzept Kapitel 12, Testfall 4
describe('rundeOhnePackung', () => {
  it('rundet unter 100 g auf 10 auf', () => {
    expect(rundeOhnePackung(73, 'g')).toBe(80)
  })

  it('rundet unter 1000 g auf 50 auf', () => {
    expect(rundeOhnePackung(430, 'g')).toBe(450)
  })

  it('rundet ab 1000 g auf 100 auf', () => {
    expect(rundeOhnePackung(1230, 'g')).toBe(1300)
  })

  it('rundet Stück auf ganze Zahl auf', () => {
    expect(rundeOhnePackung(2.3, 'stk')).toBe(3)
  })

  it('lässt bereits runde Mengen unverändert', () => {
    expect(rundeOhnePackung(500, 'ml')).toBe(500)
  })
})
