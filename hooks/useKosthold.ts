'use client'

// Data for kostholdsmodulen. Dagbok og dashbord bruker de samme spørringene (samme
// cache-nøkler) og samme summering (lib/kosthold/naering.ts), så tallene alltid er like.
//
// Robusthet:
// • Nye rader får id i appen før lagring. Ved nettverksfeil prøves det igjen med samme id;
//   finnes id-en allerede, oppdateres raden med det som sendes sist («on conflict (id) do update») –
//   aldri dobbelt, og en endring gjort mens svaret var borte går ikke tapt.
// • Endringer vises med en gang (optimistisk) og rulles tilbake hvis lagringen feiler.
//   Allerede lagrede data i cachen røres ikke ved feil.
// • Alle cache-nøkler inneholder bruker-id, og cachen tømmes ved utlogging (app/providers.tsx).

import { useEffect, useSyncExternalStore } from 'react'
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Logglinje, Matvare } from '@/lib/kosthold/naering'
import type { Maltidsmal } from '@/lib/kosthold/linje'
import { hentVannko, type Vannstatus, type Vanntilstand } from '@/lib/kosthold/vann'

const supabase = createClient()

export const QKK = {
  alt:      (u: string) => ['kost', u] as const,
  dag:      (u: string, dato: string) => ['kost', u, 'dag', dato] as const,
  periode:  (u: string, fra: string, til: string) => ['kost', u, 'periode', fra, til] as const,
  matvarer: (u: string) => ['kost', u, 'matvarer'] as const,
  maler:    (u: string) => ['kost', u, 'maler'] as const,
  mal:      (u: string) => ['kost', u, 'mal'] as const,
  vann:     (u: string, dato: string) => ['kost', u, 'vann', dato] as const,
}

/** Tabellene finnes ikke ennå (migrasjonen er ikke kjørt). */
export class IkkeOppsattFeil extends Error {
  constructor() { super('Kostholdsmodulen er ikke satt opp i databasen ennå (docs/migrasjoner/kosthold.sql).') }
}
export const erIkkeOppsatt = (e: unknown) => e instanceof IkkeOppsattFeil

function kast(error: { code?: string; message?: string } | null): never | void {
  if (!error) return
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST202' || /does not exist|could not find the table/i.test(error.message ?? '')) {
    throw new IkkeOppsattFeil()
  }
  throw new Error(error.message || 'Ukjent feil fra databasen')
}

/** Enheten er uten nett: ingenting sendes, og ingenting skal se lagret ut. */
export class UtenNettFeil extends Error {
  constructor() { super('Du er uten nett. Ingenting ble lagret – prøv igjen når du har dekning.') }
}
export const erUtenNett = (e: unknown) => e instanceof UtenNettFeil

/**
 * Stopper en skriving før den starter når nettleseren vet at den er uten nett. Uten dette ville
 * React Query satt endringen på pause (networkMode «online») mens den så lagret ut – og den
 * forsvant hvis appen ble lukket før nettet kom tilbake.
 */
export function kreverNett() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new UtenNettFeil()
}

/** En ny registrering som ikke er bekreftet av databasen ennå (vises som «Lagrer …»). */
export interface VentendeLinje extends Logglinje { _venter?: boolean }

/** Strekkoden er allerede lagret hos brukeren – brukeren velger selv om den lagrede skal brukes. */
export class StrekkodeFinnesFeil extends Error {
  constructor(public matvare: Matvare) { super(`Du har allerede lagret «${matvare.navn}» med denne strekkoden.`) }
}

/** Feilmelding for brukeren – aldri rå databasetekst. */
export function feilTekst(e: unknown): string {
  if (erIkkeOppsatt(e) || erUtenNett(e) || e instanceof StrekkodeFinnesFeil) return (e as Error).message
  const m = (e as Error)?.message ?? ''
  if (/failed to fetch|network|load failed|nettverk/i.test(m)) return 'Fikk ikke kontakt med serveren, så endringen er ikke bekreftet. Prøv igjen – det gir ingen dobbel registrering.'
  if (/check constraint|violates/i.test(m)) return 'Verdiene ble ikke godtatt. Kontroller tallene og prøv igjen.'
  if (/duplicate key|unique/i.test(m)) return 'Finnes allerede.'
  return 'Noe gikk galt. Prøv igjen.'
}

