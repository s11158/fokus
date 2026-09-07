import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useUI } from '../store/ui'
import { useTagMap, useProjectMap, useChecklistCounts } from '../lib/hooks'
import { FlatList } from '../components/tasks/FlatList'
import { TaskComposer } from '../components/tasks/TaskComposer'
import { ViewShell, EmptyState } from './shell'

export function InboxView() {
  const sort = useUI((s) => s.sort)
  const tagsById = useTagMap()
  const projectsById = useProjectMap()
  const checklistCounts = useChecklistCounts()

  const tasks = useLiveQuery(
    () => db.tasks.filter((t) => !t.removed && !t.projectId && !t.deferred).toArray(),
    [],
  )

  return (
    <ViewShell composer={<TaskComposer projectId={null} />}>
      {tasks && tasks.length === 0 ? (
        <EmptyState text="Входящие пусты. Быстро запишите всё, что в голове - разберёте позже." />
      ) : (
        <FlatList
          tasks={tasks ?? []}
          tagsById={tagsById}
          projectsById={projectsById}
          checklistCounts={checklistCounts}
          sort={sort}
          showProject={false}
        />
      )}
    </ViewShell>
  )
}
