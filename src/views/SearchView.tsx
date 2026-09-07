import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useUI } from '../store/ui'
import { useTagMap, useProjectMap, useChecklistCounts } from '../lib/hooks'
import { FlatList } from '../components/tasks/FlatList'
import { ViewShell, EmptyState } from './shell'

const strip = (html: string) => html.replace(/<[^>]+>/g, ' ')

export function SearchView() {
  const { search, sort } = useUI()
  const q = search.trim().toLowerCase()
  const tagsById = useTagMap()
  const projectsById = useProjectMap()
  const checklistCounts = useChecklistCounts()

  const tasks = useLiveQuery(async () => {
    const all = await db.tasks.filter((t) => !t.removed).toArray()
    return all.filter(
      (t) => t.title.toLowerCase().includes(q) || strip(t.note).toLowerCase().includes(q),
    )
  }, [q])

  return (
    <ViewShell>
      <div className="mb-2 px-2 text-sm text-faint">
        Результаты поиска: «{search}» - {tasks?.length ?? 0}
      </div>
      {tasks && tasks.length === 0 ? (
        <EmptyState text="Ничего не найдено." />
      ) : (
        <FlatList
          tasks={tasks ?? []}
          tagsById={tagsById}
          projectsById={projectsById}
          checklistCounts={checklistCounts}
          sort={sort}
        />
      )}
    </ViewShell>
  )
}