const LOGG_FELTER = 'id, bruker_id, dato, maltid, matvare_id, navn, merke, basis, mengde, enhet, basis_mengde, kcal_100, protein_100, karbohydrater_100, fett_100, sukker_100, mettet_fett_100, fiber_100, salt_100, opprettet'

// numeric kommer som tekst eller tall avhengig av oppsett – gjør om til tall én gang
const N = (v: unknown) => (v === null || v === undefined ? null : Number(v))
const tilLinje = (r: any): Logglinje => ({
  ...r, mengde: Number(r.mengde), basis_mengde: Number(r.basis_mengde), kcal_100: Number(r.kcal_100),
  protein_100: N(r.protein_100), karbohydrater_100: N(r.karbohydrater_100), fett_100: N(r.fett_100),
  sukker_100: N(r.sukker_100), mettet_fett_100: N(r.mettet_fett_100), fiber_100: N(r.fiber_100), salt_100: N(r.salt_100),
})
export const tilMatvare = (r: any): Matvare => ({
  ...r, kcal: Number(r.kcal), kj: N(r.kj), protein: N(r.protein), karbohydrater: N(r.karbohydrater), fett: N(r.fett),
  sukker: N(r.sukker), mettet_fett: N(r.mettet_fett), fiber: N(r.fiber), salt: N(r.salt),
  porsjon_mengde: N(r.porsjon_mengde), stk_vekt: N(r.stk_vekt), tetthet: N(r.tetthet), sist_mengde: N(r.sist_mengde),
})

// ── Lesing ─────────────────────────────────────────────────────────────────

export function useKostDag(userId?: string, dato?: string) {
  return useQuery({
    queryKey: QKK.dag(userId ?? '', dato ?? ''),
    enabled: !!userId && !!dato,
    staleTime: 30 * 1000,
    retry: (n, e) => !erIkkeOppsatt(e) && n < 2,
    queryFn: async (): Promise<Logglinje[]> => {
      const { data, error } = await supabase.from('matlogg').select(LOGG_FELTER)
        .eq('bruker_id', userId!).eq('dato', dato!).order('opprettet', { ascending: true })
      kast(error)
      return (data ?? []).map(tilLinje)
    },
  })
}

/** Linjer for flere dager (historikk). Bare feltene summeringen trenger. */
export function useKostPeriode(userId?: string, dager = 7, til = new Date()) {
  const fra = format(subDays(til, dager - 1), 'yyyy-MM-dd')
  const tilS = format(til, 'yyyy-MM-dd')
  return useQuery({
    queryKey: QKK.periode(userId ?? '', fra, tilS),
    enabled: !!userId,
    staleTime: 60 * 1000,
    retry: (n, e) => !erIkkeOppsatt(e) && n < 2,
    queryFn: async (): Promise<Logglinje[]> => {
      const { data, error } = await supabase.from('matlogg').select(LOGG_FELTER)
        .eq('bruker_id', userId!).gte('dato', fra).lte('dato', tilS).limit(2000)
      kast(error)
      return (data ?? []).map(tilLinje)
    },
  })
}

export function useMatvarer(userId?: string) {
  return useQuery({
    queryKey: QKK.matvarer(userId ?? ''),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    retry: (n, e) => !erIkkeOppsatt(e) && n < 2,
    queryFn: async (): Promise<Matvare[]> => {
      const { data, error } = await supabase.from('matvarer').select('*')
        .eq('bruker_id', userId!).order('sist_brukt', { ascending: false, nullsFirst: false }).order('navn').limit(1000)
      kast(error)
      return (data ?? []).map(tilMatvare)
    },
  })
}

export function useMaltidsmaler(userId?: string) {
  return useQuery({
    queryKey: QKK.maler(userId ?? ''),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    retry: (n, e) => !erIkkeOppsatt(e) && n < 2,
    queryFn: async (): Promise<Maltidsmal[]> => {
      const { data, error } = await supabase.from('maltidsmaler').select('*')
        .eq('bruker_id', userId!).order('sist_brukt', { ascending: false, nullsFirst: false }).order('navn')
      kast(error)
      return (data ?? []).map((r: any) => ({ ...r, linjer: Array.isArray(r.linjer) ? r.linjer : [] }))
    },
  })
}

export interface Ernaeringsmal {
  bruker_id: string
  beregningsgrunnlag: 'mann' | 'kvinne' | null
  aktivitetsniva: 'stillesittende' | 'lett' | 'moderat' | 'hoy' | 'svart_hoy' | null
  retning: 'ned' | 'vedlikehold' | 'opp' | null
  tempo: number | null
  vedlikehold_kcal: number | null
  kcal: number
  protein: number
  karbohydrater: number
  fett: number
  overstyrt: boolean
  oppdatert?: string
}

