import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Flag, CalendarClock, FolderInput } from 'lucide-react'
import { db } from '../../db/db'
import { createTask } from '../../db/repo'
import { cn } from '../../lib/cn'
import { humanDate, startOfDay, addDays } from '../../lib/date'
import type { Priority } from '../../db/types'

interface Props {
  // Контекст создания: куда складывать новую задачу.
  projectId?: string | null
  deferred?: boolean
  defaultStart?: number | null
}

export function TaskComposer({ projectId = null, deferred = false, defaultStart = null }: Props) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>(0)
  const [start, setStart] = useState<number | null>(defaultStart)
  const [pickProject, setPickProject] = useState<string | null>(projectId)
  const [menu, setMenu] = useState<null | 'date' | 'project'>(null)

  const projects = useLiveQuery(
    () => db.projects.filter((p) => !p.removed && !p.archived).toArray(),
    [],
  )

  const reset = () => { setPriority(0); setStart(defaultStart); setMenu(null) }

  const submit = async () => {
    const v = title.trim()
    if (!v) return
    await createTask({
      title: v,
      projectId: pickProject ?? null,
      priority,
      start,
      deferred,
      state: deferred ? 'someday' : 'active',
    })
    setTitle('')
    reset()
  }

  const cyclePriority = () => setPriority((p) => (((p + 1) % 4) as Priority))
  const dateOptions: { label: string; value: number | null }[] = [
    { label: 'Без даты', value: null },
    { label: 'Сегодня', value: startOfDay(new Date()).getTime() },
    { label: 'Завтра', value: startOfDay(addDays(new Date(), 1)).getTime() },
    { label: 'Через неделю', value: startOfDay(addDays(new Date(), 7)).getTime() },
  ]

  const PRIORITY_COLOR = ['text-faint', 'text-sky-400', 'text-amber-400', 'text-rose-400']

  return (
    <div className="border-t border-border bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
        <Plus size={18} className="shrink-0 text-faint" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          placeholder="Новая задача… (Enter - добавить)"
          className="input text-sm"
        />

        {/* Быстрые действия */}
        <div className="relative flex items-center gap-0.5">
          <button className={cn('icon-btn h-8 w-8', PRIORITY_COLOR[priority])}
            title="Приоритет" onClick={cyclePriority}>
            <Flag size={16} className={priority ? 'fill-current' : ''} />
          </button>

          <button className={cn('icon-btn h-8 w-8', start && 'text-accent')}
            title="Дата" onClick={() => setMenu(menu === 'date' ? null : 'date')}>
            <CalendarClock size={16} />
          </button>

          <button className={cn('icon-btn h-8 w-8', pickProject && 'text-accent')}
            title="Проект" onClick={() => setMenu(menu === 'project' ? null : 'project')}>
            <FolderInput size={16} />
          </button>

          {menu === 'date' && (
            <Dropdown onClose={() => setMenu(null)}>
              {dateOptions.map((o) => (
                <DropItem key={o.label} active={start === o.value}
                  onClick={() => { setStart(o.value); setMenu(null) }}>
                  {o.label}
                </DropItem>
              ))}
            </Dropdown>
          )}
          {menu === 'project' && (
            <Dropdown onClose={() => setMenu(null)}>
              <DropItem active={!pickProject} onClick={() => { setPickProject(null); setMenu(null) }}>
                Входящие
              </DropItem>
              {projects?.map((p) => (
                <DropItem key={p.id} active={pickProject === p.id}
                  onClick={() => { setPickProject(p.id); setMenu(null) }}>
                  <span style={{ color: p.color }}>{p.emoji || '●'}</span> {p.title}
                </DropItem>
              ))}
            </Dropdown>
          )}
        </div>

        <button className="btn btn-accent shrink-0" onClick={submit}>Добавить</button>
      </div>

      {/* Текущие выбранные быстрые свойства */}
      {(start || priority) ? (
        <div className="mt-1.5 flex items-center gap-2 pl-2 text-xs text-muted">
          {start ? <span>📅 {humanDate(start)}</span> : null}
          {priority ? <span className={PRIORITY_COLOR[priority]}>⚑ приоритет {priority}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

function Dropdown({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute bottom-full right-0 z-20 mb-2 w-48 rounded-xl border border-border bg-surface-2 p-1 shadow-xl">
        {children}
      </div>
    </>
  )
}
function DropItem({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-1.5 truncate rounded-lg px-2.5 py-1.5 text-left text-sm',
        active ? 'bg-accent-soft text-text' : 'text-muted hover:bg-surface-3 hover:text-text',
      )}
    >
      {children}
    </button>
  )
}
