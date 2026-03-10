'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DEMO_EMAIL   = 'demo@treningsapp.no'
const DEMO_PASSORD = 'demo123'

export default function Login() {
  const [epost, setEpost]           = useState('')
  const [passord, setPassord]       = useState('')
  const [error, setError]           = useState('')
  const [laster, setLaster]         = useState(false)
  const [visPassord, setVisPassord] = useState(false)
  const [mounted, setMounted]       = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  /* ── Vanlig innlogging ───────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLaster(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: epost,
        password: passord,
      })
      if (error) throw error
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Feil epost eller passord'
          : err.message
      )
    } finally {
      setLaster(false)
    }
  }

  /* ── Demo-innlogging ─────────────────────────────── */
  const handleDemoLogin = async () => {
    setLaster(true)
    setError('')

    // Steg 1 — prøv direkte login (bruker finnes allerede)
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSORD,
      })
      if (!loginError) {
        router.push('/dashboard')
        router.refresh()
        return
      }
      // Kun fortsett til signup hvis bruker ikke finnes
      if (loginError.message !== 'Invalid login credentials') {
        throw loginError
      }
    } catch (err: any) {
      if (err.message !== 'Invalid login credentials') {
        setError(feilmelding(err))
        setLaster(false)
        return
      }
    }

    // Steg 2 — bruker finnes ikke, opprett den
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSORD,
        options: { data: { full_name: 'Demo Bruker' } },
      })
      if (signUpError) {
        if (signUpError.status === 429) {
          setError('For mange forsøk. Vent litt og prøv igjen.')
          setLaster(false)
          return
        }
        // 422 / 409 = allerede registrert — OK å ignorere, prøv login
        if (signUpError.status !== 422 && signUpError.status !== 409) {
          throw signUpError
        }
      }
    } catch (err: any) {
      setError(feilmelding(err))
      setLaster(false)
      return
    }

    // Steg 3 — logg inn etter signup
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSORD,
      })
      if (loginError) throw loginError
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      if (err.message === 'Email not confirmed') {
        setError(
          'Demo-brukeren må bekreftes. Gå til Supabase → Authentication → Users ' +
          '→ finn demo@treningsapp.no og bekreft manuelt. Eller skru av ' +
          '"Confirm email" under Auth → Settings i Supabase.'
        )
      } else {
        setError(feilmelding(err))
      }
    } finally {
      setLaster(false)
    }
  }

  return (
    <div className="login-root">
      <div className="app-bg">
        <div className="app-bg-grid" />
        <div className="app-bg-blob app-bg-blob-1" />
        <div className="app-bg-blob app-bg-blob-2" />
        <div className="app-bg-blob app-bg-blob-3" />
      </div>

      <div
        className="login-card-wrap anim-fade-up"
        style={{ opacity: mounted ? undefined : 0 }}
      >
        <div className="login-glow" aria-hidden>
          <div className="login-glow-inner" />
        </div>

        <div className="login-card glass-card">

          {/* Logo */}
          <div className="login-logo-area">
            <div className="login-logo-icon">
              <div className="login-logo-ring">
                <div className="login-logo-ring-inner">
                  <span style={{ fontSize: '1.8rem' }}>🏋️</span>
                </div>
              </div>
            </div>
            <div className="login-title">Treningsapp</div>
            <div className="login-subtitle">Din personlige treningspartner</div>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
            <span className="badge badge-green">
              <span className="neon-dot neon-dot-green anim-pulse" />
              Alle systemer operative
            </span>
          </div>

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">Logg inn</span>
            <div className="login-divider-line" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label className="login-field-label">Epost</label>
              <div style={{ position: 'relative' }}>
                <span className="login-field-icon">✉</span>
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

            <div className="login-field">
              <label className="login-field-label">Passord</label>
              <div style={{ position: 'relative' }}>
                <span className="login-field-icon">🔒</span>
                <input
                  type={visPassord ? 'text' : 'password'}
                  className="input login-field-input login-field-input-pr"
                  value={passord}
                  onChange={e => setPassord(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setVisPassord(!visPassord)}
                  aria-label={visPassord ? 'Skjul passord' : 'Vis passord'}
                >
                  {visPassord ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error-box">
                <span
                  className="neon-dot"
                  style={{ background: '#ff3250', boxShadow: '0 0 8px #ff3250', flexShrink: 0 }}
                />
                <span className="login-error-text">{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary login-btn-full"
              disabled={laster}
            >
              {laster ? <span className="spinner" /> : <>⚡ Logg inn</>}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-ghost login-btn-full login-btn-demo"
            onClick={handleDemoLogin}
            disabled={laster}
          >
            {laster
              ? <span className="spinner" style={{ borderColor: 'rgba(180,78,255,0.3)', borderTopColor: '#b44eff' }} />
              : <>🚀 Prøv demo</>
            }
          </button>

          <p className="login-signup-row">
            Har du ikke bruker?{' '}
            <Link href="/signup" className="login-signup-link">
              Opprett konto →
            </Link>
          </p>
        </div>

        <p className="login-footer">© 2024 Treningsapp · Alle rettigheter reservert</p>
      </div>
    </div>
  )
}

/* ── Hjelpefunksjon for brukervennlige feilmeldinger ─── */
function feilmelding(err: any): string {
  const msg: string = err?.message ?? ''
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('NetworkError')) {
    return 'Nettverksfeil. Sjekk internettforbindelsen din.'
  }
  if (msg.includes('rate limit') || err?.status === 429) {
    return 'For mange forsøk. Vent litt og prøv igjen.'
  }
  if (msg === 'Invalid login credentials') return 'Feil epost eller passord.'
  if (msg === 'Email not confirmed')       return 'Epost ikke bekreftet. Sjekk innboksen din.'
  return 'Noe gikk galt. Prøv igjen.'
}
