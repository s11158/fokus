import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Plus, Trash2, CheckSquare, Repeat, Bell } from 'lucide-react'
import type { Project, Tag, Task } from '../../db/types'
import { toggleComplete, updateTask, removeTask, createTask } from '../../db/repo'
import { useUI } from '../../store/ui'
import { cn } from '../../lib/cn'
import { Checkbox, DateBadge, PriorityFlag, PinMark, TagChip } from '../ui/bits'

interface Props {
  task: Task
  tagsById: Map<string, Tag>
  projectsById?: Map<string, Project>
  checklist?: [number, number]
  depth?: number
  hasChildren?: boolean
  expanded?: boolean
  onToggleExpand?: () => void
  showProject?: boolean
  allowSubtask?: boolean
}

export function TaskRow({
  task, tagsById, projectsById, checklist,
  depth = 0, hasChildren, expanded, onToggleExpand,
  showProject, allowSubtask,
}: Props) {
  const { selectedTaskId, selectTask } = useUI()
  const selected = selectedTaskId === task.id
  const [editing, setEditing] = useState(task.title === '')
  const [draft, setDraft] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select() }
  }, [editing])

  const commit = () => {
    const v = draft.trim()
    if (v && v !== task.title) updateTask(task.id, { title: v })
    else setDraft(task.title)
    setEditing(false)
  }

  const project = task.projectId ? projectsById?.get(task.projectId) : undefined
  const tags = task.tags.map((id) => tagsById.get(id)).filter(Boolean) as Tag[]

  return (
    <div
      onClick={() => selectTask(selected ? null : task.id)}
      className={cn(
        'group flex items-start gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors',
        selected ? 'bg-accent-soft/60' : 'hover:bg-surface-2',
      )}
      style={{ paddingLeft: 8 + depth * 22 }}
    >
      {/* Раскрытие подзадач */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleExpand?.() }}
        className={cn(
          'mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded text-faint hover:text-text',
          !hasChildren && 'invisible',
        )}
      >
        <ChevronRight size={14} className={cn('transition-transform', expanded && 'rotate-90')} />
      </button>

      <div className="mt-[2px]">
        <Checkbox
          checked={task.complete}
          priority={task.priority}
          onChange={(v) => toggleComplete(task.id, v)}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') { setDraft(task.title); setEditing(false) }
              }}
              className="input text-sm"
              placeholder="Название задачи…"
            />
          ) : (
            <span
              onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
              className={cn(
                'truncate text-sm',
                task.complete && 'text-faint line-through',
              )}
            >
              {task.title || <span className="text-faint">(без названия)</span>}
            </span>
          )}
          {task.pinned && <PinMark />}
          <PriorityFlag value={task.priority} />
          {task.recurrence && <Repeat size={12} className="text-faint" />}
          {task.reminders.some((r) => !r.fired) && <Bell size={12} className="text-accent" />}
        </div>

        {/* Бейджи */}
        {Boolean(task.start || task.deadline || tags.length || showProject || checklist) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {showProject && project && (
              <span className="chip bg-surface-3" style={{ color: project.color }}>
                {project.emoji || '●'} {project.title}
              </span>
            )}
            {task.start && <DateBadge ts={task.start} withTime={task.useTime} kind="start" />}
            {task.deadline && <DateBadge ts={task.deadline} kind="deadline" />}
            {checklist && checklist[1] > 0 && (
              <span className="chip bg-surface-3 text-muted">
                <CheckSquare size={11} /> {checklist[0]}/{checklist[1]}
              </span>
            )}
            {tags.map((t) => <TagChip key={t.id} tag={t} />)}
          </div>
        )}
      </div>

      {/* Действия при наведении */}
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {allowSubtask && (
          <button
            className="icon-btn h-7 w-7"
            title="Подзадача"
            onClick={(e) => { e.stopPropagation(); createTask({ projectId: task.projectId, parentId: task.id }) }}
          >
            <Plus size={15} />
          </button>
        )}
        <button
          className="icon-btn h-7 w-7 hover:text-rose-400"
          title="В корзину"
          onClick={(e) => { e.stopPropagation(); removeTask(task.id); if (selected) selectTask(null) }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
