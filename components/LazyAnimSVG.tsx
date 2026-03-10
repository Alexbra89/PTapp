'use client'

/**
 * LazyAnimSVG – laster og animerer kun SVG-er som er synlige på skjermen.
 * Bruk denne i øvelseskortet (grid). På detaljsiden brukes vanlig AnimasjonSVG.
 *
 * Eksempel:
 *   import { LazyAnimSVG } from '@/components/LazyAnimSVG'
 *   <LazyAnimSVG type="press" color="#00f5ff" size={60} />
 */

import { useEffect, useRef, useState } from 'react'

type AnimType =
  | 'press' | 'pull' | 'squat' | 'hinge'
  | 'curl'  | 'pushdown' | 'raise' | 'crunch'
  | 'plank' | 'run'

interface Props {
  type:   AnimType
  color?: string
  size?:  number
}

// ─── SVG-animasjoner (identisk med ovelser/page.tsx) ────────────────────────
function AnimasjonSVG({ type, color = '#00f5ff', size = 80 }: Props) {
  const s = size
  const c = color

  switch (type) {
    case 'press': return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <style>{`.press-arms{animation:pressMove 1.4s ease-in-out infinite alternate;transform-origin:40px 55px}@keyframes pressMove{from{transform:translateY(8px)}to{transform:translateY(-8px)}}`}</style>
        <rect x="32" y="38" width="16" height="18" rx="4" fill={c} opacity=".5"/>
        <circle cx="40" cy="30" r="9" fill={c} opacity=".7"/>
        <rect x="33" y="55" width="6" height="14" rx="3" fill={c} opacity=".4"/>
        <rect x="41" y="55" width="6" height="14" rx="3" fill={c} opacity=".4"/>
        <g className="press-arms">
          <rect x="12" y="30" width="56" height="5" rx="2.5" fill={c} opacity=".9"/>
          <rect x="8"  y="28" width="8"  height="8"  rx="4" fill={c}/>
          <rect x="64" y="28" width="8"  height="8"  rx="4" fill={c}/>
          <rect x="22" y="26" width="4"  height="14" rx="2" fill={c} opacity=".6"/>
          <rect x="54" y="26" width="4"  height="14" rx="2" fill={c} opacity=".6"/>
        </g>
      </svg>
    )
    case 'pull': return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <style>{`.pull-body{animation:pullMove 1.4s ease-in-out infinite alternate;transform-origin:40px 20px}@keyframes pullMove{from{transform:translateY(16px)}to{transform:translateY(0px)}}`}</style>
        <rect x="10" y="8" width="60" height="5" rx="2.5" fill={c} opacity=".9"/>
        <g className="pull-body">
          <circle cx="40" cy="22" r="8" fill={c} opacity=".7"/>
          <rect x="33" y="29" width="14" height="18" rx="4" fill={c} opacity=".5"/>
          <rect x="20" y="10" width="5" height="22" rx="2.5" fill={c} opacity=".6"/>
          <rect x="55" y="10" width="5" height="22" rx="2.5" fill={c} opacity=".6"/>
          <rect x="34" y="46" width="5" height="16" rx="2.5" fill={c} opacity=".4"/>
          <rect x="41" y="46" width="5" height="16" rx="2.5" fill={c} opacity=".4"/>
        </g>
      </svg>
    )
    case 'squat': return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <style>{`.squat-body{animation:squatMove 1.4s ease-in-out infinite alternate;transform-origin:40px 40px}@keyframes squatMove{from{transform:translateY(-10px) scaleY(0.85)}to{transform:translateY(4px) scaleY(1.05)}}`}</style>
        <g className="squat-body">
          <circle cx="40" cy="12" r="9" fill={c} opacity=".7"/>
          <rect x="32" y="20" width="16" height="14" rx="4" fill={c} opacity=".5"/>
          <rect x="10" y="18" width="60" height="4" rx="2" fill={c} opacity=".8"/>
          <rect x="26" y="32" width="10" height="18" rx="5" fill={c} opacity=".5" transform="rotate(25,31,41)"/>
          <rect x="44" y="32" width="10" height="18" rx="5" fill={c} opacity=".5" transform="rotate(-25,49,41)"/>
          <rect x="22" y="48" width="8"  height="16" rx="4" fill={c} opacity=".4" transform="rotate(-15,26,56)"/>
          <rect x="50" y="48" width="8"  height="16" rx="4" fill={c} opacity=".4" transform="rotate(15,54,56)"/>
        </g>
      </svg>
    )
    case 'hinge': return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <style>{`.hinge-upper{animation:hingeMove 1.4s ease-in-out infinite alternate;transform-origin:40px 44px}@keyframes hingeMove{from{transform:rotate(-35deg)}to{transform:rotate(0deg)}}`}</style>
        <rect x="28" y="44" width="8"  height="24" rx="4" fill={c} opacity=".5"/>
        <rect x="44" y="44" width="8"  height="24" rx="4" fill={c} opacity=".5"/>
        <g className="hinge-upper">
          <rect x="32" y="20" width="16" height="24" rx="6" fill={c} opacity=".5"/>
          <circle cx="40" cy="14" r="9" fill={c} opacity=".7"/>
          <rect x="12" y="36" width="56" height="5" rx="2.5" fill={c} opacity=".8"/>
          <rect x="8"  y="34" width="6" height="9" rx="3" fill={c}/>
          <rect x="66" y="34" width="6" height="9" rx="3" fill={c}/>
        </g>
      </svg>
    )
    case 'curl': return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <style>{`.curl-arm{animation:curlMove 1.2s ease-in-out infinite alternate;transform-origin:28px 42px}@keyframes curlMove{from{transform:rotate(30deg)}to{transform:rotate(-60deg)}}`}</style>
        <rect x="32" y="26" width="16" height="20" rx="5" fill={c} opacity=".5"/>
        <circle cx="40" cy="18" r="9" fill={c} opacity=".7"/>
        <rect x="33" y="45" width="6" height="20" rx="3" fill={c} opacity=".4"/>
        <rect x="41" y="45" width="6" height="20" rx="3" fill={c} opacity=".4"/>
        <rect x="24" y="26" width="6" height="16" rx="3" fill={c} opacity=".5"/>
        <g className="curl-arm">
          <rect x="24" y="42" width="6" height="18" rx="3" fill={c} opacity=".7"/>
          <rect x="18" y="56" width="18" height="6" rx="3" fill={c}/>
        </g>
      </svg>
    )
    case 'pushdown': return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <style>{`.pd-arm{animation:pdMove 1.2s ease-in-out infinite alternate;transform-origin:52px 42px}@keyframes pdMove{from{transform:rotate(-50deg)}to{transform:rotate(10deg)}}`}</style>
        <rect x="48" y="4" width="4" height="20" rx="2" fill={c} opacity=".6"/>
        <rect x="44" y="4" width="12" height="6" rx="3" fill={c} opacity=".8"/>
        <rect x="32" y="24" width="16" height="20" rx="5" fill={c} opacity=".5"/>
        <circle cx="40" cy="16" r="9" fill={c} opacity=".7"/>
        <rect x="33" y="43" width="6" height="22" rx="3" fill={c} opacity=".4"/>
        <rect x="41" y="43" width="6" height="22" rx="3" fill={c} opacity=".4"/>
        <rect x="50" y="26" width="6" height="16" rx="3" fill={c} opacity=".5"/>
        <g className="pd-arm">
          <rect x="50" y="42" width="6" height="18" rx="3" fill={c} opacity=".7"/>
          <rect x="44" y="56" width="18" height="6" rx="3" fill={c}/>
        </g>
      </svg>
    )
    case 'raise': return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <style>{`.raise-l{animation:raiseL 1.2s ease-in-out infinite alternate;transform-origin:28px 36px}.raise-r{animation:raiseR 1.2s ease-in-out infinite alternate;transform-origin:52px 36px}@keyframes raiseL{from{transform:rotate(30deg)}to{transform:rotate(-50deg)}}@keyframes raiseR{from{transform:rotate(-30deg)}to{transform:rotate(50deg)}}`}</style>
        <circle cx="40" cy="16" r="9" fill={c} opacity=".7"/>
        <rect x="32" y="24" width="16" height="20" rx="5" fill={c} opacity=".5"/>
        <rect x="33" y="43" width="6" height="22" rx="3" fill={c} opacity=".4"/>
        <rect x="41" y="43" width="6" height="22" rx="3" fill={c} opacity=".4"/>
        <g className="raise-l">
          <rect x="24" y="28" width="6" height="20" rx="3" fill={c} opacity=".7"/>
          <rect x="16" y="44" width="12" height="6" rx="3" fill={c}/>
        </g>
        <g className="raise-r">
          <rect x="50" y="28" width="6" height="20" rx="3" fill={c} opacity=".7"/>
          <rect x="52" y="44" width="12" height="6" rx="3" fill={c}/>
        </g>
      </svg>
    )
    case 'crunch': return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <style>{`.crunch-upper{animation:crunchMove 1.2s ease-in-out infinite alternate;transform-origin:40px 52px}@keyframes crunchMove{from{transform:rotate(-25deg)}to{transform:rotate(5deg)}}`}</style>
        <rect x="32" y="48" width="10" height="20" rx="5" fill={c} opacity=".4" transform="rotate(-10,37,58)"/>
        <rect x="44" y="46" width="10" height="20" rx="5" fill={c} opacity=".4" transform="rotate(-10,49,56)"/>
        <g className="crunch-upper">
          <rect x="32" y="26" width="16" height="26" rx="6" fill={c} opacity=".5"/>
          <circle cx="40" cy="18" r="9" fill={c} opacity=".7"/>
        </g>
      </svg>
    )
    case 'plank': return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <style>{`.plank-glow{animation:plankPulse 1.6s ease-in-out infinite alternate}@keyframes plankPulse{from{opacity:.2}to{opacity:.6}}`}</style>
        <ellipse cx="40" cy="42" rx="28" ry="7" fill={c} opacity=".15" className="plank-glow"/>
        <circle cx="62" cy="38" r="8" fill={c} opacity=".7"/>
        <rect x="24" y="34" width="38" height="10" rx="5" fill={c} opacity=".5"/>
        <rect x="16" y="40" width="8" height="14" rx="4" fill={c} opacity=".5"/>
        <rect x="54" y="40" width="8" height="16" rx="4" fill={c} opacity=".4"/>
        <rect x="64" y="40" width="8" height="16" rx="4" fill={c} opacity=".4"/>
      </svg>
    )
    default: return ( // run
      <svg width={s} height={s} viewBox="0 0 80 80">
        <style>{`.run-leg-f{animation:runLegF 0.6s ease-in-out infinite alternate;transform-origin:40px 44px}.run-leg-b{animation:runLegB 0.6s ease-in-out infinite alternate;transform-origin:40px 44px}.run-arm-f{animation:runArmF 0.6s ease-in-out infinite alternate;transform-origin:36px 30px}.run-arm-b{animation:runArmB 0.6s ease-in-out infinite alternate;transform-origin:44px 30px}@keyframes runLegF{from{transform:rotate(-30deg)}to{transform:rotate(30deg)}}@keyframes runLegB{from{transform:rotate(30deg)}to{transform:rotate(-30deg)}}@keyframes runArmF{from{transform:rotate(-25deg)}to{transform:rotate(25deg)}}@keyframes runArmB{from{transform:rotate(25deg)}to{transform:rotate(-25deg)}}`}</style>
        <circle cx="40" cy="14" r="9" fill={c} opacity=".7"/>
        <rect x="33" y="22" width="14" height="18" rx="5" fill={c} opacity=".5"/>
        <g className="run-arm-f"><rect x="22" y="24" width="6" height="16" rx="3" fill={c} opacity=".6"/></g>
        <g className="run-arm-b"><rect x="52" y="24" width="6" height="16" rx="3" fill={c} opacity=".6"/></g>
        <g className="run-leg-f">
          <rect x="34" y="40" width="7" height="20" rx="3.5" fill={c} opacity=".5"/>
          <rect x="30" y="58" width="12" height="5" rx="2.5" fill={c} opacity=".4"/>
        </g>
        <g className="run-leg-b">
          <rect x="42" y="40" width="7" height="20" rx="3.5" fill={c} opacity=".5"/>
          <rect x="42" y="58" width="12" height="5" rx="2.5" fill={c} opacity=".4"/>
        </g>
      </svg>
    )
  }
}

// ─── Lazy wrapper – animerer kun synlige kort ───────────────────────────────
export function LazyAnimSVG({ type, color = '#00f5ff', size = 80 }: Props) {
  const ref        = useRef<HTMLDivElement>(null)
  const [synlig, setSynlig] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setSynlig(true) },
      { rootMargin: '150px' } // start litt før elementet er synlig
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {synlig
        ? <AnimasjonSVG type={type} color={color} size={size} />
        : <div style={{ width: size * 0.6, height: size * 0.6, borderRadius: '50%', background: `${color}15` }} />
      }
    </div>
  )
}
