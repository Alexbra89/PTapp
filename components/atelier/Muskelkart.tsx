import type { Muskel } from '@/data/ovelsesbibliotek'

// ─── Muskelkart ──────────────────────────────────────────────────────────────
// Stilisert anatomisk atlas, forfra og bakfra. Hver muskel er en egen flate:
// primær aktivering i gull, sekundær i dempet gull, resten som hårstrek-kontur.
// Figuren tegnes for venstre halvdel og speiles rundt x = 50.

type Flate = { m: Muskel; d: string }

const FORFRA: Flate[] = [
  { m: 'trapes',     d: 'M45 30 C41 33 35 36 30 38 L38 40 C42 38 45 36 46 34 Z' },
  { m: 'skuldre',    d: 'M30 38.5 C24 39.5 21 44 21 51 C21 55 22 58 24 60 C26 54 29 48 34 43 L37.5 40.5 Z' },
  { m: 'bryst',      d: 'M49 42 L39 41.5 C34.5 44 31 49 30 55 C32 62 38 66 44 66 C47 66 49 64.5 49 62 Z' },
  { m: 'biceps',     d: 'M24 62 C22 67 20.5 73 20.5 80 C22 83 25 83 27 80 C28.5 73 29.5 66 29.5 58.5 C27.5 58.5 25.5 59.5 24 62 Z' },
  { m: 'underarm',   d: 'M20 86 C18 95 16 105 15 116 L19 117 C21 107 24 96 26.5 86.5 C24.5 87.5 22 87.5 20 86 Z' },
  { m: 'mage',       d: 'M49 68.5 L42.5 68.5 C41.5 80 41.5 95 42.5 107 C44.5 111 47 112.5 49 112.5 Z' },
  { m: 'skra',       d: 'M40.5 67.5 C35.5 69.5 32.5 74 32.5 82 C32.5 92 34.5 101 38.5 108.5 L41 107.5 C40 95 40 81 40.5 67.5 Z' },
  { m: 'quads',      d: 'M40 117 C34 119 30.5 127 29.5 139 C29.5 151 31.5 160 35 166 L44 166 C45.5 156 46.5 142 46 129 C45 123 43 119 40 117 Z' },
  { m: 'adduktorer', d: 'M49 117 C47.5 123 47 133 47 146 C47.8 147.5 48.5 147.5 49 146.5 Z' },
  { m: 'legger',     d: 'M34.5 173 C32.5 182 32.5 194 34.5 205 L39.5 205 C40.5 194 41.5 182 41.5 173 C39 174.5 36.5 174.5 34.5 173 Z' },
]

const BAKFRA: Flate[] = [
  { m: 'trapes',     d: 'M49 29 L44.5 31.5 C40.5 34.5 35 37.5 30.5 39.5 C36.5 43.5 42.5 50 49 61 Z' },
  { m: 'skuldre',    d: 'M30 39.5 C24 40.5 21 45 21 52 C21.5 56 23 58.5 25 60.5 C27 53.5 30 47.5 33.5 43.5 Z' },
  { m: 'ovreRygg',   d: 'M34.5 44.5 C31.5 48.5 30.5 52.5 31.5 56.5 C36.5 58.5 41.5 60.5 46.5 64 C43.5 56 39.5 50 34.5 44.5 Z' },
  { m: 'lats',       d: 'M31.5 58.5 C31.5 68.5 33.5 80 38 91.5 C41 95.5 44.5 95.5 47 93.5 C47 82 46.5 72 45.5 66 C40.5 62.5 35.5 60.5 31.5 58.5 Z' },
  { m: 'korsrygg',   d: 'M49 65 L47.3 66.5 C47 79 47 92 47.8 105 L49 106.5 Z' },
  { m: 'triceps',    d: 'M24 62 C22 67 20.5 73 20.5 80 C22 83 25 83 27 80 C28.5 73 29.5 66 29.5 58.5 C27.5 58.5 25.5 59.5 24 62 Z' },
  { m: 'underarm',   d: 'M20 86 C18 95 16 105 15 116 L19 117 C21 107 24 96 26.5 86.5 C24.5 87.5 22 87.5 20 86 Z' },
  { m: 'sete',       d: 'M48.5 108.5 C42.5 107.5 35.5 110.5 32.5 117.5 C31.5 124.5 34.5 130.5 40.5 131.5 C45.5 131.5 48.5 128.5 49 124.5 Z' },
  { m: 'hamstrings', d: 'M34 133.5 C31 142.5 31 154.5 34 166 L44 166 C46 156 47 144.5 46.5 133.5 C42.5 134.5 38 134.5 34 133.5 Z' },
  { m: 'legger',     d: 'M34.5 172.5 C31.5 178.5 31.5 188.5 34.5 196.5 C36.5 200.5 40 200.5 41.5 196.5 C43 188.5 43 178.5 41.5 172.5 C39 174 36.5 174 34.5 172.5 Z' },
]

