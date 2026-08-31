import { useLiveQuery } from 'dexie-react-hooks'
import { Search, LayoutList, Trello, ArrowUpDown, Timer, Sparkles } from 'lucide-react'
import { db } from '../../db/db'
import { useUI } from '../../store/ui'
import { useFocus } from '../../store/focus'
import { useCapture } from '../../store/capture'
import { cn } from '../../lib/cn'
import type { SortField } from '../../store/ui'

const TITLES: Record<string, string> = {
  inbox: 'Входящие',
  today: 'Сегодня',
  planner: 'Планы',
  someday: 'Когда-нибудь',
  calendar: 'Календарь',
  trash: 'Корзина',
}

const SORTS: { field: SortField; label: string }[] = [
  { field: 'manual', label: 'Вручную' },
  { field: 'priority', label: 'Приоритет' },
  { field: 'start', label: 'Дата' },
  { field: 'deadline', label: 'Дедлайн' },
  { field: 'alpha', label: 'Алфавит' },
  { field: 'smart', label: 'Умная' },
]

export function TopBar() {
  const { view, search, setSearch, projectMode, setProjectMode, sort, setSort } = useUI()
  const focus = useFocus()
  const openCapture = useCapture((s) => s.setOpen)

  const project = useLiveQuery(
    async () => (view.kind === 'project' ? await db.projects.get(view.projectId) : undefined),
    [view],
  )

  const title =
    view.kind === 'project' ? project?.title ?? 'Проект' : TITLES[view.kind] ?? ''

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/60 px-4 backdrop-blur">
      <h1 className="flex items-center gap-2 truncate text-lg font-semibold">
        {view.kind === 'project' && project && (
          <span>{project.emoji || ''}</span>
        )}
        <span className="truncate">{title}</span>
      </h1>

      <div className="flex-1" />

      <div className="relative w-64 max-w-[40vw]">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
        <input
          className="input rounded-lg bg-surface-2 py-1.5 pl-8 pr-3 text-sm"
          placeholder="Поиск задач…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Быстрый захват */}
      <button className="btn btn-accent" title="Быстрый захват (Ctrl/⌘+Shift+A)" onClick={() => openCapture(true)}>
        <Sparkles size={16} /> Захват
      </button>

      {/* Таймер фокуса */}
      <button
        className={cn('icon-btn relative', focus.running && 'text-accent')}
        title="Фокус · Pomodoro"
        onClick={() => focus.setOpen(true)}
      >
        <Timer size={18} />
        {focus.running && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" />}
      </button>

      {/* Сортировка */}
      <div className="group relative">
        <button className="icon-btn" title="Сортировка"><ArrowUpDown size={18} /></button>
        <div className="invisible absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-border bg-surface-2 p-1 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
          {SORTS.map((s) => (
            <button
              key={s.field}
              onClick={() => setSort({ field: s.field, reverse: sort.field === s.field ? !sort.reverse : false })}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm',
                sort.field === s.field ? 'bg-accent-soft text-text' : 'text-muted hover:bg-surface-3 hover:text-text',
              )}
            >
              {s.label}
              {sort.field === s.field && <span className="text-xs">{sort.reverse ? '↑' : '↓'}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Переключатель список/канбан — только в проекте */}
      {view.kind === 'project' && (
        <div className="flex rounded-lg bg-surface-2 p-0.5">
          <button
            className={cn('icon-btn h-7 w-7', projectMode === 'list' && 'bg-surface-3 text-text')}
            onClick={() => setProjectMode('list')} title="Список"
          >
            <LayoutList size={16} />
          </button>
          <button
            className={cn('icon-btn h-7 w-7', projectMode === 'kanban' && 'bg-surface-3 text-text')}
            onClick={() => setProjectMode('kanban')} title="Канбан"
          >
            <Trello size={16} />
          </button>
        </div>
      )}
    </header>
  )
}
