import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, LayoutList, CalendarDays } from 'lucide-react'
import { db } from '../db/db'
import { useUI } from '../store/ui'
import { useTagMap, useProjectMap, useChecklistCounts } from '../lib/hooks'
import { FlatList } from '../components/tasks/FlatList'
import { MonthGrid } from '../components/calendar/MonthGrid'
import { sortTasks } from '../lib/sortTasks'
import { groupTasksByDay, taskDayTs } from '../lib/agenda'
import {
  startOfDay, addDays, addWeeks, startOfWeek, eachDayOfInterval,
  isSameDay, isToday, fmt, WEEK_OPTS,
} from '../lib/date'
import { cn } from '../lib/cn'

const AGENDA_DAYS = 14

export function PlannerView() {
  const sort = useUI((s) => s.sort)
  const tagsById = useTagMap()
  const projectsById = useProjectMap()
  const checklistCounts = useChecklistCounts()

  const [cursor, setCursor] = useState(startOfDay(new Date()))
  const [mode, setMode] = useState<'list' | 'calendar'>('list')

  const tasks = useLiveQuery(() => db.tasks.filter((t) => !t.removed).toArray(), []) ?? []
  const events = useLiveQuery(() => db.events.toArray(), []) ?? []

  const byDay = useMemo(() => groupTasksByDay(tasks), [tasks])

  // Просроченные незавершённые задачи (день < сегодня).
  const overdue = useMemo(() => {
    const today = startOfDay(new Date()).getTime()
    return tasks.filter((t) => !t.complete && (() => { const d = taskDayTs(t); return d != null && d < today })())
  }, [tasks])

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(cursor, WEEK_OPTS), end: addDays(startOfWeek(cursor, WEEK_OPTS), 6) }),
    [cursor],
  )

  const agendaDays = useMemo(
    () => Array.from({ length: AGENDA_DAYS }, (_, i) => addDays(cursor, i)),
    [cursor],
  )

  return (
    <div className="flex h-full flex-col">
      {/* Шапка: переключатель режима */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <button className="icon-btn" onClick={() => setCursor(addWeeks(cursor, -1))}><ChevronLeft size={18} /></button>
        <button className="btn" onClick={() => setCursor(startOfDay(new Date()))}>Сегодня</button>
        <button className="icon-btn" onClick={() => setCursor(addWeeks(cursor, 1))}><ChevronRight size={18} /></button>
        <div className="flex-1" />
        <div className="flex rounded-lg bg-surface-2 p-0.5">
          <button className={cn('icon-btn h-7 w-7', mode === 'list' && 'bg-surface-3 text-text')} onClick={() => setMode('list')} title="Список"><LayoutList size={16} /></button>
          <button className={cn('icon-btn h-7 w-7', mode === 'calendar' && 'bg-surface-3 text-text')} onClick={() => setMode('calendar')} title="Календарь"><CalendarDays size={16} /></button>
        </div>
      </div>

      {/* Лента дней недели */}
      <div className="grid grid-cols-7 gap-1 px-4 py-2">
        {weekDays.map((d) => {
          const count = (byDay.get(d.getTime()) ?? []).filter((t) => !t.complete).length
          const sel = isSameDay(d, cursor)
          return (
            <button
              key={d.getTime()}
              onClick={() => setCursor(startOfDay(d))}
              className={cn(
                'flex flex-col items-center rounded-xl border px-1 py-1.5 transition-colors',
                sel ? 'border-accent bg-accent-soft text-text' : 'border-border text-muted hover:bg-surface-2',
              )}
            >
              <span className="text-[11px] uppercase">{fmt(d, 'EEEEEE')}</span>
              <span className={cn('mt-0.5 grid h-7 w-7 place-items-center rounded-full text-sm', isToday(d) && !sel && 'bg-surface-3', isToday(d) && 'font-semibold')}>
                {fmt(d, 'd')}
              </span>
              <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', count ? 'bg-accent' : 'bg-transparent')} />
            </button>
          )
        })}
      </div>

      {mode === 'calendar' ? (
        <div className="min-h-0 flex-1 px-4 pb-3">
          <MonthGrid
            tasks={tasks} events={events} projectsById={projectsById}
            cursor={cursor} setCursor={setCursor}
            selected={cursor} onSelect={(d) => setCursor(startOfDay(d))}
            mode="month" setMode={() => {}}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="mx-auto max-w-3xl">
            {/* Просроченные */}
            {overdue.length > 0 && (
              <section className="mb-2">
                <div className="sticky top-0 z-10 -mx-1 bg-bg/90 px-1 py-1.5 text-sm font-semibold text-rose-300 backdrop-blur">
                  Просрочено · {overdue.length}
                </div>
                <FlatList tasks={overdue} tagsById={tagsById} projectsById={projectsById} checklistCounts={checklistCounts} sort={{ field: 'deadline', reverse: false }} />
              </section>
            )}

            {/* Лента дней */}
            {agendaDays.map((day) => {
              const list = (byDay.get(day.getTime()) ?? [])
              return (
                <section key={day.getTime()} className="mb-1">
                  <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-bg/90 px-1 py-1.5 backdrop-blur">
                    <span className={cn('text-sm font-semibold capitalize', isToday(day) ? 'text-accent' : 'text-text')}>
                      {isToday(day) ? 'Сегодня' : fmt(day, 'EEEE, d MMM')}
                    </span>
                    {list.length > 0 && <span className="text-xs text-faint">{list.filter((t) => !t.complete).length}</span>}
                  </div>
                  {list.length === 0 ? (
                    <div className="px-2 py-1 text-xs text-faint">-</div>
                  ) : (
                    <FlatList tasks={sortTasks(list, sort)} tagsById={tagsById} projectsById={projectsById} checklistCounts={checklistCounts} sort={sort} />
                  )}
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
