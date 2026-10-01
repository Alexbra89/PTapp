import { describe, it, expect } from 'vitest'
import { foreslaVekt, repSpenn, vektsteg } from '@/lib/progresjon'

const sett = (...x: [number, number][]) => x.map(([kg, reps]) => ({ kg, reps }))

describe('repSpenn', () => {
  it('leser spenn, enkelttall og hopper over tid', () => {
    expect(repSpenn('8-10')).toEqual([8, 10])
    expect(repSpenn('12')).toEqual([12, 12])
    expect(repSpenn('10×2')).toEqual([10, 10])
    expect(repSpenn('45 sek')).toBeNull()
    expect(repSpenn('maks')).toBeNull()
  })
})

describe('vektsteg', () => {
  it('små steg for lette vekter, større for tunge', () => {
    expect(vektsteg(12)).toBe(1)
    expect(vektsteg(60)).toBe(2.5)
    expect(vektsteg(140)).toBe(5)
  })
})

describe('foreslaVekt', () => {
  it('øker når alle sett nådde toppen av spennet', () => {
    const f = foreslaVekt(sett([60, 10], [60, 10], [60, 11]), '8-10')
    expect(f).toMatchObject({ type: 'opp', kg: 62.5 })
  })

  it('holder vekten når noen sett var under toppen', () => {
    expect(foreslaVekt(sett([60, 10], [60, 9], [60, 8]), '8-10')).toMatchObject({ type: 'samme', kg: 60 })
  })

  it('går ned når de fleste settene var langt under spennet', () => {
    const f = foreslaVekt(sett([100, 5], [100, 4], [100, 6]), '8-10')
    expect(f?.type).toBe('ned')
    expect(f!.kg).toBeLessThan(100)
  })

  it('ser bare på arbeidssettene (tyngste vekt)', () => {
    expect(foreslaVekt(sett([40, 6], [60, 10], [60, 10]), '8-10')).toMatchObject({ type: 'opp' })
  })

  it('gir ingen forslag uten historikk, uten vekt eller for tidsøvelser', () => {
    expect(foreslaVekt(undefined, '8-10')).toBeNull()
    expect(foreslaVekt(sett([0, 15]), '12')).toBeNull()
    expect(foreslaVekt(sett([20, 1]), '45 sek')).toBeNull()
  })
})
