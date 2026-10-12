'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Flashlight, RefreshCw, Keyboard } from 'lucide-react'
import { lagStrekkodeleser, type Strekkodeleser } from '@/lib/kosthold/strekkodeleser'
import { gyldigGtin, normaliserStrekkode } from '@/lib/kosthold/naering'

type Tilstand = 'klar' | 'starter' | 'skanner' | 'feil'
interface Feil { tittel: string; tekst: string; kanPrøveIgjen: boolean }

/** Oversetter feil fra getUserMedia til noe brukeren kan gjøre noe med. */
export function kamerafeil(e: unknown): Feil {
  const navn = (e as { name?: string })?.name ?? ''
  if (navn === 'NotAllowedError' || navn === 'PermissionDeniedError' || navn === 'SecurityError') {
    return {
      tittel: 'Kameratilgang er avslått',
      tekst: 'Gi appen tilgang til kameraet i nettleserens innstillinger for dette nettstedet (hengelåsen ved adressen), og prøv igjen. På iPhone: Innstillinger → Safari → Kamera.',
      kanPrøveIgjen: true,
    }
  }
  if (navn === 'NotFoundError' || navn === 'DevicesNotFoundError' || navn === 'OverconstrainedError') {
    return { tittel: 'Fant ikke noe kamera', tekst: 'Enheten ser ikke ut til å ha et kamera appen kan bruke. Skriv inn strekkoden, eller søk etter varen.', kanPrøveIgjen: true }
  }
  if (navn === 'NotReadableError' || navn === 'TrackStartError' || navn === 'AbortError') {
    return { tittel: 'Kameraet er opptatt', tekst: 'Et annet program eller en annen fane bruker kameraet. Lukk det og prøv igjen.', kanPrøveIgjen: true }
  }
  return { tittel: 'Kameraet kunne ikke åpnes', tekst: 'Prøv igjen, eller skriv inn strekkoden.', kanPrøveIgjen: true }
}

const erBakkamera = (d: MediaDeviceInfo) => /back|rear|bak|environment|baksiden/i.test(d.label)

interface Props {
  onKode: (kode: string) => void
  /** Startes med en gang (brukeren har trykket «Skann») */
  autostart?: boolean
}

/**
 * Strekkodeskanner. Kameraet startes først når brukeren ber om det, og stoppes alltid:
 * når en kode er lest, når komponenten lukkes, når fanen skjules og ved feil.
 */
