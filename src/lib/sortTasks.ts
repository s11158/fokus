import type { Task } from '../db/types'
import type { SortSpec } from '../store/ui'
import { isOverdue } from './date'

// Стабильная сортировка задач по выбранному критерию.
export function sortTasks(tasks: Task[], sort: SortSpec): Task[] {
  const arr = [...tasks]
  const dir = sort.reverse ? -1 : 1

  const cmp: Record<SortSpec['field'], (a: Task, b: Task) => number> = {
    manual: (a, b) => a.order - b.order,
    priority: (a, b) => b.priority - a.priority,
    start: (a, b) => (a.start ?? Infinity) - (b.start ?? Infinity),
    deadline: (a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity),
    alpha: (a, b) => a.title.localeCompare(b.title, 'ru'),
    smart: smartScoreCmp,
  }

  arr.sort((a, b) => {
    // Закреплённые всегда сверху (кроме ручного порядка, где pin учитывается тоже).
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    const r = cmp[sort.field](a, b)
    if (r !== 0) return r * (sort.field === 'manual' ? 1 : dir)
    return a.order - b.order
  })
  return arr
}

// «Умная» сортировка: просроченные → дедлайн скоро → приоритет → дата старта.
function smartScoreCmp(a: Task, b: Task): number {
  return score(a) - score(b)
}
function score(t: Task): number {
  let s = 0
  if (isOverdue(t.deadline)) s -= 10000
  if (t.deadline) s += (t.deadline - Date.now()) / 3_600_000 // часы до дедлайна
  s -= t.priority * 24 // приоритет смещает на сутки
  if (t.start) s += (t.start - Date.now()) / 3_600_000 / 10
  return s
}
