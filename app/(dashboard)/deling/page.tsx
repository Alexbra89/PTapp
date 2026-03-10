'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Share2, Users, Mail, Check, Copy, Eye, EyeOff, UserPlus } from 'lucide-react'

interface Bruker {
  id: string
  navn: string
  epost: string
  kanDele: boolean
  delerMedMeg: boolean
}

export default function DelingSide() {
  const [brukere, setBrukere] = useState<Bruker[]>([])
  const [minId, setMinId] = useState('')
  const [laster, setLaster] = useState(true)
  const [epostForInvitasjon, setEpostForInvitasjon] = useState('')
  const [kopiert, setKopiert] = useState(false)
  const [delingsLenke, setDelingsLenke] = useState('')
  const supabase = createClient()

  useEffect(() => {
    hentBrukere()
    genererDelingsLenke()
  }, [])

  const hentBrukere = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setMinId(user.id)

    // Hent alle profiler (i en real app ville du bare hentet de du kan dele med)
    const { data: profiler } = await supabase
      .from('profiler')
      .select('id, navn, epost, can_share_with')

    if (profiler) {
      const formaterteBrukere = profiler
        .filter(p => p.id !== user.id) // Ikke inkluder deg selv
        .map(p => ({
          id: p.id,
          navn: p.navn || 'Ukjent',
          epost: p.epost,
          kanDele: p.can_share_with?.includes(user.id) || false,
          delerMedMeg: false // Dette må hentes fra en egen tabell i produksjon
        }))
      setBrukere(formaterteBrukere)
    }

    setLaster(false)
  }

  const genererDelingsLenke = () => {
    // Generer en unik lenke (i produksjon ville du lagret denne i databasen)
    const lenke = `${window.location.origin}/delt/${Math.random().toString(36).substring(7)}`
    setDelingsLenke(lenke)
  }

  const toggleDeling = async (brukerId: string, del: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Hent nåværende profiler
    const { data: minProfil } = await supabase
      .from('profiler')
      .select('can_share_with')
      .eq('id', user.id)
      .single()

    let oppdatertListe = minProfil?.can_share_with || []

    if (del) {
      oppdatertListe = [...oppdatertListe, brukerId]
    } else {
      oppdatertListe = oppdatertListe.filter((id: string) => id !== brukerId)
    }

    // Oppdater i databasen
    await supabase
      .from('profiler')
      .update({ can_share_with: oppdatertListe })
      .eq('id', user.id)

    // Oppdater lokal state
    setBrukere(prev => prev.map(b => 
      b.id === brukerId ? { ...b, kanDele: del } : b
    ))
  }

  const kopierLenke = () => {
    navigator.clipboard.writeText(delingsLenke)
    setKopiert(true)
    setTimeout(() => setKopiert(false), 2000)
  }

  const sendInvitasjon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!epostForInvitasjon) return

    // I produksjon ville du sendt en epost via en edge function
    alert(`Invitasjon sendt til ${epostForInvitasjon}! (Simulert)`)
    setEpostForInvitasjon('')
  }

  if (laster) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Share2 className="text-green-500" />
          Deling
        </h1>
        <p className="text-gray-600 mt-1">
          Del dine treningsøkter med familie og venner
        </p>
      </div>

      {/* Din delingslenke */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">🔗 Din personlige delingslenke</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={delingsLenke}
            readOnly
            className="input flex-1 bg-gray-50"
          />
          <button
            onClick={kopierLenke}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {kopiert ? <Check size={18} /> : <Copy size={18} />}
            {kopiert ? 'Kopiert!' : 'Kopier'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Del denne lenken med andre så de kan se dine treningsøkter
        </p>
      </div>

      {/* Inviter via epost */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Mail size={18} className="text-blue-500" />
          Inviter via epost
        </h2>
        <form onSubmit={sendInvitasjon} className="flex gap-2">
          <input
            type="email"
            value={epostForInvitasjon}
            onChange={(e) => setEpostForInvitasjon(e.target.value)}
            placeholder="epost@example.com"
            className="input flex-1"
          />
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus size={18} />
            Inviter
          </button>
        </form>
      </div>

      {/* Brukere du kan dele med */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users size={18} className="text-purple-500" />
          Brukere i appen
        </h2>

        <div className="space-y-3">
          {brukere.map(bruker => (
            <div key={bruker.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {bruker.navn.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{bruker.navn}</p>
                  <p className="text-sm text-gray-500">{bruker.epost}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Status: Deler med meg */}
                {bruker.delerMedMeg && (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <Eye size={16} />
                    Deler med deg
                  </div>
                )}

                {/* Mine delingsinnstillinger */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-gray-600">
                    {bruker.kanDele ? 'Deler' : 'Ikke del'}
                  </span>
                  <button
                    onClick={() => toggleDeling(bruker.id, !bruker.kanDele)}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition
                      ${bruker.kanDele ? 'bg-green-500' : 'bg-gray-300'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition
                        ${bruker.kanDele ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </label>
              </div>
            </div>
          ))}

          {brukere.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              Ingen andre brukere funnet
            </p>
          )}
        </div>
      </div>

      {/* Delingsinnstillinger */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">⚙️ Delingsinnstillinger</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium">Synlighet for andre</p>
              <p className="text-sm text-gray-500">Hvem kan se dine økter som standard</p>
            </div>
            <select className="input w-auto">
              <option>Kun de jeg deler med</option>
              <option>Alle i appen</option>
              <option>Ingen</option>
            </select>
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium">Vis personlige rekorder</p>
              <p className="text-sm text-gray-500">La andre se dine PR'er</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500">
              <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white" />
            </button>
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium">Vis statistikk</p>
              <p className="text-sm text-gray-500">Del din fremgang med andre</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500">
              <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white" />
            </button>
          </label>
        </div>
      </div>

      {/* Hvem som deler med deg */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Eye className="text-blue-500" size={18} />
          Deler med deg
        </h2>
        <div className="space-y-2">
          {brukere.filter(b => b.delerMedMeg).length > 0 ? (
            brukere.filter(b => b.delerMedMeg).map(bruker => (
              <div key={bruker.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm">
                  {bruker.navn.charAt(0)}
                </div>
                <span>{bruker.navn}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">Ingen deler med deg enda</p>
          )}
        </div>
      </div>
    </div>
  )
}