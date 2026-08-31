import type { Task, SmartFilterQuery } from '../db/types'
import { endOfDay, startOfDay, addDays } from './date'
import { taskDayTs } from './agenda'

const strip = (html: string) => html.replace(/<[^>]+>/g, ' ')

// Подходит ли задача под критерии умного фильтра.
export function matchesFilter(task: Task, q: SmartFilterQuery): boolean {
  if (task.removed) return false

  if (q.text && q.text.trim()) {
    const t = q.text.trim().toLowerCase()
    if (!task.title.toLowerCase().includes(t) && !strip(task.note).toLowerCase().includes(t)) return false
  }
  if (q.projectId !== undefined && q.projectId !== null && q.projectId !== '') {
    if (task.projectId !== q.projectId) return false
  }
  if (q.priority != null) {
    if (task.priority !== q.priority) return false
  }
  if (q.tags && q.tags.length > 0) {
    if (!q.tags.every((tag) => task.tags.includes(tag))) return false
  }
  if (q.due) {
    const day = taskDayTs(task)
    const now = Date.now()
    if (q.due === 'none') {
      if (day != null) return false
    } else if (day == null) {
      return false
    } else if (q.due === 'overdue') {
      if (!(day < startOfDay(new Date()).getTime() && !task.complete)) return false
    } else if (q.due === 'today') {
      if (day > endOfDay(new Date()).getTime()) return false
    } else if (q.due === 'week') {
      if (day > endOfDay(addDays(new Date(), 7)).getTime()) return false
      void now
    }
  }
  return true
}
