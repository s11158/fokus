import Dexie, { type Table } from 'dexie'
import type {
  Project,
  Task,
  ChecklistItem,
  CalendarEvent,
  Habit,
  HabitDailyProgress,
  Tag,
  KanbanStatus,
  SmartFilter,
  Note,
  Settings,
  FocusSession,
} from './types'

// Локальная offline-first БД на IndexedDB через Dexie.
export class FokusDB extends Dexie {
  projects!: Table<Project, string>
  tasks!: Table<Task, string>
  checklistItems!: Table<ChecklistItem, string>
  events!: Table<CalendarEvent, string>
  habits!: Table<Habit, string>
  habitProgress!: Table<HabitDailyProgress, string>
  tags!: Table<Tag, string>
  kanbanStatuses!: Table<KanbanStatus, string>
  smartFilters!: Table<SmartFilter, string>
  notes!: Table<Note, string>
  settings!: Table<Settings, string>
  focusSessions!: Table<FocusSession, string>

  constructor() {
    super('fokus-gtd')
    this.version(1).stores({
      // Индексируем только поля, по которым делаем выборки.
      projects: 'id, parentId, order, removed, archived',
      tasks: 'id, projectId, parentId, state, complete, removed, deferred, pinned, deadline, start, order, kanbanStatusId',
      checklistItems: 'id, taskId, order',
      events: 'id, start, end',
      habits: 'id, order, archived',
      habitProgress: 'id, habitId, date, [habitId+date]',
      tags: 'id, title',
      kanbanStatuses: 'id, projectId, order',
      smartFilters: 'id, order',
      notes: 'id',
      settings: 'id',
    })
    // v2: трекинг фокус-сессий (Pomodoro).
    this.version(2).stores({
      focusSessions: 'id, taskId, date, type',
    })
    // v3: связь с внешним источником (этап 11).
    this.version(3).stores({
      tasks: 'id, projectId, parentId, state, complete, removed, deferred, pinned, deadline, start, order, kanbanStatusId, externalId',
      projects: 'id, parentId, order, removed, archived, externalId',
    })
  }
}

export const db = new FokusDB()
