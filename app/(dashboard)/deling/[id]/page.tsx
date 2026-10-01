'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Check, Eye, Trophy } from 'lucide-react'
import { nb } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { formaterDato, lokalDato } from '@/lib/dato'
import { PR_OVELSER } from '@/lib/prOvelser'
import { TelleTall } from '@/components/atelier/TelleTall'

interface Okt { id: string; dato: string; tittel: string | null; type: string | null; varighet_min: number | null; fullfort: boolean | null }
interface Logg { dato: string; sett: unknown }
interface Rekord { ovelse_id: string; kg: number; reps: number | null; dato: string | null }

const volum = (sett: unknown) => (Array.isArray(sett) ? sett : [])
  .reduce((s: number, x: any) => s + (Number(x?.vekt ?? x?.kg) || 0) * (Number(x?.reps) || 0), 0)

// Lesetilgang til en annen brukers økter, logger og rekorder – bare hvis vedkommende deler
// med deg (regelen «delt med meg: les» i databasen). Vekt og profil vises aldri.
export default function DeltProfil() {
  const { id } = useParams<{ id: string }>()
  const [status, setStatus] = useState<'laster' | 'ok' | 'ingen-tilgang' | 'feil'>('laster')
  const [navn, setNavn] = useState('')
  const [okter, setOkter] = useState<Okt[]>([])
  const [logger, setLogger] = useState<Logg[]>([])
  const [rekorder, setRekorder] = useState<Rekord[]>([])

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: oversikt, error } = await supabase.rpc('deling_oversikt')
      if (error) { setStatus('feil'); return }
      const person = (oversikt ?? []).find((p: any) => p.id === id && p.deler_med_meg)
      if (!person) { setStatus('ingen-tilgang'); return }
      setNavn(person.navn)
      const fra = lokalDato(new Date(Date.now() - 30 * 864e5))
      const [o, l, r] = await Promise.all([
        supabase.from('okter').select('id, dato, tittel, type, varighet_min, fullfort').eq('bruker_id', id).order('dato', { ascending: false }).limit(30),
        supabase.from('treningslogger').select('dato, sett').eq('bruker_id', id).gte('dato', fra),
        supabase.from('pr_rekorder').select('ovelse_id, kg, reps, dato').eq('bruker_id', id),
      ])
      if (o.error || l.error || r.error) { setStatus('feil'); return }
      setOkter(o.data ?? []); setLogger(l.data ?? []); setRekorder(r.data ?? [])
      setStatus('ok')
    })()
  }, [id])

  if (status === 'laster') return null

  if (status !== 'ok') return (
    <div className="del-page">
      <div className="page-header">
        <h1 className="page-title">Ingen tilgang<em className="gold">.</em></h1>
        <p className="page-subtitle">
          {status === 'feil' ? 'Kunne ikke hente dataene. Prøv igjen senere.' : 'Denne personen deler ikke treningen sin med deg.'}
        </p>
      </div>
      <Link href="/deling" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}><ArrowLeft size={14} /> Til deling</Link>
    </div>
  )

  const idag = lokalDato()
  const fra30 = lokalDato(new Date(Date.now() - 30 * 864e5))
  const mandag = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return lokalDato(d) })()
  const fullforte = okter.filter(o => o.fullfort)
  const sisteMnd = fullforte.filter(o => o.dato >= fra30 && o.dato <= idag).length
  const denneUka = fullforte.filter(o => o.dato >= mandag && o.dato <= idag).length
  const tonnasje = Math.round(logger.reduce((s, l) => s + volum(l.sett), 0))
  const prNavn = (pid: string) => PR_OVELSER.find(p => p.id === pid)?.navn ?? pid

  return (
    <div className="del-page">
      <Link href="/deling" className="del-tilbake"><ArrowLeft size={13} /> Deling</Link>
      <div className="page-header">
        <span className="eyebrow eyebrow-gold"><Eye size={11} style={{ verticalAlign: '-1px', marginRight: 6 }} />Delt med deg · bare lesing</span>
        <h1 className="page-title" style={{ marginTop: 8 }}>{navn}<em className="gold">.</em></h1>
      </div>

      <section className="hq-figures">
        <div className="hq-figure"><span className="eyebrow">Denne uka</span><div className="hq-figure-val num-monument"><TelleTall verdi={denneUka} /><small>økter</small></div></div>
        <div className="hq-figure"><span className="eyebrow">Siste 30 dager</span><div className="hq-figure-val num-monument"><TelleTall verdi={sisteMnd} forsinkelse={0.1} /><small>økter</small></div></div>
        <div className="hq-figure"><span className="eyebrow">Løftet · 30 dager</span><div className="hq-figure-val num-monument"><TelleTall verdi={tonnasje} forsinkelse={0.2} /><small>kg</small></div></div>
      </section>

      <section className="pf-seksjon glass-card del-seksjon">
        <span className="eyebrow">Siste økter</span>
        {okter.length === 0
          ? <p className="pf-dempet" style={{ marginTop: 10 }}>Ingen økter ennå.</p>
          : (
            <ul className="del-liste" style={{ marginTop: '0.75rem' }}>
              {okter.map(o => (
                <li key={o.id}>
                  <span className={`del-okt-merke${o.fullfort ? ' on' : ''}`}>{o.fullfort ? <Check size={12} strokeWidth={2} /> : null}</span>
                  <div className="del-info">
                    <span className="del-navn">{o.tittel || 'Økt'}</span>
                    <span className="del-epost">{formaterDato(o.dato, 'EEEE d. MMMM', { locale: nb })}{o.varighet_min ? ` · ${o.varighet_min} min` : ''}</span>
                  </div>
                  <span className="tid-merke">{o.fullfort ? 'Fullført' : 'Planlagt'}</span>
                </li>
              ))}
            </ul>
          )}
      </section>

      {rekorder.length > 0 && (
        <section className="pf-seksjon glass-card del-seksjon">
          <span className="eyebrow"><Trophy size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />Rekorder</span>
          <dl className="pf-ledger">
            {[...rekorder].sort((a, b) => b.kg - a.kg).map(r => (
              <div key={r.ovelse_id}><dt>{prNavn(r.ovelse_id)}</dt><dd>{r.kg} kg{r.reps ? ` × ${r.reps}` : ''}</dd></div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}
