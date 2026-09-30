'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Check, Search, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Bruker {
  id: string
  navn: string
  epost: string
  jegDeler: boolean    // min can_share_with inneholder denne brukeren
  delerMedMeg: boolean // denne brukerens can_share_with inneholder meg
}

// Tidligere viste bryteren om den ANDRE delte med deg, mens klikk endret om DU delte med dem –
// og «Deler med deg» var alltid tom. Nå leses begge retninger fra riktig liste.
export default function DelingSide() {
  const supabase = createClient()
  const [brukere, setBrukere] = useState<Bruker[]>([])
  const [laster, setLaster] = useState(true)
  const [sok, setSok] = useState('')
  const [epost, setEpost] = useState('')
  const [melding, setMelding] = useState('')
  const [feil, setFeil] = useState('')

  useEffect(() => {
    const hent = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profiler, error } = await supabase.from('profiler').select('id, navn, epost, can_share_with')
      if (error) { setFeil('Kunne ikke hente brukere.'); setLaster(false); return }
      const meg = profiler?.find(p => p.id === user.id)
      const mine: string[] = meg?.can_share_with ?? []
      setBrukere((profiler ?? []).filter(p => p.id !== user.id).map(p => ({
        id: p.id,
        navn: p.navn || p.epost?.split('@')[0] || 'Ukjent',
        epost: p.epost ?? '',
        jegDeler: mine.includes(p.id),
        delerMedMeg: (p.can_share_with ?? []).includes(user.id),
      })))
      setLaster(false)
    }
    hent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visMelding = (t: string) => { setMelding(t); setTimeout(() => setMelding(''), 2600) }

  const byttDeling = async (b: Bruker) => {
    const ny = !b.jegDeler
    setBrukere(l => l.map(x => x.id === b.id ? { ...x, jegDeler: ny } : x)) // optimistisk
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: minProfil } = await supabase.from('profiler').select('can_share_with').eq('id', user.id).single()
    const liste: string[] = minProfil?.can_share_with ?? []
    const oppdatert = ny ? Array.from(new Set([...liste, b.id])) : liste.filter(id => id !== b.id)
    const { error } = await supabase.from('profiler').update({ can_share_with: oppdatert }).eq('id', user.id)
    if (error) {
      setBrukere(l => l.map(x => x.id === b.id ? { ...x, jegDeler: !ny } : x)) // rull tilbake
      setFeil('Kunne ikke lagre endringen.')
      return
    }
    visMelding(ny ? `Du deler nå med ${b.navn}.` : `Du deler ikke lenger med ${b.navn}.`)
  }

  // Ekte invitasjon via e-postklienten (tidligere kun alert «Simulert»)
  const inviter = (e: React.FormEvent) => {
    e.preventDefault()
    if (!epost) return
    const emne = encodeURIComponent('Bli med meg på treningen')
    const tekst = encodeURIComponent(`Hei! Jeg bruker denne appen til å planlegge og logge trening. Bli med her: ${window.location.origin}/signup`)
    window.location.href = `mailto:${epost}?subject=${emne}&body=${tekst}`
    setEpost('')
  }

  const q = sok.trim().toLowerCase()
  const filtrert = brukere.filter(b => !q || b.navn.toLowerCase().includes(q) || b.epost.toLowerCase().includes(q))
  const delerMedMeg = brukere.filter(b => b.delerMedMeg)
  const jegDelerMed = brukere.filter(b => b.jegDeler).length

  if (laster) return null

  return (
    <div className="del-page">
      <div className="page-header">
        <h1 className="page-title">Deling<em className="gold">.</em></h1>
        <p className="page-subtitle">Hvem som ser øktene dine · og hvem du ser</p>
      </div>

      <AnimatePresence>
        {melding && (
          <motion.div className="pf-melding" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: '1rem' }}>
            <Check size={14} strokeWidth={2} /> {melding}
          </motion.div>
        )}
      </AnimatePresence>
      {feil && <div className="login-error-box" style={{ marginBottom: '1rem' }}><span className="login-error-text">{feil}</span></div>}

      <section className="hq-figures del-tall">
        <div className="hq-figure"><span className="eyebrow">Du deler med</span><div className="hq-figure-val num-monument">{jegDelerMed}<small>personer</small></div></div>
        <div className="hq-figure"><span className="eyebrow">Deler med deg</span><div className="hq-figure-val num-monument">{delerMedMeg.length}<small>personer</small></div></div>
      </section>

      {delerMedMeg.length > 0 && (
        <section className="pf-seksjon glass-card del-seksjon">
          <span className="eyebrow"><Eye size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />Deler med deg</span>
          <div className="del-avatarer">
            {delerMedMeg.map(b => (
              <div key={b.id} className="del-avatar-rad"><span className="dash-user-avatar">{b.navn.charAt(0).toUpperCase()}</span><span>{b.navn}</span></div>
            ))}
          </div>
        </section>
      )}

      <section className="pf-seksjon glass-card del-seksjon">
        <div className="pf-seksjon-hode" style={{ marginBottom: '1rem' }}>
          <div>
            <span className="eyebrow">Personer i appen</span>
            <h3 className="hq-section-title" style={{ marginTop: 8 }}>Del <em>øktene dine</em></h3>
          </div>
        </div>
        {brukere.length > 5 && (
          <label className="bib-sok" style={{ marginBottom: '0.75rem' }}>
            <Search size={15} strokeWidth={1.4} />
            <input className="input" placeholder="Søk etter navn eller e-post" value={sok} onChange={e => setSok(e.target.value)} />
          </label>
        )}
        <ul className="del-liste">
          {filtrert.map(b => (
            <li key={b.id}>
              <span className="dash-user-avatar">{b.navn.charAt(0).toUpperCase()}</span>
              <div className="del-info">
                <span className="del-navn">{b.navn}</span>
                <span className="del-epost">{b.epost}</span>
              </div>
              {b.delerMedMeg && <span className="tid-merke gull">Deler med deg</span>}
              <button
                role="switch" aria-checked={b.jegDeler} aria-label={`Del med ${b.navn}`}
                className={`del-bryter${b.jegDeler ? ' on' : ''}`} onClick={() => byttDeling(b)}
              >
                <motion.span layout className="del-knott" transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
              </button>
            </li>
          ))}
          {filtrert.length === 0 && <li className="velger-tom">{brukere.length ? 'Ingen treff.' : 'Ingen andre brukere ennå. Inviter noen under.'}</li>}
        </ul>
      </section>

      <section className="pf-seksjon glass-card del-seksjon">
        <span className="eyebrow"><Mail size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />Inviter</span>
        <h3 className="hq-section-title" style={{ margin: '0.6rem 0 0.4rem' }}>Tren <em>sammen</em></h3>
        <p className="pf-dempet">Åpner e-posten din med en ferdig invitasjon og lenke til registrering.</p>
        <form onSubmit={inviter} className="opp-puls">
          <input className="input" type="email" placeholder="navn@epost.no" value={epost} onChange={e => setEpost(e.target.value)} required />
          <button className="btn btn-primary" type="submit">Inviter</button>
        </form>
      </section>
    </div>
  )
}
