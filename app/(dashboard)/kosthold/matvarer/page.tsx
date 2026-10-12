'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { Search, Star, Trash2, Pencil, Plus, Repeat, X } from 'lucide-react'
import { useUser } from '@/hooks/useSupabaseQuery'
import {
  useMatvarer, useMaltidsmaler, useFavoritt, useSlettMatvare, useLagreMaltidsmal, useSlettMaltidsmal, useLoggMat, useSlettLogg, feilTekst,
} from '@/hooks/useKosthold'
import {
  MALTIDER, basisTekst, beregnNaering, enhetNavn, lesTall, maltidNavn, standardMaltid, summer, tilBasisMengde, tilgjengeligeEnheter,
  visGram, visKcal, type Enhet, type Maltid, type Matvare,
} from '@/lib/kosthold/naering'
import { linjerFraMal, nyId, type Maltidsmal, type Mallinje } from '@/lib/kosthold/linje'
import { sokMatvarer } from '@/lib/kosthold/sok'
import { mengdeTekst, tallTekst } from '@/lib/kosthold/visning'
import { lokalDato } from '@/lib/dato'
import KostHode, { Datafeil } from '@/components/kosthold/KostHode'
import MatvareSkjema from '@/components/kosthold/MatvareSkjema'
import Ark from '@/components/kosthold/Ark'
import Melding from '@/components/kosthold/Melding'
import { useVarsel, Varsel } from '@/components/kosthold/Varsel'

type Utkastlinje = { matvare_id: string; mengde: string; enhet: Enhet }

