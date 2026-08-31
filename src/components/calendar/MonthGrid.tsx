import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task, CalendarEvent, Project } from '../../db/types'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, addWeeks, isSameMonth, isSameDay, fmt, WEEK_OPTS, WEEKDAYS_SHORT,
} from '../../lib/date'
import { groupTasksByDay, groupEventsByDay } from '../../lib/agenda'
import { cn } from '../../lib/cn'

interface Props {
  tasks: Task[]
  events: CalendarEvent[]
  projectsById: Map<string, Project>
  cursor: Date
  setCursor: (d: Date) => void
  selected: Date | null
  onSelect: (d: Date) => void
  mode: 'month' | 'week'
  setMode: (m: 'month' | 'week') => void
}

export function MonthGrid({ tasks, events, projectsById, cursor, setCursor, selected, onSelect, mode, setMode }: Props) {
  const byDay = useMemo(() => groupTasksByDay(tasks), [tasks])
  const evByDay = useMemo(() => groupEventsByDay(events), [events])

  const days = useMemo(() => {
    if (mode === 'week') {
      return eachDayOfInterval({ start: startOfWeek(cursor, WEEK_OPTS), end: endOfWeek(cursor, WEEK_OPTS) })
    }
    const gridStart = startOfWeek(startOfMonth(cursor), WEEK_OPTS)
    const gridEnd = endOfWeek(endOfMonth(cursor), WEEK_OPTS)
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursor, mode])

  const step = (dir: 1 | -1) =>
    setCursor(mode === 'week' ? addWeeks(cursor, dir) : addMonths(cursor, dir))

  return (
    <div className="flex h-full flex-col">
      {/* Навигация */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <button className="icon-btn" onClick={() => step(-1)}><ChevronLeft size={18} /></button>
        <div className="min-w-[160px] text-center text-base font-semibold capitalize">
          {fmt(cursor, mode === 'week' ? "d MMM yyyy" : 'LLLL yyyy')}
        </div>
        <button className="icon-btn" onClick={() => step(1)}><ChevronRight size={18} /></button>
        <button className="btn ml-1" onClick={() => setCursor(new Date())}>Сегодня</button>
        <div className="flex-1" />
        <div className="flex rounded-lg bg-surface-2 p-0.5 text-sm">
          <button className={cn('rounded-md px-2.5 py-1', mode === 'month' ? 'bg-surface-3 text-text' : 'text-muted')} onClick={() => setMode('month')}>Месяц</button>
          <button className={cn('rounded-md px-2.5 py-1', mode === 'week' ? 'bg-surface-3 text-text' : 'text-muted')} onClick={() => setMode('week')}>Неделя</button>
        </div>
      </div>

      {/* Заголовки дней */}
      <div className="grid grid-cols-7 border-b border-border pb-1 text-center text-xs text-faint">
        {WEEKDAYS_SHORT.map((d) => <div key={d}>{d}</div>)}
      </div>

      {/* Сетка */}
      <div className={cn('grid flex-1 grid-cols-7 gap-px overflow-y-auto', mode === 'month' ? 'auto-rows-fr' : '')}>
        {days.map((day) => {
          const key = day.getTime()
          const dayTasks = byDay.get(new Date(day).setHours(0, 0, 0, 0)) ?? []
          const dayEvents = evByDay.get(new Date(day).setHours(0, 0, 0, 0)) ?? []
          const outside = mode === 'month' && !isSameMonth(day, cursor)
          const today = isSameDay(day, new Date())
          const isSel = selected && isSameDay(day, selected)
          return (
            <button
              key={key}
              onClick={() => onSelect(day)}
              className={cn(
                'flex min-h-[84px] flex-col items-stretch gap-1 rounded-lg border border-transparent p-1.5 text-left transition-colors hover:bg-surface-2',
                outside && 'opacity-35',
                isSel && 'border-accent bg-accent-soft/40',
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  'grid h-6 w-6 place-items-center rounded-full text-xs',
                  today ? 'bg-accent font-semibold text-white' : 'text-muted',
                )}>
                  {fmt(day, 'd')}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <span key={e.id} className="truncate rounded bg-violet-500/20 px-1 text-[11px] text-violet-200">◷ {e.title}</span>
                ))}
                {dayTasks.slice(0, mode === 'week' ? 8 : 3).map((t) => {
                  const p = t.projectId ? projectsById.get(t.projectId) : undefined
                  return (
                    <span key={t.id} className={cn('flex items-center gap-1 truncate rounded px-1 text-[11px]', t.complete ? 'text-faint line-through' : 'text-muted')}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p?.color ?? '#6c8cff' }} />
                      {t.title || '(без названия)'}
                    </span>
                  )
                })}
                {dayTasks.length > (mode === 'week' ? 8 : 3) && (
                  <span className="px-1 text-[11px] text-faint">+{dayTasks.length - (mode === 'week' ? 8 : 3)}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
