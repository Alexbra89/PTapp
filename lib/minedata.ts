import { createClient } from '@/lib/supabase/client'

// Alt brukeren eier, som én JSON-fil (retten til innsyn/dataportabilitet).
// Hver spørring filtreres på egen id – delt innsyn gjør at andres rader ellers også kunne komme med.
const TABELLER: [string, string][] = [
  ['okter', 'bruker_id'], ['treningslogger', 'bruker_id'], ['pr_rekorder', 'bruker_id'],
  ['vektlogg', 'bruker_id'], ['favoritt_ovelser', 'bruker_id'], ['treningsprogrammer', 'bruker_id'],
  ['bruker_ovelser', 'bruker_id'],
]

export async function hentMineData() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Ikke innlogget')
  const { data: profil } = await supabase.from('profiler').select('*').eq('id', user.id).maybeSingle()
  const ut: Record<string, unknown> = {
    eksportert: new Date().toISOString(),
    konto: { id: user.id, epost: user.email, opprettet: user.created_at },
    profil,
  }
  for (const [tabell, eier] of TABELLER) {
    const { data, error } = await supabase.from(tabell).select('*').eq(eier, user.id)
    ut[tabell] = error ? { feil: 'Kunne ikke hentes' } : data
  }
  return ut
}

export async function lastNedMineData() {
  const data = await hentMineData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `ab-pt-mine-data-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
