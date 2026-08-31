import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

export function useTagMap() {
  const tags = useLiveQuery(() => db.tags.toArray(), [])
  return useMemo(() => new Map((tags ?? []).map((t) => [t.id, t] as const)), [tags])
}

export function useProjectMap() {
  const projects = useLiveQuery(() => db.projects.toArray(), [])
  return useMemo(() => new Map((projects ?? []).map((p) => [p.id, p] as const)), [projects])
}

// Счётчик пунктов чек-листа по задачам: { [taskId]: [done, total] }
export function useChecklistCounts() {
  const items = useLiveQuery(() => db.checklistItems.toArray(), [])
  return useMemo(() => {
    const map = new Map<string, [number, number]>()
    for (const it of items ?? []) {
      const cur = map.get(it.taskId) ?? [0, 0]
      cur[1]++
      if (it.complete) cur[0]++
      map.set(it.taskId, cur)
    }
    return map
  }, [items])
}
