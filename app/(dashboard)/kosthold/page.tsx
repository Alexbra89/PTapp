'use client'

import { Suspense, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { format, addDays, subDays } from 'date-fns'
import { nb } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, ScanBarcode, Camera, Search, BookmarkPlus, Repeat } from 'lucide-react'
import { useUser } from '@/hooks/useSupabaseQuery'
import {
  useKostDag, useKostPeriode, useErnaeringsmal, useMatvarer, useMaltidsmaler, useLoggMat, useSlettLogg, useLagreMaltidsmal, feilTekst,
  type VentendeLinje,
} from '@/hooks/useKosthold'
import { gyldigDato, linjeNaering, maltidNavn, standardMaltid, summer, summerPerMaltid, visGram, visKcal, type Logglinje, type Maltid } from '@/lib/kosthold/naering'
import { dagTekst, mengdeTekst } from '@/lib/kosthold/visning'
import { linjerFraMal, nyId, type Maltidsmal } from '@/lib/kosthold/linje'
import { lokalDato, tilDato } from '@/lib/dato'
import KostHode, { Datafeil } from '@/components/kosthold/KostHode'
import Sammendrag from '@/components/kosthold/Sammendrag'
import Vannteller from '@/components/kosthold/Vannteller'
import MengdeArk from '@/components/kosthold/MengdeArk'
import Ark from '@/components/kosthold/Ark'
import Melding from '@/components/kosthold/Melding'
import { useVarsel, Varsel } from '@/components/kosthold/Varsel'
import { useEttTrykk } from '@/hooks/useEttTrykk'
import { useErPaNett } from '@/hooks/useErPaNett'

