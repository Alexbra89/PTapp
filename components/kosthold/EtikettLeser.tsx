'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, ImageIcon, ShieldCheck } from 'lucide-react'
import Melding from './Melding'
import { tolkEtikett, type Etikettresultat } from '@/lib/kosthold/etikett'

interface Props {
  onResultat: (r: Etikettresultat, tekst: string) => void
  onManuell: () => void
}

type Tilstand = { type: 'klar' } | { type: 'leser'; andel: number; steg: string } | { type: 'feil'; tekst: string } | { type: 'tom'; tekst: string }

/** Skalerer og gjør bildet gråtone med strukket kontrast – gir merkbart bedre OCR på mobilbilder. */
async function forbered(fil: File): Promise<HTMLCanvasElement> {
  const bilde = await createImageBitmap(fil).catch(async () => {
    // Eldre Safari: via <img>
    const url = URL.createObjectURL(fil)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally { URL.revokeObjectURL(url) }
  })
  const b0 = 'naturalWidth' in bilde ? bilde.naturalWidth : bilde.width
  const h0 = 'naturalHeight' in bilde ? bilde.naturalHeight : bilde.height
  const maks = Math.max(b0, h0)
  const skala = maks > 2200 ? 2200 / maks : maks < 800 ? 800 / maks : 1
  const c = document.createElement('canvas')
  c.width = Math.round(b0 * skala); c.height = Math.round(h0 * skala)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bilde as CanvasImageSource, 0, 0, c.width, c.height)
  if ('close' in bilde) bilde.close()
  const data = ctx.getImageData(0, 0, c.width, c.height)
  const p = data.data
  // Gråtone + histogram for 2 %/98 %-kontraststrekk
  const hist = new Uint32Array(256)
  for (let i = 0; i < p.length; i += 4) { const g = (p[i] * 77 + p[i + 1] * 150 + p[i + 2] * 29) >> 8; p[i] = g; hist[g]++ }
  const n = p.length / 4
  let lav = 0, hoy = 255, sum = 0
  for (let i = 0; i < 256; i++) { sum += hist[i]; if (sum > n * 0.02) { lav = i; break } }
  sum = 0
  for (let i = 255; i >= 0; i--) { sum += hist[i]; if (sum > n * 0.02) { hoy = i; break } }
  const spenn = Math.max(1, hoy - lav)
  for (let i = 0; i < p.length; i += 4) { const g = Math.max(0, Math.min(255, ((p[i] - lav) * 255) / spenn)); p[i] = p[i + 1] = p[i + 2] = g }
  ctx.putImageData(data, 0, 0)
  return c
}

/**
 * Leser næringsdeklarasjonen fra et bilde. All tekstgjenkjenning skjer på enheten (Tesseract,
 * levert fra appens eget domene). Bildet sendes ikke til noen server og lagres ikke.
 */