export function useErnaeringsmal(userId?: string) {
  return useQuery({
    queryKey: QKK.mal(userId ?? ''),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    retry: (n, e) => !erIkkeOppsatt(e) && n < 2,
    queryFn: async (): Promise<Ernaeringsmal | null> => {
      const { data, error } = await supabase.from('ernaeringsmal').select('*').eq('bruker_id', userId!).maybeSingle()
      kast(error)
      return data ? { ...data, tempo: N(data.tempo) } as Ernaeringsmal : null
    },
  })
}

// ── Skriving ───────────────────────────────────────────────────────────────

// Felles for alle skrivinger:
// • networkMode «always»: en skriving settes aldri stille på pause. Uten nett feiler den med en gang
//   (kreverNett) og vises ikke som lagret.
// • Nye forsøk bare ved brudd underveis – trygt fordi id-en er den samme (ingen dobbel lagring).
const PROV_IGJEN = {
  networkMode: 'always' as const,
  retry: (n: number, e: unknown) => n < 3 && !erIkkeOppsatt(e) && !erUtenNett(e) && /fetch|network|load failed/i.test((e as Error)?.message ?? ''),
  retryDelay: (n: number) => Math.min(8000, 1000 * 2 ** n),
}
const SKRIV = { networkMode: 'always' as const }

const tilRad = (l: VentendeLinje) => {
  const { opprettet: _o, _venter: _v, ...rad } = l
  return rad
}

function invaliderDag(qc: QueryClient, userId: string) {
  // Dag og historikk – dashbordet og dagboken leser de samme nøklene
  qc.invalidateQueries({ queryKey: ['kost', userId, 'dag'] })
  qc.invalidateQueries({ queryKey: ['kost', userId, 'periode'] })
}

/** Registrer én eller flere linjer i én forespørsel (alt eller ingenting). */
export function useLoggMat() {
  const qc = useQueryClient()
  return useMutation({
    ...PROV_IGJEN,
    mutationFn: async ({ linjer }: { userId: string; linjer: Logglinje[]; malId?: string }) => {
      kreverNett()
      // Samme id ved nytt forsøk: finnes raden (svaret gikk tapt), oppdateres den med det som sendes nå –
      // brukeren kan ha endret mengde eller måltid i mellomtiden. Telleren i matlogg_bruk øker bare ved innsetting.
      const { error } = await supabase.from('matlogg').upsert(linjer.map(tilRad), { onConflict: 'id' })
      kast(error)
    },
    onMutate: async ({ userId, linjer }) => {
      kreverNett() // uten nett: ingen optimistisk rad i det hele tatt
      const datoer = [...new Set(linjer.map(l => l.dato))]
      const forrige = new Map<string, Logglinje[] | undefined>()
      for (const d of datoer) {
        const k = QKK.dag(userId, d)
        await qc.cancelQueries({ queryKey: k })
        forrige.set(d, qc.getQueryData<Logglinje[]>(k))
        // Markert som ventende til databasen har bekreftet – dagboken viser «Lagrer …»
        qc.setQueryData<VentendeLinje[]>(k, (g = []) => [...g.filter(x => !linjer.some(l => l.id === x.id)), ...linjer.filter(l => l.dato === d).map(l => ({ ...l, _venter: true }))])
      }
      return { forrige }
    },
    onError: (_e, { userId }, ctx) => {
      ctx?.forrige.forEach((v, d) => qc.setQueryData(QKK.dag(userId, d), v))
    },
    onSuccess: async (_d, { userId, linjer, malId }) => {
      const ider = new Set(linjer.map(l => l.id))
      for (const d of new Set(linjer.map(l => l.dato))) {
        qc.setQueryData<VentendeLinje[]>(QKK.dag(userId, d), (g = []) => g.map(l => (ider.has(l.id) ? { ...l, _venter: false } : l)))
      }
      // «Nylig brukt», antall og sist brukte mengde oppdateres av databasen (trigger matlogg_bruk) –
      // atomisk og bare for rader som faktisk ble satt inn. Her vises det bare med en gang.
      const na = new Date().toISOString()
      const sist = new Map<string, Logglinje>()
      for (const l of linjer) if (l.matvare_id) sist.set(l.matvare_id, l)
      if (sist.size) {
        qc.setQueryData<Matvare[]>(QKK.matvarer(userId), (g = []) => g.map(m => {
          const l = sist.get(m.id)
          return l ? { ...m, sist_brukt: na, sist_mengde: l.mengde, sist_enhet: l.enhet } : m
        }))
        qc.invalidateQueries({ queryKey: QKK.matvarer(userId) })
      }
      if (malId) {
        await Promise.resolve(supabase.from('maltidsmaler').update({ sist_brukt: na }).eq('id', malId).eq('bruker_id', userId)).catch(() => {})
        qc.invalidateQueries({ queryKey: QKK.maler(userId) })
      }
    },
    onSettled: (_d, _e, { userId }) => invaliderDag(qc, userId),
  })
}