function Dagbok() {
  const router = useRouter()
  const sp = useSearchParams()
  const idag = lokalDato()
  const dato = gyldigDato(sp.get('dato')) && sp.get('dato')! <= idag ? sp.get('dato')! : idag
  const settDato = (d: string) => router.replace(d === idag ? '/kosthold' : `/kosthold?dato=${d}`, { scroll: false })

  const { data: user } = useUser()
  const uid = user?.id
  const dag = useKostDag(uid, dato)
  const { data: mal } = useErnaeringsmal(uid)
  const { data: matvarer = [] } = useMatvarer(uid)
  const { data: maler = [] } = useMaltidsmaler(uid)
  const historikk = useKostPeriode(uid, 14)
  const logg = useLoggMat()
  const slett = useSlettLogg()
  const lagreMal = useLagreMaltidsmal()
  const { varsel, vis, skjul } = useVarsel()
  const ettTrykk = useEttTrykk()
  const paNett = useErPaNett()

  const [endrer, setEndrer] = useState<Logglinje | null>(null)
  // id lages når arket åpnes: et dobbelttrykk på «Lagre» sender samme id og gir én mal
  const [nyMal, setNyMal] = useState<{ id: string; maltid: Maltid; linjer: Logglinje[] } | null>(null)
  const lagrerMal = useRef(false)
  const [malNavn, setMalNavn] = useState('')

  const linjer = useMemo(() => dag.data ?? [], [dag.data])
  const totaler = summer(linjer)
  const perMaltid = summerPerMaltid(linjer)
  const neste = format(addDays(tilDato(dato)!, 1), 'yyyy-MM-dd')
  const forrige = format(subDays(tilDato(dato)!, 1), 'yyyy-MM-dd')
  const forslag = dato === idag ? standardMaltid() : 'middag'
  const leggTil = (metode: string, maltid: Maltid = forslag) => `/kosthold/legg-til?metode=${metode}&maltid=${maltid}${dato !== idag ? `&dato=${dato}` : ''}`

  // Hele måltidet i én forespørsel. useEttTrykk hindrer duplikater ved dobbelttrykk og gjenbruker
  // samme id-er ved nytt trykk etter en feil. Bekreftelsen vises først når det er lagret.
  const brukMal = (m: Maltidsmal) => {
    if (!uid) return
    const sted = { brukerId: uid, dato, maltid: m.maltid ?? forslag }
    const r = linjerFraMal(m, matvarer, sted)
    if (r.feil) { vis({ tekst: r.feil, feil: true }); return }
    const send = () => ettTrykk.registrer(`mal:${m.id}:${dato}:${sted.maltid}`, () => linjerFraMal(m, matvarer, sted).linjer, { userId: uid, malId: m.id })?.then(
      linjer => vis({
        tekst: `«${m.navn}» registrert${r.mangler ? ` (${r.mangler} slettet matvare hoppet over)` : ''}`,
        handling: { tekst: 'Angre', gjor: () => linjer.forEach(l => slett.mutate({ userId: uid, linje: l }, { onError: e => vis({ tekst: feilTekst(e), feil: true }) })) },
      }),
      e => vis({ tekst: feilTekst(e), feil: true, handling: { tekst: 'Prøv igjen', gjor: send } }),
    )
    send()
  }

  // «Angre» etter sletting i arket: legger linjen tilbake med samme id
  const gjenopprett = (l: Logglinje) => {
    if (!uid) return
    logg.mutate({ userId: uid, linjer: [l] }, { onError: e => vis({ tekst: feilTekst(e), feil: true, handling: { tekst: 'Prøv igjen', gjor: () => gjenopprett(l) } }) })
  }

  const lagreSomMal = async () => {
    if (!uid || !nyMal || !malNavn.trim() || lagrerMal.current) return
    lagrerMal.current = true
    const linjerMedMatvare = nyMal.linjer.filter(l => l.matvare_id && matvarer.some(m => m.id === l.matvare_id))
    try {
      await lagreMal.mutateAsync({
        userId: uid, ny: true,
        mal: { id: nyMal.id, navn: malNavn.trim(), maltid: nyMal.maltid, linjer: linjerMedMatvare.map(l => ({ matvare_id: l.matvare_id!, mengde: l.mengde, enhet: l.enhet })) },
      })
      vis({ tekst: `Lagret «${malNavn.trim()}». Registrer den med ett trykk neste gang.` })
      setNyMal(null)
    } catch (e) { vis({ tekst: feilTekst(e), feil: true }) } finally { lagrerMal.current = false }
  }

  // Historikk: kcal per dag siste 14 dager
  const dager = useMemo(() => {
    const per = new Map<string, Logglinje[]>()
    for (const l of historikk.data ?? []) per.set(l.dato, [...(per.get(l.dato) ?? []), l])
    // Valgt dag fra den ferskeste kilden (dagens cache oppdateres optimistisk)
    per.set(dato, linjer)
    return Array.from({ length: 14 }, (_, i) => {
      const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
      return { dato: d, kcal: summer(per.get(d) ?? []).verdier.kcal }
    })
  }, [historikk.data, linjer, dato])
  const maksKcal = Math.max(mal?.kcal ?? 0, ...dager.map(d => d.kcal), 1)

  return (
    <div className="ko-page">
      <KostHode tittel={<>Kosthold<em className="gold">.</em></>} undertittel="Dagbok · mat, makroer og mål" />

      {!paNett && <Melding type="advarsel"><strong>Du er uten nett.</strong> Det som allerede er lagret, vises. Nye registreringer og endringer lagres ikke før du er på nett igjen.</Melding>}

      <div className="ko-dagnav">
        <button className="ko-dagnav-knapp" onClick={() => settDato(forrige)} aria-label="Forrige dag"><ChevronLeft size={18} strokeWidth={1.5} /></button>
        <div className="ko-dagnav-midt">
          <span className="ko-dagnav-dag" data-testid="dagbok-dag">{dagTekst(dato)}</span>
          <label className="ko-dagnav-dato eyebrow">
            {format(tilDato(dato)!, 'd. MMM yyyy', { locale: nb })} · velg dato
            <input type="date" value={dato} max={idag} onChange={e => gyldigDato(e.target.value) && e.target.value <= idag && settDato(e.target.value)} aria-label="Velg dato" />
          </label>
        </div>
        <button className="ko-dagnav-knapp" onClick={() => settDato(neste)} disabled={dato >= idag} aria-label="Neste dag"><ChevronRight size={18} strokeWidth={1.5} /></button>
      </div>

      {dag.isError ? <Datafeil feil={dag.error} onPrøvIgjen={() => dag.refetch()} /> : (
        <section className="glass-card crop ko-sum" aria-busy={dag.isLoading} data-testid="dagbok-sum">
          {dag.isLoading ? <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '2rem' }}><span className="spinner-lg" /></div>
            : <Sammendrag totaler={totaler} mal={mal} />}
        </section>
      )}

      <div className="ko-handlinger">
        <Link href={leggTil('strekkode')} className="ko-handling"><ScanBarcode size={20} strokeWidth={1.4} /><span className="ko-handling-navn">Skann</span><span className="ko-handling-sub">Strekkode</span></Link>
        <Link href={leggTil('etikett')} className="ko-handling"><Camera size={20} strokeWidth={1.4} /><span className="ko-handling-navn">Etikett</span><span className="ko-handling-sub">Fotografer næringsinnhold</span></Link>
        <Link href={leggTil('sok')} className="ko-handling"><Search size={20} strokeWidth={1.4} /><span className="ko-handling-navn">Søk</span><span className="ko-handling-sub">Lagrede og nylig brukte</span></Link>
      </div>

      {maler.length > 0 && (
        <section>
          <div className="hq-section-head"><h2 className="hq-section-title">Faste <em>måltider</em></h2><Link href="/kosthold/matvarer?vis=maltider" className="hq-link">Rediger</Link></div>
          <div className="ko-filter">
            {maler.slice(0, 8).map(m => (
              <button key={m.id} className="ko-chip" onClick={() => brukMal(m)} disabled={ettTrykk.laast(`mal:${m.id}:${dato}:${m.maltid ?? forslag}`)} data-testid="bruk-mal"><Repeat size={13} /> {m.navn}</button>
            ))}
          </div>
        </section>
      )}

      {!dag.isError && perMaltid.map(m => (
        <section key={m.id} className="glass-card ko-maltid" aria-label={m.navn}>
          <div className="ko-maltid-hode">
            <div>
              <h3 className="ko-maltid-navn">{m.navn}</h3>
              {m.linjer.length > 0 && (
                <div className="ko-maltid-sum">
                  <b>{visKcal(m.totaler.verdier.kcal)} kcal</b> · P {visGram(m.totaler.verdier.protein)} · K {visGram(m.totaler.verdier.karbohydrater)} · F {visGram(m.totaler.verdier.fett)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {m.linjer.length > 0 && (
                <button className="ko-ikonknapp" onClick={() => { setNyMal({ id: nyId(), maltid: m.id, linjer: m.linjer }); setMalNavn(`Min faste ${m.navn.toLowerCase()}`) }} aria-label={`Lagre ${m.navn.toLowerCase()} som fast måltid`} title="Lagre som fast måltid">
                  <BookmarkPlus size={17} strokeWidth={1.4} />
                </button>
              )}
              <Link href={leggTil('sok', m.id)} className="ko-pluss" aria-label={`Legg til i ${m.navn.toLowerCase()}`}><Plus size={18} strokeWidth={1.5} /></Link>
            </div>
          </div>
          {m.linjer.length === 0 ? <p className="ko-tom">Ingenting registrert.</p> : (m.linjer as VentendeLinje[]).map(l => {
            const n = linjeNaering(l)
            return (
              <button key={l.id} className={`ko-rad${l._venter ? ' venter' : ''}`} onClick={() => !l._venter && setEndrer(l)} aria-busy={l._venter || undefined} data-testid="logglinje">
                <div style={{ minWidth: 0 }}>
                  <div className="ko-rad-navn">{l.navn}</div>
                  <div className="ko-rad-meta">{l._venter ? 'Lagrer … · ' : ''}{mengdeTekst(l.mengde, l.enhet)}{l.merke ? ` · ${l.merke}` : ''} · P {visGram(n.protein)} · K {visGram(n.karbohydrater)} · F {visGram(n.fett)}</div>
                </div>
                <div className="ko-rad-kcal"><b>{visKcal(n.kcal)}</b> kcal</div>
              </button>
            )
          })}
        </section>
      ))}

      <Vannteller userId={uid} dato={dato} />

      <section className="glass-card" style={{ padding: '1.5rem' }}>
        <div className="hq-section-head" style={{ marginBottom: 0 }}>
          <h2 className="hq-section-title">Siste <em>14 dager</em></h2>
          <span className="eyebrow">kcal per dag</span>
        </div>
        {historikk.isError ? (dag.isError ? null : <Datafeil feil={historikk.error} />) : (
          <div className="ko-historikk" role="list" aria-label="Kalorier per dag, siste 14 dager">
            {dager.map(d => {
              const h = (d.kcal / maksKcal) * 100
              const over = !!mal && d.kcal > mal.kcal * 1.05
              return (
                <button key={d.dato} role="listitem" className={`ko-hist-kol${d.dato === dato ? ' valgt' : ''}${over ? ' over' : ''}`} onClick={() => settDato(d.dato)}
                  aria-label={`${dagTekst(d.dato)}: ${visKcal(d.kcal)} kcal`} title={`${visKcal(d.kcal)} kcal`}>
                  <div className="ko-hist-stolpe" style={{ height: `${Math.max(1.5, h)}%` }} />
                  <span className="ko-hist-lbl">{format(tilDato(d.dato)!, 'EEEEE', { locale: nb })}</span>
                </button>
              )
            })}
          </div>
        )}
        {mal && <p className="ko-felt-hint" style={{ marginTop: 10 }}>Mål: {visKcal(mal.kcal)} kcal per dag. Oransje stolper er mer enn 5 % over.</p>}
      </section>

      <AnimatePresence>
        {endrer && uid && (
          <MengdeArk key={endrer.id} userId={uid} dato={endrer.dato} maltid={endrer.maltid} linje={endrer}
            matvare={matvarer.find(m => m.id === endrer.matvare_id) ?? null} onLukk={() => setEndrer(null)} vis={vis} gjenopprett={gjenopprett} />
        )}
        {nyMal && (
          <Ark key="nymal" overtittel="Fast måltid" tittel={`Lagre ${maltidNavn(nyMal.maltid).toLowerCase()}`} onLukk={() => setNyMal(null)} laast={lagreMal.isPending}>
            <p className="pf-dempet">De {nyMal.linjer.length} matvarene og mengdene lagres som et fast måltid du kan registrere med ett trykk.</p>
            {nyMal.linjer.some(l => !l.matvare_id || !matvarer.some(m => m.id === l.matvare_id)) && (
              <Melding type="advarsel">Noen av matvarene er slettet og blir ikke med.</Melding>
            )}
            <label className="ko-felt">
              <span className="eyebrow">Navn</span>
              <input className="input" value={malNavn} onChange={e => setMalNavn(e.target.value)} maxLength={120} data-testid="mal-navn" />
            </label>
            <div className="ko-ark-knapper">
              <button className="btn btn-ghost" onClick={() => setNyMal(null)}>Avbryt</button>
              <button className="btn btn-primary" onClick={lagreSomMal} disabled={!malNavn.trim() || lagreMal.isPending} data-testid="lagre-mal">
                {lagreMal.isPending ? <span className="spinner" /> : 'Lagre'}
              </button>
            </div>
          </Ark>
        )}
      </AnimatePresence>
      <Varsel varsel={varsel} skjul={skjul} />
    </div>
  )
}

export default function KostholdSide() {
  return <Suspense fallback={null}><Dagbok /></Suspense>
}
