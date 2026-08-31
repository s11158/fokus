import { create } from 'zustand'
import { recordFocusSession } from '../db/repo'
import { todayKey } from '../lib/date'

export const FOCUS_PRESETS = [5, 10, 15, 20, 25, 30, 45, 60]

interface FocusState {
  open: boolean
  preset: number // минуты
  remaining: number // секунды
  running: boolean
  taskId: string | null
  taskTitle: string | null
  completed: number // помидоров завершено за сессию
  startedAt: number | null

  setOpen: (open: boolean) => void
  setPreset: (min: number) => void
  bindTask: (id: string | null, title: string | null) => void
  start: () => void
  pause: () => void
  reset: () => void
  tick: () => void
}

export const useFocus = create<FocusState>((set, get) => ({
  open: false,
  preset: 25,
  remaining: 25 * 60,
  running: false,
  taskId: null,
  taskTitle: null,
  completed: 0,
  startedAt: null,

  setOpen: (open) => set({ open }),
  setPreset: (min) =>
    set((s) => (s.running ? s : { preset: min, remaining: min * 60 })),
  bindTask: (taskId, taskTitle) => set({ taskId, taskTitle }),
  start: () => set((s) => ({ running: true, startedAt: s.startedAt ?? Date.now() })),
  pause: () => set({ running: false }),
  reset: () => set((s) => ({ running: false, remaining: s.preset * 60, startedAt: null })),

  tick: () => {
    const s = get()
    if (!s.running) return
    if (s.remaining > 1) {
      set({ remaining: s.remaining - 1 })
      return
    }
    // Сессия завершена.
    set({ remaining: 0, running: false, completed: s.completed + 1, startedAt: null })
    recordFocusSession({
      taskId: s.taskId,
      start: s.startedAt ?? Date.now() - s.preset * 60_000,
      duration: s.preset * 60,
      type: 'focus',
      date: todayKey(),
    })
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('🍅 Фокус завершён', { body: s.taskTitle ?? `${s.preset} мин сосредоточенной работы` }) } catch { /* ignore */ }
    }
    // Готовим следующий помидор.
    setTimeout(() => set((st) => ({ remaining: st.preset * 60 })), 1200)
  },
}))