/** Endre mengde, måltid eller dato på en linje (flytte måltid). */
export function useEndreLogg() {
  const qc = useQueryClient()
  return useMutation({
    ...PROV_IGJEN,
    mutationFn: async ({ ny }: { userId: string; gammelDato: string; ny: Logglinje }) => {
      kreverNett()
      const { id, bruker_id, dato, maltid, mengde, enhet, basis_mengde } = ny
      const { error } = await supabase.from('matlogg').update({ dato, maltid, mengde, enhet, basis_mengde }).eq('id', id).eq('bruker_id', bruker_id)
      kast(error)
    },
    onMutate: async ({ userId, gammelDato, ny }) => {
      kreverNett()
      const kG = QKK.dag(userId, gammelDato), kN = QKK.dag(userId, ny.dato)
      await qc.cancelQueries({ queryKey: kG }); await qc.cancelQueries({ queryKey: kN })
      const fG = qc.getQueryData<Logglinje[]>(kG), fN = qc.getQueryData<Logglinje[]>(kN)
      qc.setQueryData<Logglinje[]>(kG, (g = []) => g.filter(l => l.id !== ny.id))
      qc.setQueryData<Logglinje[]>(kN, (g = []) => [...g.filter(l => l.id !== ny.id), ny])
      return { fG, fN, kG, kN }
    },
    onError: (_e, _v, ctx) => { if (ctx) { qc.setQueryData(ctx.kG, ctx.fG); qc.setQueryData(ctx.kN, ctx.fN) } },
    onSettled: (_d, _e, { userId }) => invaliderDag(qc, userId),
  })
}

export function useSlettLogg() {
  const qc = useQueryClient()
  return useMutation({
    ...PROV_IGJEN,
    mutationFn: async ({ linje }: { userId: string; linje: Logglinje }) => {
      kreverNett()
      const { error } = await supabase.from('matlogg').delete().eq('id', linje.id).eq('bruker_id', linje.bruker_id)
      kast(error)
    },
    onMutate: async ({ userId, linje }) => {
      kreverNett()
      const k = QKK.dag(userId, linje.dato)
      await qc.cancelQueries({ queryKey: k })
      const forrige = qc.getQueryData<Logglinje[]>(k)
      qc.setQueryData<Logglinje[]>(k, (g = []) => g.filter(l => l.id !== linje.id))
      return { forrige, k }
    },
    onError: (_e, _v, ctx) => { if (ctx) qc.setQueryData(ctx.k, ctx.forrige) },
    onSettled: (_d, _e, { userId }) => invaliderDag(qc, userId),
  })
}

export type Matvaredata = Omit<Matvare, 'id' | 'bruker_id' | 'favoritt' | 'antall_bruk' | 'sist_brukt' | 'sist_mengde' | 'sist_enhet' | 'opprettet' | 'oppdatert'> & { favoritt?: boolean }

