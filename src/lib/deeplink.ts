// Deep-link: открытие конкретной задачи/страницы по ссылке.
// Поддержка схемы appname://?page=...&id=T-... (через protocol_handlers PWA, где
// зарегистрированный URL приходит как ?deeplink=...) и прямых query-параметров
// вида ?page=project&id=T-... или ?id=T-...
import { db } from '../db/db'
import { useUI } from '../store/ui'

function parseParams(): URLSearchParams | null {
  const sp = new URLSearchParams(window.location.search)
  // protocol_handlers передаёт исходный URL в ?deeplink=web+fokus://...
  const dl = sp.get('deeplink')
  if (dl) {
    const q = dl.split('?')[1]
    if (q) return new URLSearchParams(q)
  }
  if (sp.get('id') || sp.get('page')) return sp
  return null
}

export async function applyDeepLink() {
  const sp = parseParams()
  if (!sp) return
  const id = sp.get('id')
  const page = sp.get('page')
  const ui = useUI.getState()

  if (id && id.startsWith('T-')) {
    const task = await db.tasks.get(id)
    if (task) {
      if (task.projectId) ui.openProject(task.projectId)
      else ui.setView({ kind: 'inbox' })
      ui.selectTask(task.id)
    }
  } else if (id && id.startsWith('P-')) {
    ui.openProject(id)
  } else if (page) {
    const map: Record<string, () => void> = {
      today: () => ui.setView({ kind: 'today' }),
      inbox: () => ui.setView({ kind: 'inbox' }),
      planner: () => ui.setView({ kind: 'planner' }),
      calendar: () => ui.setView({ kind: 'calendar' }),
      someday: () => ui.setView({ kind: 'someday' }),
    }
    map[page]?.()
  }

  // Чистим query, чтобы deep-link не срабатывал повторно при навигации.
  if (window.history.replaceState) {
    window.history.replaceState({}, '', window.location.pathname)
  }
}

// Ссылка на задачу для копирования/шеринга.
export function taskDeepLink(taskId: string): string {
  return `${window.location.origin}${window.location.pathname}?page=task&id=${taskId}`
}
