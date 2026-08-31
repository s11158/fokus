// Генерация идентификаторов. Префикс помогает читать данные при отладке.
export function uid(prefix = ''): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return prefix ? `${prefix}-${rnd}` : rnd
}

export const now = () => Date.now()
