import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  startOfDay,
  endOfDay,
  addDays,
  addWeeks,
  addMonths,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns'
import { ru } from 'date-fns/locale'

export {
  startOfDay, endOfDay, addDays, addWeeks, addMonths, isSameDay, isSameMonth,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isToday,
}

// Неделя начинается с понедельника.
export const WEEK_OPTS = { weekStartsOn: 1 as const, locale: ru }

export function fmt(ts: number | Date, pattern: string): string {
  return format(typeof ts === 'number' ? new Date(ts) : ts, pattern, { locale: ru })
}

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export const WEEKDAYS_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

export function fmtDate(ts: number, withTime = false): string {
  const d = new Date(ts)
  const pat = withTime ? 'd MMM, HH:mm' : 'd MMM'
  return format(d, pat, { locale: ru })
}

// Человеческая метка даты для бейджей задач.
export function humanDate(ts: number, withTime = false): string {
  const d = new Date(ts)
  let base: string
  if (isToday(d)) base = 'Сегодня'
  else if (isTomorrow(d)) base = 'Завтра'
  else if (isYesterday(d)) base = 'Вчера'
  else base = format(d, 'd MMM', { locale: ru })
  if (withTime) base += ' ' + format(d, 'HH:mm')
  return base
}

export function isOverdue(ts: number | null): boolean {
  if (!ts) return false
  return isPast(new Date(ts)) && !isToday(new Date(ts))
}

export function todayKey(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd')
}
