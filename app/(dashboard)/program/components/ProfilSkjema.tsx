'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { TrendingDown, Dumbbell, Scale, HeartPulse } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { QK } from '@/hooks/useSupabaseQuery'

type Mal = 'ned_i_vekt' | 'bygge_muskler' | 'vedlikehold' | 'kondisjon'

const MAL: { key: Mal; label: string; ikon: typeof Scale }[] = [
  { key: 'ned_i_vekt',    label: 'Ned i vekt',      ikon: TrendingDown },
  { key: 'bygge_muskler', label: 'Bygge muskler',   ikon: Dumbbell },
  { key: 'vedlikehold',   label: 'Vedlikehold',     ikon: Scale },
  { key: 'kondisjon',     label: 'Bedre kondisjon', ikon: HeartPulse },
]

interface Props {
  onSave: () => void
  onAvbryt?: () => void
  // Eksisterende profil fylles inn – tidligere startet skjemaet alltid på 70 kg / 170 cm
  // og overskrev den ekte profilen ved lagring.
  profil?: { navn?: string; vekt?: number; hoyde?: number; fodselsar?: number; mal?: string } | null
}

export default function ProfilSkjema({ onSave, onAvbryt, profil }: Props) {
  const [navn, setNavn] = useState(profil?.navn ?? '')
  const [vekt, setVekt] = useState(String(profil?.vekt || 70))
  const [hoyde, setHoyde] = useState(String(profil?.hoyde || 170))
  const [fodselsar, setFodselsar] = useState(String(profil?.fodselsar || 1990))
  const [mal, setMal] = useState<Mal>((profil?.mal as Mal) ?? 'vedlikehold')
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState('')
  const supabase = createClient()
  const qc = useQueryClient()

  const lagre = async (e: React.FormEvent) => {
    e.preventDefault()
    setLaster(true); setFeil('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLaster(false); setFeil('Du må være logget inn.'); return }
    const { error } = await supabase.from('profiler').upsert({
      id: user.id, navn, vekt: parseFloat(vekt), hoyde: parseInt(hoyde), fodselsar: parseInt(fodselsar),
      mal, epost: user.email,
    })
    setLaster(false)
    if (error) { setFeil(`Kunne ikke lagre: ${error.message}`); return }
    qc.invalidateQueries({ queryKey: QK.profil(user.id) })
    onSave()
  }

  const kalorier = (() => {
    const alder = new Date().getFullYear() - (parseInt(fodselsar) || 1990)
    const bmr = 10 * (parseFloat(vekt) || 70) + 6.25 * (parseInt(hoyde) || 170) - 5 * alder + 5
    return Math.round(bmr * 1.2 + (mal === 'ned_i_vekt' ? -500 : mal === 'bygge_muskler' ? 300 : 0))
  })()

  return (
    <form onSubmit={lagre} className="pf-seksjon glass-card prg-skjema">
      <span className="eyebrow eyebrow-gold">Ditt utgangspunkt</span>
      <h2 className="hq-section-title" style={{ margin: '0.6rem 0 1.5rem' }}>Fortell om <em>deg selv</em></h2>
      <div className="pf-skjema">
        <label className="pf-felt pf-full"><span className="eyebrow">Navn</span>
          <input className="input" value={navn} onChange={e => setNavn(e.target.value)} placeholder="Ola Nordmann" required /></label>
        <label className="pf-felt"><span className="eyebrow">Vekt (kg)</span>
          <input className="input" type="number" inputMode="decimal" step="0.1" min="30" max="250" value={vekt} onChange={e => setVekt(e.target.value)} required /></label>
        <label className="pf-felt"><span className="eyebrow">Høyde (cm)</span>
          <input className="input" type="number" inputMode="numeric" min="100" max="250" value={hoyde} onChange={e => setHoyde(e.target.value)} required /></label>
        <label className="pf-felt pf-full"><span className="eyebrow">Fødselsår</span>
          <input className="input" type="number" inputMode="numeric" min="1900" max={new Date().getFullYear()} value={fodselsar} onChange={e => setFodselsar(e.target.value)} required /></label>
        <div className="pf-felt pf-full"><span className="eyebrow">Hovedmål</span>
          <div className="pf-mal-grid">
            {MAL.map(m => (
              <button type="button" key={m.key} className={`pf-mal${mal === m.key ? ' on' : ''}`} onClick={() => setMal(m.key)}>
                <m.ikon size={18} strokeWidth={1.3} />
                <span className="pf-mal-navn">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="prg-forhandsvis">
        <span className="eyebrow">Anslått dagsbehov</span>
        <span className="num-monument">{kalorier.toLocaleString('nb-NO')}<small> kcal</small></span>
      </div>
      {feil && <div className="login-error-box" style={{ marginTop: '1rem' }}><span className="login-error-text">{feil}</span></div>}
      <div className="pf-knapper">
        {onAvbryt && <button type="button" className="btn btn-ghost" onClick={onAvbryt}>Avbryt</button>}
        <button type="submit" className="btn btn-primary" disabled={laster}>{laster ? 'Lagrer …' : 'Lagre og vis programmet'}</button>
      </div>
    </form>
  )
}
