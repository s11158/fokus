import { useMemo, useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, X } from 'lucide-react'
import { db } from '../../db/db'
import {
  ensureDefaultKanban, createKanbanStatus, removeKanbanStatus,
  setTaskKanbanStatus, createTask, toggleComplete,
} from '../../db/repo'
import type { Task, KanbanStatus } from '../../db/types'
import { useUI } from '../../store/ui'
import { useTagMap, useProjectMap } from '../../lib/hooks'
import { cn } from '../../lib/cn'
import { Checkbox, PriorityFlag, DateBadge, TagChip } from '../ui/bits'

const UNASSIGNED = '__none__'

export function KanbanBoard({ projectId }: { projectId: string }) {
  const selectTask = useUI((s) => s.selectTask)
  const tagsById = useTagMap()
  const projectsById = useProjectMap()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newCol, setNewCol] = useState('')

  const statuses = useLiveQuery(
    () => db.kanbanStatuses.where('projectId').equals(projectId).toArray(),
    [projectId],
  )
  const tasks = useLiveQuery(
    () => db.tasks.where('projectId').equals(projectId).filter((t) => !t.removed && !t.parentId).toArray(),
    [projectId],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const cols = useMemo(() => (statuses ?? []).slice().sort((a, b) => a.order - b.order), [statuses])
  const byStatus = useMemo(() => {
    const map = new Map<string, Task[]>()
    map.set(UNASSIGNED, [])
    for (const c of cols) map.set(c.id, [])
    for (const t of tasks ?? []) {
      const key = t.kanbanStatusId && map.has(t.kanbanStatusId) ? t.kanbanStatusId : UNASSIGNED
      map.get(key)!.push(t)
    }
    for (const arr of map.values()) arr.sort((a, b) => a.order - b.order)
    return map
  }, [cols, tasks])

  const activeTask = (tasks ?? []).find((t) => t.id === activeId)

  if (statuses && statuses.length === 0) {
    return (
      <div className="grid h-full place-items-center">
        <div className="text-center">
          <p className="mb-3 text-sm text-faint">У проекта ещё нет колонок канбана.</p>
          <button className="btn btn-accent" onClick={() => ensureDefaultKanban(projectId)}>
            Создать колонки по умолчанию
          </button>
        </div>
      </div>
    )
  }

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const taskId = String(e.active.id)
    const over = e.over?.id ? String(e.over.id) : null
    if (!over) return
    const target = over === UNASSIGNED ? null : over
    const task = (tasks ?? []).find((t) => t.id === taskId)
    if (task && (task.kanbanStatusId ?? null) !== target) setTaskKanbanStatus(taskId, target)
  }

  const unassigned = byStatus.get(UNASSIGNED) ?? []
  const columns: { id: string; status?: KanbanStatus }[] = [
    ...(unassigned.length > 0 ? [{ id: UNASSIGNED }] : []),
    ...cols.map((c) => ({ id: c.id, status: c })),
  ]

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full gap-3 overflow-x-auto px-4 py-3">
        {columns.map(({ id, status }) => (
          <Column
            key={id}
            id={id}
            status={status}
            tasks={byStatus.get(id) ?? []}
            tagsById={tagsById}
            projectsById={projectsById}
            onAddTask={(title) => createTask({ projectId, title, kanbanStatusId: id === UNASSIGNED ? null : id })}
            onSelect={selectTask}
          />
        ))}

        {/* Добавить колонку */}
        <div className="w-72 shrink-0">
          {adding ? (
            <div className="rounded-xl border border-border bg-surface-2 p-2">
              <input
                autoFocus value={newCol} onChange={(e) => setNewCol(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newCol.trim()) { await createKanbanStatus(projectId, newCol.trim()); setNewCol(''); setAdding(false) }
                  if (e.key === 'Escape') { setAdding(false); setNewCol('') }
                }}
                onBlur={() => { setAdding(false); setNewCol('') }}
                placeholder="Название колонки" className="input text-sm"
              />
            </div>
          ) : (
            <button className="btn w-full justify-start" onClick={() => setAdding(true)}>
              <Plus size={16} /> Колонка
            </button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? <Card task={activeTask} tagsById={tagsById} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function Column({
  id, status, tasks, tagsById, onAddTask, onSelect,
}: {
  id: string
  status?: KanbanStatus
  tasks: Task[]
  tagsById: Map<string, any>
  projectsById: Map<string, any>
  onAddTask: (title: string) => void
  onSelect: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: status?.color ?? '#5b6271' }} />
        <span className="text-sm font-medium">{status?.title ?? 'Без статуса'}</span>
        <span className="text-xs text-faint">{tasks.length}</span>
        <div className="flex-1" />
        {status && (
          <button
            className="icon-btn h-6 w-6 opacity-60 hover:opacity-100 hover:text-rose-400"
            title="Удалить колонку"
            onClick={() => { if (confirm(`Удалить колонку «${status.title}»? Задачи останутся без статуса.`)) removeKanbanStatus(status.id) }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[80px] flex-1 flex-col gap-2 rounded-xl border border-border bg-surface-2/40 p-2 transition-colors',
          isOver && 'border-accent bg-accent-soft/30',
        )}
      >
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} tagsById={tagsById} onSelect={onSelect} />
        ))}

        {adding ? (
          <input
            autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) { onAddTask(draft.trim()); setDraft('') }
              if (e.key === 'Escape') { setAdding(false); setDraft('') }
            }}
            onBlur={() => { if (draft.trim()) onAddTask(draft.trim()); setAdding(false); setDraft('') }}
            placeholder="Новая задача" className="input rounded-lg bg-surface-3 px-2.5 py-2 text-sm"
          />
        ) : (
          <button className="btn justify-start text-faint hover:text-text" onClick={() => setAdding(true)}>
            <Plus size={15} /> Задача
          </button>
        )}
      </div>
    </div>
  )
}

function DraggableCard({ task, tagsById, onSelect }: { task: Task; tagsById: Map<string, any>; onSelect: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(task.id)}
      className={cn('cursor-grab active:cursor-grabbing', isDragging && 'opacity-30')}
    >
      <Card task={task} tagsById={tagsById} />
    </div>
  )
}

function Card({ task, tagsById, overlay }: { task: Task; tagsById: Map<string, any>; overlay?: boolean }) {
  const tags = task.tags.map((id) => tagsById.get(id)).filter(Boolean)
  return (
    <div className={cn(
      'rounded-lg border border-border bg-surface p-2.5 shadow-sm',
      overlay && 'rotate-2 shadow-xl ring-1 ring-accent',
    )}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={task.complete} priority={task.priority} onChange={(v) => toggleComplete(task.id, v)} />
        </div>
        <span className={cn('flex-1 text-sm', task.complete && 'text-faint line-through')}>
          {task.title || '(без названия)'}
        </span>
        <PriorityFlag value={task.priority} />
      </div>
      {(task.start || task.deadline || tags.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-7">
          {task.start && <DateBadge ts={task.start} withTime={task.useTime} kind="start" />}
          {task.deadline && <DateBadge ts={task.deadline} kind="deadline" />}
          {tags.map((t: any) => <TagChip key={t.id} tag={t} />)}
        </div>
      )}
    </div>
  )
}
