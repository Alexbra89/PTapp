'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Save, Trash2, Edit2, ChevronDown, ChevronUp, Flame } from 'lucide-react'
import type { TreningsLogg, TreningsSett, OppvarmingType } from '@/types'

interface Props {
  dato: Date
  onTrainingChange: () => void
}

export default function DagVisning({ dato, onTrainingChange }: Props) {
  const [treninger, setTreninger] = useState<TreningsLogg[]>([])
  const [laster, setLaster] = useState(true)
  const [redigerer, setRedigerer] = useState<string | null>(null)
  const [nyOvelse, setNyOvelse] = useState('')
  const [visLeggTil, setVisLeggTil] = useState(false)
  const [oppvarming, setOppvarming] = useState<OppvarmingType[]>([])
  const [visOppvarming, setVisOppvarming] = useState(false)
  const supabase = createClient()

  const datoStreng = dato.toISOString().split('T')[0]
  const ukedag = dato.toLocaleDateString('no-NO', { weekday: 'long' })
  const formattedDato = dato.toLocaleDateString('no-NO', { 
    day: 'numeric', 
    month: 'long' 
  })

  useEffect(() => {
    hentTreninger()
  }, [datoStreng])

  const hentTreninger = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('treningslogger')
      .select('*')
      .eq('bruker_id', user.id)
      .eq('dato', datoStreng)
      .order('created_at', { ascending: true })

    if (data) {
      setTreninger(data as TreningsLogg[])
      // Hent oppvarming fra første trening (hvis finnes)
      if (data.length > 0 && data[0].oppvarming) {
        setOppvarming(data[0].oppvarming as OppvarmingType[])
      }
    }
    setLaster(false)
  }

  const leggTilOvelse = async () => {
    if (!nyOvelse.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const nyLogg = {
      bruker_id: user.id,
      dato: datoStreng,
      ovelse_navn: nyOvelse,
      ovelse_id: nyOvelse.toLowerCase().replace(/\s+/g, '-'),
      muskelgruppe: 'annet',
      sett: [{ reps: 10, vekt: 0, fullfort: false }],
      oppvarming: oppvarming,
      opprettet: new Date().toISOString()
    }

    const { error } = await supabase
      .from('treningslogger')
      .insert([nyLogg])

    if (!error) {
      setNyOvelse('')
      setVisLeggTil(false)
      hentTreninger()
      onTrainingChange()
    }
  }

  const oppdaterSett = async (loggId: string, settIndex: number, felt: keyof TreningsSett, verdi: any) => {
    const logg = treninger.find(t => t.id === loggId)
    if (!logg) return

    const oppdaterteSett = [...logg.sett]
    oppdaterteSett[settIndex] = { ...oppdaterteSett[settIndex], [felt]: verdi }

    const { error } = await supabase
      .from('treningslogger')
      .update({ sett: oppdaterteSett })
      .eq('id', loggId)

    if (!error) {
      hentTreninger()
    }
  }

  const leggTilSett = async (loggId: string) => {
    const logg = treninger.find(t => t.id === loggId)
    if (!logg) return

    const sisteSett = logg.sett[logg.sett.length - 1]
    const nyeSett = [
      ...logg.sett, 
      { reps: sisteSett?.reps || 10, vekt: sisteSett?.vekt || 0, fullfort: false }
    ]

    const { error } = await supabase
      .from('treningslogger')
      .update({ sett: nyeSett })
      .eq('id', loggId)

    if (!error) {
      hentTreninger()
    }
  }

  const fjernSett = async (loggId: string, settIndex: number) => {
    const logg = treninger.find(t => t.id === loggId)
    if (!logg) return

    const oppdaterteSett = logg.sett.filter((_, i) => i !== settIndex)

    const { error } = await supabase
      .from('treningslogger')
      .update({ sett: oppdaterteSett })
      .eq('id', loggId)

    if (!error) {
      hentTreninger()
    }
  }

  const slettOvelse = async (loggId: string) => {
    if (!confirm('Vil du slette denne øvelsen?')) return

    const { error } = await supabase
      .from('treningslogger')
      .delete()
      .eq('id', loggId)

    if (!error) {
      hentTreninger()
      onTrainingChange()
    }
  }

  const oppdaterOppvarming = async (type: OppvarmingType) => {
    let nyeOppvarming: OppvarmingType[]
    
    if (oppvarming.includes(type)) {
      nyeOppvarming = oppvarming.filter(t => t !== type)
    } else {
      nyeOppvarming = [...oppvarming, type]
    }
    
    setOppvarming(nyeOppvarming)

    // Oppdater første trening med oppvarming (eller legg til hvis ingen finnes)
    if (treninger.length > 0) {
      await supabase
        .from('treningslogger')
        .update({ oppvarming: nyeOppvarming })
        .eq('id', treninger[0].id)
    }
  }

  const oppvarmingsmuligheter = [
    { type: 'boksesekk' as OppvarmingType, navn: 'Boksesekk', ikon: '🥊', tid: '5-10 min' },
    { type: 'romaskin' as OppvarmingType, navn: 'Romaskin', ikon: '🚣', tid: '5-10 min' },
    { type: 'elipsemaskin' as OppvarmingType, navn: 'Ellipsemaskin', ikon: '🏃', tid: '5-10 min' },
    { type: 'tredemølle' as OppvarmingType, navn: 'Tredemølle', ikon: '🎽', tid: '5-10 min' },
  ]

  if (laster) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Dato-header */}
      <div className="border-b pb-3">
        <h2 className="text-xl font-semibold capitalize">
          {ukedag} {formattedDato}
        </h2>
        <p className="text-sm text-gray-500">
          {treninger.length} øvelser • {treninger.reduce((sum, t) => sum + t.sett.length, 0)} sett
        </p>
      </div>

      {/* Oppvarming */}
      <div className="bg-orange-50 rounded-lg p-3">
        <button
          onClick={() => setVisOppvarming(!visOppvarming)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-orange-500" />
            <span className="font-medium">Oppvarming</span>
            {oppvarming.length > 0 && (
              <span className="bg-orange-200 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                {oppvarming.length} valgt
              </span>
            )}
          </div>
          {visOppvarming ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {visOppvarming && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {oppvarmingsmuligheter.map(mulighet => (
              <button
                key={mulighet.type}
                onClick={() => oppdaterOppvarming(mulighet.type)}
                className={`
                  p-2 rounded-lg text-sm flex items-center gap-2 transition
                  ${oppvarming.includes(mulighet.type)
                    ? 'bg-orange-200 border-orange-300 border-2'
                    : 'bg-white border hover:bg-orange-100'
                  }
                `}
              >
                <span className="text-lg">{mulighet.ikon}</span>
                <div className="text-left">
                  <div>{mulighet.navn}</div>
                  <div className="text-xs text-gray-500">{mulighet.tid}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Øvelser */}
      <div className="space-y-3">
        {treninger.map((trening) => (
          <div key={trening.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{trening.ovelse_navn}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRedigerer(redigerer === trening.id ? null : trening.id)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <Edit2 size={16} className="text-gray-500" />
                </button>
                <button
                  onClick={() => slettOvelse(trening.id)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>

            {/* Sett */}
            <div className="space-y-2">
              {trening.sett.map((sett, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="w-8 text-gray-400">#{idx + 1}</span>
                  
                  <input
                    type="number"
                    value={sett.reps}
                    onChange={(e) => oppdaterSett(trening.id, idx, 'reps', parseInt(e.target.value) || 0)}
                    className="w-16 p-1 border rounded text-center"
                    min="0"
                  />
                  <span>reps</span>
                  
                  <span className="text-gray-300">×</span>
                  
                  <input
                    type="number"
                    value={sett.vekt}
                    onChange={(e) => oppdaterSett(trening.id, idx, 'vekt', parseInt(e.target.value) || 0)}
                    className="w-16 p-1 border rounded text-center"
                    min="0"
                    step="0.5"
                  />
                  <span>kg</span>

                  <button
                    onClick={() => fjernSett(trening.id, idx)}
                    className="ml-auto text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => leggTilSett(trening.id)}
              className="mt-2 text-blue-500 text-sm hover:underline flex items-center gap-1"
            >
              <Plus size={16} />
              Legg til sett
            </button>

            {/* Notat-felt (valgfritt) */}
            {redigerer === trening.id && (
              <div className="mt-3 pt-2 border-t">
                <textarea
                  placeholder="Notat til øvelsen..."
                  className="w-full p-2 text-sm border rounded"
                  rows={2}
                  value={trening.kommentar || ''}
                  onChange={async (e) => {
                    await supabase
                      .from('treningslogger')
                      .update({ kommentar: e.target.value })
                      .eq('id', trening.id)
                    hentTreninger()
                  }}
                />
              </div>
            )}
          </div>
        ))}

        {treninger.length === 0 && !visLeggTil && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">Ingen øvelser logget for denne dagen</p>
            <button
              onClick={() => setVisLeggTil(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Legg til første øvelse
            </button>
          </div>
        )}

        {/* Legg til ny øvelse */}
        {visLeggTil && (
          <div className="bg-blue-50 rounded-lg p-3">
            <input
              type="text"
              placeholder="Skriv øvelsesnavn..."
              value={nyOvelse}
              onChange={(e) => setNyOvelse(e.target.value)}
              className="w-full p-2 border rounded mb-2"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={leggTilOvelse}
                disabled={!nyOvelse.trim()}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Legg til
              </button>
              <button
                onClick={() => setVisLeggTil(false)}
                className="flex-1 btn-secondary"
              >
                Avbryt
              </button>
            </div>
          </div>
        )}

        {treninger.length > 0 && !visLeggTil && (
          <button
            onClick={() => setVisLeggTil(true)}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Legg til øvelse
          </button>
        )}
      </div>

      {/* Oppsummering */}
      {treninger.length > 0 && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium text-sm mb-2">📊 Dagens oppsummering</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Totale sett:</span>{' '}
              {treninger.reduce((sum, t) => sum + t.sett.length, 0)}
            </div>
            <div>
              <span className="text-gray-500">Totale reps:</span>{' '}
              {treninger.reduce((sum, t) => sum + t.sett.reduce((s, sett) => s + sett.reps, 0), 0)}
            </div>
            <div>
              <span className="text-gray-500">Total vekt:</span>{' '}
              {treninger.reduce((sum, t) => sum + t.sett.reduce((s, sett) => s + (sett.vekt * sett.reps), 0), 0)} kg
            </div>
            <div>
              <span className="text-gray-500">Øvelser:</span> {treninger.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}