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

  // Les session synkront fra localStorage FØR getSession() async-kallet
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (key) {
      const parsed = JSON.parse(localStorage.getItem(key) ?? '{}')
      if (parsed?.user) queryClient.setQueryData(['user'], parsed.user)
    }
  } catch {}

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) queryClient.setQueryData(['user'], session.user)
  })

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    queryClient.setQueryData(['user'], session?.user ?? null)
    if (!session) queryClient.clear()
  })

  return () => subscription.unsubscribe()
}, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
