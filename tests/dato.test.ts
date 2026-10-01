import { describe, it, expect } from 'vitest'
import { lokalDato } from '@/lib/dato'

describe('lokalDato', () => {
  it('gir yyyy-MM-dd med ledende nuller', () => {
    expect(lokalDato(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('bruker lokal dato rett etter midnatt (ikke UTC som toISOString)', () => {
    expect(lokalDato(new Date(2026, 8, 30, 0, 15))).toBe('2026-09-30')
  })

  it('bruker dagens dato uten argument', () => {
    const n = new Date()
    expect(lokalDato()).toBe(lokalDato(new Date(n.getFullYear(), n.getMonth(), n.getDate())))
  })
})

describe('tilDato og formaterDato', () => {
  it('tolker yyyy-MM-dd som lokal dato', async () => {
    const { tilDato } = await import('@/lib/dato')
    expect(tilDato('2026-10-01')?.getDate()).toBe(1)
  })
  it('krasjer ikke på manglende eller ugyldige datoer', async () => {
    const { tilDato, formaterDato } = await import('@/lib/dato')
    for (const v of [undefined, null, '', 'tull', 42]) {
      expect(tilDato(v)).toBeNull()
      expect(formaterDato(v, 'dd.MM')).toBe('')
    }
    expect(formaterDato('2026-10-01', 'dd.MM')).toBe('01.10')
  })
})
