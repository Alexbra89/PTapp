import { describe, it, expect } from 'vitest'
import { PR_OVELSER, finnPrOvelse } from '@/lib/prOvelser'

describe('finnPrOvelse', () => {
  it('matcher uavhengig av store bokstaver og mellomrom rundt', () => {
    expect(finnPrOvelse('  benkpress ')?.id).toBe('benkpress')
    expect(finnPrOvelse('KNEBØY')?.id).toBe('kneboey')
  })

  it('gir undefined for øvelser uten rekord', () => {
    expect(finnPrOvelse('Planke')).toBeUndefined()
  })

  it('har unike id-er', () => {
    expect(new Set(PR_OVELSER.map(o => o.id)).size).toBe(PR_OVELSER.length)
  })
})

describe('finnPrOvelse med nye navn', () => {
  it('kobler omdøpt øvelse til riktig rekord', () => {
    expect(finnPrOvelse('Incline benkpress')?.id).toBe('skraabenkpress')
  })
})