function MalEditor({ userId, mal, matvarer, onLukk, onLagret }: {
  userId: string; mal: Maltidsmal | null; matvarer: Matvare[]; onLukk: () => void; onLagret: (navn: string) => void
}) {
  const [id] = useState(() => mal?.id ?? nyId())
  const [navn, setNavn] = useState(mal?.navn ?? '')
  const [maltid, setMaltid] = useState<Maltid | null>(mal?.maltid ?? null)
  const [linjer, setLinjer] = useState<Utkastlinje[]>(() => (mal?.linjer ?? []).map(l => ({ matvare_id: l.matvare_id, mengde: tallTekst(Number(l.mengde)), enhet: l.enhet })))
  const [q, setQ] = useState('')
  const lagre = useLagreMaltidsmal()

  const finn = (id: string) => matvarer.find(m => m.id === id)
  const treff = q.trim() ? sokMatvarer(matvarer, q, 'alle', 8) : []

  const beregnet = linjer.map(l => {
    const m = finn(l.matvare_id)
    const tall = lesTall(l.mengde)
    if (!m) return { feil: 'Matvaren er slettet' as string | null, kcal: 0 }
    const r = tall === null || Number.isNaN(tall) ? { ok: false as const, feil: 'Ugyldig mengde' } : tilBasisMengde(tall, l.enhet, m)
    return r.ok ? { feil: null, kcal: beregnNaering(m, r.basisMengde).kcal ?? 0 } : { feil: r.feil, kcal: 0 }
  })
  const gyldige = linjer.filter((l, i) => !beregnet[i].feil)
  const feil = !navn.trim() ? 'Gi måltidet et navn.' : gyldige.length === 0 ? 'Legg til minst én matvare.' : beregnet.some(b => b.feil) ? 'Rett eller fjern linjene som er markert.' : null

  const send = async () => {
    if (feil) return
    const ut: Mallinje[] = linjer.map(l => ({ matvare_id: l.matvare_id, mengde: lesTall(l.mengde)!, enhet: l.enhet }))
    try {
      await lagre.mutateAsync({ userId, ny: !mal, mal: { id, navn: navn.trim(), maltid, linjer: ut } })
      onLagret(navn.trim())
    } catch { /* vises under */ }
  }

  return (
    <Ark overtittel="Fast måltid" tittel={mal ? 'Rediger måltid' : 'Nytt måltid'} onLukk={onLukk} laast={lagre.isPending}>
      <label className="ko-felt"><span className="eyebrow">Navn</span>
        <input className="input" value={navn} onChange={e => setNavn(e.target.value)} placeholder="F.eks. Min faste frokost" maxLength={120} data-testid="maleditor-navn" /></label>
      <div className="ko-felt"><span className="eyebrow">Vanligvis til</span>
        <div className="ko-maltidvalg">
          <button className={`ko-chip${maltid === null ? ' on' : ''}`} onClick={() => setMaltid(null)}>Valgfritt</button>
          {MALTIDER.map(m => <button key={m.id} className={`ko-chip${maltid === m.id ? ' on' : ''}`} onClick={() => setMaltid(m.id)}>{m.navn}</button>)}
        </div>
      </div>

      <div className="ko-felt">
        <span className="eyebrow">Matvarer</span>
        {linjer.length === 0 && <p className="pf-dempet">Ingen ennå. Søk i dine matvarer under.</p>}
        {linjer.map((l, i) => {
          const m = finn(l.matvare_id)
          const enheter = m ? tilgjengeligeEnheter(m) : [l.enhet]
          return (
            <div key={i} className="ko-rad" style={{ cursor: 'default', gridTemplateColumns: '1fr auto' }}>
              <div style={{ minWidth: 0 }}>
                <div className="ko-rad-navn">{m?.navn ?? 'Slettet matvare'}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input className="input" style={{ width: 90, minHeight: 44 }} inputMode="decimal" value={l.mengde} aria-label="Mengde"
                    onChange={e => setLinjer(x => x.map((y, j) => j === i ? { ...y, mengde: e.target.value } : y))} />
                  <div className="ko-enheter">
                    {enheter.map(en => <button key={en} className={`ko-enhet${l.enhet === en ? ' on' : ''}`} style={{ minHeight: 36 }} onClick={() => setLinjer(x => x.map((y, j) => j === i ? { ...y, enhet: en } : y))}>{enhetNavn(en)}</button>)}
                  </div>
                  <span className="ko-rad-meta" style={{ marginTop: 0 }}>{beregnet[i].feil ?? `${visKcal(beregnet[i].kcal)} kcal`}</span>
                </div>
              </div>
              <button className="ko-ikonknapp fare" onClick={() => setLinjer(x => x.filter((_, j) => j !== i))} aria-label="Fjern"><X size={16} /></button>
            </div>
          )
        })}
      </div>

      <div className="ko-sok"><Search size={16} />
        <input className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Legg til matvare …" aria-label="Søk etter matvare å legge til" /></div>
      {treff.length > 0 && (
        <div className="ko-liste">
          {treff.map(m => (
            <button key={m.id} className="ko-rad" onClick={() => {
              const enhet: Enhet = m.sist_enhet ?? (tilgjengeligeEnheter(m).includes('porsjon') ? 'porsjon' : m.basis === '100ml' ? 'ml' : 'g')
              const mengde = m.sist_mengde ?? (enhet === 'porsjon' || enhet === 'stk' ? 1 : 100)
              setLinjer(x => [...x, { matvare_id: m.id, mengde: tallTekst(mengde), enhet }]); setQ('')
            }}>
              <div style={{ minWidth: 0 }}><div className="ko-rad-navn">{m.navn}</div><div className="ko-rad-meta">{visKcal(m.kcal)} kcal {basisTekst(m.basis)}</div></div>
              <Plus size={16} />
            </button>
          ))}
        </div>
      )}
      {linjer.length > 0 && <p className="ko-felt-hint">Totalt {visKcal(beregnet.reduce((s, b) => s + b.kcal, 0))} kcal.</p>}
      {feil && (navn || linjer.length > 0) && <Melding type="advarsel">{feil}</Melding>}
      {lagre.isError && <Melding type="feil">{feilTekst(lagre.error)}</Melding>}
      <div className="ko-ark-knapper">
        <button className="btn btn-ghost" onClick={onLukk}>Avbryt</button>
        <button className="btn btn-primary" onClick={send} disabled={!!feil || lagre.isPending} data-testid="maleditor-lagre">{lagre.isPending ? <span className="spinner" /> : 'Lagre måltid'}</button>
      </div>
    </Ark>
  )
}

