import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useUI } from '../store/ui'
import { useTagMap, useProjectMap, useChecklistCounts } from '../lib/hooks'
import { FlatList } from '../components/tasks/FlatList'
import { TaskComposer } from '../components/tasks/TaskComposer'
import { ViewShell, EmptyState } from './shell'

export function SomedayView() {
  const sort = useUI((s) => s.sort)
  const tagsById = useTagMap()
  const projectsById = useProjectMap()
  const checklistCounts = useChecklistCounts()

  const tasks = useLiveQuery(
    () => db.tasks.filter((t) => !t.removed && t.deferred && !t.complete).toArray(),
    [],
  )

  return (
    <ViewShell composer={<TaskComposer deferred />}>
      {tasks && tasks.length === 0 ? (
        <EmptyState text="«Когда-нибудь» — для идей и задач без даты. Пока пусто." />
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
