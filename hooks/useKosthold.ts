'use client'

// Data for kostholdsmodulen. Dagbok og dashbord bruker de samme spørringene (samme
// cache-nøkler) og samme summering (lib/kosthold/naering.ts), så tallene alltid er like.
//
// Robusthet:
// • Nye rader får id i appen før lagring. Ved nettverksfeil prøves det igjen med samme id;
//   databasen ignorerer en id den allerede har («on conflict do nothing») – aldri dobbelt.
// • Endringer vises med en gang (optimistisk) og rulles tilbake hvis lagringen feiler.
//   Allerede lagrede data i cachen røres ikke ved feil.
// • Alle cache-nøkler inneholder bruker-id, og cachen tømmes ved utlogging (app/providers.tsx).

import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Logglinje, Matvare } from '@/lib/kosthold/naering'
import type { Maltidsmal } from '@/lib/kosthold/linje'

const supabase = createClient()

export const QKK = {
  alt:      (u: string) => ['kost', u] as const,
  dag:      (u: string, dato: string) => ['kost', u, 'dag', dato] as const,
  periode:  (u: string, fra: string, til: string) => ['kost', u, 'periode', fra, til] as const,
  matvarer: (u: string) => ['kost', u, 'matvarer'] as const,
  maler:    (u: string) => ['kost', u, 'maler'] as const,
  mal:      (u: string) => ['kost', u, 'mal'] as const,
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

/** Feilmelding for brukeren – aldri rå databasetekst. */
export function feilTekst(e: unknown): string {
  if (erIkkeOppsatt(e)) return (e as Error).message
  const m = (e as Error)?.message ?? ''
  if (/failed to fetch|network|load failed|nettverk/i.test(m)) return 'Ingen kontakt med serveren. Sjekk nettet og prøv igjen – ingenting av det som er lagret, er tapt.'
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

// Nye forsøk ved nettverksfeil er trygge fordi id-en er den samme (ingen dobbel lagring)
const PROV_IGJEN = { retry: (n: number, e: unknown) => n < 3 && !erIkkeOppsatt(e) && /fetch|network|load failed/i.test((e as Error)?.message ?? ''), retryDelay: (n: number) => Math.min(8000, 1000 * 2 ** n) }

const tilRad = (l: Logglinje) => {
  const { opprettet: _o, ...rad } = l
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
      const { error } = await supabase.from('matlogg').upsert(linjer.map(tilRad), { onConflict: 'id', ignoreDuplicates: true })
      kast(error)
    },
    onMutate: async ({ userId, linjer }) => {
      const datoer = [...new Set(linjer.map(l => l.dato))]
      const forrige = new Map<string, Logglinje[] | undefined>()
      for (const d of datoer) {
        const k = QKK.dag(userId, d)
        await qc.cancelQueries({ queryKey: k })
        forrige.set(d, qc.getQueryData<Logglinje[]>(k))
        qc.setQueryData<Logglinje[]>(k, (g = []) => [...g.filter(x => !linjer.some(l => l.id === x.id)), ...linjer.filter(l => l.dato === d)])
      }
      return { forrige }
    },
    onError: (_e, { userId }, ctx) => {
      ctx?.forrige.forEach((v, d) => qc.setQueryData(QKK.dag(userId, d), v))
    },
    onSuccess: async (_d, { userId, linjer, malId }) => {
      // Bruksstatistikk for «nylig brukt» og «legg til igjen» – ikke kritisk, feil her stopper ikke registreringen
      const na = new Date().toISOString()
      const sist = new Map<string, Logglinje>()
      for (const l of linjer) if (l.matvare_id) sist.set(l.matvare_id, l)
      if (sist.size) {
        const matvarer = qc.getQueryData<Matvare[]>(QKK.matvarer(userId)) ?? []
        const endring = (id: string, l: Logglinje) => ({ sist_brukt: na, sist_mengde: l.mengde, sist_enhet: l.enhet, antall_bruk: (matvarer.find(x => x.id === id)?.antall_bruk ?? 0) + 1 })
        await Promise.all([...sist].map(([id, l]) => supabase.from('matvarer').update(endring(id, l)).eq('id', id).eq('bruker_id', userId))).catch(() => {})
        qc.setQueryData<Matvare[]>(QKK.matvarer(userId), (g = []) => g.map(m => sist.has(m.id) ? { ...m, ...endring(m.id, sist.get(m.id)!) } : m))
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
      const { id, bruker_id, dato, maltid, mengde, enhet, basis_mengde } = ny
      const { error } = await supabase.from('matlogg').update({ dato, maltid, mengde, enhet, basis_mengde }).eq('id', id).eq('bruker_id', bruker_id)
      kast(error)
    },
    onMutate: async ({ userId, gammelDato, ny }) => {
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
      const { error } = await supabase.from('matlogg').delete().eq('id', linje.id).eq('bruker_id', linje.bruker_id)
      kast(error)
    },
    onMutate: async ({ userId, linje }) => {
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
      if (ny) {
        const { error } = await supabase.from('matvarer').upsert({ id, bruker_id: userId, ...data }, { onConflict: 'id', ignoreDuplicates: true })
        // Strekkoden finnes allerede hos brukeren: bruk den lagrede matvaren i stedet for å lage en kopi
        if (error && /matvarer_bruker_strekkode_key|duplicate key/i.test(error.message) && data.strekkode) {
          const { data: eks, error: e2 } = await supabase.from('matvarer').select('*').eq('bruker_id', userId).eq('strekkode', data.strekkode).single()
          kast(e2)
          return tilMatvare(eks)
        }
        kast(error)
      } else {
        const { error } = await supabase.from('matvarer').update(data).eq('id', id).eq('bruker_id', userId)
        kast(error)
      }
      const { data: rad, error } = await supabase.from('matvarer').select('*').eq('id', id).eq('bruker_id', userId).single()
      kast(error)
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
    mutationFn: async ({ userId, id, favoritt }: { userId: string; id: string; favoritt: boolean }) => {
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
    mutationFn: async ({ userId, id }: { userId: string; id: string }) => {
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
    mutationFn: async ({ userId, id }: { userId: string; id: string }) => {
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
      if (profil && Object.keys(profil).length) {
        const { error } = await supabase.from('profiler').update(profil).eq('id', userId)
        if (error) throw new Error(error.message)
      }
      const { error } = await supabase.from('ernaeringsmal').upsert({ bruker_id: userId, ...mal }, { onConflict: 'bruker_id' })
      kast(error)
    },
    onSuccess: (_d, { userId, mal }) => {
      qc.setQueryData(QKK.mal(userId), { bruker_id: userId, ...mal })
      qc.invalidateQueries({ queryKey: ['profil', userId] })
    },
    onSettled: (_d, _e, { userId }) => qc.invalidateQueries({ queryKey: QKK.mal(userId) }),
  })
}
