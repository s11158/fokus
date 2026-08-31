// Коннектор к локальному мосту Telegram-бота.
// Тянет захваты -> создаёт задачи в Inbox -> подтверждает; пушит снимок Inbox/Сегодня.
import { db } from '../db/db'
import { createTask, createTag } from '../db/repo'
import { endOfDay } from '../lib/date'
import type { Priority } from '../db/types'

export interface BridgeSettings {
  enabled: boolean
  url: string
}
export const DEFAULT_BRIDGE: BridgeSettings = { enabled: false, url: 'http://localhost:8787' }

export async function loadBridgeSettings(): Promise<BridgeSettings> {
  const row = await db.settings.get('bridge')
  return { ...DEFAULT_BRIDGE, ...(row?.value as Partial<BridgeSettings> | undefined) }
}
export async function saveBridgeSettings(patch: Partial<BridgeSettings>) {
  const cur = await loadBridgeSettings()
  await db.settings.put({ id: 'bridge', value: { ...cur, ...patch } })
}

export async function pingBridge(url: string): Promise<boolean> {
  try {
    const r = await fetch(url.replace(/\/$/, '') + '/health', { signal: AbortSignal.timeout(3000) })
    return r.ok
  } catch {
    return false
  }
}

interface BridgeTask {
  title: string
  note?: string
  projectId?: string | null
  priority?: number
  start?: string | null
  deadline?: string | null
  tags?: string[]
  subtasks?: string[]
}

async function tagIdsFromNames(names: string[]): Promise<string[]> {
  const all = await db.tags.toArray()
  const ids: string[] = []
  for (const name of names) {
    const ex = all.find((t) => t.title.toLowerCase() === name.toLowerCase())
    ids.push(ex ? ex.id : await createTag(name))
  }
  return ids
}

const toMs = (s?: string | null) => (s ? new Date(s).getTime() || null : null)

// Один цикл синхронизации: импорт захватов + отправка снимка.
export async function syncBridgeOnce(url: string): Promise<{ imported: number }> {
  const base = url.replace(/\/$/, '')

  // 1) Забираем захваты.
  const res = await fetch(base + '/captures', { signal: AbortSignal.timeout(4000) })
  if (!res.ok) throw new Error('bridge /captures ' + res.status)
  const { captures } = (await res.json()) as { captures: { id: string; task: BridgeTask }[] }

  const done: string[] = []
  for (const c of captures) {
    const t = c.task
    if (!t?.title) { done.push(c.id); continue }
    const tags = t.tags?.length ? await tagIdsFromNames(t.tags) : []
    const start = toMs(t.start)
    const parentId = await createTask({
      title: t.title,
      note: t.note ?? '',
      projectId: t.projectId ?? null,
      priority: (Math.max(0, Math.min(3, t.priority ?? 0))) as Priority,
      start,
      useTime: !!(t.start && t.start.length > 10),
      deadline: toMs(t.deadline),
      tags,
    })
    for (const st of t.subtasks ?? []) {
      if (st.trim()) await createTask({ title: st.trim(), parentId, projectId: t.projectId ?? null })
    }
    done.push(c.id)
  }
  if (done.length) {
    await fetch(base + '/captures/ack', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: done }),
    }).catch(() => {})
  }

  // 2) Пушим снимок Inbox/Сегодня для команд /inbox /today.
  const endToday = endOfDay(new Date()).getTime()
  const tasks = await db.tasks.filter((t) => !t.removed && !t.complete).toArray()
  const inbox = tasks.filter((t) => !t.projectId && !t.deferred).map((t) => t.title || '(без названия)')
  const today = tasks
    .filter((t) => !t.deferred && ((t.start != null && t.start <= endToday) || (t.deadline != null && t.deadline <= endToday)))
    .map((t) => t.title || '(без названия)')
  await fetch(base + '/snapshot', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ inbox, today }),
  }).catch(() => {})

  return { imported: done.length }
}
