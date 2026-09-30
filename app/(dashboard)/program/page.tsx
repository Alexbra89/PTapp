'use client'

import { useState } from 'react'
import { Pencil, Dumbbell } from 'lucide-react'
import { useUser, useProfil, useStats, useAktivitet } from '@/hooks/useSupabaseQuery'
import { OVELSER as BIBLIOTEK, muskler, visesBakfra } from '@/data/ovelsesbibliotek'
import { MuskelkartMini } from '@/components/atelier/Muskelkart'
import { TelleTall } from '@/components/atelier/TelleTall'
import ProfilSkjema from './components/ProfilSkjema'
import AnbefaltOpplegg from './components/AnbefaltOpplegg'
import type { BrukerProfil } from '@/types'

const MAL_NAVN: Record<string, string> = {
  ned_i_vekt: 'vekttap', bygge_muskler: 'muskelvekst', vedlikehold: 'vedlikehold', kondisjon: 'bedre kondisjon',
}

const UKEPLAN = [
  { dag: 'Mandag', fokus: 'Bryst', ovelser: [['Benkpress', '3×8–10'], ['Incline benkpress', '3×10–12'], ['Hantelflyes', '3×12–15'], ['Triceps pushdown', '3×12']] },
  { dag: 'Tirsdag', fokus: 'Rygg', ovelser: [['Pull-ups', '3×maks'], ['Stang roing', '3×10–12'], ['Markløft', '3×8'], ['Biceps curl', '3×12']] },
  { dag: 'Torsdag', fokus: 'Bein og skuldre', ovelser: [['Knebøy', '4×8–10'], ['Utfall', '3×12 per bein'], ['Military press', '3×10'], ['Sidehev', '3×15']] },
  { dag: 'Lørdag', fokus: 'Kondisjon', ovelser: [['Sprints', '20 min'], ['Burpees', '3×15'], ['Fjellklatrere', '3×30 sek'], ['Planke', '3×60 sek']] },
]

function Merke({ navn }: { navn: string }) {
  const b = BIBLIOTEK.find(o => o.navn.toLowerCase() === navn.toLowerCase())
  if (!b) return <span className="kal-ov-em"><Dumbbell size={14} strokeWidth={1.3} style={{ color: 'var(--text-muted)' }} /></span>
  const m = muskler(b)
  return <span className="kal-ov-em"><MuskelkartMini {...m} bakfra={visesBakfra(m.primaer)} hoyde={38} /></span>
}

export default function ProgramSide() {
  const { data: user } = useUser()
  const { data: profil, isLoading } = useProfil(user?.id)
  const { data: stats } = useStats(user?.id)
  const { data: aktivitet = [] } = useAktivitet(user?.id)
  const [redigerer, setRedigerer] = useState(false)

  if (isLoading || !user) return null

  if (!profil || !profil.vekt || redigerer) {
    return (
      <div className="prg-page">
        <div className="page-header">
          <h1 className="page-title">Programmet<em className="gold">.</em></h1>
          <p className="page-subtitle">Tilpasset kroppen og målet ditt</p>
        </div>
        <ProfilSkjema profil={profil} onSave={() => setRedigerer(false)} onAvbryt={profil?.vekt ? () => setRedigerer(false) : undefined} />
      </div>
    )
  }

  // Ekte tall – tidligere viste «Din fremgang» faste tall (4 økter, 3 økter, 2 450 kg) for alle
  const forrigeUke = aktivitet.length >= 2 ? aktivitet[aktivitet.length - 2].okter : 0
  const denneUka = stats?.ukeMaal ?? 0

  return (
    <div className="prg-page">
      <div className="page-header">
        <h1 className="page-title">Programmet<em className="gold">.</em></h1>
        <p className="page-subtitle">Tilpasset {MAL_NAVN[profil.mal] ?? 'målet ditt'} · {profil.vekt} kg · {profil.hoyde} cm</p>
      </div>

      <div className="prg-verktoy">
        <button className="btn btn-ghost" onClick={() => setRedigerer(true)}><Pencil size={13} strokeWidth={1.5} /> Endre utgangspunkt</button>
      </div>

      <AnbefaltOpplegg profil={profil as unknown as BrukerProfil} />

      <section>
        <div className="hq-section-head" style={{ marginTop: '1rem' }}>
          <h2 className="hq-section-title">Ukens <em>plan</em></h2>
          <span className="eyebrow">Fire økter</span>
        </div>
        <div className="prg-uke">
          {UKEPLAN.map(d => (
            <div key={d.dag} className="pf-seksjon glass-card">
              <div className="prg-dag-hode">
                <h3 className="prg-dag">{d.dag}</h3>
                <span className="eyebrow eyebrow-gold">{d.fokus}</span>
              </div>
              {d.ovelser.map(([n, s]) => (
                <div key={n} className="kal-ov-rad">
                  <Merke navn={n} />
                  <div className="kal-ov-info"><div className="kal-ov-navn">{n}</div></div>
                  <div className="kal-ov-tall">{s}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="hq-figures prg-tall" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '1.5rem' }}>
        <div className="hq-figure"><span className="eyebrow">Forrige uke</span><div className="hq-figure-val num-monument"><TelleTall verdi={forrigeUke} /><small>økter</small></div></div>
        <div className="hq-figure"><span className="eyebrow">Denne uken</span><div className="hq-figure-val num-monument"><TelleTall verdi={denneUka} forsinkelse={0.1} /><small>økter</small></div></div>
        <div className="hq-figure"><span className="eyebrow">Totalt løftet</span><div className="hq-figure-val num-monument"><TelleTall verdi={stats?.totalKg ?? 0} forsinkelse={0.2} /><small>kg</small></div></div>
      </section>
    </div>
  )
}
