import { useEffect } from 'react'
import { db } from '../db/db'
import { markReminderFired } from '../db/repo'

// Фоновый опрос напоминаний: каждые 20с проверяем «сработавшие» и шлём уведомление.
export function useReminderScheduler() {
  useEffect(() => {
    let stopped = false

    const check = async () => {
      if (stopped) return
      const nowTs = Date.now()
      const tasks = await db.tasks.filter((t) => !t.removed && !t.complete && t.reminders.length > 0).toArray()
      for (const t of tasks) {
        for (const r of t.reminders) {
          if (!r.fired && r.at <= nowTs) {
            notify(t.title || 'Задача', t.note)
            await markReminderFired(t.id, r.id)
          }
        }
      }
    }

    const notify = (title: string, body: string) => {
      const text = body.replace(/<[^>]+>/g, ' ').trim().slice(0, 120)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try { new Notification('⏰ ' + title, { body: text, tag: title }) } catch { /* ignore */ }
      } else {
        // Фолбэк, если уведомления не разрешены.
        console.info('[Напоминание]', title, text)
      }
    }

    check()
    const id = setInterval(check, 20_000)
    return () => { stopped = true; clearInterval(id) }
  }, [])
}
