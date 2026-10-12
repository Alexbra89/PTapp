import { describe, it, expect } from 'vitest'
import { beregnMal, bmrMifflin, fordelMakro, erKonsistent, makroKcal, validerInput, retningFraProfil, KONFIG, type MalInput } from '@/lib/kosthold/mal'

const mann: MalInput = { vekt: 82, hoyde: 182, alder: 37, grunnlag: 'mann', aktivitet: 'moderat', retning: 'vedlikehold' }

describe('Mifflin–St Jeor', () => {
  it('stemmer med formelen for mann og kvinne', () => {
    // 10·82 + 6,25·182 − 5·37 + 5 = 1777,5
    expect(bmrMifflin(mann)).toBeCloseTo(1777.5, 10)
    // 10·65 + 6,25·168 − 5·30 − 161 = 1389
    expect(bmrMifflin({ vekt: 65, hoyde: 168, alder: 30, grunnlag: 'kvinne' })).toBe(1389)
  })
})

describe('beregnMal', () => {
  it('vedlikehold = BMR × aktivitetsfaktor, uten ekstra treningskalorier', () => {
    const r = beregnMal(mann)
    expect(r.vedlikehold).toBe(Math.round(1777.5 * 1.55))
    expect(r.kcal).toBe(Math.round((1777.5 * 1.55) / 10) * 10)
  })

  it('vektnedgang 0,5 kg/uke gir ~550 kcal underskudd', () => {
    const r = beregnMal({ ...mann, retning: 'ned', tempo: 0.5 })
    expect(r.vedlikehold - r.kcal).toBeGreaterThan(530)
    expect(r.vedlikehold - r.kcal).toBeLessThan(570)
  })

  it('underskuddet begrenses til 25 % av vedlikehold', () => {
    const r = beregnMal({ ...mann, aktivitet: 'stillesittende', retning: 'ned', tempo: 1 })
    expect(r.kcal).toBeGreaterThanOrEqual(Math.round(r.vedlikehold * 0.75) - 10)
    expect(r.merknader.join(' ')).toMatch(/25 %/)
  })

  it('aldri under gulvet for beregningsgrunnlaget', () => {
    const r = beregnMal({ vekt: 50, hoyde: 155, alder: 60, grunnlag: 'kvinne', aktivitet: 'stillesittende', retning: 'ned', tempo: 1 })
    expect(r.kcal).toBeGreaterThanOrEqual(Math.min(KONFIG.minKcal.kvinne, r.vedlikehold) - 10)
  })

  it('muskelvekst gir overskudd, begrenset', () => {
    const r = beregnMal({ ...mann, retning: 'opp', tempo: 0.25 })
    expect(r.kcal).toBeGreaterThan(r.vedlikehold)
    expect(r.kcal - r.vedlikehold).toBeLessThanOrEqual(KONFIG.maksOverskudd + 10)
  })

  it('protein etter mål og kroppsvekt', () => {
    expect(beregnMal({ ...mann, retning: 'ned' }).protein).toBe(Math.round(82 * 2.0))
    expect(beregnMal({ ...mann, retning: 'opp' }).protein).toBe(Math.round(82 * 1.8))
    expect(beregnMal(mann).protein).toBe(Math.round(82 * 1.6))
  })

  it('ved KMI ≥ 30 brukes vekten ved KMI 25 som referanse for protein', () => {
    const r = beregnMal({ ...mann, vekt: 125, retning: 'ned' })
    const ref = 25 * 1.82 ** 2
    expect(r.proteinReferansevekt).toBeCloseTo(ref, 0)
    expect(r.protein).toBe(Math.round(ref * 2.0))
  })

  it('P×4 + K×4 + F×9 er konsistent med energimålet for mange profiler', () => {
    for (const vekt of [50, 65, 82, 100, 140])
      for (const aktivitet of ['stillesittende', 'lett', 'moderat', 'hoy', 'svart_hoy'] as const)
        for (const retning of ['ned', 'vedlikehold', 'opp'] as const)
          for (const grunnlag of ['mann', 'kvinne'] as const) {
            const r = beregnMal({ vekt, hoyde: 175, alder: 35, grunnlag, aktivitet, retning })
            expect(Math.abs(makroKcal(r) - r.kcal), `${vekt} ${aktivitet} ${retning} ${grunnlag}`).toBeLessThanOrEqual(2)
            expect(r.karbohydrater).toBeGreaterThanOrEqual(0)
            expect(r.fett).toBeGreaterThan(0)
          }
  })
})

describe('fordelMakro', () => {
  it('karbohydrater fyller resten', () => {
    const m = fordelMakro(2500, 160, 0.3)
    expect(m).toEqual({ kcal: 2500, protein: 160, fett: 83, karbohydrater: 278 })
    expect(erKonsistent(m)).toBe(true)
  })
  it('for lite energi: senker fett, deretter protein – aldri negative karbo', () => {
    const m = fordelMakro(900, 250, 0.3, 40)
    expect(m.karbohydrater).toBeGreaterThanOrEqual(0)
    expect(m.protein).toBeLessThan(250)
    expect(Math.abs(makroKcal(m) - 900)).toBeLessThanOrEqual(9)
  })
})

describe('validering og profil', () => {
  it('avviser manglende eller urimelige verdier', () => {
    expect(validerInput(mann)).toEqual([])
    expect(validerInput({ ...mann, vekt: 0 })).toHaveLength(1)
    expect(validerInput({ ...mann, alder: 12 })).toHaveLength(1)
    expect(validerInput({ vekt: 80 })).toHaveLength(5)
  })
  it('oversetter treningsmålet i profilen', () => {
    expect(retningFraProfil('ned_i_vekt')).toBe('ned')
    expect(retningFraProfil('bygge_muskler')).toBe('opp')
    expect(retningFraProfil('kondisjon')).toBe('vedlikehold')
    expect(retningFraProfil(null)).toBe('vedlikehold')
  })
})
