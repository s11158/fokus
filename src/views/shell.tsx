import { Inbox } from 'lucide-react'

// Общая обёртка представления: прокручиваемый список + (опц.) закреплённый композер.
export function ViewShell({ children, composer }: { children: React.ReactNode; composer?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto max-w-3xl">{children}</div>
      </div>
      {composer && <div className="mx-auto w-full max-w-3xl shrink-0">{composer}</div>}
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-faint">
      <Inbox size={40} strokeWidth={1.4} />
      <p className="text-sm">{text}</p>
    </div>
  )
}
