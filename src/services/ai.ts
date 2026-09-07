// AI-сервис для разбора «сырого» захвата в структуру задачи.
// Провайдер заменяем (интерфейс AIProvider). Ключ хранится только локально (в настройках).
import { db } from '../db/db'

export interface AISettings {
  provider: 'anthropic'
  apiKey: string
  model: string
  baseUrl?: string // для прокси/совместимых эндпоинтов
}

export const DEFAULT_AI: AISettings = {
  provider: 'anthropic',
  apiKey: '',
  model: 'claude-haiku-4-5-20251001',
  baseUrl: 'https://api.anthropic.com',
}

export async function loadAISettings(): Promise<AISettings> {
  const row = await db.settings.get('ai')
  return { ...DEFAULT_AI, ...(row?.value as Partial<AISettings> | undefined) }
}
export async function saveAISettings(patch: Partial<AISettings>) {
  const cur = await loadAISettings()
  await db.settings.put({ id: 'ai', value: { ...cur, ...patch } })
}

// Результат разбора (до маппинга в задачу).
export interface ParsedCapture {
  title: string
  note?: string
  projectId?: string | null
  priority?: 0 | 1 | 2 | 3
  start?: string | null // ISO
  deadline?: string | null // ISO
  tags?: string[] // названия тегов
  subtasks?: string[]
}

export interface CaptureContext {
  projects: { id: string; title: string }[]
  tags: string[]
  today: string // YYYY-MM-DD
}

export interface AIProvider {
  parse(text: string, ctx: CaptureContext): Promise<ParsedCapture>
}

const TASK_TOOL = {
  name: 'create_task',
  description: 'Преобразовать заметку пользователя в структурированную задачу.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Краткий заголовок задачи (без даты и тегов внутри).' },
      note: { type: 'string', description: 'Доп. детали/описание, если есть.' },
      projectId: { type: ['string', 'null'], description: 'id подходящего проекта из списка или null.' },
      priority: { type: 'integer', enum: [0, 1, 2, 3], description: '0 нет, 1 низкий, 2 средний, 3 высокий.' },
      start: { type: ['string', 'null'], description: 'Дата начала ISO (YYYY-MM-DD или с временем) или null.' },
      deadline: { type: ['string', 'null'], description: 'Дедлайн ISO или null.' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Метки (короткие слова).' },
      subtasks: { type: 'array', items: { type: 'string' }, description: 'Список подзадач, если задача разбивается.' },
    },
    required: ['title'],
  },
}

class AnthropicProvider implements AIProvider {
  constructor(private s: AISettings) {}

  async parse(text: string, ctx: CaptureContext): Promise<ParsedCapture> {
    const projectList = ctx.projects.map((p) => `- ${p.title} (id: ${p.id})`).join('\n') || '(нет проектов)'
    const prompt =
      `Сегодня ${ctx.today}. Разбери заметку в задачу по методологии GTD. ` +
      `Если в тексте есть относительная дата (завтра, в пятницу, через неделю) - переведи в конкретную ISO-дату. ` +
      `Подбери подходящий проект из списка по смыслу (или null). Существующие теги: ${ctx.tags.join(', ') || '-'}.\n\n` +
      `Проекты:\n${projectList}\n\nЗаметка:\n"""${text}"""`

    const res = await fetch(`${this.s.baseUrl || DEFAULT_AI.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.s.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.s.model,
        max_tokens: 1024,
        tools: [TASK_TOOL],
        tool_choice: { type: 'tool', name: 'create_task' },
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`AI ${res.status}: ${t.slice(0, 200)}`)
    }
    const data = await res.json()
    const tool = (data.content ?? []).find((c: any) => c.type === 'tool_use')
    if (!tool?.input) throw new Error('AI не вернул структуру')
    return tool.input as ParsedCapture
  }
}

export function makeProvider(s: AISettings): AIProvider {
  // Точка расширения: сюда можно добавить другие провайдеры.
  return new AnthropicProvider(s)
}

export async function parseCapture(text: string, ctx: CaptureContext): Promise<ParsedCapture> {
  const s = await loadAISettings()
  if (!s.apiKey) throw new Error('Не задан API-ключ. Откройте Настройки, раздел AI.')
  return makeProvider(s).parse(text, ctx)
}
