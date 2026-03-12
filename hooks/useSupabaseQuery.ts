'use client'

/**
 * Sentral cache-konfigurasjon for React Query + Supabase
 * Importeres i alle sider som trenger data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks } from 'date-fns'

const supabase = createClient()

// ── Cache-nøkler ────────────────────────────────────────────────────────────────
export const QK = {
  profil:       (userId: string) => ['profil', userId],
  okterManed:   (userId: string, maned: string) => ['okter', userId, maned],
  okterIdag:    (userId: string, dato: string)  => ['okterIdag', userId, dato],
  stats:        (userId: string) => ['stats', userId],
  aktivitet:    (userId: string) => ['aktivitet', userId],
  muskelfokus:  (userId: string) => ['muskelfokus', userId],
  streak:       (userId: string) => ['streak', userId],
  vektlogg:     (userId: string) => ['vektlogg', userId],
} as const

// ── Hent gjeldende bruker (caches i 10 min) ────────────────────────────────────
export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn:  async () => {
      // Prøv session først (synkron) — fall tilbake på getUser (nettverkskall)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) return session.user
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    staleTime: 10 * 60 * 1000,
    gcTime:    15 * 60 * 1000,
    // Ikke vis loading-tilstand ved første render — vent på data stille
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })
}

// ── Profil (caches i 5 min) ────────────────────────────────────────────────────
export function useProfil(userId?: string) {
  return useQuery({
    queryKey: QK.profil(userId ?? ''),
    enabled:  !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn:  async () => {
      const { data } = await supabase
        .from('profiler')
        .select('id, epost, navn, vekt, hoyde, mal, onsket_vekt')
        .eq('id', userId!)
        .single()
      return data
    },
  })
}

// ── Dagensøkter (caches i 2 min) ───────────────────────────────────────────────
export function useDagensOkter(userId?: string, dato?: string) {
  return useQuery({
    queryKey: QK.okterIdag(userId ?? '', dato ?? ''),
    enabled:  !!userId && !!dato,
    staleTime: 2 * 60 * 1000,
    queryFn:  async () => {
      const { data } = await supabase
        .from('okter')
        .select('id, tittel, type, varighet_min')
        .eq('bruker_id', userId!)
        .eq('dato', dato!)
        .order('created_at', { ascending: true })
      return data ?? []
    },
  })
}

// ── Måneds-økter for kalender (caches i 3 min) ─────────────────────────────────
export function useOkterManed(userId?: string, maned?: Date) {
  const manadKey = maned ? format(maned, 'yyyy-MM') : ''
  return useQuery({
    queryKey: QK.okterManed(userId ?? '', manadKey),
    enabled:  !!userId && !!maned && userId !== '',
    staleTime: 3 * 60 * 1000,
    queryFn:  async () => {
      const fra = format(startOfMonth(maned!), 'yyyy-MM-dd')
      const til = format(endOfMonth(maned!),   'yyyy-MM-dd')
      const { data } = await supabase
        .from('okter')
        .select('id, dato, tittel, type, varighet_min, notater, ovelser')
        .eq('bruker_id', userId!)
        .gte('dato', fra)
        .lte('dato', til)
        .order('dato')
      return data ?? []
    },
  })
}

// ── Statistikk (caches i 5 min) ────────────────────────────────────────────────
export function useStats(userId?: string) {
  return useQuery({
    queryKey: QK.stats(userId ?? ''),
    enabled:  !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn:  async () => {
      const [
        { count: totalOkter },
        { data: logger },
        { data: dAll },
        { count: ukeMaal },
      ] = await Promise.all([
        supabase.from('okter')
          .select('*', { count: 'exact', head: true })
          .eq('bruker_id', userId!),

        supabase.from('treningslogger')
          .select('sett, muskelgruppe')
          .eq('bruker_id', userId!),

        supabase.from('okter')
          .select('dato')
          .eq('bruker_id', userId!)
          .order('dato', { ascending: false })
          .limit(60),

        supabase.from('okter')
          .select('*', { count: 'exact', head: true })
          .eq('bruker_id', userId!)
          .gte('dato', format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')),
      ])

      // Streak
      const dSet = new Set((dAll ?? []).map((d: any) => d.dato))
      let streak = 0
      const today = new Date(); today.setHours(0,0,0,0)
      for (let i = 0; i < 60; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i)
        if (dSet.has(d.toISOString().split('T')[0])) streak++
        else if (i > 0) break
      }

      // Total kg løftet
      const totalKg = (logger ?? []).reduce((s: number, l: any) =>
        s + (l.sett ?? []).reduce((ss: number, set: any) =>
          ss + (set.vekt ?? 0) * (set.reps ?? 0), 0), 0)

      // Muskelfokus
      const mMap: Record<string, number> = {}
      ;(logger ?? []).forEach((l: any) => {
        const g = l.muskelgruppe ?? 'annet'
        mMap[g] = (mMap[g] ?? 0) + 1
      })
      const muskelfokus = Object.entries(mMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([gruppe, okter]) => ({ gruppe, okter }))

      return {
        totalOkter: totalOkter ?? 0,
        totalKg:    Math.round(totalKg),
        streak,
        ukeMaal:    ukeMaal ?? 0,
        muskelfokus,
      }
    },
  })
}

// ── Ukentlig aktivitet (caches i 10 min) ───────────────────────────────────────
export function useAktivitet(userId?: string) {
  return useQuery({
    queryKey: QK.aktivitet(userId ?? ''),
    enabled:  !!userId,
    staleTime: 10 * 60 * 1000,
    queryFn:  async () => {
      const uker: any[] = []
      for (let i = 6; i >= 0; i--) {
        const fra = format(startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const til = format(endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const { count } = await supabase.from('okter')
          .select('*', { count: 'exact', head: true })
          .eq('bruker_id', userId!)
          .gte('dato', fra)
          .lte('dato', til)
        uker.push({ uke: `U${format(subWeeks(new Date(), i), 'w')}`, okter: count ?? 0 })
      }
      return uker
    },
  })
}

// ── Vektlogg — localStorage + profil ──────────────────────────────────────────
export function useVektlogg(userId?: string, profilVekt?: number) {
  return useQuery({
    queryKey: QK.vektlogg(userId ?? ''),
    enabled:  !!userId,
    staleTime: 2 * 60 * 1000,
    queryFn:  async () => {
      const key  = `vektlogg_${userId}`
      const lokal: { dato: string; vekt: number }[] =
        JSON.parse(localStorage.getItem(key) ?? '[]')
      if (lokal.length === 0 && profilVekt) {
        const start = [{ dato: format(new Date(), 'yyyy-MM-dd'), vekt: profilVekt }]
        localStorage.setItem(key, JSON.stringify(start))
        return start
      }
      return lokal
    },
  })
}

// ── Mutasjoner ─────────────────────────────────────────────────────────────────

export function useLagreOkt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      userId: string; dato: string; tittel: string
      type: string; varighet_min: number; notater: string
      id?: string
    }) => {
      const { id, userId, ...rest } = payload
      if (id) {
        const { data, error } = await supabase
          .from('okter').update(rest).eq('id', id).select().single()
        if (error) throw new Error(error.message)
        return { ...data, _isEdit: true }
      } else {
        const { data, error } = await supabase
          .from('okter')
          .insert([{ ...rest, bruker_id: userId, ovelser: [] }])
          .select().single()
        if (error) throw new Error(error.message)
        return data
      }
    },
    onSuccess: (nyOkt: any, v) => {
      const manadKey = v.dato.slice(0, 7)
      const qKey = QK.okterManed(v.userId, manadKey)
      qc.setQueryData(qKey, (gammel: any[] = []) => {
        if (nyOkt._isEdit) {
          return gammel.map((o: any) => o.id === nyOkt.id ? { ...o, ...nyOkt } : o)
        }
        const uten = gammel.filter((o: any) => o.id !== nyOkt.id)
        return [...uten, nyOkt].sort((a: any, b: any) => a.dato.localeCompare(b.dato))
      })
      qc.invalidateQueries({ queryKey: QK.okterIdag(v.userId, v.dato) })
      qc.invalidateQueries({ queryKey: QK.stats(v.userId) })
    },
  })
}

export function useSlettOkt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string; maned: string; dato: string }) => {
      const { error } = await supabase.from('okter').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (v) => {
      // Fjern fra cache FØR nettverkskallet — umiddelbar UI-oppdatering
      const qKey = QK.okterManed(v.userId, v.maned)
      await qc.cancelQueries({ queryKey: qKey })
      const forrige = qc.getQueryData(qKey)
      qc.setQueryData(qKey, (gammel: any[] = []) =>
        gammel.filter((o: any) => o.id !== v.id)
      )
      return { forrige, qKey }
    },
    onError: (_, __, ctx: any) => {
      // Rull tilbake ved feil
      if (ctx?.forrige) qc.setQueryData(ctx.qKey, ctx.forrige)
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: QK.okterIdag(v.userId, v.dato) })
      qc.invalidateQueries({ queryKey: QK.stats(v.userId) })
    },
  })
}

export function useLagreProfil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id: string; epost: string; navn: string
      vekt: number; hoyde: number; mal: string; onsket_vekt: number
    }) => {
      const { error } = await supabase
        .from('profiler')
        .upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(error.message)
      return payload
    },
    onSuccess: (data) => {
      // Oppdater cache umiddelbart uten ny fetch
      qc.setQueryData(QK.profil(data.id), data)
      qc.invalidateQueries({ queryKey: QK.stats(data.id) })
    },
  })
}

export function useLoggVekt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId, vekt, vektLogger,
    }: { userId: string; vekt: number; vektLogger: { dato: string; vekt: number }[] }) => {
      const ny = { dato: format(new Date(), 'yyyy-MM-dd'), vekt }
      const oppdatert = [...vektLogger.filter(v => v.dato !== ny.dato), ny]
        .sort((a, b) => a.dato.localeCompare(b.dato))
      localStorage.setItem(`vektlogg_${userId}`, JSON.stringify(oppdatert))
      await supabase.from('profiler').update({ vekt }).eq('id', userId)
      return oppdatert
    },
    onSuccess: (data, { userId }) => {
      qc.setQueryData(QK.vektlogg(userId), data)
      qc.invalidateQueries({ queryKey: QK.profil(userId) })
    },
  })
}