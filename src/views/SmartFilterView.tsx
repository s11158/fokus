import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2, SlidersHorizontal } from 'lucide-react'
import { db } from '../db/db'
import { updateSmartFilter, removeSmartFilter } from '../db/repo'
import { useUI } from '../store/ui'
import { useTagMap, useProjectMap, useChecklistCounts } from '../lib/hooks'
import { FlatList } from '../components/tasks/FlatList'
import { ViewShell, EmptyState } from './shell'
import { matchesFilter } from '../lib/smartFilter'
import type { Priority, SmartFilterQuery } from '../db/types'
import { cn } from '../lib/cn'

const DUE_OPTS: { v: SmartFilterQuery['due']; l: string }[] = [
  { v: undefined, l: 'Любые' },
  { v: 'overdue', l: 'Просрочено' },
  { v: 'today', l: 'Сегодня' },
  { v: 'week', l: 'Неделя' },
  { v: 'none', l: 'Без даты' },
]

export function SmartFilterView({ id }: { id: string }) {
  const { sort, setView } = useUI()
  const tagsById = useTagMap()
  const projectsById = useProjectMap()
  const checklistCounts = useChecklistCounts()

  const filter = useLiveQuery(() => db.smartFilters.get(id), [id])
  const projects = useLiveQuery(() => db.projects.filter((p) => !p.removed).toArray(), [])
  const tasks = useLiveQuery(() => db.tasks.filter((t) => !t.removed).toArray(), []) ?? []
  const allTags = useLiveQuery(() => db.tags.toArray(), []) ?? []

  if (!filter) return null
  const q = filter.query as SmartFilterQuery
  const setQuery = (patch: Partial<SmartFilterQuery>) => updateSmartFilter(id, { query: { ...q, ...patch } })

  const matched = tasks.filter((t) => matchesFilter(t, q))

  return (
    <ViewShell>
      {/* Заголовок + удаление */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <SlidersHorizontal size={18} className="text-accent" />
        <input
          value={filter.title}
          onChange={(e) => updateSmartFilter(id, { title: e.target.value })}
          className="input flex-1 text-lg font-semibold"
          placeholder="Название фильтра"
        />
        <button
          className="icon-btn hover:text-rose-400" title="Удалить фильтр"
          onClick={async () => { if (confirm(`Удалить фильтр «${filter.title}»?`)) { await removeSmartFilter(id); setView({ kind: 'today' }) } }}
        >
          <Trash2 size={17} />
        </button>
      </div>

      {/* Критерии */}
      <div className="mb-3 flex flex-col gap-2 rounded-xl border border-border bg-surface-2/50 p-3">
        <input
          value={q.text ?? ''}
          onChange={(e) => setQuery({ text: e.target.value })}
          placeholder="Текст в названии/описании…"
          className="input rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={q.projectId ?? ''}
            onChange={(e) => setQuery({ projectId: e.target.value || null })}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none"
          >
            <option value="">Любой проект</option>
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.title}</option>)}
          </select>
          <select
            value={q.priority ?? ''}
            onChange={(e) => setQuery({ priority: e.target.value === '' ? undefined : (Number(e.target.value) as Priority) })}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none"
          >
            <option value="">Любой приоритет</option>
            <option value="3">Высокий</option><option value="2">Средний</option>
            <option value="1">Низкий</option><option value="0">Без приоритета</option>
          </select>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {DUE_OPTS.map((o) => (
              <button
                key={o.l}
                onClick={() => setQuery({ due: o.v })}
                className={cn('px-2.5 py-1.5 text-sm', (q.due ?? undefined) === o.v ? 'bg-accent-soft text-text' : 'text-muted hover:bg-surface-3')}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t) => {
              const active = q.tags?.includes(t.id)
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    const cur = q.tags ?? []
                    setQuery({ tags: active ? cur.filter((x) => x !== t.id) : [...cur, t.id] })
                  }}
                  className={cn('chip', active ? '' : 'opacity-50')}
                  style={{ background: t.color + '22', color: t.color }}
                >
                  #{t.title}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="mb-1 px-2 text-xs text-faint">Найдено: {matched.length}</div>
      {matched.length === 0 ? (
        <EmptyState text="Под критерии ничего не подходит. Измените условия выше." />
      ) : (
        <FlatList tasks={matched} tagsById={tagsById} projectsById={projectsById} checklistCounts={checklistCounts} sort={sort} />
      )}
    </ViewShell>
  )
}
