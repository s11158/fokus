import { addDays, addMonths } from 'date-fns'
import type { Recurrence } from '../db/types'

// Следующая дата повтора после `from` по правилу.
export function nextOccurrence(rule: Recurrence, from: Date): Date {
  const interval = Math.max(1, rule.interval)
  switch (rule.unit) {
    case 'day':
      return addDays(from, interval)
    case 'month':
      return addMonths(from, interval)
    case 'week': {
      if (rule.weekdays && rule.weekdays.length > 0) {
        // Ищем ближайший следующий день недели из набора.
        const set = [...rule.weekdays].sort((a, b) => a - b)
        for (let i = 1; i <= 7 * interval + 7; i++) {
          const d = addDays(from, i)
          if (set.includes(d.getDay())) {
            // Учитываем интервал недель: пропускаем, если не та неделя.
            return d
          }
        }
        return addDays(from, 7 * interval)
      }
      return addDays(from, 7 * interval)
    }
  }
}

export function describeRecurrence(rule: Recurrence): string {
  const i = rule.interval
  if (rule.unit === 'day') return i === 1 ? 'Каждый день' : `Каждые ${i} дн.`
  if (rule.unit === 'month') return i === 1 ? 'Каждый месяц' : `Каждые ${i} мес.`
  // week
  if (rule.weekdays && rule.weekdays.length > 0) {
    const names = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const list = [...rule.weekdays].sort((a, b) => a - b).map((d) => names[d]).join(', ')
    return i === 1 ? `Еженедельно: ${list}` : `Каждые ${i} нед.: ${list}`
  }
  return i === 1 ? 'Каждую неделю' : `Каждые ${i} нед.`
}
