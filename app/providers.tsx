'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:            60 * 1000,
        gcTime:         5 * 60 * 1000,
        retry:                1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  useEffect(() => {
    const supabase = createClient()

    // Seed React Query-cache med bruker fra session – skjer synkront fra localStorage
    // Dette gjør at useUser() returnerer data umiddelbart på første render
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        queryClient.setQueryData(['user'], session.user)
      }
    })

    // Lytt på auth-endringer (login/logout) og hold cache oppdatert
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(['user'], session?.user ?? null)
      if (!session) {
        // Tøm all bruker-data fra cache ved logout
        queryClient.clear()
      }
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
