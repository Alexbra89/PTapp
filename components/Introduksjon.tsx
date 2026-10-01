'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { TrendingDown, Dumbbell, Scale, HeartPulse, Building2, Home, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { QK } from '@/hooks/useSupabaseQuery'
import { lagreInnstillinger, type Innstillinger } from '@/lib/innstillinger'
import { BRAND } from '@/lib/brand'
import { Dial } from '@/components/atelier/Dial'

export const INTRO_NOKKEL = 'abpt_intro_ferdig'

type Mal = 'ned_i_vekt' | 'bygge_muskler' | 'vedlikehold' | 'kondisjon'
type Niva = NonNullable<Innstillinger['niva']>
type Sted = NonNullable<Innstillinger['sted']>

const MAL: { k: Mal; l: string; s: string; ikon: typeof Scale }[] = [
  { k: 'bygge_muskler', l: 'Bygge muskler',   s: 'Mer styrke og muskelmasse', ikon: Dumbbell },
  { k: 'ned_i_vekt',    l: 'Ned i vekt',      s: 'Forbrenne fett, beholde muskler', ikon: TrendingDown },
  { k: 'kondisjon',     l: 'Bedre kondisjon', s: 'Mer utholdenhet og overskudd', ikon: HeartPulse },
  { k: 'vedlikehold',   l: 'Holde formen',    s: 'Jevn trening, uke etter uke', ikon: Scale },
]
const NIVA: { k: Niva; l: string; s: string; n: number }[] = [
  { k: 'Nybegynner', l: 'Nybegynner', s: 'Nytt eller lenge siden sist', n: 1 },
  { k: 'Middels',    l: 'Middels',    s: 'Trener jevnlig og kan grunnøvelsene', n: 2 },
  { k: 'Avansert',   l: 'Erfaren',    s: 'Flere års trening, tunge løft', n: 3 },
]
const STED: { k: Sted; l: string; s: string; ikon: typeof Home }[] = [
  { k: 'gym',    l: 'På gymmen', s: 'Stang, manualer, kabler og maskiner', ikon: Building2 },
  { k: 'hjemme', l: 'Hjemme',    s: 'Kroppsvekt, manualer og strikk', ikon: Home },
]

const EASE = [0.16, 1, 0.3, 1] as const

interface Props {
  bruker: { id: string; email?: string; user_metadata?: { full_name?: string } }
  harProfil: boolean
  navn?: string | null
  onFerdig: () => void
}

