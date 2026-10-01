'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Dial } from '@/components/atelier/Dial'
import { BRAND } from '@/lib/brand'

export default function Login() {
  const [epost, setEpost]           = useState('')
  const [passord, setPassord]       = useState('')
  const [error, setError]           = useState('')
  const [laster, setLaster]         = useState(false)
  const [visPassord, setVisPassord] = useState(false)
  const [mounted, setMounted]       = useState(false)
  const [ikkeBekreftet, setIkkeBekreftet] = useState(false)
  const [sendtPaNytt, setSendtPaNytt]     = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLaster(true)
    setError(''); setIkkeBekreftet(false); setSendtPaNytt(false)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: epost,
        password: passord,
      })
      if (error) throw error
      router.refresh()
      router.push('/dashboard')
    } catch (err: any) {
      const m = err?.message ?? ''
      if (/email not confirmed/i.test(m)) { setIkkeBekreftet(true); setError('E-posten er ikke bekreftet ennå. Åpne lenken vi sendte deg.') }
      else if (m === 'Invalid login credentials') setError('Feil e-post eller passord.')
      else if (err?.status === 429 || /rate limit|too many/i.test(m)) setError('For mange forsøk. Vent litt og prøv igjen.')
      else setError('Kunne ikke logge inn. Prøv igjen.')
    } finally {
      setLaster(false)
    }
  }

  const sendBekreftelse = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: epost.trim(), options: { emailRedirectTo: `${window.location.origin}/bekreftet` } })
    if (error && (error.status === 429 || /rate limit|security purposes/i.test(error.message))) setError('For mange forsøk. Vent litt og prøv igjen.')
    else setSendtPaNytt(true)
  }

  // Vises etter at kontoen er slettet (profilsiden)
  const [slettet, setSlettet] = useState(false)
  useEffect(() => { setSlettet(new URLSearchParams(window.location.search).has('slettet')) }, [])

  return (
    <div className="login-root">
      <div className="app-bg" aria-hidden>
        <Dial className="app-bg-dial" />
      </div>

      <motion.div
        className="login-card-wrap"
        initial={{ opacity: 0, y: 24 }}
        animate={mounted ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="login-card glass-card crop">
          <div className="login-logo-area">
            <div className="login-logo-icon">
              <span className="monogram">AB</span>
            </div>
            <div className="login-title">
              Velkommen<br />tilbake til <em>{BRAND.navn}.</em>
            </div>
            <div className="login-subtitle">{BRAND.kort} · Medlemsinngang</div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label className="login-field-label" htmlFor="epost">E-post</label>
              <div style={{ position: 'relative' }}>
                <span className="login-field-icon"><Mail size={15} strokeWidth={1.4} /></span>
                <input
                  id="epost"
                  type="email"
                  className="input login-field-input"
                  value={epost}
                  onChange={e => setEpost(e.target.value)}
                  placeholder="navn@epost.no"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-field-label" htmlFor="passord">Passord</label>
              <div style={{ position: 'relative' }}>
                <span className="login-field-icon"><Lock size={15} strokeWidth={1.4} /></span>
                <input
                  id="passord"
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
                  {visPassord ? <EyeOff size={16} strokeWidth={1.4} /> : <Eye size={16} strokeWidth={1.4} />}
                </button>
              </div>
            </div>

            <div className="login-glemt"><Link href="/glemt-passord">Glemt passord?</Link></div>

            {slettet && !error && (
              <div className="pf-melding" role="status" style={{ marginBottom: '1rem' }}>Kontoen og alle dataene dine er slettet.</div>
            )}

            {error && (
              <motion.div className="login-error-box" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                <span className="login-error-text">{error}</span>
                {ikkeBekreftet && (sendtPaNytt
                  ? <span className="login-error-text" style={{ display: 'block', marginTop: 6 }}>Ny lenke er sendt.</span>
                  : <button type="button" className="login-lenkeknapp" onClick={sendBekreftelse}>Send lenken på nytt</button>)}
              </motion.div>
            )}

            <button
              type="submit"
              className="btn btn-primary login-btn-full"
              disabled={laster}
              style={{ marginTop: '0.75rem', marginBottom: '1.4rem', justifyContent: 'space-between', paddingLeft: '1.5rem', paddingRight: '0.5rem' }}
            >
              <span>{laster ? 'Åpner døren …' : 'Logg inn'}</span>
              <span className="hq-cta-arrow" style={{ width: 36, height: 36 }}>
                {laster ? <span className="spinner" style={{ borderColor: 'rgba(227,198,140,0.25)', borderTopColor: 'var(--gold-hi)' }} /> : <ArrowRight size={16} strokeWidth={1.5} />}
              </span>
            </button>
          </form>

          <p className="login-signup-row">
            Ikke medlem ennå?{' '}
            <Link href="/signup" className="login-signup-link">Opprett konto</Link>
          </p>
        </div>
        <p className="login-footer">{BRAND.navn} · {BRAND.under} · <Link href="/personvern" className="login-footer-lenke">Personvern</Link></p>
      </motion.div>
    </div>
  )
}
