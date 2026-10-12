import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

type Type = 'info' | 'advarsel' | 'feil' | 'ok'
const IKON = { info: Info, advarsel: AlertTriangle, feil: XCircle, ok: CheckCircle2 }

export default function Melding({ type = 'info', children }: { type?: Type; children: React.ReactNode }) {
  const Ikon = IKON[type]
  return (
    <div className={`ko-melding ${type}`} role={type === 'feil' ? 'alert' : 'status'}>
      <Ikon size={16} strokeWidth={1.6} aria-hidden />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  )
}
