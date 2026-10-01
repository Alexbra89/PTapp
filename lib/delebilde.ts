import { BRAND } from '@/lib/brand'

export interface DeleData {
  tittel: string
  dato: string             // ferdig formatert, f.eks. «onsdag 1. oktober»
  tall: { verdi: string; etikett: string }[]
  rekorder: string[]       // f.eks. «Benkpress 102,5 kg»
  endring: number | null
}

const B = 1080, H = 1350
const GULL = '#C9A96E', BLEK = '#F2ECE1', DEMPET = 'rgba(242,236,225,0.55)'

// Tegner et delbart kort (4:5, passer Instagram) i appens stil
export async function lagDelebilde(d: DeleData): Promise<Blob> {
  try {
    await Promise.all([
      document.fonts.load("italic 120px 'Instrument Serif'"),
      document.fonts.load("400 120px 'Instrument Serif'"),
      document.fonts.load("500 30px 'JetBrains Mono'"),
    ])
  } catch {}
  const c = document.createElement('canvas')
  c.width = B; c.height = H
  const x = c.getContext('2d')!

  const bg = x.createRadialGradient(B / 2, H * 0.3, 50, B / 2, H * 0.3, H)
  bg.addColorStop(0, '#1F1B16'); bg.addColorStop(1, '#0B0A09')
  x.fillStyle = bg; x.fillRect(0, 0, B, H)

  // Urskive i bakgrunnen
  x.save(); x.translate(B * 0.78, H * 0.22); x.strokeStyle = 'rgba(201,169,110,0.18)'
  x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 360, 0, Math.PI * 2); x.stroke()
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, lang = i % 5 === 0
    x.lineWidth = lang ? 3 : 1.5
    x.beginPath(); x.moveTo(Math.sin(a) * 360, -Math.cos(a) * 360)
    x.lineTo(Math.sin(a) * (lang ? 320 : 340), -Math.cos(a) * (lang ? 320 : 340)); x.stroke()
  }
  x.restore()

  const mono = (px: number) => `500 ${px}px 'JetBrains Mono', ui-monospace, monospace`
  const serif = (px: number, kursiv = false) => `${kursiv ? 'italic ' : ''}400 ${px}px 'Instrument Serif', Georgia, serif`
  const sperret = (t: string, px: number, y: number, farge: string, venstre = 90) => {
    x.font = mono(px); x.fillStyle = farge
    let cx = venstre
    for (const ch of t.toUpperCase()) { x.fillText(ch, cx, y); cx += x.measureText(ch).width + px * 0.22 }
  }

  sperret(BRAND.navn, 30, 140, GULL)
  sperret(d.dato, 26, 196, DEMPET)

  x.fillStyle = BLEK; x.font = serif(150)
  x.fillText('Fullført', 84, 400)
  const bredde = x.measureText('Fullført').width
  x.fillStyle = GULL; x.font = serif(150, true); x.fillText('.', 84 + bredde, 400)

  x.fillStyle = DEMPET; x.font = serif(52, true)
  x.fillText(d.tittel.length > 34 ? d.tittel.slice(0, 33) + '…' : d.tittel, 90, 480)

  // Tallrad
  const y0 = 600, kol = (B - 180) / d.tall.length
  x.strokeStyle = 'rgba(242,236,225,0.14)'; x.lineWidth = 2
  x.beginPath(); x.moveTo(90, y0); x.lineTo(B - 90, y0); x.stroke()
  d.tall.forEach((t, i) => {
    const cx = 90 + i * kol
    if (i) { x.beginPath(); x.moveTo(cx, y0); x.lineTo(cx, y0 + 230); x.stroke() }
    x.fillStyle = BLEK; x.font = serif(110); x.fillText(t.verdi, cx + (i ? 30 : 0), y0 + 140)
    sperret(t.etikett, 22, y0 + 200, DEMPET, cx + (i ? 30 : 0))
  })
  x.beginPath(); x.moveTo(90, y0 + 230); x.lineTo(B - 90, y0 + 230); x.stroke()

  let y = y0 + 320
  if (d.endring !== null) {
    sperret('Mot forrige gang', 24, y, DEMPET)
    x.fillStyle = d.endring >= 0 ? GULL : BLEK; x.font = serif(72)
    x.fillText(`${d.endring > 0 ? '+' : ''}${d.endring} % volum`, 90, y + 80)
    y += 150
  }
  if (d.rekorder.length) {
    sperret(d.rekorder.length === 1 ? 'Ny rekord' : 'Nye rekorder', 24, y, GULL)
    x.fillStyle = BLEK; x.font = serif(56)
    // Plass til maks to linjer over bunnteksten
    const plass = Math.max(1, Math.min(d.rekorder.length, Math.floor((H - 110 - (y + 72)) / 66) + 1))
    x.font = serif(52)
    d.rekorder.slice(0, plass).forEach((r, i) => x.fillText(r, 90, y + 72 + i * 66))
  }

  sperret(BRAND.under, 22, H - 60, 'rgba(242,236,225,0.35)')

  return new Promise((ok, feil) => c.toBlob(b => b ? ok(b) : feil(new Error('Kunne ikke lage bilde')), 'image/png'))
}

// Del via telefonens delingsmeny; last ned som fil der det ikke støttes
export async function delBilde(blob: Blob, filnavn: string): Promise<'delt' | 'lastet' | 'avbrutt'> {
  const fil = new File([blob], filnavn, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (nav.canShare?.({ files: [fil] })) {
    try { await nav.share({ files: [fil] }); return 'delt' } catch { return 'avbrutt' }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filnavn; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'lastet'
}
