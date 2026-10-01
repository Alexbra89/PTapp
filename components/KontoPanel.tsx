'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, ShieldCheck, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { lastNedMineData } from '@/lib/minedata'
import { ryddVedUtlogging } from '@/lib/utlogging'

const BEKREFT = 'SLETT'

export default function KontoPanel() {
  const [laster, setLaster] = useState(false)
  const [melding, setMelding] = useState('')
  const [visSlett, setVisSlett] = useState(false)
  const [tekst, setTekst] = useState('')
  const [sletter, setSletter] = useState(false)
  const [feil, setFeil] = useState('')

  const lastNed = async () => {
    setLaster(true); setMelding('')
    try { await lastNedMineData(); setMelding('Filen er lastet ned.') }
    catch { setMelding('Kunne ikke hente dataene. Prøv igjen.') }
    setLaster(false)
  }

  const slett = async () => {
    if (tekst !== BEKREFT) return
    setSletter(true); setFeil('')
    const supabase = createClient()
    const { error } = await supabase.rpc('slett_min_konto')
    if (error) {
      setSletter(false)
      setFeil(/could not find the function|PGRST202/i.test(error.message + (error.code ?? ''))
        ? 'Sletting er ikke satt opp i databasen ennå (docs/migrasjoner/slett_konto.sql).'
        : 'Kunne ikke slette kontoen. Ingenting er slettet – prøv igjen.')
      return
    }
    // Brukeren finnes ikke lenger: rydd lokalt og send til innlogging
    await ryddVedUtlogging()
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    window.location.href = '/login?slettet=1'
  }

  return (
    <section className="pf-seksjon glass-card inn-panel">
      <span className="eyebrow">Dine data</span>
      <ul className="inn-liste">
        <li>
          <span className="inn-ikon"><Download size={16} strokeWidth={1.4} /></span>
          <div className="inn-tekst"><strong>Last ned dataene mine</strong><span>Alt du har lagret – økter, sett, rekorder, vekt og profil – som én fil</span></div>
          <button className="btn btn-ghost konto-knapp" onClick={lastNed} disabled={laster}>{laster ? 'Henter …' : 'Last ned'}</button>
        </li>
        <li>
          <span className="inn-ikon"><ShieldCheck size={16} strokeWidth={1.4} /></span>
          <div className="inn-tekst"><strong>Personvern</strong><span>Hva vi lagrer, hvorfor og hvem som ser det</span></div>
          <Link href="/personvern" className="btn btn-ghost konto-knapp">Les</Link>
        </li>
        <li>
          <span className="inn-ikon konto-fare"><Trash2 size={16} strokeWidth={1.4} /></span>
          <div className="inn-tekst"><strong>Slett kontoen</strong><span>Sletter kontoen og alle dataene dine for godt</span></div>
          <button className="btn btn-ghost konto-knapp konto-fare-knapp" onClick={() => { setVisSlett(true); setTekst(''); setFeil('') }}>Slett</button>
        </li>
      </ul>
      {melding && <p className="pf-dempet" role="status" style={{ marginTop: 8 }}>{melding}</p>}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {visSlett && (
            <motion.div className="kal-modal-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !sletter && setVisSlett(false)}>
              <motion.div className="kal-modal glass-card konto-modal" role="dialog" aria-modal="true" aria-label="Slett kontoen"
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} onClick={e => e.stopPropagation()}>
                <div className="konto-modal-hode">
                  <h3 className="hq-section-title">Slette <em>kontoen?</em></h3>
                  <button className="kal-modal-x" onClick={() => setVisSlett(false)} aria-label="Lukk" disabled={sletter}><X size={16} strokeWidth={1.5} /></button>
                </div>
                <p className="pf-dempet">Alle økter, sett, rekorder, vektmålinger, programmer og profilen din slettes, og du fjernes fra andres delingslister. <strong>Dette kan ikke angres.</strong> Last gjerne ned dataene dine først.</p>
                <label className="pf-felt" style={{ marginTop: '1rem' }}>
                  <span className="eyebrow">Skriv {BEKREFT} for å bekrefte</span>
                  <input className="input" value={tekst} onChange={e => setTekst(e.target.value.toUpperCase())} autoComplete="off" aria-label={`Skriv ${BEKREFT}`} />
                </label>
                {feil && <div className="login-error-box" role="alert" style={{ marginTop: '0.75rem' }}><span className="login-error-text">{feil}</span></div>}
                <div className="konto-modal-knapper">
                  <button className="btn btn-ghost" onClick={() => setVisSlett(false)} disabled={sletter}>Avbryt</button>
                  <button className="btn konto-slett" onClick={slett} disabled={tekst !== BEKREFT || sletter}>{sletter ? 'Sletter …' : 'Slett for godt'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </section>
  )
}
