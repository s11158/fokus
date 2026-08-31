import { Flag, Pin } from 'lucide-react'
import { cn } from '../../lib/cn'
import { humanDate, isOverdue } from '../../lib/date'
import type { Priority, Tag } from '../../db/types'

const PRIORITY_COLOR: Record<Priority, string> = {
  0: 'text-faint',
  1: 'text-sky-400',
  2: 'text-amber-400',
  3: 'text-rose-400',
}
export const PRIORITY_LABEL: Record<Priority, string> = {
  0: 'Без приоритета',
  1: 'Низкий',
  2: 'Средний',
  3: 'Высокий',
}

export function PriorityFlag({ value, className }: { value: Priority; className?: string }) {
  if (!value) return null
  return <Flag size={14} className={cn(PRIORITY_COLOR[value], 'fill-current', className)} />
}

export function PinMark() {
  return <Pin size={13} className="text-amber-400 fill-current" />
}

export function DateBadge({ ts, withTime, kind = 'start' }: { ts: number; withTime?: boolean; kind?: 'start' | 'deadline' }) {
  const over = kind === 'deadline' && isOverdue(ts)
  return (
    <span
      className={cn(
        'chip',
        over ? 'bg-rose-500/15 text-rose-300' : 'bg-surface-3 text-muted',
      )}
    >
      {kind === 'deadline' ? '⚑ ' : ''}
      {humanDate(ts, withTime)}
    </span>
  )
}

export function TagChip({ tag, onClick }: { tag: Tag; onClick?: () => void }) {
  return (
    <span
      onClick={onClick}
      className="chip"
      style={{ background: tag.color + '22', color: tag.color }}
    >
      #{tag.title}
    </span>
  )
}

export function Checkbox({
  checked,
  onChange,
  priority = 0,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  priority?: Priority
}) {
  const ring = ['border-faint', 'border-sky-400', 'border-amber-400', 'border-rose-400'][priority]
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      className={cn(
        'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border-2 transition-colors',
        checked ? 'border-accent bg-accent text-white' : cn(ring, 'hover:bg-surface-3'),
      )}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