// Nøytrale deler (hode, hender, knær, føtter, bekken) – bare kontur
const SKJELETT_FORFRA = [
  'M40.5 110.5 L49 114 L49 116.5 L40 115.5 Z',
  'M36 167.5 C37.5 170 41.5 170 43.5 167.5',
  'M14.5 118.5 C12.5 122 13 127 15.5 129 C18 128.5 19.5 124 19 119 Z',
  'M34.5 207 C33 210 33.5 213 36 214 L42 214 C42.5 211 41.5 208 39.5 207 Z',
]
const SKJELETT_BAKFRA = [
  'M36 167.5 C37.5 170 41.5 170 43.5 167.5',
  'M14.5 118.5 C12.5 122 13 127 15.5 129 C18 128.5 19.5 124 19 119 Z',
  'M34.5 202 C33 207 33.5 212 36 214 L42 214 C42.5 210 41.5 205 40.5 202 Z',
]

const GULL = '#C9A96E'

function Halvdel({ flater, skjelett, farge }: { flater: Flate[]; skjelett: string[]; farge: (m: Muskel) => { fill: string; opacity: number; stroke: string } }) {
  const innhold = (
    <>
      {flater.map((f, i) => {
        const s = farge(f.m)
        return <path key={i} d={f.d} fill={s.fill} fillOpacity={s.opacity} stroke={s.stroke} strokeWidth={0.5} strokeLinejoin="round" />
      })}
      {skjelett.map((d, i) => <path key={`s${i}`} d={d} fill="none" stroke="rgba(242,236,225,0.16)" strokeWidth={0.5} />)}
    </>
  )
  return (
    <>
      {innhold}
      <g transform="translate(100 0) scale(-1 1)">{innhold}</g>
    </>
  )
}

function Figur({ bakfra, primaer, sekundaer }: { bakfra: boolean; primaer: Muskel[]; sekundaer: Muskel[] }) {
  const farge = (m: Muskel) =>
    primaer.includes(m) ? { fill: GULL, opacity: 0.92, stroke: '#E3C68C' }
    : sekundaer.includes(m) ? { fill: GULL, opacity: 0.32, stroke: 'rgba(201,169,110,0.55)' }
    : { fill: '#F2ECE1', opacity: 0.035, stroke: 'rgba(242,236,225,0.16)' }
  return (
    <>
      {/* Hode og hals */}
      <ellipse cx="50" cy="14" rx="8.5" ry="10.5" fill="none" stroke="rgba(242,236,225,0.18)" strokeWidth="0.5" />
      <path d="M45.5 24.5 L45.5 30 M54.5 24.5 L54.5 30" stroke="rgba(242,236,225,0.16)" strokeWidth="0.5" />
      <Halvdel flater={bakfra ? BAKFRA : FORFRA} skjelett={bakfra ? SKJELETT_BAKFRA : SKJELETT_FORFRA} farge={farge} />
      {/* Midtlinje: ryggrad bakfra, linea alba forfra */}
      <path d={bakfra ? 'M50 30 L50 106' : 'M50 42 L50 112'} stroke="rgba(242,236,225,0.12)" strokeWidth="0.4" strokeDasharray={bakfra ? '1 1.6' : undefined} />
      {!bakfra && (
        <path d="M42.5 80 H57.5 M42.5 91 H57.5 M42.8 101 H57.2" stroke="rgba(11,10,9,0.55)" strokeWidth="0.6" />
      )}
    </>
  )
}

// Begge sider, med etiketter – for detaljvisning
export function Muskelkart({ primaer, sekundaer, hoyde = 280 }: { primaer: Muskel[]; sekundaer: Muskel[]; hoyde?: number }) {
  return (
    <svg viewBox="0 0 220 232" height={hoyde} width={(hoyde * 220) / 232} role="img" aria-label="Muskelkart forfra og bakfra">
      <g transform="translate(5 4)"><Figur bakfra={false} primaer={primaer} sekundaer={sekundaer} /></g>
      <g transform="translate(115 4)"><Figur bakfra primaer={primaer} sekundaer={sekundaer} /></g>
      <text x="55" y="230" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="5.5" letterSpacing="1.2" fill="rgba(242,236,225,0.34)">FORFRA</text>
      <text x="165" y="230" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="5.5" letterSpacing="1.2" fill="rgba(242,236,225,0.34)">BAKFRA</text>
    </svg>
  )
}

const OVERKROPP: Muskel[] = ['bryst', 'skuldre', 'trapes', 'biceps', 'triceps', 'underarm', 'mage', 'skra', 'lats', 'ovreRygg', 'korsrygg']

// Én side, uten etikett – for kort i listen. Zoomer inn på over- eller underkroppen
// når alle primærmusklene ligger der, så markeringen blir stor nok til å lese.
export function MuskelkartMini({ primaer, sekundaer, bakfra = false, hoyde = 96 }: { primaer: Muskel[]; sekundaer: Muskel[]; bakfra?: boolean; hoyde?: number }) {
  const over = primaer.every(m => OVERKROPP.includes(m))
  const under = primaer.every(m => !OVERKROPP.includes(m))
  const [x, y, w, h] = over ? [10, 2, 80, 120] : under ? [18, 104, 64, 114] : [8, 0, 84, 220]
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} height={hoyde} width={(hoyde * w) / h} aria-hidden>
      <Figur bakfra={bakfra} primaer={primaer} sekundaer={sekundaer} />
    </svg>
  )
}
