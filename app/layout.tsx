import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Treningsapp',
  description: 'Din personlige treningsapp',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>
        <div>  {/* VIKTIG: wrapper */}
          {children}
        </div>
      </body>
    </html>
  )
}