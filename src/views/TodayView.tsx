import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useUI } from '../store/ui'
import { useTagMap, useProjectMap, useChecklistCounts } from '../lib/hooks'
import { FlatList } from '../components/tasks/FlatList'
import { TaskComposer } from '../components/tasks/TaskComposer'
import { ViewShell, EmptyState } from './shell'
import { endOfDay, startOfDay } from '../lib/date'

export function TodayView() {
  const sort = useUI((s) => s.sort)
  const tagsById = useTagMap()
  const projectsById = useProjectMap()
  const checklistCounts = useChecklistCounts()

  const tasks = useLiveQuery(async () => {
    const end = endOfDay(new Date()).getTime()
    const all = await db.tasks.filter((t) => !t.removed && !t.complete && !t.deferred).toArray()
    return all.filter((t) => (t.start != null && t.start <= end) || (t.deadline != null && t.deadline <= end))
  }, [])

  const todayStart = startOfDay(new Date()).getTime()

  return (
    <ViewShell composer={<TaskComposer defaultStart={todayStart} />}>
      {tasks && tasks.length === 0 ? (
        <EmptyState text="На сегодня всё чисто 🎉 Просроченных и запланированных задач нет." />
      ) : (
        <FlatList
          tasks={tasks ?? []}
          tagsById={tagsById}
          projectsById={projectsById}
          checklistCounts={checklistCounts}
          sort={sort.field === 'manual' ? { field: 'smart', reverse: false } : sort}
        />
      )}
    </ViewShell>
  )
}
