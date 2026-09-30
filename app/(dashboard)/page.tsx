'use client'

import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { format, getISOWeek } from 'date-fns'
import { nb } from 'date-fns/locale'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useUser, useProfil, useDagensOkter, useStats, useAktivitet } from '@/hooks/useSupabaseQuery'
import { TickRing } from '@/components/atelier/Dial'

const UKEMAL = 4

const MAL_SITAT: Record<string, string> = {
  ned_i_vekt:    'Kostholdet gjør det meste av jobben. Treningen sørger for at det du mister, er fett.',
  bygge_muskler: 'Legg på litt mer enn sist, og spis nok protein. Resten ordner tiden.',
  vedlikehold:   'Du trenger ikke rekorder, bare jevn innsats over tid.',
  kondisjon:     'Tren mest i sone 2. Det føles for lett, og det er poenget.',
}

const REGISTER = [
  { href: '/treninger',    label: 'Ny økt',       sub: 'Sett sammen dagens trening' },
  { href: '/kalender',     label: 'Kalender',     sub: 'Ukens plan' },
  { href: '/ovelser',      label: 'Øvelser',      sub: 'Biblioteket' },
  { href: '/statistikk',   label: 'Statistikk',   sub: 'Fremgang og mål' },
  { href: '/utfordringer', label: 'Utfordringer', sub: 'Ukentlige mål' },
  { href: '/profiler',     label: 'Profil',       sub: 'Innstillinger' },
]

const fmt = (n: number) => new Intl.NumberFormat('nb-NO').format(n)

// Tonnasje over 10 000 kg vises i tonn for å holde tallet monumentalt, men lesbart
function tonnasje(kg: number) {
  if (kg >= 10000) return { val: (kg / 1000).toLocaleString('nb-NO', { maximumFractionDigits: 1 }), unit: 'tonn' }
  return { val: fmt(kg), unit: 'kg' }
}

const rise: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }),
}

