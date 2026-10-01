'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Dial } from '@/components/atelier/Dial'
import { BRAND } from '@/lib/brand'

const MIN_LENGDE = 8

const oversett = (melding: string) =>
  /different from the old/i.test(melding) ? 'Det nye passordet må være forskjellig fra det gamle.'
  : /at least|too short|weak/i.test(melding) ? `Passordet er for svakt. Bruk minst ${MIN_LENGDE} tegn, gjerne med tall og symboler.`
  : /session|jwt|expired|not authenticated/i.test(melding) ? 'Lenken er utløpt. Be om en ny.'
  : 'Kunne ikke lagre passordet. Prøv igjen.'

export default function NyttPassord() {
  const router = useRouter()
  const [status, setStatus] = useState<'sjekker' | 'klar' | 'ugyldig'>('sjekker')
  const [passord, setPassord] = useState('')
  const [passord2, setPassord2] = useState('')
  const [vis, setVis] = useState(false)
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState('')

  // Lenken fra e-posten gir en midlertidig innlogging. Den kommer enten som ?code=… (standard)
  // eller ?token_hash=…&type=recovery (hvis e-postmalen i Supabase er satt opp slik).
  useEffect(() => {
    const supabase = createClient()
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.slice(1))
    ;(async () => {
      if (url.searchParams.get('error') || hash.get('error')) { setStatus('ugyldig'); return }
      const tokenHash = url.searchParams.get('token_hash')
      if (tokenHash && url.searchParams.get('type') === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        if (error) { setStatus('ugyldig'); return }
      }
      // ?code= veksles automatisk av klienten; getSession venter til det er gjort
      const { data: { session } } = await supabase.auth.getSession()
      // Fjern engangskoden fra adressefeltet
      window.history.replaceState(null, '', '/nytt-passord')
      setStatus(session ? 'klar' : 'ugyldig')
    })()
  }, [])

  const lagre = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeil('')
    if (passord.length < MIN_LENGDE) { setFeil(`Passordet må være minst ${MIN_LENGDE} tegn.`); return }
    if (passord !== passord2) { setFeil('Passordene er ikke like.'); return }
    setLaster(true)
    const { error } = await createClient().auth.updateUser({ password: passord })
    setLaster(false)
    if (error) { setFeil(oversett(error.message)); return }
    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <div className="login-root">
      <div className="app-bg" aria-hidden><Dial className="app-bg-dial" /></div>
      <div className="login-card-wrap anim-fade-up">
        <div className="login-card glass-card crop">
          <div className="login-logo-area">
            <div className="login-logo-icon"><span className="monogram">AB</span></div>
            <div className="login-title">Nytt <em>passord.</em></div>
            <div className="login-subtitle">{BRAND.navn} · Tilbakestill passord</div>
          </div>

          {status === 'sjekker' && <p className="pf-dempet" role="status">Sjekker lenken …</p>}

          {status === 'ugyldig' && (
            <>
              <div className="login-error-box" role="alert">
                <span className="login-error-text">Lenken er ugyldig eller utløpt. Den må åpnes i samme nettleser som du ba om den fra, og den virker bare én gang.</span>
              </div>
              <Link href="/glemt-passord" className="btn btn-primary login-btn-full" style={{ marginTop: '1rem', marginBottom: '1.4rem' }}>Be om en ny lenke</Link>
            </>
          )}

          {status === 'klar' && (
            <form onSubmit={lagre}>
              {[
                { id: 'passord', label: 'Nytt passord', v: passord, set: setPassord },
                { id: 'passord2', label: 'Gjenta passordet', v: passord2, set: setPassord2 },
              ].map(f => (
                <div className="login-field" key={f.id}>
                  <label className="login-field-label" htmlFor={f.id}>{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <span className="login-field-icon"><Lock size={15} strokeWidth={1.4} /></span>
                    <input id={f.id} type={vis ? 'text' : 'password'} className="input login-field-input login-field-input-pr"
                      value={f.v} onChange={e => f.set(e.target.value)} required minLength={MIN_LENGDE} autoComplete="new-password" />
                    {f.id === 'passord' && (
                      <button type="button" className="login-eye-btn" onClick={() => setVis(!vis)} aria-label={vis ? 'Skjul passord' : 'Vis passord'}>
                        {vis ? <EyeOff size={16} strokeWidth={1.4} /> : <Eye size={16} strokeWidth={1.4} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {feil && <div className="login-error-box" role="alert"><span className="login-error-text">{feil}</span></div>}
              <button type="submit" className="btn btn-primary login-btn-full" disabled={laster}
                style={{ marginTop: '0.75rem', marginBottom: '1.4rem', justifyContent: 'space-between', paddingLeft: '1.5rem', paddingRight: '0.5rem' }}>
                <span>{laster ? 'Lagrer …' : 'Lagre nytt passord'}</span>
                <span className="hq-cta-arrow" style={{ width: 36, height: 36 }}><ArrowRight size={16} strokeWidth={1.5} /></span>
              </button>
            </form>
          )}
        </div>
        <p className="login-footer">{BRAND.navn} · {BRAND.under}</p>
      </div>
    </div>
  )
}
