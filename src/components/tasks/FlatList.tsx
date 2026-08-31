import type { Project, Tag, Task } from '../../db/types'
import type { SortSpec } from '../../store/ui'
import { sortTasks } from '../../lib/sortTasks'
import { TaskRow } from './TaskRow'

interface Props {
  tasks: Task[]
  tagsById: Map<string, Tag>
  projectsById: Map<string, Project>
  checklistCounts: Map<string, [number, number]>
  sort: SortSpec
  showProject?: boolean
}

// Плоский список (умные представления, поиск, корзина).
export function FlatList({ tasks, tagsById, projectsById, checklistCounts, sort, showProject = true }: Props) {
  return (
    <div>
      {sortTasks(tasks, sort).map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          tagsById={tagsById}
          projectsById={projectsById}
          checklist={checklistCounts.get(task.id)}
          showProject={showProject}
        />
      ))}
    </div>
  )
}
