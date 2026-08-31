// Слой операций над данными. Компоненты читают через useLiveQuery,
// а пишут через эти функции, чтобы вся мутация состояния шла в одном месте.
import { db } from './db'
import { uid, now } from '../lib/id'
import { nextOccurrence } from '../lib/recurrence'
import type {
  Project,
  Task,
  ChecklistItem,
  Priority,
  TaskState,
  KanbanStatus,
  Tag,
  Habit,
  FocusSession,
} from './types'

const PALETTE = [
  '#6c8cff', '#ffc107', '#ff7043', '#26c6da',
  '#66bb6a', '#ab47bc', '#ec407a', '#ffa726',
]
export function randomColor(seed = Math.floor(Math.random() * PALETTE.length)) {
  return PALETTE[seed % PALETTE.length]
}

// ---------- Проекты ----------
export async function createProject(patch: Partial<Project> = {}): Promise<string> {
  const id = uid('P')
  const maxOrder = (await db.projects.orderBy('order').last())?.order ?? 0
  const project: Project = {
    id,
    title: patch.title ?? 'Новый проект',
    emoji: patch.emoji ?? '',
    color: patch.color ?? randomColor(),
    note: patch.note ?? '',
    parentId: patch.parentId ?? null,
    order: patch.order ?? maxOrder + 10,
    tags: patch.tags ?? [],
    archived: false,
    removed: false,
    createdDate: now(),
    modifiedDate: now(),
  }
  await db.projects.add(project)
  return id
}

export async function updateProject(id: string, patch: Partial<Project>) {
  await db.projects.update(id, { ...patch, modifiedDate: now() })
}

export async function removeProject(id: string) {
  // Мягкое удаление проекта и его задач — в корзину.
  await db.transaction('rw', db.projects, db.tasks, async () => {
    await db.projects.update(id, { removed: true, modifiedDate: now() })
    const tasks = await db.tasks.where('projectId').equals(id).toArray()
    for (const t of tasks) await db.tasks.update(t.id, { removed: true })
  })
}

export async function restoreProject(id: string) {
  await db.projects.update(id, { removed: false, archived: false, modifiedDate: now() })
}

// ---------- Задачи ----------
export async function createTask(patch: Partial<Task> = {}): Promise<string> {
  const id = uid('T')
  const project = patch.projectId ?? null
  const parent = patch.parentId ?? null
  // Полный фильтр вместо where().equals(): IndexedDB не индексирует null
  // (задачи «Входящих» имеют projectId === null).
  const siblings = await db.tasks
    .filter((t) => t.projectId === project && t.parentId === parent && !t.removed)
    .toArray()
  const maxOrder = siblings.reduce((m, t) => Math.max(m, t.order), 0)
  const task: Task = {
    id,
    title: patch.title ?? '',
    note: patch.note ?? '',
    projectId: project,
    parentId: parent,
    order: patch.order ?? maxOrder + 10,
    priority: patch.priority ?? 0,
    complete: false,
    state: patch.state ?? 'active',
    start: patch.start ?? null,
    useTime: patch.useTime ?? false,
    deadline: patch.deadline ?? null,
    deferred: patch.deferred ?? false,
    pinned: patch.pinned ?? false,
    recurrence: patch.recurrence ?? null,
    tags: patch.tags ?? [],
    reminders: patch.reminders ?? [],
    kanbanStatusId: patch.kanbanStatusId ?? null,
    createdDate: now(),
    modifiedDate: now(),
    completedDate: null,
    removed: false,
  }
  await db.tasks.add(task)
  return id
}

// Обработчик изменений задач (регистрируется слоем синхронизации, этап 11).
type TaskChangeHandler = (taskId: string) => void
let taskChangeHandler: TaskChangeHandler | null = null
export function setTaskChangeHandler(fn: TaskChangeHandler | null) {
  taskChangeHandler = fn
}

export async function updateTask(id: string, patch: Partial<Task>) {
  await db.tasks.update(id, { ...patch, modifiedDate: now() })
  taskChangeHandler?.(id)
}

