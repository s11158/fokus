import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import {
  X, Flag, Pin, CalendarClock, Flag as DeadlineIcon, Hash, Plus, Trash2, Link as LinkIcon,
} from 'lucide-react'
import { db } from '../../db/db'
import {
  updateTask, toggleComplete, setPriority, togglePin, moveTaskToProject,
  addChecklistItem, updateChecklistItem, removeChecklistItem, createTag,
  setRecurrence, addReminder, removeReminder,
} from '../../db/repo'
import { RecurrencePicker } from './RecurrencePicker'
import { Repeat, Bell } from 'lucide-react'
import { fmt } from '../../lib/date'
import { useUI } from '../../store/ui'
import { cn } from '../../lib/cn'
import { Checkbox } from '../ui/bits'
import { RichEditor } from '../ui/RichEditor'
import { PRIORITY_LABEL } from '../ui/bits'
import type { Priority } from '../../db/types'

// timestamp <-> значение <input>
const toDateInput = (ts: number | null) => (ts ? new Date(ts - new Date(ts).getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '')
const toDateTimeInput = (ts: number | null) => (ts ? new Date(ts - new Date(ts).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')

function Section({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-border px-4 py-3">{children}</div>
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-faint">{children}</div>
}

export function TaskDetail({ taskId }: { taskId: string }) {
  const selectTask = useUI((s) => s.selectTask)
  const task = useLiveQuery(() => db.tasks.get(taskId), [taskId])
  const projects = useLiveQuery(() => db.projects.filter((p) => !p.removed && !p.archived).toArray(), [])
  const allTags = useLiveQuery(() => db.tags.toArray(), [])
  const checklist = useLiveQuery(
    () => db.checklistItems.where('taskId').equals(taskId).toArray(),
    [taskId],
  )
  const [newItem, setNewItem] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [showTagAdd, setShowTagAdd] = useState(false)
  const [reminderInput, setReminderInput] = useState('')

  if (!task) return null

  const taskTags = (allTags ?? []).filter((t) => task.tags.includes(t.id))
  const items = (checklist ?? []).sort((a, b) => a.order - b.order)

  const toggleTag = (id: string) => {
    const has = task.tags.includes(id)
    updateTask(task.id, { tags: has ? task.tags.filter((t) => t !== id) : [...task.tags, id] })
  }

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-xs text-faint">Задача</span>
        <div className="flex items-center gap-0.5">
          <button
            className="icon-btn" title="Скопировать ссылку на задачу"
            onClick={async () => { const { taskDeepLink } = await import('../../lib/deeplink'); navigator.clipboard?.writeText(taskDeepLink(task.id)) }}
          >
            <LinkIcon size={16} />
          </button>
          <button className="icon-btn" onClick={() => selectTask(null)}><X size={18} /></button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Заголовок */}
        <Section>
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5"><Checkbox checked={task.complete} priority={task.priority} onChange={(v) => toggleComplete(task.id, v)} /></div>
            <textarea
              value={task.title}
              onChange={(e) => updateTask(task.id, { title: e.target.value })}
              rows={1}
              placeholder="Название задачи"
              className={cn('input resize-none text-base font-medium leading-snug', task.complete && 'text-faint line-through')}
            />
          </div>
        </Section>

        {/* Описание */}
        <Section>
          <Label>Описание</Label>
          <RichEditor value={task.note} onChange={(html) => updateTask(task.id, { note: html })} />
        </Section>

        {/* Проект */}
        <Section>
          <Label>Проект</Label>
          <select
            value={task.projectId ?? ''}
            onChange={(e) => moveTaskToProject(task.id, e.target.value || null)}
            className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none"
          >
            <option value="">Входящие</option>
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.title}</option>)}
          </select>
        </Section>

        {/* Приоритет + закрепление */}
        <Section>
          <Label>Приоритет</Label>
          <div className="flex items-center gap-1">
            {([0, 1, 2, 3] as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(task.id, p)}
                title={PRIORITY_LABEL[p]}
                className={cn(
                  'flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border text-xs transition-colors',
                  task.priority === p ? 'border-accent bg-accent-soft text-text' : 'border-border text-muted hover:bg-surface-3',
                )}
              >
                <Flag size={13} className={['text-faint', 'text-sky-400', 'text-amber-400', 'text-rose-400'][p]} />
                {p === 0 ? '-' : p}
              </button>
            ))}
            <button
              onClick={() => togglePin(task.id, !task.pinned)}
              title="Закрепить"
              className={cn(
                'flex h-8 w-9 items-center justify-center rounded-lg border transition-colors',
                task.pinned ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-border text-muted hover:bg-surface-3',
              )}
            >
              <Pin size={14} className={task.pinned ? 'fill-current' : ''} />
            </button>
          </div>
        </Section>

        {/* Даты */}
        <Section>
          <Label>Дата начала</Label>
          <div className="flex items-center gap-2">
            <CalendarClock size={15} className="text-faint" />
            <input
              type={task.useTime ? 'datetime-local' : 'date'}
              value={task.useTime ? toDateTimeInput(task.start) : toDateInput(task.start)}
              onChange={(e) => updateTask(task.id, { start: e.target.value ? new Date(e.target.value).getTime() : null })}
              className="flex-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none [color-scheme:dark]"
            />
            <label className="flex items-center gap-1 text-xs text-muted">
              <input type="checkbox" checked={task.useTime} onChange={(e) => updateTask(task.id, { useTime: e.target.checked })} />
              время
            </label>
          </div>
        </Section>

        <Section>
          <Label>Дедлайн</Label>
          <div className="flex items-center gap-2">
            <DeadlineIcon size={15} className="text-rose-400" />
            <input
              type="date"
              value={toDateInput(task.deadline)}
              onChange={(e) => updateTask(task.id, { deadline: e.target.value ? new Date(e.target.value).getTime() : null })}
              className="flex-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none [color-scheme:dark]"
            />
          </div>
        </Section>

        {/* Повтор */}
        <Section>
          <Label><span className="inline-flex items-center gap-1.5"><Repeat size={12} /> Повтор</span></Label>
          <RecurrencePicker value={task.recurrence} onChange={(r) => setRecurrence(task.id, r)} />
          {task.recurrence && (task.start == null && task.deadline == null) && (
            <p className="mt-1.5 text-xs text-amber-300/80">Укажите дату начала или дедлайн - повтор перекатывается от неё.</p>
          )}
        </Section>

        {/* Напоминания */}
        <Section>
          <Label><span className="inline-flex items-center gap-1.5"><Bell size={12} /> Напоминания</span></Label>
          <div className="flex flex-col gap-1.5">
            {task.reminders.length > 0 && (
              <div className="flex flex-col gap-1">
                {[...task.reminders].sort((a, b) => a.at - b.at).map((r) => (
                  <div key={r.id} className="group flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm">
                    <Bell size={13} className={r.fired ? 'text-faint' : 'text-accent'} />
                    <span className={cn('flex-1', r.fired && 'text-faint line-through')}>{fmt(r.at, 'd MMM, HH:mm')}</span>
                    <button className="icon-btn h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-rose-400" onClick={() => removeReminder(task.id, r.id)}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={reminderInput}
                onChange={(e) => setReminderInput(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none [color-scheme:dark]"
              />
              <button
                className="btn btn-accent shrink-0"
                disabled={!reminderInput}
                onClick={async () => {
                  if (!reminderInput) return
                  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    try { await Notification.requestPermission() } catch {}
                  }
                  await addReminder(task.id, new Date(reminderInput).getTime())
                  setReminderInput('')
                }}
              >
                Добавить
              </button>
            </div>
          </div>
        </Section>

        {/* Теги */}
        <Section>
          <Label>Теги</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {taskTags.map((t) => (
              <button key={t.id} onClick={() => toggleTag(t.id)} className="chip" style={{ background: t.color + '22', color: t.color }}>
                #{t.title} <X size={11} />
              </button>
            ))}
            <button className="icon-btn h-6 w-6" onClick={() => setShowTagAdd((v) => !v)}><Hash size={14} /></button>
          </div>
          {showTagAdd && (
            <div className="mt-2 rounded-lg border border-border bg-surface-2 p-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    const id = await createTag(tagInput.trim())
                    toggleTag(id); setTagInput('')
                  }
                }}
                placeholder="Новый тег + Enter"
                className="input mb-2 text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {(allTags ?? []).filter((t) => !task.tags.includes(t.id)).map((t) => (
                  <button key={t.id} onClick={() => toggleTag(t.id)} className="chip" style={{ background: t.color + '22', color: t.color }}>
                    #{t.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Чек-лист */}
        <Section>
          <Label>Чек-лист</Label>
          <div className="flex flex-col gap-1">
            {items.map((it) => (
              <div key={it.id} className="group flex items-center gap-2">
                <Checkbox checked={it.complete} onChange={(v) => updateChecklistItem(it.id, { complete: v })} />
                <input
                  value={it.title}
                  onChange={(e) => updateChecklistItem(it.id, { title: e.target.value })}
                  className={cn('input text-sm', it.complete && 'text-faint line-through')}
                />
                <button className="icon-btn h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-rose-400" onClick={() => removeChecklistItem(it.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 pl-[2px]">
              <Plus size={15} className="text-faint" />
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newItem.trim()) { await addChecklistItem(task.id, newItem.trim()); setNewItem('') }
                }}
                placeholder="Добавить пункт…"
                className="input text-sm"
              />
            </div>
          </div>
        </Section>
      </div>
    </aside>
  )
}
