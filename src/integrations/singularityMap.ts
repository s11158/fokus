// Общие хелперы и мапперы записей SingularityApp -> модель «Фокуса».
// Используются и файловым импортом (singularityImport), и живым коннектором.
import { uid } from '../lib/id'
import type { Project, Task, Reminder } from '../db/types'

type Any = Record<string, any>

export const toMs = (v: unknown): number | null => {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v) { const t = Date.parse(v); return Number.isNaN(t) ? null : t }
  return null
}
export const clampPriority = (p: unknown): 0 | 1 | 2 | 3 => {
  const n = Math.round(Number(p) || 0)
  return (n < 0 ? 0 : n > 3 ? 3 : n) as 0 | 1 | 2 | 3
}
export const bool = (v: unknown) => v === true || v === 1 || v === '1'

export const cleanTitle = (s: unknown): string =>
  typeof s === 'string'
    ? s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
    : ''

const COLOR_NAMES: Record<string, string> = {
  amber: '#ffc107', red: '#ef5350', pink: '#ec407a', purple: '#ab47bc', deeppurple: '#7e57c2',
  indigo: '#5c6bc0', blue: '#42a5f5', lightblue: '#29b6f6', cyan: '#26c6da', teal: '#26a69a',
  green: '#66bb6a', lightgreen: '#9ccc65', lime: '#d4e157', yellow: '#ffee58', orange: '#ffa726',
  deeporange: '#ff7043', brown: '#8d6e63', grey: '#bdbdbd', gray: '#bdbdbd', bluegrey: '#78909c',
}
export const resolveColor = (c: unknown): string => {
  if (typeof c === 'string') {
    if (c.startsWith('#')) return c
    if (COLOR_NAMES[c]) return COLOR_NAMES[c]
  }
  return '#6c8cff'
}

// Описания лежат в store notes по containerId = id сущности.
export function buildNoteMap(notes: Any[] | undefined): Map<string, string> {
  const m = new Map<string, string>()
  for (const n of notes ?? []) {
    if (n?.containerId && typeof n.content === 'string') m.set(n.containerId, n.content)
  }
  return m
}

export function mapProjectRecord(p: Any, notes: Map<string, string>): Project {
  return {
    id: p.id,
    title: cleanTitle(p.title) || 'Без названия',
    emoji: p.emoji || '',
    color: resolveColor(p.color),
    note: notes.get(p.id) ?? '',
    parentId: typeof p.parent === 'string' && p.parent.startsWith('P-') ? p.parent : null,
    order: Number(p.parentOrder) || 0,
    tags: Array.isArray(p.tags) ? p.tags : [],
    archived: false,
    removed: bool(p._removed),
    externalId: p.id,
    createdDate: toMs(p.createdDate) ?? Date.now(),
    modifiedDate: toMs(p.modificatedDate) ?? Date.now(),
  }
}

export interface TaskMapResult { task: Task; hadRecurrence: boolean; reminderCount: number }

export function mapTaskRecord(t: Any, notes: Map<string, string>): TaskMapResult {
  // Выполненность - поле complete (а не checked, см. разбор экспорта).
  const done = bool(t.complete)
  const start = toMs(t.start)

  const reminders: Reminder[] = []
  if (start != null && Array.isArray(t.notifies)) {
    for (const off of t.notifies) {
      const m = Number(off)
      if (!Number.isNaN(m)) reminders.push({ id: uid('R'), at: start - m * 60_000, fired: true })
    }
  }

  const task: Task = {
    id: t.id,
    title: cleanTitle(t.title),
    note: notes.get(t.id) ?? '',
    projectId: typeof t.projectId === 'string' ? t.projectId : null,
    parentId: typeof t.parent === 'string' && t.parent.startsWith('T-') ? t.parent : null,
    order: Number(t.parentOrder) || 0,
    priority: clampPriority(t.priority),
    complete: done,
    state: bool(t.deferred) ? 'someday' : done ? 'done' : 'active',
    start,
    useTime: bool(t.useTime),
    deadline: null,
    deferred: bool(t.deferred),
    pinned: false,
    recurrence: null,
    tags: Array.isArray(t.tags) ? t.tags : [],
    reminders,
    kanbanStatusId: null,
    externalId: t.id,
    createdDate: toMs(t.createdDate) ?? Date.now(),
    modifiedDate: toMs(t.modificatedDate) ?? Date.now(),
    completedDate: done ? toMs(t.modificatedDate) : null,
    removed: bool(t._removed) || bool(t.showInBasket),
  }
  return { task, hadRecurrence: !!t.recurrence, reminderCount: reminders.length }
}
