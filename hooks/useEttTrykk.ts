'use client'

import { useCallback, useRef } from 'react'
import { useSperre } from './useSperre'
import { useLoggMat } from './useKosthold'
import type { Logglinje } from '@/lib/kosthold/naering'

/**
 * Registrering med ett trykk («+ 60 g», «Min faste frokost») uten duplikater:
 *
 * 1. Sperre: samme handling kan ikke startes igjen mens den pågår, eller rett etter at den lyktes.
 * 2. Samme id-er ved nytt trykk etter feil: Hvis lagringen feilet, er det ikke sikkert at databasen
 *    ikke lagret – svaret kan ha gått tapt på vei tilbake. Linjene (med id) huskes derfor, og neste
 *    trykk på samme handling sender dem igjen. Databasen ignorerer id-er den allerede har
 *    («on conflict do nothing»), så resultatet blir én registrering uansett.
 *    Først når et forsøk har lyktes, lages nye id-er for neste (villede) registrering.
 *
 * Nøkkelen må beskrive hele handlingen (matvare/mal, dato og måltid), slik at en annen dag eller et
 * annet måltid aldri gjenbruker gamle linjer.
 */
export function useEttTrykk(pauseMs?: number) {
  const sperre = useSperre(pauseMs)
  const logg = useLoggMat()
  const uavklart = useRef(new Map<string, Logglinje[]>())

  const registrer = useCallback((
    nokkel: string,
    lagLinjer: () => Logglinje[],
    sted: { userId: string; malId?: string },
  ): Promise<Logglinje[]> | null => {
    return sperre.kjor(nokkel, async () => {
      const linjer = uavklart.current.get(nokkel) ?? lagLinjer()
      try {
        await logg.mutateAsync({ ...sted, linjer })
        uavklart.current.delete(nokkel)
        return linjer
      } catch (e) {
        uavklart.current.set(nokkel, linjer)
        throw e
      }
    })
  }, [sperre, logg])

  return { registrer, laast: sperre.laast }
}