function Matvarer() {
  const router = useRouter()
  const sp = useSearchParams()
  const vis2 = sp.get('vis') === 'maltider' ? 'maltider' : 'matvarer'
  const { data: user } = useUser()
  const uid = user?.id
  const matvarerQ = useMatvarer(uid)
  const matvarer = useMemo(() => matvarerQ.data ?? [], [matvarerQ.data])
  const malerQ = useMaltidsmaler(uid)
  const favoritt = useFavoritt()
  const slettMatvare = useSlettMatvare()
  const slettMal = useSlettMaltidsmal()
  const logg = useLoggMat()
  const slettLogg = useSlettLogg()
  const { varsel, vis, skjul } = useVarsel()

  const [q, setQ] = useState('')
  const [bareFav, setBareFav] = useState(false)
  const [redigerer, setRedigerer] = useState<Matvare | null>(null)
  const [sletter, setSletter] = useState<Matvare | null>(null)
  const [malEditor, setMalEditor] = useState<{ mal: Maltidsmal | null } | null>(null)

  const liste = useMemo(() => sokMatvarer(matvarer, q, bareFav ? 'favoritter' : 'alle', 500), [matvarer, q, bareFav])

  const registrerMal = (m: Maltidsmal) => {
    if (!uid) return
    const r = linjerFraMal(m, matvarer, { brukerId: uid, dato: lokalDato(), maltid: m.maltid ?? standardMaltid() })
    if (r.feil) { vis({ tekst: r.feil, feil: true }); return }
    const send = () => logg.mutate({ userId: uid, linjer: r.linjer, malId: m.id }, { onError: e => vis({ tekst: feilTekst(e), feil: true, handling: { tekst: 'Prøv igjen', gjor: send } }) })
    send()
    vis({ tekst: `«${m.navn}» registrert i dag`, handling: { tekst: 'Angre', gjor: () => r.linjer.forEach(l => slettLogg.mutate({ userId: uid, linje: l })) } })
  }

  return (
    <div className="ko-page">
      <KostHode tittel={<>Matvarer<em className="gold">.</em></>} undertittel="Lagrede matvarer, favoritter og faste måltider" />

      <div className="ko-filter" role="tablist">
        <button role="tab" aria-selected={vis2 === 'matvarer'} className={`ko-chip${vis2 === 'matvarer' ? ' on' : ''}`} onClick={() => router.replace('/kosthold/matvarer')}>Matvarer ({matvarer.length})</button>
        <button role="tab" aria-selected={vis2 === 'maltider'} className={`ko-chip${vis2 === 'maltider' ? ' on' : ''}`} onClick={() => router.replace('/kosthold/matvarer?vis=maltider')}>Faste måltider ({malerQ.data?.length ?? 0})</button>
      </div>

      {vis2 === 'matvarer' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {matvarerQ.isError && <Datafeil feil={matvarerQ.error} onPrøvIgjen={() => matvarerQ.refetch()} />}
          <div className="ko-sok"><Search size={17} />
            <input className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Søk i dine matvarer …" aria-label="Søk i dine matvarer" /></div>
          <div className="ko-filter">
            <button className={`ko-chip${!bareFav ? ' on' : ''}`} onClick={() => setBareFav(false)}>Alle</button>
            <button className={`ko-chip${bareFav ? ' on' : ''}`} onClick={() => setBareFav(true)}><Star size={13} /> Favoritter</button>
          </div>
          {matvarerQ.isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><span className="spinner-lg" /></div>
            : liste.length === 0 ? <p className="pf-dempet">{matvarer.length === 0 ? 'Ingen lagrede matvarer ennå. Alt du skanner eller registrerer, havner her.' : 'Ingen treff.'}</p>
            : (
              <div className="ko-liste">
                {liste.map(m => (
                  <div key={m.id} className="ko-rad" style={{ cursor: 'default' }} data-testid="matvare-rad">
                    <button style={{ all: 'unset', cursor: 'pointer', minWidth: 0, display: 'block' }} onClick={() => setRedigerer(m)}>
                      <div className="ko-rad-navn">{m.navn}{m.kilde === 'openfoodfacts' && <span className="ko-merke">OFF</span>}{m.kilde === 'etikett' && <span className="ko-merke">Etikett</span>}</div>
                      <div className="ko-rad-meta">
                        {m.merke ? `${m.merke} · ` : ''}{visKcal(m.kcal)} kcal · P {visGram(m.protein)} · K {visGram(m.karbohydrater)} · F {visGram(m.fett)} {basisTekst(m.basis)}
                        {m.antall_bruk ? ` · brukt ${m.antall_bruk}×` : ''}
                      </div>
                    </button>
                    <div className="ko-rad-hoyre">
                      <button className={`ko-ikonknapp${m.favoritt ? ' on' : ''}`} onClick={() => uid && favoritt.mutate({ userId: uid, id: m.id, favoritt: !m.favoritt }, { onError: e => vis({ tekst: feilTekst(e), feil: true }) })}
                        aria-label={m.favoritt ? 'Fjern favoritt' : 'Merk som favoritt'} aria-pressed={m.favoritt} data-testid="favoritt">
                        <Star size={17} strokeWidth={1.4} fill={m.favoritt ? 'currentColor' : 'none'} />
                      </button>
                      <button className="ko-ikonknapp" onClick={() => setRedigerer(m)} aria-label="Rediger"><Pencil size={16} strokeWidth={1.4} /></button>
                      <button className="ko-ikonknapp fare" onClick={() => setSletter(m)} aria-label="Slett"><Trash2 size={16} strokeWidth={1.4} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </section>
      )}

      {vis2 === 'maltider' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {malerQ.isError && <Datafeil feil={malerQ.error} onPrøvIgjen={() => malerQ.refetch()} />}
          <p className="pf-dempet">Et fast måltid er flere matvarer med mengder – for eksempel frokosten du spiser nesten hver dag. Registrer hele måltidet med ett trykk.</p>
          <button className="btn btn-primary" onClick={() => setMalEditor({ mal: null })} style={{ alignSelf: 'flex-start' }} disabled={matvarer.length === 0} data-testid="nytt-maltid"><Plus size={15} /> Nytt fast måltid</button>
          {matvarer.length === 0 && <p className="ko-felt-hint">Registrer noen matvarer først.</p>}
          {(malerQ.data ?? []).length > 0 && (
            <div className="ko-liste">
              {malerQ.data!.map(m => {
                const r = uid ? linjerFraMal(m, matvarer, { brukerId: uid, dato: lokalDato(), maltid: m.maltid ?? 'frokost' }) : null
                const kcal = r ? summer(r.linjer).verdier.kcal : 0
                return (
                  <div key={m.id} className="ko-rad" style={{ cursor: 'default' }}>
                    <button style={{ all: 'unset', cursor: 'pointer', minWidth: 0, display: 'block' }} onClick={() => setMalEditor({ mal: m })}>
                      <div className="ko-rad-navn">{m.navn}</div>
                      <div className="ko-rad-meta">
                        {m.maltid ? `${maltidNavn(m.maltid)} · ` : ''}{m.linjer.length} matvarer · {visKcal(kcal)} kcal
                        {r?.mangler ? ` · ${r.mangler} slettet` : ''}
                      </div>
                      <div className="ko-rad-meta">{m.linjer.slice(0, 4).map(l => { const mv = matvarer.find(x => x.id === l.matvare_id); return mv ? `${mv.navn} ${mengdeTekst(Number(l.mengde), l.enhet)}` : null }).filter(Boolean).join(' · ')}</div>
                    </button>
                    <div className="ko-rad-hoyre">
                      <button className="ko-igjen-knapp" onClick={() => registrerMal(m)}><Repeat size={13} /> I dag</button>
                      <button className="ko-ikonknapp fare" onClick={() => uid && slettMal.mutate({ userId: uid, id: m.id }, { onSuccess: () => vis({ tekst: `«${m.navn}» er slettet` }), onError: e => vis({ tekst: feilTekst(e), feil: true }) })} aria-label={`Slett ${m.navn}`}><Trash2 size={16} strokeWidth={1.4} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {redigerer && uid && (
          <Ark key={redigerer.id} overtittel="Rediger matvare" tittel={redigerer.navn} onLukk={() => setRedigerer(null)}>
            <MatvareSkjema userId={uid} eksisterende={redigerer} onLagret={() => { setRedigerer(null); vis({ tekst: 'Matvaren er oppdatert' }) }} onAvbryt={() => setRedigerer(null)} />
            <p className="ko-felt-hint">Endringer gjelder nye registreringer. Det du allerede har ført i dagboken, beholder verdiene fra da.</p>
          </Ark>
        )}
        {sletter && uid && (
          <Ark key="slett" overtittel="Slett matvare" tittel={`Slette ${sletter.navn}?`} onLukk={() => setSletter(null)}>
            <p className="pf-dempet">Matvaren fjernes fra listen din og fra faste måltider. Det du allerede har ført i dagboken, blir stående.</p>
            <div className="ko-ark-knapper">
              <button className="btn btn-ghost" onClick={() => setSletter(null)}>Avbryt</button>
              <button className="btn konto-slett" onClick={() => {
                slettMatvare.mutate({ userId: uid, id: sletter.id }, { onError: e => vis({ tekst: feilTekst(e), feil: true }) })
                vis({ tekst: `${sletter.navn} er slettet` }); setSletter(null)
              }} data-testid="bekreft-slett">Slett</button>
            </div>
          </Ark>
        )}
        {malEditor && uid && (
          <MalEditor key={malEditor.mal?.id ?? 'ny'} userId={uid} mal={malEditor.mal} matvarer={matvarer} onLukk={() => setMalEditor(null)}
            onLagret={navn => { setMalEditor(null); vis({ tekst: `«${navn}» er lagret` }) }} />
        )}
      </AnimatePresence>
      <Varsel varsel={varsel} skjul={skjul} />
    </div>
  )
}

export default function MatvarerSide() {
  return <Suspense fallback={null}><Matvarer /></Suspense>
}
