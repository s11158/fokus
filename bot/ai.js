// Разбор текста заметки в задачу через Anthropic (тот же подход, что в приложении).
// Ключ - только из переменных окружения.

const TASK_TOOL = {
  name: 'create_task',
  description: 'Преобразовать заметку пользователя в структурированную задачу GTD.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      note: { type: 'string' },
      priority: { type: 'integer', enum: [0, 1, 2, 3] },
      start: { type: ['string', 'null'], description: 'ISO дата/время или null' },
      deadline: { type: ['string', 'null'] },
      tags: { type: 'array', items: { type: 'string' } },
      subtasks: { type: 'array', items: { type: 'string' } },
    },
    required: ['title'],
  },
}

export async function parseTask(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
  // Без ключа - деградация до «сырого» захвата (заголовок = текст).
  if (!apiKey) return { title: text.trim(), tags: [], subtasks: [] }

  const today = new Date().toISOString().slice(0, 10)
  const prompt =
    `Сегодня ${today}. Разбери заметку в задачу по GTD. Относительные даты переведи в ISO.\n\nЗаметка:\n"""${text}"""`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      tools: [TASK_TOOL],
      tool_choice: { type: 'tool', name: 'create_task' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    console.error('[ai] ошибка', res.status, await res.text().catch(() => ''))
    return { title: text.trim(), tags: [], subtasks: [] }
  }
  const data = await res.json()
  const tool = (data.content || []).find((c) => c.type === 'tool_use')
  return tool?.input || { title: text.trim(), tags: [], subtasks: [] }
}
