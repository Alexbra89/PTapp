import { describe, it, expect, beforeEach } from 'vitest'
import { laasRulling } from '@/hooks/useRullelaas'

// Minimal «document» i node-miljøet: bare det låsen bruker
const body = { style: { overflow: '' } }
beforeEach(() => {
  ;(globalThis as unknown as { document: unknown }).document = { body }
  body.style.overflow = ''
})

describe('scroll-lås for ark', () => {
  it('låser og låser opp for ett ark', () => {
    const slipp = laasRulling()
    expect(body.style.overflow).toBe('hidden')
    slipp()
    expect(body.style.overflow).toBe('')
  })

  it('overlappende ark (det første lukkes mens det andre er åpent) etterlater ikke siden låst', () => {
    const forste = laasRulling()
    const andre = laasRulling() // åpnes mens det første animeres ut
    forste()
    expect(body.style.overflow).toBe('hidden') // det andre er fortsatt åpent
    andre()
    expect(body.style.overflow).toBe('')
  })

  it('samme opplåsing to ganger teller bare én gang', () => {
    const a = laasRulling()
    const b = laasRulling()
    a(); a()
    expect(body.style.overflow).toBe('hidden')
    b()
    expect(body.style.overflow).toBe('')
  })

  it('beholder en verdi siden hadde fra før', () => {
    body.style.overflow = 'auto'
    const slipp = laasRulling()
    slipp()
    expect(body.style.overflow).toBe('auto')
  })
})
