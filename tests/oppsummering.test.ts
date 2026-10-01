import { describe, it, expect } from 'vitest'
import { oppsummer, varighetSek, fmtVarighet } from '@/lib/oppsummering'

describe('oppsummer', () => {
  it('regner volum bare for fullførte sett', () => {
    const r = oppsummer([{ navn: 'Benkpress', sett: [{ kg: 60, reps: 10, fullfort: true }, { kg: 60, reps: 10, fullfort: false }] }])
    expect(r.volum).toBe(600)
    expect(r.endring).toBeNull()
  })

  it('sammenligner med forrige gang for øvelser med historikk', () => {
    const r = oppsummer([
      { navn: 'Benkpress', sett: [{ kg: 66, reps: 10, fullfort: true }], forrige: [{ kg: 60, reps: 10 }] },
      { navn: 'Ny øvelse', sett: [{ kg: 20, reps: 10, fullfort: true }] },
    ])
    expect(r.endring).toBe(10)
    expect(r.perOvelse[0].retning).toBe('opp')
    expect(r.perOvelse[1].retning).toBeNull()
  })

  it('finner beste sett og retning ned', () => {
    const r = oppsummer([{ navn: 'Knebøy', sett: [{ kg: 100, reps: 3, fullfort: true }, { kg: 90, reps: 8, fullfort: true }], forrige: [{ kg: 100, reps: 5 }] }])
    expect(r.perOvelse[0].beste).toEqual({ kg: 100, reps: 3 })
    expect(r.perOvelse[0].retning).toBe('ned')
  })
})

describe('varighet', () => {
  it('bruker stoppeklokka når den er brukt', () => {
    expect(varighetSek(1800, 0, 10_000_000)).toBe(1800)
  })
  it('bruker starttid ellers, med tak på 4 timer', () => {
    expect(varighetSek(0, 1_000_000, 1_000_000 + 45 * 60_000)).toBe(2700)
    expect(varighetSek(0, 0, 10 * 3600_000)).toBe(4 * 3600)
  })
  it('formaterer', () => {
    expect(fmtVarighet(2700)).toBe('45 min')
    expect(fmtVarighet(4500)).toBe('1 t 15 min')
  })
})