export async function toggleComplete(id: string, complete: boolean) {
  const task = await db.tasks.get(id)
  // Повторяющаяся задача при выполнении не закрывается, а перекатывается вперёд.
  if (complete && task?.recurrence && (task.start != null || task.deadline != null)) {
    const base = new Date(task.start ?? task.deadline!)
    const next = nextOccurrence(task.recurrence, base)
    const delta = next.getTime() - base.getTime()
    await db.tasks.update(id, {
      start: task.start != null ? task.start + delta : null,
      deadline: task.deadline != null ? task.deadline + delta : null,
      reminders: task.reminders.map((r) => ({ ...r, at: r.at + delta, fired: false })),
      modifiedDate: now(),
    })
    return
  }

  await db.tasks.update(id, {
    complete,
    state: (complete ? 'done' : 'active') as TaskState,
    completedDate: complete ? now() : null,
    modifiedDate: now(),
  })
  // Подзадачи при выполнении родителя тоже отмечаем выполненными.
  if (complete) {
    const children = await db.tasks.where('parentId').equals(id).toArray()
    for (const c of children) {
      if (!c.complete) await toggleComplete(c.id, true)
    }
  }
}

export async function setRecurrence(id: string, recurrence: Task['recurrence']) {
  await updateTask(id, { recurrence })
}

// ---------- Напоминания ----------
export async function addReminder(taskId: string, at: number) {
  const task = await db.tasks.get(taskId)
  if (!task) return
  const reminders = [...task.reminders, { id: uid('R'), at, fired: false }]
  await updateTask(taskId, { reminders })
}

export async function removeReminder(taskId: string, reminderId: string) {
  const task = await db.tasks.get(taskId)
  if (!task) return
  await updateTask(taskId, { reminders: task.reminders.filter((r) => r.id !== reminderId) })
}

export async function markReminderFired(taskId: string, reminderId: string) {
  const task = await db.tasks.get(taskId)
  if (!task) return
  await db.tasks.update(taskId, {
    reminders: task.reminders.map((r) => (r.id === reminderId ? { ...r, fired: true } : r)),
  })
}

export async function setPriority(id: string, priority: Priority) {
  await updateTask(id, { priority })
}

export async function togglePin(id: string, pinned: boolean) {
  await updateTask(id, { pinned })
}

export async function removeTask(id: string) {
  // Мягкое удаление задачи и всего поддерева подзадач.
  const descendants = await collectDescendants(id)
  await db.transaction('rw', db.tasks, async () => {
    for (const tid of [id, ...descendants]) {
      await db.tasks.update(tid, { removed: true, modifiedDate: now() })
    }
  })
}

export async function restoreTask(id: string) {
  await db.tasks.update(id, { removed: false, modifiedDate: now() })
}

export async function purgeTask(id: string) {
  const descendants = await collectDescendants(id)
  await db.transaction('rw', db.tasks, db.checklistItems, async () => {
    for (const tid of [id, ...descendants]) {
      await db.tasks.delete(tid)
      await db.checklistItems.where('taskId').equals(tid).delete()
    }
  })
}

async function collectDescendants(id: string): Promise<string[]> {
  const out: string[] = []
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    const kids = await db.tasks.where('parentId').equals(cur).toArray()
    for (const k of kids) {
      out.push(k.id)
      stack.push(k.id)
    }
  }
  return out
}

export async function moveTaskToProject(id: string, projectId: string | null) {
  await updateTask(id, { projectId, kanbanStatusId: null })
}

// ---------- Чек-листы ----------
export async function addChecklistItem(taskId: string, title: string): Promise<string> {
  const id = uid('C')
  const items = await db.checklistItems.where('taskId').equals(taskId).toArray()
  const maxOrder = items.reduce((m, i) => Math.max(m, i.order), 0)
  const item: ChecklistItem = { id, taskId, title, complete: false, order: maxOrder + 10 }
  await db.checklistItems.add(item)
  return id
}
export async function updateChecklistItem(id: string, patch: Partial<ChecklistItem>) {
  await db.checklistItems.update(id, patch)
}
export async function removeChecklistItem(id: string) {
  await db.checklistItems.delete(id)
}