/** Lagre ny eller endret matvare. Ny matvare får id i appen (trygt å prøve igjen). */
export function useLagreMatvare() {
  const qc = useQueryClient()
  return useMutation({
    ...PROV_IGJEN,
    mutationFn: async ({ userId, id, data, ny }: { userId: string; id: string; data: Matvaredata; ny: boolean }): Promise<Matvare> => {
      kreverNett()
      const { error } = ny
        // Nytt forsøk med samme id oppdaterer raden, så en rettelse etter et tapt svar ikke forkastes
        ? await supabase.from('matvarer').upsert({ id, bruker_id: userId, ...data }, { onConflict: 'id' })
        : await supabase.from('matvarer').update(data).eq('id', id).eq('bruker_id', userId)
      // Strekkoden finnes allerede hos brukeren: ikke lag kopi, og ikke forkast det brukeren skrev
      // uten å si fra – skjemaet spør om den lagrede varen skal brukes.
      if (error && /matvarer_bruker_strekkode_key|duplicate key/i.test(error.message) && data.strekkode) {
        const { data: eks, error: e2 } = await supabase.from('matvarer').select('*').eq('bruker_id', userId).eq('strekkode', data.strekkode).maybeSingle()
        kast(e2)
        if (eks) throw new StrekkodeFinnesFeil(tilMatvare(eks))
      }
      kast(error)
      const { data: rad, error: lesFeil } = await supabase.from('matvarer').select('*').eq('id', id).eq('bruker_id', userId).single()
      kast(lesFeil)
      return tilMatvare(rad)
    },
    onSuccess: (m, { userId }) => {
      qc.setQueryData<Matvare[]>(QKK.matvarer(userId), (g = []) => [m, ...g.filter(x => x.id !== m.id)])
    },
    onSettled: (_d, _e, { userId }) => qc.invalidateQueries({ queryKey: QKK.matvarer(userId) }),
  })
}

export function useFavoritt() {
  const qc = useQueryClient()
  return useMutation({
    ...SKRIV,
    mutationFn: async ({ userId, id, favoritt }: { userId: string; id: string; favoritt: boolean }) => {
      kreverNett()
      const { error } = await supabase.from('matvarer').update({ favoritt }).eq('id', id).eq('bruker_id', userId)
      kast(error)
    },
    onMutate: async ({ userId, id, favoritt }) => {
      const k = QKK.matvarer(userId)
      await qc.cancelQueries({ queryKey: k })
      const forrige = qc.getQueryData<Matvare[]>(k)
      qc.setQueryData<Matvare[]>(k, (g = []) => g.map(m => m.id === id ? { ...m, favoritt } : m))
      return { forrige, k }
    },
    onError: (_e, _v, ctx) => { if (ctx) qc.setQueryData(ctx.k, ctx.forrige) },
  })
}

export function useSlettMatvare() {
  const qc = useQueryClient()
  return useMutation({
    ...SKRIV,
    mutationFn: async ({ userId, id }: { userId: string; id: string }) => {
      kreverNett()
      const { error } = await supabase.from('matvarer').delete().eq('id', id).eq('bruker_id', userId)
      kast(error)
    },
    onMutate: async ({ userId, id }) => {
      const k = QKK.matvarer(userId)
      await qc.cancelQueries({ queryKey: k })
      const forrige = qc.getQueryData<Matvare[]>(k)
      qc.setQueryData<Matvare[]>(k, (g = []) => g.filter(m => m.id !== id))
      return { forrige, k }
    },
    onError: (_e, _v, ctx) => { if (ctx) qc.setQueryData(ctx.k, ctx.forrige) },
    // Dagboken beholder øyeblikksbildet; bare koblingen til matvaren blir borte
    onSettled: (_d, _e, { userId }) => { qc.invalidateQueries({ queryKey: QKK.matvarer(userId) }); invaliderDag(qc, userId) },
  })
}

export function useLagreMaltidsmal() {
  const qc = useQueryClient()
  return useMutation({
    ...PROV_IGJEN,
    mutationFn: async ({ userId, mal }: { userId: string; mal: Pick<Maltidsmal, 'id' | 'navn' | 'maltid' | 'linjer'>; ny: boolean }) => {
      kreverNett()
      const rad = { id: mal.id, bruker_id: userId, navn: mal.navn.trim(), maltid: mal.maltid, linjer: mal.linjer }
      const { error } = await supabase.from('maltidsmaler').upsert(rad, { onConflict: 'id' })
      kast(error)
    },
    onSettled: (_d, _e, { userId }) => qc.invalidateQueries({ queryKey: QKK.maler(userId) }),
  })
}

export function useSlettMaltidsmal() {
  const qc = useQueryClient()
  return useMutation({
    ...SKRIV,
    mutationFn: async ({ userId, id }: { userId: string; id: string }) => {
      kreverNett()
      const { error } = await supabase.from('maltidsmaler').delete().eq('id', id).eq('bruker_id', userId)
      kast(error)
    },
    onMutate: async ({ userId, id }) => {
      const k = QKK.maler(userId)
      const forrige = qc.getQueryData<Maltidsmal[]>(k)
      qc.setQueryData<Maltidsmal[]>(k, (g = []) => g.filter(m => m.id !== id))
      return { forrige, k }
    },
    onError: (_e, _v, ctx) => { if (ctx) qc.setQueryData(ctx.k, ctx.forrige) },
    onSettled: (_d, _e, { userId }) => qc.invalidateQueries({ queryKey: QKK.maler(userId) }),
  })
}