export default function Introduksjon({ bruker, harProfil, navn, onFerdig }: Props) {
  const [steg, setSteg] = useState(0)
  const [retning, setRetning] = useState(1)
  const [mal, setMal] = useState<Mal | null>(null)
  const [niva, setNiva] = useState<Niva | null>(null)
  const [sted, setSted] = useState<Sted | null>(null)
  const [lagrer, setLagrer] = useState(false)
  const qc = useQueryClient()
  const fornavn = (navn || bruker.user_metadata?.full_name || '').split(' ')[0]

  const valgt = [mal, niva, sted][steg]
  const ga = (d: number) => { setRetning(d); setSteg(s => s + d) }

  const avslutt = () => {
    try { localStorage.setItem(INTRO_NOKKEL, '1') } catch {}
    onFerdig()
  }

  const fullfor = async () => {
    setLagrer(true)
    lagreInnstillinger({ niva: niva ?? undefined, sted: sted ?? undefined })
    const supabase = createClient()
    // Eksisterende profil: bare målet endres. Ny: opprett med det vi vet.
    const { error } = harProfil
      ? await supabase.from('profiler').update({ mal }).eq('id', bruker.id)
      : await supabase.from('profiler').upsert({ id: bruker.id, epost: bruker.email, navn: navn || bruker.user_metadata?.full_name || '', mal }, { onConflict: 'id' })
    if (error) console.warn('Kunne ikke lagre målet:', error.message) // ikke stopp brukeren – det kan settes på profilen senere
    qc.invalidateQueries({ queryKey: QK.profil(bruker.id) })
    setLagrer(false)
    avslutt()
  }

  const sider = [
    {
      eyebrow: 'Steg 1 av 3', tittel: <>Hva vil du <em>oppnå?</em></>,
      innhold: (
        <div className="intro-valg">
          {MAL.map(m => (
            <button key={m.k} className={`intro-kort${mal === m.k ? ' on' : ''}`} onClick={() => setMal(m.k)}>
              <span className="intro-ikon"><m.ikon size={20} strokeWidth={1.3} /></span>
              <span className="intro-tekst"><strong>{m.l}</strong><span>{m.s}</span></span>
              <span className="intro-hake">{mal === m.k && <Check size={14} strokeWidth={2} />}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      eyebrow: 'Steg 2 av 3', tittel: <>Hvor <em>erfaren</em> er du?</>,
      innhold: (
        <div className="intro-valg">
          {NIVA.map(n => (
            <button key={n.k} className={`intro-kort${niva === n.k ? ' on' : ''}`} onClick={() => setNiva(n.k)}>
              <span className="intro-ikon"><span className="bib-niva">{[1, 2, 3].map(i => <i key={i} className={i <= n.n ? 'on' : ''} />)}</span></span>
              <span className="intro-tekst"><strong>{n.l}</strong><span>{n.s}</span></span>
              <span className="intro-hake">{niva === n.k && <Check size={14} strokeWidth={2} />}</span>
            </button>
          ))}
          <p className="intro-merk">Brukes til å foreslå øvelser på ditt nivå.</p>
        </div>
      ),
    },
    {
      eyebrow: 'Steg 3 av 3', tittel: <>Hvor trener du <em>mest?</em></>,
      innhold: (
        <div className="intro-valg">
          {STED.map(st => (
            <button key={st.k} className={`intro-kort${sted === st.k ? ' on' : ''}`} onClick={() => setSted(st.k)}>
              <span className="intro-ikon"><st.ikon size={20} strokeWidth={1.3} /></span>
              <span className="intro-tekst"><strong>{st.l}</strong><span>{st.s}</span></span>
              <span className="intro-hake">{sted === st.k && <Check size={14} strokeWidth={2} />}</span>
            </button>
          ))}
          <p className="intro-merk">Du kan alltid bytte når du setter sammen en økt.</p>
        </div>
      ),
    },
  ]
  const side = sider[steg]

  return createPortal(
    <motion.div className="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Kom i gang">
      <motion.div className="intro-ring" initial={{ rotate: -40, opacity: 0 }} animate={{ rotate: steg * 30, opacity: 1 }} transition={{ duration: 1.4, ease: EASE }}>
        <Dial className="w-full h-full" />
      </motion.div>

      <div className="intro-ramme">
        <div className="intro-topp">
          <span className="eyebrow eyebrow-gold">{BRAND.navn}</span>
          <button className="intro-hopp" onClick={avslutt}>Hopp over</button>
        </div>

        <div className="intro-fremdrift" aria-hidden>
          {[0, 1, 2].map(i => <span key={i} className={i <= steg ? 'on' : ''} />)}
        </div>

        {steg === 0 && (
          <motion.p className="intro-hei" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            Velkommen{fornavn ? `, ${fornavn}` : ''}. Tre raske spørsmål, så tilpasser vi appen til deg.
          </motion.p>
        )}

        <AnimatePresence mode="wait" custom={retning} initial={false}>
          <motion.div key={steg} custom={retning}
            initial={{ opacity: 0, x: retning * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: retning * -40 }}
            transition={{ duration: 0.45, ease: EASE }}>
            <span className="eyebrow">{side.eyebrow}</span>
            <h2 className="intro-tittel">{side.tittel}</h2>
            {side.innhold}
          </motion.div>
        </AnimatePresence>

        <div className="intro-knapper">
          {steg > 0
            ? <button className="btn btn-ghost" onClick={() => ga(-1)}><ArrowLeft size={14} strokeWidth={1.6} /> Tilbake</button>
            : <span />}
          {steg < 2
            ? <button className="btn btn-primary" disabled={!valgt} onClick={() => ga(1)}>Neste <ArrowRight size={14} strokeWidth={1.6} /></button>
            : <button className="btn btn-gold" disabled={!valgt || lagrer} onClick={fullfor}>{lagrer ? 'Lagrer …' : 'Kom i gang'} <ArrowRight size={14} strokeWidth={1.6} /></button>}
        </div>
      </div>
    </motion.div>,
    document.body,
  )
}
