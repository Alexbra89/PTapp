'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Dial } from '@/components/atelier/Dial'
import { BRAND } from '@/lib/brand'

export default function GlemtPassord() {
  const [epost, setEpost] = useState('')
  const [laster, setLaster] = useState(false)
  const [sendt, setSendt] = useState(false)
  const [feil, setFeil] = useState('')

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setLaster(true); setFeil('')
    const { error } = await createClient().auth.resetPasswordForEmail(epost.trim(), {
      redirectTo: `${window.location.origin}/nytt-passord`,
    })
    setLaster(false)
    // Samme svar uansett om e-posten finnes – ellers kan siden brukes til å finne ut hvem som har konto.
    // Unntaket er for mange forsøk, der brukeren må vente.
    if (error && (error.status === 429 || /rate limit|security purposes/i.test(error.message))) {
      setFeil('For mange forsøk. Vent litt og prøv igjen.')
      return
    }
    setSendt(true)
  }

  return (
    <div className="login-root">
      <div className="app-bg" aria-hidden><Dial className="app-bg-dial" /></div>
      <div className="login-card-wrap anim-fade-up">
        <div className="login-card glass-card crop">
          <div className="login-logo-area">
            <div className="login-logo-icon"><span className="monogram">AB</span></div>
            <div className="login-title">Glemt <em>passordet?</em></div>
            <div className="login-subtitle">{BRAND.navn} · Tilbakestill passord</div>
          </div>

          {sendt ? (
            <div className="pf-melding" role="status" style={{ alignItems: 'flex-start' }}>
              <Check size={14} strokeWidth={2} style={{ marginTop: 3, flexShrink: 0 }} />
              <span>Hvis {epost.trim()} har en konto, har vi sendt en lenke for å lage nytt passord. Sjekk innboksen (og søppelpost). Lenken virker en kort stund og må åpnes i denne nettleseren.</span>
            </div>
          ) : (
            <form onSubmit={send}>
              <p className="pf-dempet" style={{ marginBottom: '1.25rem' }}>Skriv e-posten du logger inn med, så sender vi en lenke for å lage nytt passord.</p>
              <div className="login-field">
                <label className="login-field-label" htmlFor="epost">E-post</label>
                <div style={{ position: 'relative' }}>
                  <span className="login-field-icon"><Mail size={15} strokeWidth={1.4} /></span>
                  <input id="epost" type="email" className="input login-field-input" value={epost}
                    onChange={e => setEpost(e.target.value)} placeholder="navn@epost.no" required autoComplete="email" />
                </div>
              </div>
              {feil && <div className="login-error-box"><span className="login-error-text">{feil}</span></div>}
              <button type="submit" className="btn btn-primary login-btn-full" disabled={laster}
                style={{ marginTop: '0.75rem', marginBottom: '1.4rem', justifyContent: 'space-between', paddingLeft: '1.5rem', paddingRight: '0.5rem' }}>
                <span>{laster ? 'Sender …' : 'Send lenke'}</span>
                <span className="hq-cta-arrow" style={{ width: 36, height: 36 }}><ArrowRight size={16} strokeWidth={1.5} /></span>
              </button>
            </form>
          )}

          <p className="login-signup-row">
            <Link href="/login" className="login-signup-link"><ArrowLeft size={12} style={{ verticalAlign: '-1px' }} /> Tilbake til innlogging</Link>
          </p>
        </div>
        <p className="login-footer">{BRAND.navn} · {BRAND.under}</p>
      </div>
    </div>
  )
}
