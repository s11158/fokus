import type { Task, CalendarEvent } from '../db/types'
import { startOfDay } from './date'

// День, к которому относится задача в планировщике/календаре:
// приоритет у даты старта, иначе - дедлайн.
export function taskDayTs(t: Task): number | null {
  if (t.start != null) return startOfDay(new Date(t.start)).getTime()
  if (t.deadline != null) return startOfDay(new Date(t.deadline)).getTime()
  return null
}

export function groupTasksByDay(tasks: Task[]): Map<number, Task[]> {
  const map = new Map<number, Task[]>()
  for (const t of tasks) {
    const day = taskDayTs(t)
    if (day == null) continue
    const arr = map.get(day) ?? []
    arr.push(t)
    map.set(day, arr)
  }
  return map
}

export function groupEventsByDay(events: CalendarEvent[]): Map<number, CalendarEvent[]> {
  const map = new Map<number, CalendarEvent[]>()
  for (const e of events) {
    const day = startOfDay(new Date(e.start)).getTime()
    const arr = map.get(day) ?? []
    arr.push(e)
    map.set(day, arr)
  }
  return map
}