export default function EtikettLeser({ onResultat, onManuell }: Props) {
  const [tilstand, setTilstand] = useState<Tilstand>({ type: 'klar' })
  const [forhand, setForhand] = useState<string | null>(null)
  const kamera = useRef<HTMLInputElement>(null)
  const galleri = useRef<HTMLInputElement>(null)
  const avbrutt = useRef(false)

  useEffect(() => () => { avbrutt.current = true }, [])
  useEffect(() => () => { if (forhand) URL.revokeObjectURL(forhand) }, [forhand])

  const les = async (fil: File | undefined) => {
    if (!fil) return
    if (!fil.type.startsWith('image/')) { setTilstand({ type: 'feil', tekst: 'Filen er ikke et bilde.' }); return }
    if (fil.size > 25 * 1024 * 1024) { setTilstand({ type: 'feil', tekst: 'Bildet er for stort (over 25 MB).' }); return }
    setForhand(URL.createObjectURL(fil))
    setTilstand({ type: 'leser', andel: 0.02, steg: 'Forbereder bildet' })
    let arbeider: { recognize: Function; terminate: () => Promise<unknown>; setParameters: Function } | null = null
    try {
      const lerret = await forbered(fil)
      const { createWorker } = await import('tesseract.js')
      arbeider = await createWorker('nor', 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr',
        langPath: '/ocr',
        workerBlobURL: false, // CSP: arbeideren lastes direkte fra eget domene, ikke via blob:
        gzip: true,
        logger: (m: { status: string; progress: number }) => {
          if (avbrutt.current) return
          const steg = m.status.includes('recogniz') ? 'Leser teksten' : m.status.includes('load') ? 'Laster lesemotoren' : 'Forbereder'
          const andel = m.status.includes('recogniz') ? 0.35 + m.progress * 0.65 : Math.min(0.35, 0.05 + m.progress * 0.3)
          setTilstand({ type: 'leser', andel, steg })
        },
      }) as any
      await arbeider!.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' })
      const { data } = await arbeider!.recognize(lerret)
      if (avbrutt.current) return
      const tekst: string = data?.text ?? ''
      const r = tolkEtikett(tekst)
      if (!r.fantTabell) {
        setTilstand({ type: 'tom', tekst: 'Fant ingen næringsdeklarasjon i bildet. Prøv igjen med godt lys, rett vinkel og hele tabellen i bildet – eller fyll inn selv.' })
        return
      }
      setTilstand({ type: 'klar' })
      onResultat(r, tekst)
    } catch {
      if (!avbrutt.current) setTilstand({ type: 'feil', tekst: 'Kunne ikke lese bildet. Første gang må lesemotoren lastes ned (ca. 6 MB) – sjekk nettet og prøv igjen, eller fyll inn selv.' })
    } finally {
      arbeider?.terminate().catch(() => {})
    }
  }

  const leser = tilstand.type === 'leser'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Melding type="info">
        <strong>Bildet blir på telefonen din.</strong> Teksten leses på enheten – bildet sendes ikke til noen server, ingen kunstig intelligens hos tredjepart brukes, og bildet lagres ikke.
        Du kontrollerer alle verdiene før noe lagres.
      </Melding>

      {/* Lokal forhåndsvisning (blob:) – next/image gir ingenting her, og bildet skal ikke via serveren */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {forhand && <img src={forhand} alt="Bildet som leses" className="ko-bilde" />}

      {leser && (
        <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="eyebrow">{tilstand.steg} …</span>
            <span className="eyebrow">{Math.round(tilstand.andel * 100)} %</span>
          </div>
          <div className="ko-fremdrift"><i style={{ width: `${tilstand.andel * 100}%` }} /></div>
        </div>
      )}
      {tilstand.type === 'feil' && <Melding type="feil">{tilstand.tekst}</Melding>}
      {tilstand.type === 'tom' && <Melding type="advarsel">{tilstand.tekst}</Melding>}

      <div className="hq-kost-knapper">
        <button className="btn btn-primary" onClick={() => kamera.current?.click()} disabled={leser}><Camera size={16} strokeWidth={1.6} /> Ta bilde</button>
        <button className="btn btn-ghost" onClick={() => galleri.current?.click()} disabled={leser}><ImageIcon size={16} strokeWidth={1.6} /> Velg bilde</button>
      </div>
      {(tilstand.type === 'tom' || tilstand.type === 'feil') && <button className="btn btn-subtle" onClick={onManuell}>Fyll inn selv</button>}
      <input ref={kamera} type="file" accept="image/*" capture="environment" hidden onChange={e => { les(e.target.files?.[0]); e.target.value = '' }} data-testid="etikett-kamera" />
      <input ref={galleri} type="file" accept="image/*" hidden onChange={e => { les(e.target.files?.[0]); e.target.value = '' }} data-testid="etikett-fil" />

      <p className="ko-felt-hint" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <ShieldCheck size={13} style={{ flexShrink: 0, marginTop: 1 }} /> Tips: Fyll bildet med selve tabellen, hold telefonen parallelt med pakken og unngå gjenskinn.
      </p>
    </div>
  )
}
