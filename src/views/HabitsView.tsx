import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2, Flame } from 'lucide-react'
import { db } from '../db/db'
import { createHabit, removeHabit, updateHabit, setHabitProgress } from '../db/repo'
import { addDays, startOfDay, todayKey, fmt } from '../lib/date'
import { computeStreak, isScheduled } from '../lib/habits'
import { cn } from '../lib/cn'
import { ViewShell, EmptyState } from './shell'
import type { Habit } from '../db/types'

export function HabitsView() {
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.archived).toArray(), [])
  const progress = useLiveQuery(() => db.habitProgress.toArray(), [])

  // Последние 7 дней (старое, затем новое).
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => startOfDay(addDays(new Date(), i - 6))),
    [],
  )

  const doneByHabit = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const p of progress ?? []) {
      if (p.value <= 0) continue
      const set = map.get(p.habitId) ?? new Set<string>()
      set.add(p.date)
      map.set(p.habitId, set)
    }
    return map
  }, [progress])

  const sorted = (habits ?? []).slice().sort((a, b) => a.order - b.order)

  return (
    <ViewShell>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-lg font-semibold">Привычки</h2>
        <button className="btn btn-accent" onClick={() => createHabit()}><Plus size={16} /> Привычка</button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState text="Пока нет привычек. Добавьте первую - например, «Зарядка» или «Чтение»." />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((h) => {
            const done = doneByHabit.get(h.id) ?? new Set<string>()
            const streak = computeStreak(h, done)
            const todayDone = done.has(todayKey())
            return (
              <div key={h.id} className="rounded-xl border border-border bg-surface-2/50 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: h.color }} />
                  <input
                    value={h.title}
                    onChange={(e) => updateHabit(h.id, { title: e.target.value })}
                    className="input flex-1 text-sm font-medium"
                  />
                  <span className={cn('chip', streak > 0 ? 'bg-orange-500/15 text-orange-300' : 'bg-surface-3 text-faint')}>
                    <Flame size={12} /> {streak}
                  </span>
                  <button
                    className="icon-btn h-7 w-7 hover:text-rose-400"
                    onClick={() => { if (confirm(`Удалить привычку «${h.title}»?`)) removeHabit(h.id) }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Неделя */}
                <div className="mt-2.5 flex items-center gap-1.5 pl-5">
                  {days.map((d) => {
                    const key = todayKey(d)
                    const isDone = done.has(key)
                    const scheduled = isScheduled(h, d)
                    const isToday = key === todayKey()
                    return (
                      <button
                        key={key}
                        disabled={!scheduled}
                        onClick={() => setHabitProgress(h.id, key, isDone ? 0 : h.target)}
                        title={fmt(d, 'EEEE, d MMM')}
                        className={cn(
                          'flex h-9 w-9 flex-col items-center justify-center rounded-lg border text-[11px] transition-colors disabled:opacity-30',
                          isDone ? 'border-transparent text-white' : 'border-border text-muted hover:bg-surface-3',
                          isToday && !isDone && 'border-accent',
                        )}
                        style={isDone ? { background: h.color } : undefined}
                      >
                        <span>{fmt(d, 'EEEEEE')}</span>
                        <span className="font-semibold">{fmt(d, 'd')}</span>
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setHabitProgress(h.id, todayKey(), todayDone ? 0 : h.target)}
                    className={cn(
                      'ml-auto rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      todayDone ? 'bg-surface-3 text-muted' : 'btn-accent',
                    )}
                  >
                    {todayDone ? 'Сегодня ✓' : 'Отметить'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ViewShell>
  )
}