export default function StrekkodeSkanner({ onKode, autostart = true }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const strom = useRef<MediaStream | null>(null)
  const leser = useRef<Strekkodeleser | null>(null)
  const montert = useRef(true)
  const forsok = useRef(0)            // øker ved hver start, så gamle løkker/løfter avbrytes
  const sisteKode = useRef<{ kode: string; n: number; tid: number } | null>(null)
  const onKodeRef = useRef(onKode)
  onKodeRef.current = onKode

  const [tilstand, setTilstand] = useState<Tilstand>('klar')
  const [feil, setFeil] = useState<Feil | null>(null)
  const [kameraer, setKameraer] = useState<MediaDeviceInfo[]>([])
  const [kameraId, setKameraId] = useState<string>('')
  const [harLys, setHarLys] = useState(false)
  const [lys, setLys] = useState(false)
  const [manuell, setManuell] = useState(false)
  const [kodeTekst, setKodeTekst] = useState('')

  const stopp = useCallback(() => {
    forsok.current++
    strom.current?.getTracks().forEach(t => t.stop())
    strom.current = null
    const v = video.current
    if (v) { try { v.pause() } catch {} v.srcObject = null }
    setLys(false)
  }, [])

  const skannLokke = useCallback(async (mitt: number) => {
    while (montert.current && forsok.current === mitt) {
      const v = video.current
      if (v && leser.current && v.readyState >= 2 && !document.hidden) {
        try {
          const kode = await leser.current.les(v)
          if (kode && forsok.current === mitt) {
            // Samme kode to ganger på rad før vi godtar den (motvirker feillesing i dårlig lys)
            const s = sisteKode.current
            const na = Date.now()
            if (s && s.kode === kode && na - s.tid < 2000) {
              navigator.vibrate?.(40)
              stopp()
              setTilstand('klar')
              onKodeRef.current(kode)
              return
            }
            sisteKode.current = { kode, n: 1, tid: na }
          }
        } catch { /* et enkelt bilde som feilet – fortsett */ }
      }
      await new Promise(r => setTimeout(r, leser.current?.type === 'innebygd' ? 120 : 180))
    }
  }, [stopp])

  const start = useCallback(async (onsketId?: string) => {
    stopp()
    const mitt = forsok.current
    setFeil(null)
    setTilstand('starter')
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setFeil({ tittel: 'Kameraet krever sikker tilkobling', tekst: 'Åpne appen via https:// (eller localhost under utvikling). Kameraet er blokkert på usikre adresser.', kanPrøveIgjen: false })
      setTilstand('feil'); return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setFeil({ tittel: 'Nettleseren støtter ikke kamera', tekst: 'Prøv en oppdatert Safari, Chrome eller Firefox – eller skriv inn strekkoden.', kanPrøveIgjen: false })
      setTilstand('feil'); return
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: onsketId
          ? { deviceId: { exact: onsketId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      // Lukket eller startet på nytt mens vi ventet på tillatelse: slipp kameraet med en gang
      if (!montert.current || forsok.current !== mitt) { s.getTracks().forEach(t => t.stop()); return }
      strom.current = s
      const v = video.current!
      v.srcObject = s
      v.muted = true
      v.setAttribute('playsinline', 'true')
      try { await v.play() } catch { /* iOS kan kreve brukerhandling; videoen spilles når den er klar */ }
      if (forsok.current !== mitt) return

      const spor = s.getVideoTracks()[0]
      const innst = spor?.getSettings?.() ?? {}
      setKameraId(innst.deviceId ?? '')
      try { setHarLys(!!(spor?.getCapabilities?.() as any)?.torch) } catch { setHarLys(false) }
      try {
        const enheter = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput')
        setKameraer(enheter)
        // Fikk vi frontkameraet selv om vi ba om bakkameraet? Bytt hvis et bakkamera finnes.
        if (!onsketId && innst.facingMode === 'user') {
          const bak = enheter.find(erBakkamera)
          if (bak && bak.deviceId !== innst.deviceId) { start(bak.deviceId); return }
        }
      } catch {}

      if (!leser.current) leser.current = await lagStrekkodeleser()
      if (forsok.current !== mitt) return
      setTilstand('skanner')
      skannLokke(mitt)
    } catch (e) {
      if (forsok.current !== mitt) return
      stopp()
      setFeil(kamerafeil(e))
      setTilstand('feil')
    }
  }, [stopp, skannLokke])

  // Start ved åpning, stopp alltid ved lukking
  useEffect(() => {
    montert.current = true
    if (autostart) start()
    return () => { montert.current = false; stopp() }
  }, [autostart, start, stopp])

  // Fanen skjules (bytter app, låser skjermen): slipp kameraet, start igjen når den vises
  useEffect(() => {
    const synlig = () => {
      if (document.hidden) { if (strom.current) { stopp(); setTilstand('klar') } }
    }
    document.addEventListener('visibilitychange', synlig)
    window.addEventListener('pagehide', stopp)
    return () => { document.removeEventListener('visibilitychange', synlig); window.removeEventListener('pagehide', stopp) }
  }, [stopp])

  const byttLys = async () => {
    const spor = strom.current?.getVideoTracks()[0]
    if (!spor) return
    try { await spor.applyConstraints({ advanced: [{ torch: !lys } as any] }); setLys(!lys) } catch { setHarLys(false) }
  }

  const sendManuell = () => {
    const k = normaliserStrekkode(kodeTekst)
    if (!gyldigGtin(k)) return
    stopp()
    onKode(k)
  }
  const manuellGyldig = gyldigGtin(normaliserStrekkode(kodeTekst))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div className="ko-kamera" data-tilstand={tilstand}>
        <video ref={video} playsInline muted autoPlay aria-label="Kamerabilde" />
        {tilstand === 'skanner' && (
          <>
            <div className="ko-sikte" aria-hidden><div className="ko-sikte-linje" /></div>
            <div className="ko-kamera-status" role="status">Sikt på strekkoden</div>
          </>
        )}
        {tilstand === 'starter' && <div className="ko-kamera-dekke" role="status"><span className="spinner-lg" /><p>Starter kameraet …</p></div>}
        {tilstand === 'klar' && (
          <div className="ko-kamera-dekke">
            <Camera size={34} strokeWidth={1.2} style={{ color: 'var(--gold)' }} />
            <h3>Skann strekkoden</h3>
            <p>Kameraet brukes bare til å lese strekkoden. Ingen bilder lagres eller sendes.</p>
            <button className="btn btn-primary" onClick={() => start(kameraId || undefined)} data-testid="start-kamera">Start kamera</button>
          </div>
        )}
        {tilstand === 'feil' && feil && (
          <div className="ko-kamera-dekke" role="alert">
            <h3>{feil.tittel}</h3>
            <p>{feil.tekst}</p>
            <div className="ko-kamera-kontroller">
              {feil.kanPrøveIgjen && <button className="btn btn-primary" onClick={() => start()}><RefreshCw size={15} /> Prøv igjen</button>}
              <button className="btn btn-ghost" onClick={() => setManuell(true)}><Keyboard size={15} /> Skriv inn kode</button>
            </div>
          </div>
        )}
      </div>

      <div className="ko-kamera-kontroller">
        {kameraer.length > 1 && tilstand !== 'feil' && (
          <select className="input" value={kameraId} onChange={e => { setKameraId(e.target.value); start(e.target.value) }} aria-label="Velg kamera">
            {kameraer.map((k, i) => <option key={k.deviceId || i} value={k.deviceId}>{k.label || `Kamera ${i + 1}`}</option>)}
          </select>
        )}
        {harLys && tilstand === 'skanner' && (
          <button className={`btn ${lys ? 'btn-primary' : 'btn-ghost'}`} onClick={byttLys} aria-pressed={lys}><Flashlight size={15} /> Lys</button>
        )}
        {tilstand === 'skanner' && <button className="btn btn-ghost" onClick={() => { stopp(); setTilstand('klar') }} data-testid="stopp-kamera">Stopp kamera</button>}
        {!manuell && tilstand !== 'feil' && <button className="btn btn-subtle" onClick={() => setManuell(true)}><Keyboard size={15} /> Skriv inn kode</button>}
      </div>

      {manuell && (
        <form className="ko-mengde" onSubmit={e => { e.preventDefault(); sendManuell() }}>
          <label className="ko-felt" style={{ minWidth: 0 }}>
            <span className="eyebrow">Strekkode (8–14 siffer)</span>
            <input className="input" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }} inputMode="numeric" autoComplete="off" value={kodeTekst}
              onChange={e => setKodeTekst(e.target.value.replace(/\D/g, '').slice(0, 14))} aria-invalid={kodeTekst.length >= 8 && !manuellGyldig} data-testid="strekkode-input" />
            {kodeTekst.length >= 8 && !manuellGyldig && <span className="ko-felt-hint" style={{ color: 'var(--ember)' }}>Kontrollsifferet stemmer ikke – sjekk sifrene.</span>}
          </label>
          <button className="btn btn-primary" type="submit" disabled={!manuellGyldig} style={{ alignSelf: 'end', minHeight: 48 }}>Slå opp</button>
        </form>
      )}
    </div>
  )
}