export default function DashboardPage() {
  const idag  = new Date().toISOString().split('T')[0]
  const time  = new Date().getHours()
  const hilsen = time < 5 ? 'God natt' : time < 10 ? 'God morgen' : time < 17 ? 'God dag' : 'God kveld'
  const dagNavn = format(new Date(), 'EEEE d. MMMM', { locale: nb })
  const uke = getISOWeek(new Date())

  const { data: user }                  = useUser()
  const { data: profil }                = useProfil(user?.id)
  const { data: dagensOkter = [] }      = useDagensOkter(user?.id, idag)
  const { data: stats }                 = useStats(user?.id)
  const { data: aktivitet = [] }        = useAktivitet(user?.id)

  const fornavn = profil?.navn?.split(' ')[0]
    ?? user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'medlem'

  const sitat = MAL_SITAT[profil?.mal ?? 'bygge_muskler'] ?? MAL_SITAT.bygge_muskler
  const ukeOkter = stats?.ukeMaal ?? 0
  const ukeT = tonnasje(stats?.ukeKg ?? 0)
  const totalT = tonnasje(stats?.totalKg ?? 0)
  const maksUke = Math.max(1, ...aktivitet.map((a: any) => a.okter))

  return (
    <motion.div className="hq" initial="hidden" animate="show">

      {/* ── Masthead ── */}
      <motion.section variants={rise} custom={0}>
        <div className="hq-masthead">
          <span className="eyebrow" suppressHydrationWarning>{dagNavn}</span>
          <span className="eyebrow" suppressHydrationWarning>Uke {uke}</span>
        </div>
        <h1 className="hq-greeting" suppressHydrationWarning>
          {hilsen},<br /><em>{fornavn}.</em>
        </h1>
        <div className="hq-quote">
          <span className="hq-quote-bar" />
          <p>{sitat}</p>
        </div>
      </motion.section>

      {/* ── Ukens arbeid ── */}
      <motion.section variants={rise} custom={1} className="glass-card crop hq-panel">
        <div className="hq-panel-grid">
          <div>
            <span className="eyebrow eyebrow-gold">Løftet denne uken</span>
            <div className="hq-tonnage num-monument">
              {ukeT.val}<span className="unit">{ukeT.unit}</span>
            </div>
            <p className="hq-caption">
              {ukeOkter === 0
                ? 'Uken er fortsatt ubrukt. Første økt teller mest.'
                : `${ukeOkter} ${ukeOkter === 1 ? 'økt' : 'økter'} fullført, ${Math.max(0, UKEMAL - ukeOkter)} igjen til ukemålet.`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem', justifyContent: 'space-between', minWidth: 0 }}>
            <TickRing
              value={ukeOkter} max={UKEMAL} size={124}
              label={<span className="num-monument" style={{ fontSize: '2.6rem' }}>{ukeOkter}<span style={{ color: 'var(--text-muted)', fontSize: '1.3rem' }}>/{UKEMAL}</span></span>}
              sub="Ukemål"
            />
            <div style={{ flex: 1, minWidth: 0, maxWidth: 260 }}>
              <div className="hq-bars" aria-label="Økter per uke, siste sju uker">
                {(aktivitet.length ? aktivitet : Array.from({ length: 7 }, (_, i) => ({ uke: '', okter: 0, i }))).map((a: any, i: number, arr: any[]) => {
                  const now = i === arr.length - 1
                  return (
                    <div key={i} className={`hq-bar-col${now ? ' now' : ''}`}>
                      <div
                        className={`hq-bar${now ? ' now' : ''}`}
                        style={{ height: `${Math.max(3, (a.okter / maksUke) * 100)}%`, animationDelay: `${0.4 + i * 0.06}s` }}
                        title={`${a.okter} økter`}
                      />
                      <span className="hq-bar-lbl">{a.uke || '—'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <Link href="/treninger" className="btn btn-primary hq-cta">
          <span>Start dagens økt</span>
          <span className="hq-cta-arrow"><ArrowRight size={18} strokeWidth={1.5} /></span>
        </Link>
      </motion.section>

      {/* ── Nøkkeltall ── */}
      <motion.section variants={rise} custom={2} className="hq-figures">
        <div className="hq-figure">
          <span className="eyebrow">Rekke</span>
          <div className="hq-figure-val num-monument">{stats?.streak ?? 0}<small>dager</small></div>
          <div className="hq-figure-sub">på rad med trening</div>
        </div>
        <div className="hq-figure">
          <span className="eyebrow">Økter totalt</span>
          <div className="hq-figure-val num-monument">{fmt(stats?.totalOkter ?? 0)}</div>
          <div className="hq-figure-sub">siden du startet</div>
        </div>
        <div className="hq-figure">
          <span className="eyebrow">Samlet tonnasje</span>
          <div className="hq-figure-val num-monument">{totalT.val}<small>{totalT.unit}</small></div>
          <div className="hq-figure-sub">flyttet jern, totalt</div>
        </div>
      </motion.section>

      {/* ── Dagens plan ── */}
      <motion.section variants={rise} custom={3}>
        <div className="hq-section-head">
          <h2 className="hq-section-title">Dagens <em>plan</em></h2>
          <Link href="/kalender" className="hq-link">Kalender <ArrowUpRight size={12} /></Link>
        </div>

        {dagensOkter.length === 0 ? (
          <div className="glass-card hq-plan-empty">
            <div>
              <h3>Ingenting planlagt i dag.</h3>
              <p>Sett opp en økt nå, eller legg inn uken i kalenderen.</p>
            </div>
            <div className="hq-plan-btns">
              <Link href="/treninger" className="btn btn-primary">Lag en økt</Link>
              <Link href="/kalender" className="btn btn-ghost">Åpne kalender</Link>
            </div>
          </div>
        ) : (
          <div>
            {dagensOkter.map((okt: any) => (
              <Link key={okt.id} href={`/treninger/okt?okt=${okt.id}`} className="glass-card hq-session">
                <span className="hq-session-time">{okt.varighet_min}′</span>
                <div style={{ minWidth: 0 }}>
                  <div className="hq-session-title">{okt.tittel}</div>
                  <div className="hq-session-meta">{okt.type} · {okt.varighet_min} min</div>
                </div>
                <span className="hq-index-arrow"><ArrowRight size={18} strokeWidth={1.4} /></span>
              </Link>
            ))}
          </div>
        )}
      </motion.section>

      {/* ── Register ── */}
      <motion.section variants={rise} custom={4}>
        <div className="hq-section-head">
          <h2 className="hq-section-title">Register</h2>
          <span className="eyebrow">{REGISTER.length} kapitler</span>
        </div>
        <ul className="hq-index">
          {REGISTER.map((r, i) => (
            <li key={r.href}>
              <Link href={r.href} className="hq-index-row">
                <span className="hq-index-num">N°{String(i + 1).padStart(2, '0')}</span>
                <span className="hq-index-label">{r.label}</span>
                <span className="hq-index-sub">{r.sub}</span>
                <span className="hq-index-arrow"><ArrowUpRight size={16} strokeWidth={1.4} /></span>
              </Link>
            </li>
          ))}
        </ul>
      </motion.section>

    </motion.div>
  )
}
