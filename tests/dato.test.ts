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
