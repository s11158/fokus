import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useUI } from '../store/ui'
import { useTagMap, useProjectMap, useChecklistCounts } from '../lib/hooks'
import { MonthGrid } from '../components/calendar/MonthGrid'
import { FlatList } from '../components/tasks/FlatList'
import { fmt, isSameDay } from '../lib/date'
import { taskDayTs } from '../lib/agenda'

export function CalendarView() {
  const sort = useUI((s) => s.sort)
  const tagsById = useTagMap()
  const projectsById = useProjectMap()
  const checklistCounts = useChecklistCounts()
  const [cursor, setCursor] = useState(new Date())
  const [selected, setSelected] = useState<Date | null>(new Date())
  const [mode, setMode] = useState<'month' | 'week'>('month')

  const tasks = useLiveQuery(() => db.tasks.filter((t) => !t.removed).toArray(), []) ?? []
  const events = useLiveQuery(() => db.events.toArray(), []) ?? []

  const dayTasks = selected
    ? tasks.filter((t) => {
        const d = taskDayTs(t)
        return d != null && isSameDay(new Date(d), selected)
      })
    : []

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 px-3 py-3">
        <MonthGrid
          tasks={tasks}
          events={events}
          projectsById={projectsById}
          cursor={cursor}
          setCursor={setCursor}
          selected={selected}
          onSelect={setSelected}
          mode={mode}
          setMode={setMode}
        />
      </div>
      {selected && (
        <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-surface lg:flex">
          <div className="border-b border-border px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-faint">Выбранный день</div>
            <div className="text-base font-semibold capitalize">{fmt(selected, 'EEEE, d MMMM')}</div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {dayTasks.length === 0 ? (
              <div className="p-6 text-center text-sm text-faint">Нет задач на этот день.</div>
            ) : (
              <FlatList tasks={dayTasks} tagsById={tagsById} projectsById={projectsById} checklistCounts={checklistCounts} sort={sort} />
            )}
          </div>
        </aside>
      )}
    </div>
  )
}
