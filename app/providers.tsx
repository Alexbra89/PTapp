'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:            60 * 1000,  // Data er "fersk" i 1 min
        gcTime:         5 * 60 * 1000,    // Behold i cache 5 min etter siste bruk
        retry:                1,
        refetchOnWindowFocus: false,      // Ikke refetch ved tab-bytte
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
