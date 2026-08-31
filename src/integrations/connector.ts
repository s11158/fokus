// Абстрактный слой интеграций: интерфейс коннектора к внешнему таск-менеджеру.
// Любой провайдер (Singularity, Todoist, …) реализует TaskConnector.
import type { Project, Task } from '../db/types'

// «Сырая» сущность из внешнего источника, уже приведённая к нашей модели,
// но помеченная externalId (исходный id во внешней системе).
export type RemoteProject = Omit<Project, never> & { externalId: string }
export type RemoteTask = Omit<Task, never> & { externalId: string }

export interface ConnectorConfig {
  apiBaseUrl: string
  apiToken: string
  syncEnabled: boolean // двусторонняя синхронизация
  pushOnChange: boolean // отправлять локальные изменения сразу
}

export const DEFAULT_CONNECTOR: ConnectorConfig = {
  // НЕ хардкодим конкретный адрес — пользователь вписывает из официальной документации API.
  apiBaseUrl: '',
  apiToken: '',
  syncEnabled: false,
  pushOnChange: false,
}

export interface TaskConnector {
  readonly id: string
  readonly name: string
  /** Проверка доступности и авторизации. */
  testConnection(): Promise<boolean>
  fetchProjects(): Promise<RemoteProject[]>
  fetchTasks(): Promise<RemoteTask[]>
  /** Создать задачу во внешнем источнике, вернуть её внешний id. */
  createTask(task: Task): Promise<{ externalId: string }>
  /** Отправить изменение во внешний источник по внешнему id. */
  updateTask(externalId: string, patch: Partial<Task>): Promise<void>
}