// ---------- Теги ----------
export async function createTag(title: string, color?: string): Promise<string> {
  const id = uid('G')
  const tag: Tag = { id, title, color: color ?? randomColor() }
  await db.tags.add(tag)
  return id
}
export async function updateTag(id: string, patch: Partial<Tag>) {
  await db.tags.update(id, patch)
}
export async function removeTag(id: string) {
  await db.tags.delete(id)
}

// ---------- Умные фильтры ----------
export async function createSmartFilter(title = 'Новый фильтр'): Promise<string> {
  const id = uid('SF')
  const maxOrder = (await db.smartFilters.orderBy('order').last())?.order ?? 0
  await db.smartFilters.add({ id, title, query: {}, order: maxOrder + 10 })
  return id
}
export async function updateSmartFilter(id: string, patch: Partial<{ title: string; query: any }>) {
  await db.smartFilters.update(id, patch)
}
export async function removeSmartFilter(id: string) {
  await db.smartFilters.delete(id)
}

// ---------- Канбан-статусы ----------
export async function createKanbanStatus(projectId: string, title: string, color?: string) {
  const id = uid('K')
  const cols = await db.kanbanStatuses.where('projectId').equals(projectId).toArray()
  const maxOrder = cols.reduce((m, c) => Math.max(m, c.order), 0)
  const col: KanbanStatus = { id, projectId, title, color: color ?? randomColor(), order: maxOrder + 10 }
  await db.kanbanStatuses.add(col)
  return id
}

export async function updateKanbanStatus(id: string, patch: Partial<KanbanStatus>) {
  await db.kanbanStatuses.update(id, patch)
}

// Удаление колонки: задачи возвращаются в «без статуса».
export async function removeKanbanStatus(id: string) {
  await db.transaction('rw', db.kanbanStatuses, db.tasks, async () => {
    const affected = await db.tasks.where('kanbanStatusId').equals(id).toArray()
    for (const t of affected) await db.tasks.update(t.id, { kanbanStatusId: null })
    await db.kanbanStatuses.delete(id)
  })
}

export async function ensureDefaultKanban(projectId: string) {
  const count = await db.kanbanStatuses.where('projectId').equals(projectId).count()
  if (count > 0) return
  await createKanbanStatus(projectId, 'К выполнению', '#8b93a4')
  await createKanbanStatus(projectId, 'В работе', '#ffc107')
  await createKanbanStatus(projectId, 'Готово', '#66bb6a')
}

export async function setTaskKanbanStatus(taskId: string, statusId: string | null) {
  await updateTask(taskId, { kanbanStatusId: statusId })
}

// ---------- Фокус-сессии (Pomodoro) ----------
export async function recordFocusSession(s: Omit<FocusSession, 'id'>) {
  await db.focusSessions.add({ ...s, id: uid('F') })
}

// ---------- Привычки ----------
export async function createHabit(patch: Partial<Habit> = {}): Promise<string> {
  const id = uid('H')
  const maxOrder = (await db.habits.orderBy('order').last())?.order ?? 0
  const habit: Habit = {
    id,
    title: patch.title ?? 'Новая привычка',
    note: patch.note ?? '',
    color: patch.color ?? randomColor(),
    scheduleDays: patch.scheduleDays ?? [],
    target: patch.target ?? 1,
    order: patch.order ?? maxOrder + 10,
    archived: false,
  }
  await db.habits.add(habit)
  return id
}

export async function updateHabit(id: string, patch: Partial<Habit>) {
  await db.habits.update(id, patch)
}

export async function removeHabit(id: string) {
  await db.transaction('rw', db.habits, db.habitProgress, async () => {
    await db.habits.delete(id)
    await db.habitProgress.where('habitId').equals(id).delete()
  })
}

// Установить значение прогресса привычки за день (YYYY-MM-DD).
export async function setHabitProgress(habitId: string, date: string, value: number) {
  const existing = await db.habitProgress.where('[habitId+date]').equals([habitId, date]).first()
  if (existing) {
    if (value <= 0) await db.habitProgress.delete(existing.id)
    else await db.habitProgress.update(existing.id, { value })
  } else if (value > 0) {
    await db.habitProgress.add({ id: uid('HP'), habitId, date, value })
  }
}
