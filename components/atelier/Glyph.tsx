import {
  Target, ArrowUpFromLine, Mountain, PersonStanding, ChevronsUp, Waves, Bike, Orbit, Footprints, Flame,
} from 'lucide-react'

// ─── Anatomiske glyfer ───────────────────────────────────────────────────────
// En enkel strekfigur der muskelgruppen som trenes, tegnes i gull.

const BASE = 'rgba(242,236,225,0.28)'
const GULL = '#C9A96E'

type Del = 'bryst' | 'rygg' | 'skuldre' | 'bicep' | 'tricep' | 'core' | 'bein'

const FIGUR = {
  hode:      <circle cx="20" cy="6" r="3.2" />,
  skuldre:   <path d="M12 13.5 H28" />,
  torso:     <path d="M13 13.5 L14.5 28 H25.5 L27 13.5" />,
  armV:      <path d="M12 13.5 L9.5 23 L8.5 31" />,
  armH:      <path d="M28 13.5 L30.5 23 L31.5 31" />,
  beinV:     <path d="M16.5 28 L15.5 37.5 L15.5 45" />,
  beinH:     <path d="M23.5 28 L24.5 37.5 L24.5 45" />,
}

const MARKERING: Record<Del, React.ReactNode> = {
  bryst:   <path d="M14.5 15.5 Q17 19 20 17.5 Q23 19 25.5 15.5" />,
  rygg:    <path d="M14 14.5 L20 26 L26 14.5" />,
  skuldre: <><circle cx="12" cy="13.5" r="2" /><circle cx="28" cy="13.5" r="2" /></>,
  bicep:   <><path d="M11.6 15 L10 21.5" /><path d="M28.4 15 L30 21.5" /></>,
  tricep:  <><path d="M12.8 16 L11.3 22.5" strokeDasharray="1.4 1.4" /><path d="M27.2 16 L28.7 22.5" strokeDasharray="1.4 1.4" /></>,
  core:    <path d="M17.5 20.5 H22.5 M17.5 23 H22.5 M17.5 25.5 H22.5" />,
  bein:    <><path d="M16.5 28 L15.5 37.5" /><path d="M23.5 28 L24.5 37.5" /><path d="M15.5 39 L15.5 44" /><path d="M24.5 39 L24.5 44" /></>,
}

function Figur({ del, alt = false, size }: { del?: Del; alt?: boolean; size: number }) {
  return (
    <svg viewBox="0 0 40 48" width={size * 0.83} height={size} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g stroke={alt ? GULL : BASE} strokeWidth={alt ? 1.5 : 1.1}>
        {Object.entries(FIGUR).map(([k, v]) => <g key={k}>{v}</g>)}
      </g>
      {del && <g stroke={GULL} strokeWidth="2.2">{MARKERING[del]}</g>}
    </svg>
  )
}

export function MuskelGlyph({ gruppe, size = 30 }: { gruppe: string; size?: number }) {
  switch (gruppe) {
    case 'bryst': case 'rygg': case 'skuldre': case 'bicep': case 'tricep': case 'core': case 'bein':
      return <Figur del={gruppe} size={size} />
    case 'fullkropp': case 'styrkeløft':
      return <Figur alt size={size} />
    case 'tabata':
      // Intervaller: fire arbeidsblokker med hvile mellom
      return (
        <svg viewBox="0 0 40 48" width={size * 0.83} height={size} fill="none" aria-hidden>
          <path d="M4 34 H36" stroke={BASE} strokeWidth="1" />
          {[0, 1, 2, 3].map(i => <rect key={i} x={5 + i * 8} y={16} width={5} height={18} fill={GULL} opacity={1 - i * 0.18} />)}
        </svg>
      )
    case 'cardio':
      return (
        <svg viewBox="0 0 40 48" width={size * 0.83} height={size} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 26 H11 L14 18 L19 34 L23 14 L27 26 H37" stroke={GULL} strokeWidth="1.8" />
        </svg>
      )
    default:
      return <Figur size={size} />
  }
}

// ─── Oppvarming: linjeikoner i stedet for emojier ────────────────────────────
const OPPVARMING_IKON: Record<string, typeof Flame> = {
  boksesekk:    Target,
  froskehopp:   ArrowUpFromLine,
  fjellklatrer: Mountain,
  strekk:       PersonStanding,
  hopping:      ChevronsUp,
  romaskin:     Waves,
  sykkel:       Bike,
  elipsemaskin: Orbit,
  tredemill:    Footprints,
}

export function OppvarmingIkon({ id, size = 16 }: { id: string; size?: number }) {
  const Icon = OPPVARMING_IKON[id] ?? Flame
  return <Icon size={size} strokeWidth={1.4} />
}
