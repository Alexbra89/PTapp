'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Dial } from '@/components/atelier/Dial'
import { BRAND } from '@/lib/brand'

// Tar imot bekreftelseslenken fra e-posten etter registrering.
// Lenken kommer som ?code=… (standard) eller ?token_hash=…&type=signup|email.
export default function Bekreftet() {
  const router = useRouter()
  const [status, setStatus] = useState<'sjekker' | 'ok' | 'ugyldig'>('sjekker')

  useEffect(() => {
    const supabase = createClient()
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.slice(1))
    ;(async () => {
      if (url.searchParams.get('error') || hash.get('error')) { setStatus('ugyldig'); return }
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')
      if (tokenHash && (type === 'signup' || type === 'email')) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        if (error) { setStatus('ugyldig'); return }
      }
      const { data: { session } } = await supabase.auth.getSession()
      window.history.replaceState(null, '', '/bekreftet')
      if (!session) { setStatus('ugyldig'); return }
      setStatus('ok')
      setTimeout(() => { router.replace('/dashboard'); router.refresh() }, 1600)
    })()
  }, [router])

  return (
    <div className="login-root">
      <div className="app-bg" aria-hidden><Dial className="app-bg-dial" /></div>
      <div className="login-card-wrap anim-fade-up">
        <div className="login-card glass-card crop">
          <div className="login-logo-area">
            <div className="login-logo-icon"><span className="monogram">AB</span></div>
            <div className="login-title">{status === 'ugyldig' ? <>Lenken virket <em>ikke.</em></> : <>Velkommen <em>inn.</em></>}</div>
            <div className="login-subtitle">{BRAND.navn} · Bekreft e-post</div>
          </div>
          {status === 'sjekker' && <p className="pf-dempet" role="status">Bekrefter kontoen …</p>}
          {status === 'ok' && (
            <div className="pf-melding" role="status"><Check size={14} strokeWidth={2} /> E-posten er bekreftet. Sender deg videre …</div>
          )}
          {status === 'ugyldig' && (
            <>
              <div className="login-error-box" role="alert">
                <span className="login-error-text">Lenken er ugyldig eller utløpt. Prøv å logge inn – er kontoen ikke bekreftet, kan du få tilsendt en ny lenke der.</span>
              </div>
              <Link href="/login" className="btn btn-primary login-btn-full" style={{ marginTop: '1rem', marginBottom: '1.4rem' }}>Til innlogging</Link>
            </>
          )}
        </div>
        <p className="login-footer">{BRAND.navn} · {BRAND.under}</p>
      </div>
    </div>
  )
}
