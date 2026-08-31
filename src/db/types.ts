// Модель данных приложения «Фокус». Оригинальная схема по методологии GTD.
// Поля совместимы по смыслу с типовыми органайзерами, но это собственная реализация.

export type ID = string

export type Priority = 0 | 1 | 2 | 3 // 0 — нет, 1 — низкий, 2 — средний, 3 — высокий
export type TaskState = 'active' | 'done' | 'someday'

export interface Project {
  id: ID
  title: string
  emoji: string
  color: string
  note: string // описание (rich-text HTML)
  parentId: ID | null // вложенные проекты
  order: number
  tags: ID[]
  archived: boolean
  removed: boolean
  externalId?: string | null // связь с внешним источником (этап 11)
  createdDate: number
  modifiedDate: number
}

export interface Reminder {
  id: ID
  at: number // timestamp напоминания
  fired: boolean
}

export type RecurrenceUnit = 'day' | 'week' | 'month'

export interface Recurrence {
  unit: RecurrenceUnit
  interval: number // каждые N единиц
  weekdays?: number[] // 0..6 (вс..сб) для week
}

export interface Task {
  id: ID
  title: string
  note: string // описание (rich-text HTML)
  projectId: ID | null // null => Входящие
  parentId: ID | null // подзадача => дерево
  order: number
  priority: Priority
  complete: boolean
  state: TaskState
  start: number | null // дата/время начала
  useTime: boolean // учитывать время в start
  deadline: number | null // дедлайн отдельно от старта
  deferred: boolean // «когда-нибудь»
  pinned: boolean
  recurrence: Recurrence | null
  tags: ID[]
  reminders: Reminder[]
  kanbanStatusId: ID | null
  externalId?: string | null // связь с внешним источником (этап 11)
  createdDate: number
  modifiedDate: number
  completedDate: number | null
  removed: boolean
}

export interface ChecklistItem {
  id: ID
  taskId: ID
  title: string
  complete: boolean
  order: number
}

export interface CalendarEvent {
  id: ID
  title: string
  note: string
  start: number
  end: number
  allDay: boolean
}

export interface Habit {
  id: ID
  title: string
  note: string
  color: string
  scheduleDays: number[] // дни недели 0..6, пусто => каждый день
  target: number // цель в день (по умолчанию 1)
  order: number
  archived: boolean
}

export interface HabitDailyProgress {
  id: ID
  habitId: ID
  date: string // YYYY-MM-DD
  value: number
}

export interface Tag {
  id: ID
  title: string
  color: string
}

export interface KanbanStatus {
  id: ID
  projectId: ID
  title: string
  color: string
  order: number
}

export interface SmartFilter {
  id: ID
  title: string
  query: SmartFilterQuery
  order: number
}

export interface SmartFilterQuery {
  text?: string
  projectId?: ID | null
  tags?: ID[]
  priority?: Priority
  due?: 'overdue' | 'today' | 'week' | 'none'
}

export interface Note {
  id: ID
  title: string
  text: string
}

export interface FocusSession {
  id: ID
  taskId: ID | null
  start: number
  duration: number // секунд фокуса
  type: 'focus' | 'break'
  date: string // YYYY-MM-DD
}

export interface Settings {
  id: string // singleton ключ
  value: unknown
}
