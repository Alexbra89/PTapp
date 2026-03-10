'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profil {
  id: string
  epost: string
  navn: string
  vekt: number
  hoyde: number
  mal: string
}

const MAL_OPTIONS = [
  { key: 'ned_i_vekt',    label: 'Ned i vekt',      emoji: '⬇️', color: 'var(--cyan)'   },
  { key: 'bygge_muskler', label: 'Bygge muskler',   emoji: '💪', color: 'var(--purple)' },
  { key: 'vedlikehold',   label: 'Vedlikehold',     emoji: '⚖️', color: 'var(--green)'  },
  { key: 'kondisjon',     label: 'Bedre kondisjon', emoji: '🏃', color: 'var(--orange)' },
]

function beregnBMI(vekt: number, hoyde: number) {
  if (!vekt || !hoyde || hoyde < 50) return null
  return (vekt / ((hoyde / 100) ** 2)).toFixed(1)
}

function bmiKategori(bmi: number) {
  if (bmi < 18.5) return { label: 'Undervekt', color: 'var(--cyan)' }
  if (bmi < 25)   return { label: 'Normal',    color: 'var(--green)' }
  if (bmi < 30)   return { label: 'Overvekt',  color: 'var(--orange)' }
  return             { label: 'Fedme',        color: '#ff4444' }
}

