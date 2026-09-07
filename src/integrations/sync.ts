// Синхронизация с внешним источником через TaskConnector.
// Стратегия конфликтов - last-write-wins по modifiedDate.
import { db } from '../db/db'
import { setTaskChangeHandler } from '../db/repo'
import { SingularityConnector } from './singularityConnector'
import { DEFAULT_CONNECTOR, type ConnectorConfig, type TaskConnector } from './connector'
import { now } from '../lib/id'

export async function loadConnectorConfig(): Promise<ConnectorConfig> {
  const row = await db.settings.get('connector')
  return { ...DEFAULT_CONNECTOR, ...(row?.value as Partial<ConnectorConfig> | undefined) }
}
export async function saveConnectorConfig(patch: Partial<ConnectorConfig>) {
  const cur = await loadConnectorConfig()
  await db.settings.put({ id: 'connector', value: { ...cur, ...patch } })
}

export function makeConnector(cfg: ConnectorConfig): TaskConnector {
  // Точка расширения: по cfg можно выбирать разные коннекторы.
  return new SingularityConnector(cfg.apiBaseUrl, cfg.apiToken)
}

async function getLastSync(): Promise<number> {
  return ((await db.settings.get('connector_lastSync'))?.value as number) ?? 0
}
async function setLastSync(ts: number) {
  await db.settings.put({ id: 'connector_lastSync', value: ts })
}

export interface SyncStats { pulled: number; pushed: number; created: number }

// Импорт/слияние данных из внешнего источника (last-write-wins).
export async function importViaConnector(conn: TaskConnector): Promise<{ projects: number; tasks: number }> {
  const [projects, tasks] = await Promise.all([conn.fetchProjects(), conn.fetchTasks()])

  await db.transaction('rw', db.projects, db.tasks, async () => {
    for (const rp of projects) {
      const local = await db.projects.get(rp.id)
      if (!local || rp.modifiedDate >= local.modifiedDate) await db.projects.put(rp)
    }
    for (const rt of tasks) {
      const local = await db.tasks.get(rt.id)
      if (!local || rt.modifiedDate >= local.modifiedDate) await db.tasks.put(rt)
    }
  })
  return { projects: projects.length, tasks: tasks.length }
}

// Полная синхронизация: тянем удалённое (LWW) и отправляем локальные изменения.
export async function syncNow(conn: TaskConnector): Promise<SyncStats> {
  const lastSync = await getLastSync()
  const pull = await importViaConnector(conn)

  let pushed = 0
  let created = 0
  // Локальные задачи, изменённые после прошлой синхронизации.
  const changed = await db.tasks.filter((t) => t.modifiedDate > lastSync && !t.removed).toArray()
  for (const t of changed) {
    try {
      if (t.externalId) {
        await conn.updateTask(t.externalId, t)
        pushed++
      } else {
        const { externalId } = await conn.createTask(t)
        await db.tasks.update(t.id, { externalId })
        created++
      }
    } catch (e) {
      console.warn('[sync] не удалось отправить задачу', t.id, e)
    }
  }

  await setLastSync(now())
  return { pulled: pull.tasks, pushed, created }
}

// Пуш одного локального изменения (если включён pushOnChange).
let pushTimer: ReturnType<typeof setTimeout> | null = null
const pendingPush = new Set<string>()

export function initConnectorSync() {
  // repo вызывает этот обработчик при изменении задачи (без циклического импорта).
  setTaskChangeHandler((taskId) => {
    pendingPush.add(taskId)
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(flushPush, 1500) // дебаунс
  })
}

async function flushPush() {
  pushTimer = null
  const cfg = await loadConnectorConfig()
  if (!cfg.syncEnabled || !cfg.pushOnChange || !cfg.apiBaseUrl || !cfg.apiToken) { pendingPush.clear(); return }
  const conn = makeConnector(cfg)
  const ids = [...pendingPush]
  pendingPush.clear()
  for (const id of ids) {
    const t = await db.tasks.get(id)
    if (!t) continue
    try {
      if (t.externalId) await conn.updateTask(t.externalId, t)
      else { const { externalId } = await conn.createTask(t); await db.tasks.update(t.id, { externalId }) }
    } catch (e) {
      console.warn('[sync] push изменения не удался', id, e)
    }
  }
}
