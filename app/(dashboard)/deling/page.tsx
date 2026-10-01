'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Check, UserPlus, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Person {
  id: string
  navn: string
  jegDeler: boolean    // du deler med denne personen (din can_share_with)
  delerMedMeg: boolean // denne personen deler med deg
}

// Andres profiler er ikke lesbare (RLS: bare egen rad). Navn hentes via to databasefunksjoner
// som bare gir ut id og navn – aldri e-post, vekt eller annet (docs/migrasjoner/deling.sql).
const funksjonMangler = (e: { code?: string; message?: string }) =>
  e.code === 'PGRST202' || e.code === '42883' || /could not find the function|does not exist/i.test(e.message ?? '')

export default function DelingSide() {
  const supabase = createClient()
  const [personer, setPersoner] = useState<Person[]>([])
  const [laster, setLaster] = useState(true)
  const [ikkeSattOpp, setIkkeSattOpp] = useState(false)
  const [epost, setEpost] = useState('')
  const [soker, setSoker] = useState(false)
  const [ikkeFunnet, setIkkeFunnet] = useState('')
  const [melding, setMelding] = useState('')
  const [feil, setFeil] = useState('')

  const hent = useCallback(async () => {
    const { data, error } = await supabase.rpc('deling_oversikt')
    if (error) {
      if (funksjonMangler(error)) setIkkeSattOpp(true)
      else setFeil('Kunne ikke hente delingene.')
      setLaster(false)
      return
    }
    setPersoner((data ?? []).map((p: any) => ({ id: p.id, navn: p.navn, jegDeler: !!p.jeg_deler, delerMedMeg: !!p.deler_med_meg })))
    setLaster(false)
  }, [supabase])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- kjøres bevisst kun ved oppstart
  useEffect(() => { hent() }, [])

  const visMelding = (t: string) => { setMelding(t); setTimeout(() => setMelding(''), 2600) }

  // Leser og skriver bare din egen profil (tillatt av RLS)
  const settDeling = async (id: string, del: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Du er logget ut.'
    const { data: meg, error: lesFeil } = await supabase.from('profiler').select('can_share_with').eq('id', user.id).single()
    if (lesFeil) return 'Kunne ikke lagre endringen.'
    const liste: string[] = (meg?.can_share_with ?? []).map(String)
    const oppdatert = del ? Array.from(new Set([...liste, id])) : liste.filter(x => x !== id)
    const { error } = await supabase.from('profiler').update({ can_share_with: oppdatert }).eq('id', user.id)
    return error ? 'Kunne ikke lagre endringen.' : null
  }

  const bytt = async (p: Person) => {
    const ny = !p.jegDeler
    setPersoner(l => l.map(x => x.id === p.id ? { ...x, jegDeler: ny } : x)) // optimistisk
    const f = await settDeling(p.id, ny)
    if (f) {
      setPersoner(l => l.map(x => x.id === p.id ? { ...x, jegDeler: !ny } : x)) // rull tilbake
      setFeil(f)
      return
    }
    visMelding(ny ? `Du deler nå med ${p.navn}.` : `Du deler ikke lenger med ${p.navn}.`)
  }

  const leggTil = async (e: React.FormEvent) => {
    e.preventDefault()
    const adresse = epost.trim()
    if (!adresse) return
    setSoker(true); setFeil(''); setIkkeFunnet('')
    const { data, error } = await supabase.rpc('finn_bruker_for_deling', { p_epost: adresse })
    setSoker(false)
    if (error) { setFeil(funksjonMangler(error) ? 'Deling er ikke satt opp i databasen ennå.' : 'Noe gikk galt. Prøv igjen.'); return }
    const treff = (data ?? [])[0] as { id: string; navn: string } | undefined
    if (!treff) { setIkkeFunnet(adresse); return }
    if (personer.some(p => p.id === treff.id && p.jegDeler)) { visMelding(`Du deler allerede med ${treff.navn}.`); setEpost(''); return }
    const f = await settDeling(treff.id, true)
    if (f) { setFeil(f); return }
    setPersoner(l => l.some(p => p.id === treff.id)
      ? l.map(p => p.id === treff.id ? { ...p, jegDeler: true } : p)
      : [...l, { id: treff.id, navn: treff.navn, jegDeler: true, delerMedMeg: false }])
    setEpost('')
    visMelding(`Du deler nå med ${treff.navn}.`)
  }

  const inviter = (adresse: string) => {
    const emne = encodeURIComponent('Bli med meg på treningen')
    const tekst = encodeURIComponent(`Hei! Jeg bruker AB-PT til å planlegge og logge trening. Bli med her: ${window.location.origin}/signup`)
    window.location.href = `mailto:${encodeURIComponent(adresse)}?subject=${emne}&body=${tekst}`
  }

  const delerMedMeg = personer.filter(p => p.delerMedMeg)
  const jegDelerMed = personer.filter(p => p.jegDeler).length

  if (laster) return null

  return (
    <div className="del-page">
      <div className="page-header">
        <h1 className="page-title">Deling<em className="gold">.</em></h1>
        <p className="page-subtitle">De du deler med kan se dine økter og rekorder – ikke vekt eller profil</p>
      </div>

      <AnimatePresence>
        {melding && (
          <motion.div className="pf-melding" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Check size={14} strokeWidth={2} /> {melding}
          </motion.div>
        )}
      </AnimatePresence>
      {feil && <div className="login-error-box" role="alert"><span className="login-error-text">{feil}</span></div>}

      {ikkeSattOpp ? (
        <section className="pf-seksjon glass-card del-seksjon">
          <span className="eyebrow">Ikke satt opp</span>
          <p className="pf-dempet" style={{ marginTop: 10 }}>Deling må aktiveres i databasen først (docs/migrasjoner/deling.sql).</p>
        </section>
      ) : (
        <>
          <section className="hq-figures del-tall">
            <div className="hq-figure"><span className="eyebrow">Du deler med</span><div className="hq-figure-val num-monument">{jegDelerMed}<small>{jegDelerMed === 1 ? 'person' : 'personer'}</small></div></div>
            <div className="hq-figure"><span className="eyebrow">Deler med deg</span><div className="hq-figure-val num-monument">{delerMedMeg.length}<small>{delerMedMeg.length === 1 ? 'person' : 'personer'}</small></div></div>
          </section>

          <section className="pf-seksjon glass-card del-seksjon">
            <span className="eyebrow"><UserPlus size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />Legg til</span>
            <h3 className="hq-section-title" style={{ margin: '0.6rem 0 0.4rem' }}>Del med <em>noen</em></h3>
            <p className="pf-dempet">Skriv e-posten personen bruker i AB-PT. Av personvernhensyn kan du ikke søke i eller se en liste over andre brukere.</p>
            <form onSubmit={leggTil} className="opp-puls">
              <input className="input" type="email" placeholder="navn@epost.no" value={epost}
                onChange={e => { setEpost(e.target.value); setIkkeFunnet('') }} required aria-label="E-post" />
              <button className="btn btn-primary" type="submit" disabled={soker}>{soker ? 'Søker …' : 'Legg til'}</button>
            </form>
            {ikkeFunnet && (
              <div className="del-ikke-funnet">
                <p className="pf-dempet">Fant ingen bruker med {ikkeFunnet}.</p>
                <button className="btn btn-ghost" onClick={() => inviter(ikkeFunnet)}><Mail size={13} strokeWidth={1.5} /> Inviter på e-post</button>
              </div>
            )}
          </section>

          {personer.length > 0 && (
            <section className="pf-seksjon glass-card del-seksjon">
              <span className="eyebrow">Personer</span>
              <ul className="del-liste" style={{ marginTop: '0.75rem' }}>
                {personer.map(p => (
                  <li key={p.id}>
                    <span className="dash-user-avatar">{p.navn.charAt(0).toUpperCase()}</span>
                    <div className="del-info">
                      <span className="del-navn">{p.navn}</span>
                      <span className="del-epost">{p.jegDeler ? 'Du deler med denne personen' : 'Du deler ikke'}</span>
                    </div>
                    {p.delerMedMeg && <Link href={`/deling/${p.id}`} className="del-se"><Eye size={11} strokeWidth={1.8} style={{ verticalAlign: '-1px' }} /> Se treningen</Link>}
                    <button
                      role="switch" aria-checked={p.jegDeler} aria-label={`Del med ${p.navn}`}
                      className={`del-bryter${p.jegDeler ? ' on' : ''}`} onClick={() => bytt(p)}
                    >
                      <motion.span layout className="del-knott" transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