export function useLagreErnaeringsmal() {
  const qc = useQueryClient()
  return useMutation({
    ...PROV_IGJEN,
    mutationFn: async ({ userId, mal, profil }: {
      userId: string
      mal: Omit<Ernaeringsmal, 'bruker_id' | 'oppdatert'>
      /** Grunnlag som hører hjemme i profilen (vekt, høyde, fødselsår, målvekt) */
      profil?: { vekt?: number; hoyde?: number; fodselsar?: number; onsket_vekt?: number | null }
    }) => {
      kreverNett()
      // Målene først – de er det brukeren ba om å lagre. Profilen (vekt, høyde …) oppdateres etterpå;
      // feiler det, er målene likevel lagret, og brukeren får beskjed om at profilen ikke ble endret.
      const { error } = await supabase.from('ernaeringsmal').upsert({ bruker_id: userId, ...mal }, { onConflict: 'bruker_id' })
      kast(error)
      if (profil && Object.keys(profil).length) {
        const { error: pFeil } = await supabase.from('profiler').update(profil).eq('id', userId)
        if (pFeil) return { profilOppdatert: false }
      }
      return { profilOppdatert: true }
    },
    onSuccess: (_d, { userId, mal }) => {
      qc.setQueryData(QKK.mal(userId), { bruker_id: userId, ...mal })
      qc.invalidateQueries({ queryKey: ['profil', userId] })
    },
    onSettled: (_d, _e, { userId }) => qc.invalidateQueries({ queryKey: QKK.mal(userId) }),
  })
}

// ── Vann ───────────────────────────────────────────────────────────────────

/** Vann er ikke satt opp i databasen (docs/migrasjoner/vann.sql er ikke kjørt). */
export class VannIkkeOppsattFeil extends Error {
  constructor() { super('Vanntelleren er ikke satt opp i databasen ennå (docs/migrasjoner/vann.sql).') }
}

function kastVann(error: { code?: string; message?: string } | null) {
  try { kast(error) } catch (e) { throw erIkkeOppsatt(e) ? new VannIkkeOppsattFeil() : e }
}

/**
 * Antall glass for en dag. Endringer går gjennom en kø (lib/kosthold/vann.ts): én lagring om gangen,
 * med versjon, så raske trykk og nye forsøk aldri overskriver et nyere antall. Endringer tillates
 * først når dagens antall er lastet.
 */
export function useVann(userId?: string, dato?: string) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: QKK.vann(userId ?? '', dato ?? ''),
    enabled: !!userId && !!dato,
    staleTime: 30 * 1000,
    retry: (n, e) => !(e instanceof VannIkkeOppsattFeil) && n < 2,
    queryFn: async (): Promise<Vannstatus> => {
      const { data, error } = await supabase.from('vanninntak').select('glass, versjon')
        .eq('bruker_id', userId!).eq('dato', dato!).maybeSingle()
      kastVann(error)
      return data ? { glass: Number(data.glass), versjon: Number(data.versjon) } : { glass: 0, versjon: 0 }
    },
  })

  const ko = userId && dato ? hentVannko(userId, dato, () => async (glass, versjon) => {
    kreverNett()
    const { data, error } = await supabase.rpc('vann_sett', { p_dato: dato, p_glass: glass, p_versjon: versjon })
    kastVann(error)
    const s = { glass: Number((data as any).glass), versjon: Number((data as any).versjon) }
    qc.setQueryData<Vannstatus>(QKK.vann(userId, dato), g => (!g || s.versjon >= g.versjon ? s : g))
    return s
  }) : null

  useEffect(() => { if (ko && query.data) ko.settLagret(query.data) }, [ko, query.data])

  const tilstand = useSyncExternalStore<Vanntilstand>(
    ko?.abonner ?? ingenAbonnement,
    () => ko?.tilstand() ?? INGEN,
    () => INGEN,
  )
  // glass er null til dagens antall er lastet fra databasen – da kan det heller ikke endres
  return { query, ko, ...tilstand }
}

const INGEN: Vanntilstand = { glass: null, lagrer: false, feil: null }
const ingenAbonnement = () => () => {}
