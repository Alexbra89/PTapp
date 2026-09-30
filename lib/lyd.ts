// Korte lydsignaler via Web Audio – krever ingen lydfiler.
// (Tabata refererte til /beep.mp3 og /complete.mp3, som aldri har eksistert.)
let ctx: AudioContext | null = null

function hentCtx() {
  if (typeof window === 'undefined') return null
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch { return null }
}

function tone(frekvens: number, start: number, varighet: number, volum = 0.25) {
  const c = hentCtx()
  if (!c) return
  const o = c.createOscillator(), g = c.createGain()
  o.type = 'sine'; o.frequency.value = frekvens
  o.connect(g); g.connect(c.destination)
  const t = c.currentTime + start
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(volum, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + varighet)
  o.start(t); o.stop(t + varighet + 0.02)
}

export const lyd = {
  // Kalles fra et klikk for å låse opp lyd på iOS
  klargjor: () => { hentCtx() },
  tikk:     () => tone(660, 0, 0.09, 0.15),
  arbeid:   () => { tone(880, 0, 0.14); tone(1320, 0.16, 0.22) },
  hvile:    () => { tone(660, 0, 0.14); tone(440, 0.16, 0.26) },
  ferdig:   () => { tone(880, 0, 0.15); tone(1100, 0.18, 0.15); tone(1320, 0.36, 0.4) },
}
