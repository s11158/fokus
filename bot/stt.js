// Распознавание речи (STT) - заменяемый модуль.
// По умолчанию поддержан OpenAI-совместимый Whisper-эндпоинт (настраивается через .env).
// Чтобы подключить другой провайдер - реализуйте transcribe(buffer, mime) здесь.

export async function transcribe(audioBuffer, mime = 'audio/ogg') {
  const url = process.env.STT_API_URL // напр. https://api.openai.com/v1/audio/transcriptions
  const key = process.env.STT_API_KEY
  const model = process.env.STT_MODEL || 'whisper-1'
  if (!url || !key) {
    throw new Error('STT не настроен: задайте STT_API_URL и STT_API_KEY в .env')
  }

  const form = new FormData()
  form.append('file', new Blob([audioBuffer], { type: mime }), 'voice.ogg')
  form.append('model', model)
  form.append('language', 'ru')

  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}` },
    body: form,
  })
  if (!res.ok) throw new Error(`STT ${res.status}: ${await res.text().catch(() => '')}`)
  const data = await res.json()
  return data.text || ''
}
