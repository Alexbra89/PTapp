'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingDown, Dumbbell, Scale, HeartPulse, Pencil, X, Check } from 'lucide-react'
import { useUser, useProfil, useLagreProfil, useStats, useVektlogg } from '@/hooks/useSupabaseQuery'
import { TelleTall } from '@/components/atelier/TelleTall'
import { BRAND } from '@/lib/brand'
import InnstillingerPanel from '@/components/InnstillingerPanel'
import KontoPanel from '@/components/KontoPanel'

const MAL_OPTIONS = [
  { key: 'ned_i_vekt',    label: 'Ned i vekt',      ikon: TrendingDown, tekst: 'Kaloriunderskudd, bevar muskelmassen.' },
  { key: 'bygge_muskler', label: 'Bygge muskler',   ikon: Dumbbell,     tekst: 'Progressiv belastning og nok protein.' },
  { key: 'vedlikehold',   label: 'Vedlikehold',     ikon: Scale,        tekst: 'Jevn innsats, uke etter uke.' },
  { key: 'kondisjon',     label: 'Bedre kondisjon', ikon: HeartPulse,   tekst: 'Mest sone 2, litt intervall.' },
]

function beregnBMI(vekt: number, hoyde: number) {
  if (!vekt || !hoyde || hoyde < 50) return null
  return (vekt / ((hoyde / 100) ** 2)).toFixed(1)
}

function bmiKategori(bmi: number) {
  if (bmi < 18.5) return { label: 'Undervekt', color: 'var(--platinum)' }
  if (bmi < 25)   return { label: 'Normalvekt', color: 'var(--sage)' }
  if (bmi < 30)   return { label: 'Overvekt',  color: 'var(--ember)' }
  return             { label: 'Fedme',        color: 'var(--danger)' }
}

