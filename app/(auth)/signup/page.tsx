'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, KeyRound, Eye, EyeOff, User, Check } from 'lucide-react'
import { Dial } from '@/components/atelier/Dial'
import { BRAND } from '@/lib/brand'

export default function Signup() {
  const [navn,      setNavn]      = useState('')
  const [epost,     setEpost]     = useState('')
  const [passord,   setPassord]   = useState('')
  const [passord2,  setPassord2]  = useState('')
  const [error,     setError]     = useState('')
  const [suksess,   setSuksess]   = useState(false)
  const [laster,    setLaster]    = useState(false)
  const [visP1,     setVisP1]     = useState(false)
  const [visP2,     setVisP2]     = useState(false)
  const [mounted,   setMounted]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (passord !== passord2) { setError('Passordene stemmer ikke overens'); return }
    if (passord.length < 6)   { setError('Passordet må være minst 6 tegn'); return }

    setLaster(true)
    try {
      // 1. Opprett bruker
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: epost,
        password: passord,
        options: { data: { full_name: navn } },
      })
      if (signUpError) throw signUpError

      // 2. Logg inn umiddelbart (unngår hvitskjerm / epost-bekreftelse-limbo)
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: epost,
        password: passord,
      })
      if (loginError) throw loginError

      // 3. Opprett profil-rad med bruker-ID
      const userId = loginData.user?.id ?? signUpData.user?.id
      if (userId) {
        await supabase.from('profiler').upsert({
          id: userId,
          epost,
          navn,
          vekt: 0, hoyde: 0, mal: 'bygge_muskler', onsket_vekt: 0,
        }, { onConflict: 'id' })
      }

      setSuksess(true)
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      if (err.message?.includes('already registered') || err.message?.includes('already been registered')) {
        setError('Denne eposten er allerede registrert — prøv å logge inn')
      } else {
        setError(err.message ?? 'Noe gikk galt')
      }
    } finally {
      setLaster(false)
    }
  }

  const styrke = passord.length === 0 ? 0
    : passord.length < 6 ? 1
    : passord.length < 10 ? 2
    : 3
  const styrkeLabel = ['', 'Svakt', 'OK', 'Sterkt'][styrke]
  const styrkeColor = ['', '#E0614F', '#E07A4F', '#9DC496'][styrke]

  return (
    <div className="login-root">
      {/* Background — samme som login */}
      <div className="app-bg">
        <Dial className="app-bg-dial" />
      </div>

      <div className="login-card-wrap anim-fade-up" style={{ opacity: mounted ? undefined : 0 }}>
        <div className="login-glow" aria-hidden><div className="login-glow-inner" /></div>

        <div className="login-card glass-card crop">

          {/* Logo */}
          <div className="login-logo-area">
            <div className="login-logo-icon">
              <span className="monogram">AB</span>
            </div>
            <div className="login-title">Bli <em>medlem.</em></div>
            <div className="login-subtitle">{BRAND.navn} · Opprett konto</div>
          </div>

          {/* Suksess-melding */}
          {suksess ? (
            <div className="su-suksess">
              <div className="su-suksess-icon"><Check size={22} strokeWidth={1.5} /></div>
              <div className="su-suksess-t">Konto opprettet!</div>
              <div className="su-suksess-s">Sender deg til dashboard…</div>
            </div>
          ) : (
            <>
              {/* Divider */}
              <div className="login-divider">
                <div className="login-divider-line" />
                <span className="login-divider-text">Ny bruker</span>
                <div className="login-divider-line" />
              </div>

              <form onSubmit={handleSubmit}>

                {/* Navn */}
                <div className="login-field">
                  <label className="login-field-label">Navn</label>
                  <div style={{ position: 'relative' }}>
                    <span className="login-field-icon"><User size={15} strokeWidth={1.4} /></span>
                    <input
                      type="text"
                      className="input login-field-input"
                      value={navn}
                      onChange={e => setNavn(e.target.value)}
                      placeholder="Ola Nordmann"
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Epost */}
                <div className="login-field">
                  <label className="login-field-label">Epost</label>
                  <div style={{ position: 'relative' }}>
                    <span className="login-field-icon"><Mail size={15} strokeWidth={1.4} /></span>
                    <input
                      type="email"
                      className="input login-field-input"
                      value={epost}
                      onChange={e => setEpost(e.target.value)}
                      placeholder="din@epost.no"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Passord */}
                <div className="login-field">
                  <label className="login-field-label">Passord</label>
                  <div style={{ position: 'relative' }}>
                    <span className="login-field-icon"><Lock size={15} strokeWidth={1.4} /></span>
                    <input
                      type={visP1 ? 'text' : 'password'}
                      className="input login-field-input login-field-input-pr"
                      value={passord}
                      onChange={e => setPassord(e.target.value)}
                      placeholder="Minst 6 tegn"
                      required
                      autoComplete="new-password"
                    />
                    <button type="button" className="login-eye-btn"
                      onClick={() => setVisP1(!visP1)}
                      aria-label={visP1 ? 'Skjul passord' : 'Vis passord'}>
                      {visP1 ? <EyeOff size={16} strokeWidth={1.4} /> : <Eye size={16} strokeWidth={1.4} />}
                    </button>
                  </div>
                  {passord.length > 0 && (
                    <div className="su-styrke-rad">
                      <div className="su-styrke-bar">
                        {[1,2,3].map(i => (
                          <div key={i} className="su-styrke-seg"
                            style={{ background: i <= styrke ? styrkeColor : 'rgba(242,236,225,0.08)' }} />
                        ))}
                      </div>
                      <span className="su-styrke-lbl" style={{ color: styrkeColor }}>{styrkeLabel}</span>
                    </div>
                  )}
                </div>

                {/* Bekreft passord */}
                <div className="login-field">
                  <label className="login-field-label">Bekreft passord</label>
                  <div style={{ position: 'relative' }}>
                    <span className="login-field-icon"><KeyRound size={15} strokeWidth={1.4} /></span>
                    <input
                      type={visP2 ? 'text' : 'password'}
                      className="input login-field-input login-field-input-pr"
                      value={passord2}
                      onChange={e => setPassord2(e.target.value)}
                      placeholder="Gjenta passord"
                      required
                      autoComplete="new-password"
                    />
                    <button type="button" className="login-eye-btn"
                      onClick={() => setVisP2(!visP2)}
                      aria-label={visP2 ? 'Skjul passord' : 'Vis passord'}>
                      {visP2 ? <EyeOff size={16} strokeWidth={1.4} /> : <Eye size={16} strokeWidth={1.4} />}
                    </button>
                  </div>
                  {passord2.length > 0 && passord !== passord2 && (
                    <div className="su-mismatch">Passordene stemmer ikke</div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="login-error-box">
                    
                    <span className="login-error-text">{error}</span>
                  </div>
                )}

                {/* Opprett-knapp */}
                <button
                  type="submit"
                  className="btn btn-primary login-btn-full"
                  disabled={laster || passord !== passord2}
                >
                  {laster ? <span className="spinner" /> : <>Opprett konto</>}
                </button>
              </form>

              {/* Logg inn-link */}
              <p className="login-signup-row" style={{ marginTop: '0.5rem' }}>
                Har du allerede konto?{' '}
                <Link href="/login" className="login-signup-link">Logg inn</Link>
              </p>
            </>
          )}
        </div>

        <p className="login-footer">{BRAND.navn} · {BRAND.under}</p>
      </div>

      <style>{`
        .su-suksess {
          display: flex; flex-direction: column; align-items: center;
          padding: 2rem 1rem; text-align: center; gap: .75rem;
        }
        .su-suksess-icon {
          width: 56px; height: 56px; border-radius: 50%;
          background: transparent; border: 1px solid rgba(201,169,110,.6);
          color: #E3C68C; font-size: 1.6rem;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 8px rgba(201,169,110,.06);
          animation: suPop .4s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        @keyframes suPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .su-suksess-t { font-family: var(--font-serif); font-size: 2rem; font-weight: 400; color: #F2ECE1; }
        .su-suksess-s { font-size: .82rem; color: rgba(242,236,225,.35); }

        .su-styrke-rad { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
        .su-styrke-bar { display: flex; gap: 4px; flex: 1; }
        .su-styrke-seg { height: 3px; flex: 1; border-radius: 2px; transition: background .3s; }
        .su-styrke-lbl { font-family: var(--font-mono); font-size: .6rem; font-weight: 500; min-width: 40px; text-align: right; text-transform: uppercase; letter-spacing: .06em; transition: color .3s; }

        .su-mismatch { font-size: .68rem; color: #E88A7A; margin-top: 5px; }
      `}</style>
    </div>
  )
}
