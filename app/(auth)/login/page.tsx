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
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

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
      router.refresh()
      router.push('/dashboard')
    } catch (err: any) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Feil e-post eller passord.'
          : err.message
      )
    } finally {
      setLaster(false)
    }
  }

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

            {error && (
              <motion.div className="login-error-box" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                <span className="login-error-text">{error}</span>
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
        <p className="login-footer">{BRAND.navn} · {BRAND.under}</p>
      </motion.div>
    </div>
  )
}