export default function ProfilPage() {
  const { data: user,   isLoading: userLaster } = useUser()
  const { data: profil, isLoading: profilLaster } = useProfil(user?.id)
  const lagreMut = useLagreProfil()

  // ── Form-state ──────────────────────────────────────────────────────────────
  const [redigerer,  setRedigerer]  = useState(false)
  const [melding,    setMelding]    = useState('')
  const [feil,       setFeil]       = useState('')

  // Form-feltene initialiseres fra profil når den lastes
  const [navn,       setNavn]       = useState('')
  const [vekt,       setVekt]       = useState<number|''>('')
  const [hoyde,      setHoyde]      = useState<number|''>('')
  const [mal,        setMal]        = useState('bygge_muskler')
  const [onsketVekt, setOnsketVekt] = useState<number|''>('')

  // Samme cachede tall som dashbordet – tidligere hadde profilen egne, dupliserte spørringer
  const { data: stats, isLoading: lasterStats } = useStats(user?.id)
  const { data: vektlogg = [] } = useVektlogg(user?.id, profil?.vekt)

  // Fyll inn form når profil laster
  const aapneRedigeringsform = () => {
    setNavn(profil?.navn ?? '')
    setVekt(profil?.vekt || '')
    setHoyde(profil?.hoyde || '')
    setMal(profil?.mal ?? 'bygge_muskler')
    setOnsketVekt(profil?.onsket_vekt || '')
    setFeil('')
    setRedigerer(true)
  }

  const avbrytRedigering = () => {
    setRedigerer(false)
    setFeil('')
  }

  const lagreProfil = async () => {
    if (!user) return
    setFeil('')
    const gyldigeMal = ['ned_i_vekt', 'bygge_muskler', 'vedlikehold', 'kondisjon']
    const malVerdi   = gyldigeMal.includes(mal) ? mal : 'bygge_muskler'
    try {
      await lagreMut.mutateAsync({
        id:          user.id,
        epost:       user.email ?? '',
        navn:        (String(navn).trim()) || (user.email ?? ''),
        vekt:        Number(vekt)        || 0,
        hoyde:       Number(hoyde)       || 0,
        mal:         malVerdi,
        onsket_vekt: Number(onsketVekt)  || 0,
      })
      setRedigerer(false)
      setMelding('Profilen er oppdatert.')
      setTimeout(() => setMelding(''), 3000)
    } catch (e: any) {
      setFeil(`Kunne ikke lagre: ${e.message}`)
    }
  }

  // ── Avledet data ────────────────────────────────────────────────────────────
  const liveBmi  = redigerer ? beregnBMI(Number(vekt), Number(hoyde)) : null
  const liveBmiK = liveBmi   ? bmiKategori(parseFloat(liveBmi)) : null

  const lagretBmi  = profil ? beregnBMI(profil.vekt, profil.hoyde) : null
  const lagretBmiK = lagretBmi ? bmiKategori(parseFloat(lagretBmi)) : null

  const malMeta = MAL_OPTIONS.find(m => m.key === (redigerer ? mal : profil?.mal))

  const initialer = ((redigerer ? navn : profil?.navn) || '?')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  const laster = userLaster || profilLaster

  if (laster) return null

  const startVekt = vektlogg[0]?.vekt ?? profil?.vekt ?? 0
  const naVekt    = profil?.vekt ?? 0
  const malVekt   = profil?.onsket_vekt ?? 0
  const totalVei  = Math.abs(startVekt - malVekt)
  const gjenstar  = Math.abs(naVekt - malVekt)
  const vektPct   = totalVei > 0 ? Math.max(0, Math.min(100, Math.round((1 - gjenstar / totalVei) * 100))) : (gjenstar === 0 ? 100 : 0)
  const medlemSiden = user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy', { locale: nb }) : null

  return (
    <div className="pf-page">
      <div className="page-header">
        <h1 className="page-title">Profilen<em className="gold">.</em></h1>
        <p className="page-subtitle">Kropp, mål og medlemskap</p>
      </div>

      <AnimatePresence>
        {melding && (
          <motion.div className="pf-melding" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Check size={14} strokeWidth={2} /> {melding}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medlemskort */}
      <section className="pf-kort glass-card crop">
        <div className="pf-kort-glans" />
        <div className="pf-kort-topp">
          <span className="eyebrow eyebrow-gold">{BRAND.navn} · {BRAND.kort}</span>
          <button className="btn btn-ghost pf-rediger" onClick={redigerer ? avbrytRedigering : aapneRedigeringsform}>
            {redigerer ? <><X size={13} /> Avbryt</> : <><Pencil size={13} strokeWidth={1.5} /> Rediger</>}
          </button>
        </div>
        <div className="pf-kort-midt">
          <div className="pf-monogram">{initialer}</div>
          <div style={{ minWidth: 0 }}>
            <h2 className="pf-navn">{profil?.navn || user?.email?.split('@')[0] || 'Legg til navn'}</h2>
            <div className="pf-epost">{profil?.epost ?? user?.email}</div>
          </div>
        </div>
        <div className="pf-kort-bunn">
          <div><span className="eyebrow">Mål</span><span className="pf-kort-verdi">{malMeta?.label ?? 'Ikke satt'}</span></div>
          {medlemSiden && <div><span className="eyebrow">Medlem siden</span><span className="pf-kort-verdi" style={{ textTransform: 'capitalize' }}>{medlemSiden}</span></div>}
        </div>
      </section>

      {/* Nøkkeltall */}
      <section className="hq-figures pf-tall">
        <div className="hq-figure">
          <span className="eyebrow">Økter</span>
          <div className="hq-figure-val num-monument">{lasterStats ? '–' : <TelleTall verdi={stats?.totalOkter ?? 0} />}</div>
          <div className="hq-figure-sub">totalt</div>
        </div>
        <div className="hq-figure">
          <span className="eyebrow">Tonnasje</span>
          <div className="hq-figure-val num-monument">{lasterStats ? '–' : <TelleTall verdi={stats?.totalKg ?? 0} forsinkelse={0.1} />}<small>kg</small></div>
          <div className="hq-figure-sub">løftet totalt</div>
        </div>
        <div className="hq-figure">
          <span className="eyebrow">Vekt</span>
          <div className="hq-figure-val num-monument">{naVekt ? <TelleTall verdi={naVekt} desimaler={naVekt % 1 ? 1 : 0} forsinkelse={0.2} /> : '–'}<small>kg</small></div>
          <div className="hq-figure-sub">{profil?.hoyde ? `${profil.hoyde} cm høy` : 'høyde ikke satt'}</div>
        </div>
        <div className="hq-figure">
          <span className="eyebrow">BMI</span>
          <div className="hq-figure-val num-monument">{lagretBmi ?? '–'}</div>
          <div className="hq-figure-sub" style={{ color: lagretBmiK?.color }}>{lagretBmiK?.label ?? '–'}</div>
        </div>
      </section>

      {/* Vektmål */}
      {malVekt > 0 && naVekt > 0 && (
        <section className="pf-seksjon glass-card">
          <div className="pf-seksjon-hode">
            <div>
              <span className="eyebrow">Vektmål</span>
              <h3 className="hq-section-title" style={{ marginTop: 8 }}>
                {gjenstar === 0 ? <>Målet er <em>nådd.</em></> : <><TelleTall verdi={gjenstar} desimaler={gjenstar % 1 ? 1 : 0} /> kg <em>igjen</em></>}
              </h3>
            </div>
            <div className="pf-prosent num-monument">{vektPct}<span>%</span></div>
          </div>
          <div className="tick-track"><div className="tick-fill" style={{ width: `${vektPct}%` }} /></div>
          <div className="pf-skala">
            <span>Start {startVekt} kg</span><span>Nå {naVekt} kg</span><span className="gold">Mål {malVekt} kg</span>
          </div>
        </section>
      )}

      {/* Redigering */}
      <AnimatePresence initial={false}>
        {redigerer && (
          <motion.section
            className="pf-seksjon glass-card"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <h3 className="hq-section-title" style={{ marginBottom: '1.5rem' }}>Rediger <em>profil</em></h3>
            <div className="pf-skjema">
              <label className="pf-felt pf-full"><span className="eyebrow">Navn</span>
                <input className="input" placeholder="Ditt navn" value={navn} onChange={e => setNavn(e.target.value)} /></label>
              <label className="pf-felt"><span className="eyebrow">Vekt (kg)</span>
                <input className="input" type="number" inputMode="decimal" min={30} max={300} value={vekt}
                  onChange={e => setVekt(e.target.value === '' ? '' : parseFloat(e.target.value))} /></label>
              <label className="pf-felt"><span className="eyebrow">Målvekt (kg)</span>
                <input className="input" type="number" inputMode="decimal" min={30} max={300} step={0.5} placeholder="80" value={onsketVekt}
                  onChange={e => setOnsketVekt(e.target.value === '' ? '' : parseFloat(e.target.value))} /></label>
              <label className="pf-felt"><span className="eyebrow">Høyde (cm)</span>
                <input className="input" type="number" inputMode="numeric" min={100} max={250} value={hoyde}
                  onChange={e => setHoyde(e.target.value === '' ? '' : parseFloat(e.target.value))} /></label>
              <div className="pf-felt"><span className="eyebrow">BMI</span>
                <div className="pf-bmi">{liveBmi ? <><span className="num-monument">{liveBmi}</span><span style={{ color: liveBmiK?.color }}>{liveBmiK?.label}</span></> : <span className="pf-dempet">Fyll inn vekt og høyde</span>}</div>
              </div>
              <div className="pf-felt pf-full"><span className="eyebrow">Treningsmål</span>
                <div className="pf-mal-grid">
                  {MAL_OPTIONS.map(m => (
                    <button key={m.key} className={`pf-mal${mal === m.key ? ' on' : ''}`} onClick={() => setMal(m.key)}>
                      <m.ikon size={18} strokeWidth={1.3} />
                      <span className="pf-mal-navn">{m.label}</span>
                      <span className="pf-mal-tekst">{m.tekst}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {feil && <div className="login-error-box" style={{ marginTop: '1rem' }}><span className="login-error-text">{feil}</span></div>}
            <div className="pf-knapper">
              <button className="btn btn-ghost" onClick={avbrytRedigering}>Avbryt</button>
              <button className="btn btn-primary" onClick={lagreProfil} disabled={lagreMut.isPending}>
                {lagreMut.isPending ? <span className="spinner" /> : 'Lagre profil'}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Mål og konto */}
      {!redigerer && (
        <section className="pf-to">
          <div className="pf-seksjon glass-card">
            <span className="eyebrow">Treningsmål</span>
            {malMeta ? (
              <div className="pf-mal-vis">
                <span className="pf-mal-ikon"><malMeta.ikon size={20} strokeWidth={1.3} /></span>
                <div>
                  <div className="pf-mal-vis-navn">{malMeta.label}</div>
                  <div className="pf-dempet">{malMeta.tekst}</div>
                </div>
              </div>
            ) : <p className="pf-dempet" style={{ marginTop: 12 }}>Ikke satt. Trykk «Rediger» for å velge.</p>}
          </div>
          <div className="pf-seksjon glass-card">
            <span className="eyebrow">Konto</span>
            <dl className="pf-ledger">
              <div><dt>E-post</dt><dd>{profil?.epost ?? user?.email}</dd></div>
              <div><dt>Status</dt><dd className="gold">Aktiv</dd></div>
            </dl>
          </div>
        </section>
      )}

      {!redigerer && <InnstillingerPanel />}
      {!redigerer && <KontoPanel />}
    </div>
  )
}
