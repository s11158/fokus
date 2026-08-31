// Коннектор к SingularityApp по HTTP API.
// ВАЖНО: точные адреса эндпоинтов НЕ зафиксированы — их нужно взять из официальной
// документации API SingularityApp. Здесь они вынесены в константы с пометкой TODO,
// а базовый адрес (apiBaseUrl) и токен задаются пользователем в настройках.
import type { Task } from '../db/types'
import type { TaskConnector, RemoteProject, RemoteTask } from './connector'
import { buildNoteMap, mapProjectRecord, mapTaskRecord } from './singularityMap'

// TODO: подставить реальные пути из официальной документации SingularityApp API.
const ENDPOINTS = {
  ping: '/api/v1/me',
  projects: '/api/v1/projects',
  tasks: '/api/v1/tasks',
  createTask: '/api/v1/tasks',
  updateTask: (id: string) => `/api/v1/tasks/${id}`,
}

export class SingularityConnector implements TaskConnector {
  readonly id = 'singularity'
  readonly name = 'SingularityApp'

  constructor(private apiBaseUrl: string, private apiToken: string) {}

  private get base() {
    return this.apiBaseUrl.replace(/\/$/, '')
  }
  private headers(): HeadersInit {
    return {
      'content-type': 'application/json',
      // Авторизация по токену (Bearer). Точная схема — см. документацию.
      authorization: `Bearer ${this.apiToken}`,
    }
  }
  private async req(path: string, init?: RequestInit) {
    if (!this.apiBaseUrl) throw new Error('Не задан apiBaseUrl (см. документацию SingularityApp API).')
    if (!this.apiToken) throw new Error('Не задан токен.')
    const res = await fetch(this.base + path, {
      ...init,
      headers: { ...this.headers(), ...(init?.headers || {}) },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`${this.name} ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
    return res
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.req(ENDPOINTS.ping)
      return true
    } catch {
      return false
    }
  }

  async fetchProjects(): Promise<RemoteProject[]> {
    const data = await (await this.req(ENDPOINTS.projects)).json()
    const list: any[] = Array.isArray(data) ? data : data.projects ?? data.items ?? []
    const notes = buildNoteMap(data.notes)
    return list.filter((p) => p?.id).map((p) => ({ ...mapProjectRecord(p, notes), externalId: p.id }))
  }

  async fetchTasks(): Promise<RemoteTask[]> {
    const data = await (await this.req(ENDPOINTS.tasks)).json()
    const list: any[] = Array.isArray(data) ? data : data.tasks ?? data.items ?? []
    const notes = buildNoteMap(data.notes)
    return list.filter((t) => t?.id).map((t) => ({ ...mapTaskRecord(t, notes).task, externalId: t.id }))
  }

  async createTask(task: Task): Promise<{ externalId: string }> {
    // Маппинг нашей модели обратно во внешнюю. Поля — по документации API.
    const payload = {
      title: task.title,
      note: task.note,
      projectId: task.projectId, // схема id: проекты P-uuid, задачи T-uuid
      priority: task.priority,
      start: task.start ? new Date(task.start).toISOString() : null,
      complete: task.complete,
      deferred: task.deferred,
      tags: task.tags,
    }
    const data = await (await this.req(ENDPOINTS.createTask, { method: 'POST', body: JSON.stringify(payload) })).json()
    const externalId = data.id || data.task?.id
    if (!externalId) throw new Error('API не вернул id созданной задачи')
    return { externalId }
  }

  async updateTask(externalId: string, patch: Partial<Task>): Promise<void> {
    const payload: Record<string, unknown> = {}
    if (patch.title != null) payload.title = patch.title
    if (patch.note != null) payload.note = patch.note
    if (patch.complete != null) payload.complete = patch.complete
    if (patch.priority != null) payload.priority = patch.priority
    if (patch.projectId !== undefined) payload.projectId = patch.projectId
    if (patch.start !== undefined) payload.start = patch.start ? new Date(patch.start).toISOString() : null
    await this.req(ENDPOINTS.updateTask(externalId), { method: 'PATCH', body: JSON.stringify(payload) })
  }
}
