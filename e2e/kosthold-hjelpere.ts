import type { Request } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

// ── Falsk database for kostholdstabellene ─────────────────────────────────
// Holder tilstand mellom kall, slik at en registrering faktisk dukker opp i dagboken og på
// dashbordet. Etterligner det PostgREST gjør for filtrene appen bruker (eq, gte, lte),
// upsert med on_conflict og «single». Tilgangsregler testes mot ekte PostgreSQL (npm run test:rls).

type Rad = Record<string, any>
export type Tabell = 'matvarer' | 'matlogg' | 'maltidsmaler' | 'ernaeringsmal'
const NOKKEL: Record<Tabell, string> = { matvarer: 'id', matlogg: 'id', maltidsmaler: 'id', ernaeringsmal: 'bruker_id' }

export interface Skriving { tabell: Tabell; metode: string; body: any; sok: string }

export function kostholdDb(start: Partial<Record<Tabell, Rad[]>> = {}) {
  const db: Record<Tabell, Rad[]> = { matvarer: [], matlogg: [], maltidsmaler: [], ernaeringsmal: [], ...structuredClone(start) }
  const skrivinger: Skriving[] = []
  /** Feil som skal returneres for neste skrivinger til en tabell (status), én per kall */
  const feilKo: Partial<Record<Tabell, number[]>> = {}

  const filtrer = (rader: Rad[], url: URL) => {
    let ut = rader
    for (const [k, v] of url.searchParams) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue
      const [op, ...rest] = v.split('.')
      const verdi = rest.join('.')
      ut = ut.filter(r => {
        const x = r[k] === null || r[k] === undefined ? null : String(r[k])
        if (op === 'eq') return x === verdi
        if (op === 'gte') return x !== null && x >= verdi
        if (op === 'lte') return x !== null && x <= verdi
        if (op === 'is') return verdi === 'null' ? x === null : true
        return true
      })
    }
    return ut
  }

  const standard = (t: Tabell, r: Rad): Rad => {
    const na = new Date().toISOString()
    if (t === 'matvarer') return { favoritt: false, antall_bruk: 0, sist_brukt: null, sist_mengde: null, sist_enhet: null, opprettet: na, oppdatert: na, kj: null, merke: null, strekkode: null, porsjon_navn: null, porsjon_mengde: null, porsjon_enhet: null, stk_vekt: null, tetthet: null, ...r }
    return { opprettet: na, oppdatert: na, ...r }
  }

  function handler(req: Request, url: URL) {
    const t = url.pathname.replace('/rest/v1/', '') as Tabell
    if (!(t in db)) return undefined
    const m = req.method()
    const prefer = req.headers()['prefer'] ?? ''
    const objekt = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object')
    const representasjon = prefer.includes('return=representation')

    if (m === 'GET' || m === 'HEAD') {
      let rader = filtrer(db[t], url)
      const order = url.searchParams.get('order')
      if (order?.startsWith('opprettet')) rader = [...rader].sort((a, b) => String(a.opprettet).localeCompare(String(b.opprettet)))
      if (objekt) return rader.length === 1 ? { json: rader[0] } : { status: 406, json: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rader.length} rows` } }
      return { json: rader }
    }

    const body = req.postData() ? JSON.parse(req.postData()!) : null
    skrivinger.push({ tabell: t, metode: m, body, sok: decodeURIComponent(url.search) })
    const feil = feilKo[t]?.shift()
    if (feil) return { status: feil, json: { code: 'XX000', message: 'simulert serverfeil' } }

    if (m === 'POST') {
      const rader: Rad[] = Array.isArray(body) ? body : [body]
      const konflikt = url.searchParams.get('on_conflict') ?? NOKKEL[t]
      const ignorer = prefer.includes('ignore-duplicates')
      const slaSammen = prefer.includes('merge-duplicates')
      // Alt eller ingenting, som én SQL-setning
      for (const r of rader) {
        if (t === 'matvarer' && r.strekkode && db.matvarer.some(x => x.strekkode === r.strekkode && x.bruker_id === r.bruker_id && x.id !== r.id)) {
          return { status: 409, json: { code: '23505', message: 'duplicate key value violates unique constraint "matvarer_bruker_strekkode_key"' } }
        }
        if (t === 'matlogg' && (!(Number(r.mengde) > 0) || !(Number(r.basis_mengde) > 0))) return { status: 400, json: { code: '23514', message: 'violates check constraint' } }
      }
      const nye: Rad[] = []
      for (const r of rader) {
        const i = db[t].findIndex(x => x[konflikt] === r[konflikt])
        if (i >= 0) {
          if (ignorer) continue
          if (slaSammen) { db[t][i] = { ...db[t][i], ...r }; nye.push(db[t][i]); continue }
          return { status: 409, json: { code: '23505', message: 'duplicate key value violates unique constraint' } }
        }
        const ny = standard(t, r)
        db[t].push(ny); nye.push(ny)
      }
      return representasjon ? { status: 201, json: objekt ? nye[0] : nye } : { status: 201, body: '' }
    }
    if (m === 'PATCH') {
      const treff = filtrer(db[t], url)
      for (const r of treff) Object.assign(r, body, { oppdatert: new Date().toISOString() })
      return representasjon ? { json: objekt ? treff[0] : treff } : { status: 204, body: '' }
    }
    if (m === 'DELETE') {
      const treff = new Set(filtrer(db[t], url))
      db[t] = db[t].filter(r => !treff.has(r))
      if (t === 'matvarer') for (const l of db.matlogg) if (l.matvare_id && !db.matvarer.some(x => x.id === l.matvare_id)) l.matvare_id = null
      return { status: 204, body: '' }
    }
    return undefined
  }

  return { db, handler, skrivinger, feilKo }
}

const iso = (dager = 0) => { const d = new Date(Date.now() - dager * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const idag = () => iso(0)
export const dagerSiden = iso

export const HAVREGRYN = {
  id: '11111111-1111-4111-8111-111111111111', bruker_id: 'u1', navn: 'Havregryn', merke: 'AXA', strekkode: '7310130006210', kilde: 'openfoodfacts', basis: '100g',
  kcal: 370, kj: null, protein: 13, karbohydrater: 60, fett: 7, sukker: 1.1, mettet_fett: 1.2, fiber: 10, salt: 0.01,
  porsjon_navn: '40 g', porsjon_mengde: 40, porsjon_enhet: 'g', stk_vekt: null, tetthet: null,
  favoritt: true, antall_bruk: 5, sist_brukt: new Date(Date.now() - 864e5).toISOString(), sist_mengde: 60, sist_enhet: 'g',
}
export const MELK = {
  id: '22222222-2222-4222-8222-222222222222', bruker_id: 'u1', navn: 'Lettmelk 1 %', merke: 'Tine', strekkode: '7038010009457', kilde: 'openfoodfacts', basis: '100ml',
  kcal: 38, kj: 161, protein: 3.5, karbohydrater: 4.5, fett: 1, sukker: 4.5, mettet_fett: 0.6, fiber: null, salt: 0.1,
  porsjon_navn: '1 glass', porsjon_mengde: 250, porsjon_enhet: 'ml', stk_vekt: null, tetthet: null,
  favoritt: false, antall_bruk: 3, sist_brukt: new Date(Date.now() - 2 * 864e5).toISOString(), sist_mengde: 250, sist_enhet: 'ml',
}
export const linje = (o: Rad) => ({
  id: crypto.randomUUID(), bruker_id: 'u1', dato: idag(), maltid: 'frokost', matvare_id: null, merke: null, basis: '100g', enhet: 'g',
  protein_100: null, karbohydrater_100: null, fett_100: null, sukker_100: null, mettet_fett_100: null, fiber_100: null, salt_100: null,
  opprettet: new Date().toISOString(), ...o,
})
export const MAL = { bruker_id: 'u1', kcal: 2500, protein: 160, karbohydrater: 278, fett: 83, overstyrt: false, beregningsgrunnlag: 'mann', aktivitetsniva: 'moderat', retning: 'vedlikehold', tempo: 0, vedlikehold_kcal: 2500 }

// ── Strekkode som video for Chromium sitt falske kamera ──────────────────────
// EAN-13 tegnes som bilde og lagres som .y4m (rå YUV 4:2:0), som Chromium spiller av
// som kamerabilde med --use-file-for-fake-video-capture.
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100']
const PARITET = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

export function ean13Moduler(kode: string): string {
  const d = kode.split('').map(Number)
  const p = PARITET[d[0]]
  let s = '101'
  for (let i = 1; i <= 6; i++) s += (p[i - 1] === 'L' ? L : G)[d[i]]
  s += '01010'
  for (let i = 7; i <= 12; i++) s += R[d[i]]
  return s + '101'
}

export function lagStrekkodeVideo(kode: string, fil: string, b = 640, h = 480, modul = 4): string {
  const moduler = ean13Moduler(kode)
  const y = new Uint8Array(b * h).fill(235)
  const bredde = moduler.length * modul
  const x0 = Math.round((b - bredde) / 2), y0 = Math.round(h * 0.3), y1 = Math.round(h * 0.7)
  for (let i = 0; i < moduler.length; i++) {
    if (moduler[i] !== '1') continue
    for (let x = x0 + i * modul; x < x0 + (i + 1) * modul; x++) for (let yy = y0; yy < y1; yy++) y[yy * b + x] = 16
  }
  const uv = new Uint8Array((b / 2) * (h / 2)).fill(128)
  const ramme = Buffer.concat([Buffer.from('FRAME\n'), Buffer.from(y), Buffer.from(uv), Buffer.from(uv)])
  const hode = Buffer.from(`YUV4MPEG2 W${b} H${h} F10:1 Ip A1:1 C420jpeg\n`)
  mkdirSync(path.dirname(fil), { recursive: true })
  writeFileSync(fil, Buffer.concat([hode, ...Array.from({ length: 10 }, () => ramme)]))
  return fil
}
