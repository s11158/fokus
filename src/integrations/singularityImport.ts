// Импорт бэкапа SingularityApp в модель «Фокуса».
// Сохраняем ОРИГИНАЛЬНЫЕ id (P-, T-, A-, CH-, HB- …), чтобы все связи сошлись.
import { db } from '../db/db'
import type { ChecklistItem, Tag, Habit, HabitDailyProgress, KanbanStatus, CalendarEvent, Project, Task } from '../db/types'
import { buildNoteMap, mapProjectRecord, mapTaskRecord, resolveColor, cleanTitle, bool, toMs } from './singularityMap'

type Any = Record<string, any>

export interface ImportStats {
  projects: number; tasks: number; checklists: number; tags: number
  habits: number; habitProgress: number; kanban: number; events: number
  recurrenceSkipped: number; reminders: number
}

export function isSingularityBackup(data: Any): boolean {
  return !!data && Array.isArray(data.tasks) && Array.isArray(data.projects)
}

export async function importSingularityBackup(data: Any): Promise<ImportStats> {
  if (!isSingularityBackup(data)) throw new Error('Не похоже на бэкап SingularityApp')

  const stats: ImportStats = {
    projects: 0, tasks: 0, checklists: 0, tags: 0, habits: 0,
    habitProgress: 0, kanban: 0, events: 0, recurrenceSkipped: 0, reminders: 0,
  }
  const notes = buildNoteMap(data.notes)

  const projects: Project[] = (data.projects ?? []).filter((p: Any) => p?.id).map((p: Any) => mapProjectRecord(p, notes))
  stats.projects = projects.length

  const tasks: Task[] = (data.tasks ?? []).filter((t: Any) => t?.id).map((t: Any) => {
    const r = mapTaskRecord(t, notes)
    if (r.hadRecurrence) stats.recurrenceSkipped++
    stats.reminders += r.reminderCount
    return r.task
  })
  stats.tasks = tasks.length

  const checklists: ChecklistItem[] = (data.checklists ?? [])
    .filter((c: Any) => c?.id && typeof c.parent === 'string')
    .map((c: Any) => ({ id: c.id, taskId: c.parent, title: cleanTitle(c.title), complete: bool(c.done), order: Number(c.parentOrder) || 0 }))
  stats.checklists = checklists.length

  const tags: Tag[] = (data.tags ?? [])
    .filter((g: Any) => g?.id)
    .map((g: Any) => ({ id: g.id, title: cleanTitle(g.title) || 'тег', color: resolveColor(g.color) }))
  stats.tags = tags.length

  const habits: Habit[] = (data.habits ?? [])
    .filter((h: Any) => h?.id)
    .map((h: Any) => ({
      id: h.id, title: cleanTitle(h.title) || 'Привычка', note: h.description || '',
      color: resolveColor(h.color), scheduleDays: [], target: 1,
      order: Number(h.order) || 0, archived: h.status ? h.status !== 'active' : false,
    }))
  stats.habits = habits.length

  const habitProgress: HabitDailyProgress[] = (data.habitDailyProgress ?? [])
    .filter((p: Any) => p?.id && p.habit && p.date)
    .map((p: Any) => ({ id: p.id, habitId: p.habit, date: p.date, value: Number(p.progress) || 0 }))
    .filter((p: HabitDailyProgress) => p.value > 0)
  stats.habitProgress = habitProgress.length

  const kanban: KanbanStatus[] = (data.kanbanStatuses ?? [])
    .filter((k: Any) => k?.id && k.projectId)
    .map((k: Any) => ({ id: k.id, projectId: k.projectId, title: k.name || 'Статус', color: resolveColor(k.color), order: Number(k.kanbanOrder) || 0 }))
  stats.kanban = kanban.length

  const events: CalendarEvent[] = (data.events ?? [])
    .filter((e: Any) => e?.id && e.start)
    .map((e: Any) => {
      const s = toMs(e.start) ?? Date.now()
      return { id: e.id, title: cleanTitle(e.title) || 'Событие', note: e.link || '', start: s, end: toMs(e.end) ?? s, allDay: !bool(e.useTime) }
    })
  stats.events = events.length

  await db.transaction(
    'rw',
    [db.projects, db.tasks, db.checklistItems, db.tags, db.habits, db.habitProgress, db.kanbanStatuses, db.events, db.settings],
    async () => {
      await Promise.all([
        db.projects.clear(), db.tasks.clear(), db.checklistItems.clear(), db.tags.clear(),
        db.habits.clear(), db.habitProgress.clear(), db.kanbanStatuses.clear(), db.events.clear(),
      ])
      await db.projects.bulkAdd(projects)
      await db.tasks.bulkAdd(tasks)
      await db.checklistItems.bulkAdd(checklists)
      await db.tags.bulkAdd(tags)
      await db.habits.bulkAdd(habits)
      await db.habitProgress.bulkAdd(habitProgress)
      await db.kanbanStatuses.bulkAdd(kanban)
      await db.events.bulkAdd(events)
      await db.settings.put({ id: 'seeded', value: true })
    },
  )

  return stats
}