export default function ProfilPage() {
  const supabase = createClient()
  const [profil,    setProfil]    = useState<Profil | null>(null)
  const [redigerer, setRedigerer] = useState(false)
  const [lagrer,    setLagrer]    = useState(false)
  const [laster,    setLaster]    = useState(true)
  const [melding,   setMelding]   = useState('')
  const [feil,      setFeil]      = useState('')
  const [stats,     setStats]     = useState({ okter: 0, kg: 0 })

  // Form state
  const [navn,   setNavn]  = useState('')
  const [vekt,   setVekt]  = useState<number|''>('')
  const [hoyde,  setHoyde] = useState<number|''>('')
  const [mal,    setMal]   = useState('bygge_muskler')

  // Live BMI fra form
  const liveBmi  = beregnBMI(Number(vekt), Number(hoyde))
  const liveBmiK = liveBmi ? bmiKategori(parseFloat(liveBmi)) : null

  // BMI fra lagret profil
  const lagretBmi  = profil ? beregnBMI(profil.vekt, profil.hoyde) : null
  const lagretBmiK = lagretBmi ? bmiKategori(parseFloat(lagretBmi)) : null

  useEffect(() => { hentProfil() }, [])

  const hentProfil = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLaster(false); return }

    const { data } = await supabase
      .from('profiler')
      .select('id, epost, navn, vekt, hoyde, mal')
      .eq('id', user.id)
      .single()

    const p: Profil = data ?? {
      id: user.id, epost: user.email ?? '',
      navn: user.user_metadata?.full_name ?? '',
      vekt: 0, hoyde: 0, mal: 'bygge_muskler',
    }

    setProfil(p)
    setNavn(p.navn || '')
    setVekt(p.vekt || '')
    setHoyde(p.hoyde || '')
    setMal(p.mal || 'bygge_muskler')

    // Stats
    const { count: okter } = await supabase
      .from('okter').select('*', { count: 'exact', head: true }).eq('bruker_id', user.id)

    const { data: logger } = await supabase
      .from('treningslogger').select('sett').eq('bruker_id', user.id)

    const totalKg = (logger ?? []).reduce((sum: number, l: any) =>
      sum + (l.sett ?? []).reduce((s: number, set: any) =>
        s + (set.vekt ?? 0) * (set.reps ?? 0), 0), 0)

    setStats({ okter: okter ?? 0, kg: Math.round(totalKg) })
    setLaster(false)
  }

  const lagreProfil = async () => {
    setLagrer(true)
    setFeil('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLagrer(false); return }

    // Bare kolonnene som eksisterer i tabellen
    const payload = {
      id:    user.id,
      epost: user.email ?? '',
      navn:  navn.trim() || (user.email ?? ''),
      vekt:  Number(vekt) || 0,
      hoyde: Number(hoyde) || 0,
      mal,
    }

    const { error } = await supabase
      .from('profiler')
      .upsert(payload, { onConflict: 'id' })

    if (error) {
      console.error('Profil-feil:', error)
      setFeil(`Kunne ikke lagre: ${error.message}`)
      setLagrer(false)
      return
    }

    setProfil({ ...payload })
    setRedigerer(false)
    setMelding('Profil oppdatert! ✓')
    setTimeout(() => setMelding(''), 3000)
    setLagrer(false)
  }

  const initialer = (navn || profil?.navn || '?')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const malMeta = MAL_OPTIONS.find(m => m.key === (redigerer ? mal : profil?.mal))

  if (laster) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner-lg" />
    </div>
  )

  return (
    <div className="pr-page anim-fade-up">
      <div className="page-header">
        <h1 className="page-title">Profil</h1>
        <p className="page-subtitle">Din treningsprofil og innstillinger</p>
      </div>

      {melding && <div className="pr-melding">{melding}</div>}
      {feil    && <div className="pr-feil">{feil}</div>}

      {/* Hero-kort */}
      <div className="pr-hero glass-card">
        <div className="pr-hero-shine" />
        <div className="pr-hero-inner">
          <div className="pr-avatar-wrap">
            <div className="pr-avatar">{initialer}</div>
            <div className="pr-avatar-ring" />
          </div>
          <div className="pr-hero-info">
            <div className="pr-navn">{profil?.navn || 'Legg til navn'}</div>
            <div className="pr-epost">{profil?.epost}</div>
            {malMeta && !redigerer && (
              <div className="pr-mal-badge"
                style={{ background: `${malMeta.color}15`, borderColor: `${malMeta.color}30`, color: malMeta.color }}>
                {malMeta.emoji} {malMeta.label}
              </div>
            )}
          </div>
          <button className="btn btn-ghost pr-edit-btn" onClick={() => { setRedigerer(!redigerer); setFeil('') }}>
            {redigerer ? '✕ Avbryt' : '✏️ Rediger'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="pr-stats-grid">
        {[
          { label: 'Treningsøkter', value: stats.okter,                           color: 'var(--cyan)',   icon: '📅' },
          { label: 'Kg løftet',     value: `${stats.kg.toLocaleString('no')} kg`, color: 'var(--green)',  icon: '🏋️' },
          { label: 'Vekt',          value: profil?.vekt ? `${profil.vekt} kg` : '–', color: 'var(--purple)', icon: '⚖️' },
          {
            label: 'BMI',
            value: lagretBmi ?? '–',
            color: lagretBmiK?.color ?? 'rgba(255,255,255,0.4)',
            icon: '📊',
            sub: lagretBmiK?.label,
          },
        ].map(s => (
          <div key={s.label} className="pr-stat glass-card">
            <div className="pr-stat-icon">{s.icon}</div>
            <div className="pr-stat-val" style={{ color: s.color }}>{s.value}</div>
            {(s as any).sub && <div className="pr-stat-sub" style={{ color: s.color }}>{(s as any).sub}</div>}
            <div className="pr-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Redigeringsform */}
      {redigerer ? (
        <div className="pr-form glass-card">
          <div className="pr-form-title">✏️ Rediger profil</div>
          <div className="pr-form-grid">

            <div className="pr-form-field">
              <label className="pr-label">Navn</label>
              <input className="input" placeholder="Ditt navn"
                value={navn} onChange={e => setNavn(e.target.value)} />
            </div>

            <div className="pr-form-field">
              <label className="pr-label">Vekt (kg)</label>
              <input className="input" type="number" min={30} max={300}
                value={vekt}
                onChange={e => setVekt(e.target.value === '' ? '' : parseFloat(e.target.value))} />
            </div>

            <div className="pr-form-field">
              <label className="pr-label">Høyde (cm)</label>
              <input className="input" type="number" min={100} max={250}
                value={hoyde}
                onChange={e => setHoyde(e.target.value === '' ? '' : parseFloat(e.target.value))} />
            </div>

            {/* Live BMI */}
            {liveBmi && liveBmiK && (
              <div className="pr-form-field">
                <label className="pr-label">BMI (live)</label>
                <div className="pr-bmi-display"
                  style={{ borderColor: `${liveBmiK.color}30`, background: `${liveBmiK.color}08` }}>
                  <span className="pr-bmi-tall" style={{ color: liveBmiK.color }}>{liveBmi}</span>
                  <span className="pr-bmi-kat" style={{ color: liveBmiK.color }}>{liveBmiK.label}</span>
                </div>
              </div>
            )}

            <div className="pr-form-field pr-form-full">
              <label className="pr-label">Treningsmål</label>
              <div className="pr-mal-grid">
                {MAL_OPTIONS.map(m => (
                  <button key={m.key}
                    className="pr-mal-btn"
                    style={mal === m.key ? {
                      background: `${m.color}15`,
                      borderColor: `${m.color}40`,
                      color: m.color,
                    } : {}}
                    onClick={() => setMal(m.key)}>
                    <span style={{ fontSize: '1.3rem' }}>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pr-form-footer">
            <button className="btn btn-ghost" onClick={() => { setRedigerer(false); setFeil('') }}>Avbryt</button>
            <button className="btn btn-primary" onClick={lagreProfil} disabled={lagrer}>
              {lagrer
                ? <span className="spinner" style={{ width: 16, height: 16 }} />
                : '💾 Lagre profil'}
            </button>
          </div>
        </div>
      ) : (
        <div className="pr-info-grid">
          <div className="pr-card glass-card">
            <div className="pr-card-title">🏋️ Kropp</div>
            <div className="pr-info-rows">
              {[
                { label: 'Vekt',   value: profil?.vekt  ? `${profil.vekt} kg`  : '–' },
                { label: 'Høyde',  value: profil?.hoyde ? `${profil.hoyde} cm` : '–' },
                {
                  label: 'BMI',
                  value: lagretBmi ? `${lagretBmi} — ${lagretBmiK?.label}` : '–',
                  color: lagretBmiK?.color,
                },
              ].map(r => (
                <div key={r.label} className="pr-info-row">
                  <span className="pr-info-lbl">{r.label}</span>
                  <span className="pr-info-val" style={(r as any).color ? { color: (r as any).color } : {}}>
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pr-card glass-card">
            <div className="pr-card-title">🎯 Treningsmål</div>
            {malMeta ? (
              <div className="pr-mal-vis"
                style={{ background: `${malMeta.color}08`, borderColor: `${malMeta.color}20` }}>
                <span style={{ fontSize: '2rem' }}>{malMeta.emoji}</span>
                <div>
                  <div style={{ color: malMeta.color, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
                    {malMeta.label}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', marginTop: 3 }}>
                    Ditt nåværende treningsmål
                  </div>
                </div>
              </div>
            ) : (
              <div className="pr-empty">Ingen mål satt — trykk Rediger</div>
            )}
          </div>

          <div className="pr-card glass-card">
            <div className="pr-card-title">🔐 Konto</div>
            <div className="pr-info-rows">
              <div className="pr-info-row">
                <span className="pr-info-lbl">E-post</span>
                <span className="pr-info-val">{profil?.epost}</span>
              </div>
              <div className="pr-info-row">
                <span className="pr-info-lbl">Status</span>
                <span className="pr-info-val" style={{ color: 'var(--green)' }}>● Aktiv</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pr-page { max-width: 900px; }

        .pr-melding { background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.25); color: var(--green); border-radius: 12px; padding: 0.75rem 1rem; font-size: 0.85rem; text-align: center; margin-bottom: 1rem; }
        .pr-feil { background: rgba(255,50,50,0.1); border: 1px solid rgba(255,50,50,0.25); color: #ff6060; border-radius: 12px; padding: 0.75rem 1rem; font-size: 0.85rem; margin-bottom: 1rem; }

        .pr-hero { padding: 0; overflow: hidden; margin-bottom: 1.25rem; }
        .pr-hero-shine { height: 1px; background: linear-gradient(90deg, transparent, rgba(0,245,255,0.3), transparent); }
        .pr-hero-inner { display: flex; align-items: center; gap: 1.5rem; padding: 1.75rem 2rem; flex-wrap: wrap; }

        .pr-avatar-wrap { position: relative; flex-shrink: 0; }
        .pr-avatar { width: 72px; height: 72px; border-radius: 50%; position: relative; z-index: 1; background: linear-gradient(135deg, rgba(0,245,255,0.3), rgba(180,78,255,0.3)); border: 2px solid rgba(0,245,255,0.3); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; color: #fff; }
        .pr-avatar-ring { position: absolute; inset: -6px; border-radius: 50%; background: conic-gradient(var(--cyan), var(--purple), var(--cyan)); opacity: 0.2; animation: pr-spin 8s linear infinite; }
        @keyframes pr-spin { to { transform: rotate(360deg); } }

        .pr-hero-info { flex: 1; }
        .pr-navn { font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: 4px; }
        .pr-epost { font-size: 0.82rem; color: rgba(255,255,255,0.35); margin-bottom: 10px; }
        .pr-mal-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 500; border: 1px solid; }
        .pr-edit-btn { flex-shrink: 0; }

        .pr-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.25rem; }
        @media(max-width: 700px) { .pr-stats-grid { grid-template-columns: repeat(2, 1fr); } }
        .pr-stat { padding: 1.25rem; text-align: center; }
        .pr-stat-icon { font-size: 1.4rem; margin-bottom: 0.5rem; }
        .pr-stat-val { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; margin-bottom: 2px; }
        .pr-stat-sub { font-size: 0.68rem; font-weight: 600; margin-bottom: 2px; }
        .pr-stat-lbl { font-size: 0.68rem; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.08em; }

        .pr-form { padding: 1.5rem; }
        .pr-form-title { font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem; }
        .pr-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; }
        @media(max-width: 600px) { .pr-form-grid { grid-template-columns: 1fr; } }
        .pr-form-full { grid-column: 1 / -1; }
        .pr-form-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .pr-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.35); font-weight: 600; }
        .pr-form-footer { display: flex; gap: 10px; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.07); }

        .pr-bmi-display { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; border: 1px solid; }
        .pr-bmi-tall { font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; }
        .pr-bmi-kat { font-size: 0.88rem; font-weight: 600; }

        .pr-mal-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        @media(max-width: 600px) { .pr-mal-grid { grid-template-columns: 1fr 1fr; } }
        .pr-mal-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); cursor: pointer; transition: all 0.15s; font-family: var(--font-body); font-size: 0.78rem; color: rgba(255,255,255,0.5); }
        .pr-mal-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.8); }

        .pr-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        @media(max-width: 600px) { .pr-info-grid { grid-template-columns: 1fr; } }
        .pr-card { padding: 1.25rem; }
        .pr-card-title { font-family: var(--font-display); font-size: 0.85rem; font-weight: 700; color: #fff; margin-bottom: 1rem; }
        .pr-info-rows { display: flex; flex-direction: column; gap: 8px; }
        .pr-info-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); }
        .pr-info-lbl { font-size: 0.75rem; color: rgba(255,255,255,0.35); }
        .pr-info-val { font-size: 0.85rem; color: rgba(255,255,255,0.75); font-weight: 500; }
        .pr-mal-vis { display: flex; align-items: center; gap: 1rem; padding: 1rem; border-radius: 14px; border: 1px solid; }
        .pr-empty { font-size: 0.82rem; color: rgba(255,255,255,0.3); text-align: center; padding: 1rem 0; }
      `}</style>
    </div>
  )
}
