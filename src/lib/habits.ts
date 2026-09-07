import { addDays, todayKey } from './date'
import type { Habit } from '../db/types'

export function isScheduled(habit: Habit, date: Date): boolean {
  if (!habit.scheduleDays || habit.scheduleDays.length === 0) return true
  return habit.scheduleDays.includes(date.getDay())
}

// Текущая серия (streak): подряд выполненные запланированные дни до сегодня.
export function computeStreak(habit: Habit, doneDates: Set<string>): number {
  let streak = 0
  let cursor = new Date()
  // Если сегодня запланировано, но ещё не сделано - серия считается со вчера.
  if (isScheduled(habit, cursor) && !doneDates.has(todayKey(cursor))) {
    cursor = addDays(cursor, -1)
  }
  for (let i = 0; i < 366; i++) {
    if (!isScheduled(habit, cursor)) { cursor = addDays(cursor, -1); continue }
    if (doneDates.has(todayKey(cursor))) { streak++; cursor = addDays(cursor, -1) }
    else break
  }
  return streak
}
