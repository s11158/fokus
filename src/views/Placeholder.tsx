import { Construction } from 'lucide-react'

export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-faint">
      <Construction size={40} strokeWidth={1.4} />
      <div className="text-base font-medium text-muted">{title}</div>
      <p className="max-w-xs text-sm">{note}</p>
    </div>
  )
}
