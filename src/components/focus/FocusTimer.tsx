import { useLiveQuery } from 'dexie-react-hooks'
import { Play, Pause, RotateCcw, X, Link2, Link2Off } from 'lucide-react'
import { db } from '../../db/db'
import { useFocus, FOCUS_PRESETS } from '../../store/focus'
import { useUI } from '../../store/ui'
import { todayKey } from '../../lib/date'
import { cn } from '../../lib/cn'

function fmtClock(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function FocusTimer() {
  const f = useFocus()
  const selectedTaskId = useUI((s) => s.selectedTaskId)
  const selectedTask = useLiveQuery(
    async () => (selectedTaskId ? await db.tasks.get(selectedTaskId) : undefined),
    [selectedTaskId],
  )

  const stats = useLiveQuery(async () => {
    const today = todayKey()
    const sessions = await db.focusSessions.where('date').equals(today).toArray()
    const focus = sessions.filter((s) => s.type === 'focus')
    return { count: focus.length, minutes: Math.round(focus.reduce((a, s) => a + s.duration, 0) / 60) }
  }, [f.completed])

  if (!f.open) return null

  const total = f.preset * 60
  const progress = total > 0 ? 1 - f.remaining / total : 0
  const R = 86
  const C = 2 * Math.PI * R
  const offset = C * (1 - progress)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => f.setOpen(false)}>
      <div
        className="w-[360px] rounded-2xl border border-border bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Фокус · Pomodoro</h2>
          <button className="icon-btn" onClick={() => f.setOpen(false)}><X size={18} /></button>
        </div>

        {/* Круговой отсчёт */}
        <div className="relative mx-auto my-2 grid h-[200px] w-[200px] place-items-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={R} fill="none" stroke="#272c37" strokeWidth="10" />
            <circle
              cx="100" cy="100" r={R} fill="none" stroke="#6c8cff" strokeWidth="10"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="text-center">
            <div className="text-4xl font-semibold tabular-nums tracking-tight">{fmtClock(f.remaining)}</div>
            <div className="mt-1 text-xs text-faint">{f.running ? 'идёт фокус' : 'пауза'}</div>
          </div>
        </div>

        {/* Пресеты */}
        <div className="my-3 flex flex-wrap justify-center gap-1.5">
          {FOCUS_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => f.setPreset(p)}
              disabled={f.running}
              className={cn(
                'h-8 w-10 rounded-lg border text-sm transition-colors disabled:opacity-40',
                f.preset === p ? 'border-accent bg-accent-soft text-text' : 'border-border text-muted hover:bg-surface-3',
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Управление */}
        <div className="flex items-center justify-center gap-2">
          {f.running ? (
            <button className="btn bg-surface-3 px-4 py-2 text-text" onClick={f.pause}><Pause size={16} /> Пауза</button>
          ) : (
            <button className="btn btn-accent px-4 py-2" onClick={f.start}><Play size={16} /> Старт</button>
          )}
          <button className="icon-btn" title="Сброс" onClick={f.reset}><RotateCcw size={18} /></button>
        </div>

        {/* Привязка к задаче */}
        <div className="mt-4 rounded-xl bg-surface-2 p-3">
          {f.taskId ? (
            <div className="flex items-center gap-2 text-sm">
              <Link2 size={15} className="text-accent" />
              <span className="flex-1 truncate">{f.taskTitle}</span>
              <button className="icon-btn h-6 w-6" title="Отвязать" onClick={() => f.bindTask(null, null)}><Link2Off size={14} /></button>
            </div>
          ) : selectedTask ? (
            <button
              className="flex w-full items-center gap-2 text-sm text-muted hover:text-text"
              onClick={() => f.bindTask(selectedTask.id, selectedTask.title)}
            >
              <Link2 size={15} /> Привязать к: <span className="truncate font-medium">{selectedTask.title || '(без названия)'}</span>
            </button>
          ) : (
            <p className="text-xs text-faint">Откройте задачу, чтобы привязать сессию к ней.</p>
          )}
        </div>

        {/* Статистика дня */}
        <div className="mt-3 flex justify-center gap-6 text-center text-sm">
          <div>
            <div className="text-lg font-semibold">{stats?.count ?? 0}</div>
            <div className="text-xs text-faint">🍅 сегодня</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{stats?.minutes ?? 0}</div>
            <div className="text-xs text-faint">минут фокуса</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{f.completed}</div>
            <div className="text-xs text-faint">за сессию</div>
          </div>
        </div>
      </div>
    </div>
  )
}
