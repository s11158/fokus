import { useMemo, useState } from 'react'
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
}

// Дерево задач проекта с раскрытием подзадач.
export function TaskTree({ tasks, tagsById, projectsById, checklistCounts, sort }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const { childrenOf, roots } = useMemo(() => {
    const ids = new Set(tasks.map((t) => t.id))
    const childrenOf = new Map<string, Task[]>()
    const roots: Task[] = []
    for (const t of tasks) {
      if (t.parentId && ids.has(t.parentId)) {
        const arr = childrenOf.get(t.parentId) ?? []
        arr.push(t)
        childrenOf.set(t.parentId, arr)
      } else {
        roots.push(t)
      }
    }
    return { childrenOf, roots }
  }, [tasks])

  const toggle = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const render = (list: Task[], depth: number): React.ReactNode =>
    sortTasks(list, sort).map((task) => {
      const kids = childrenOf.get(task.id) ?? []
      const open = !collapsed.has(task.id)
      return (
        <div key={task.id}>
          <TaskRow
            task={task}
            tagsById={tagsById}
            projectsById={projectsById}
            checklist={checklistCounts.get(task.id)}
            depth={depth}
            hasChildren={kids.length > 0}
            expanded={open}
            onToggleExpand={() => toggle(task.id)}
            allowSubtask
          />
          {open && kids.length > 0 && render(kids, depth + 1)}
        </div>
      )
    })

  return <div>{render(roots, 0)}</div>
}
