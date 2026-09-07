import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Trash2, FileText } from 'lucide-react'
import { db } from '../db/db'
import { updateProject, removeProject } from '../db/repo'
import { useUI } from '../store/ui'
import { useTagMap, useProjectMap, useChecklistCounts } from '../lib/hooks'
import { TaskTree } from '../components/tasks/TaskTree'
import { TaskComposer } from '../components/tasks/TaskComposer'
import { RichEditor } from '../components/ui/RichEditor'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { ViewShell, EmptyState } from './shell'
import type { Project } from '../db/types'

function ProjectHeader({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const [showNote, setShowNote] = useState(false)
  return (
    <>
      <div className="flex items-center gap-2 px-1">
        <input
          value={project.emoji}
          onChange={(e) => updateProject(project.id, { emoji: e.target.value.slice(0, 2) })}
          className="w-9 rounded-lg bg-surface-2 px-2 py-1 text-center text-base outline-none"
          placeholder="🙂"
        />
        <input
          value={project.title}
          onChange={(e) => updateProject(project.id, { title: e.target.value })}
          className="input flex-1 text-lg font-semibold"
          placeholder="Название проекта"
        />
        <button className="icon-btn" title="Описание проекта" onClick={() => setShowNote((v) => !v)}>
          <FileText size={17} />
        </button>
        <button className="icon-btn hover:text-rose-400" title="Удалить проект" onClick={onDelete}>
          <Trash2 size={17} />
        </button>
      </div>
      {showNote && (
        <div className="mt-2 px-1">
          <RichEditor value={project.note} onChange={(html) => updateProject(project.id, { note: html })} placeholder="Описание проекта…" />
        </div>
      )}
    </>
  )
}

export function ProjectView({ projectId }: { projectId: string }) {
  const { sort, projectMode, setView } = useUI()
  const tagsById = useTagMap()
  const projectsById = useProjectMap()
  const checklistCounts = useChecklistCounts()

  const project = useLiveQuery(() => db.projects.get(projectId), [projectId])
  const tasks = useLiveQuery(
    () => db.tasks.where('projectId').equals(projectId).filter((t) => !t.removed).toArray(),
    [projectId],
  )

  if (!project) return null

  const onDelete = async () => {
    if (confirm(`Удалить проект «${project.title}» в корзину?`)) {
      await removeProject(projectId)
      setView({ kind: 'today' })
    }
  }

  // Канбан - на всю ширину.
  if (projectMode === 'kanban') {
    return (
      <div className="flex h-full flex-col">
        <div className="px-3 pt-3"><ProjectHeader project={project} onDelete={onDelete} /></div>
        <div className="min-h-0 flex-1"><KanbanBoard projectId={projectId} /></div>
      </div>
    )
  }

  const active = (tasks ?? []).filter((t) => !t.complete)
  const done = (tasks ?? []).filter((t) => t.complete)

  return (
    <ViewShell composer={<TaskComposer projectId={projectId} />}>
      <div className="mb-2"><ProjectHeader project={project} onDelete={onDelete} /></div>

      {active.length === 0 && done.length === 0 ? (
        <EmptyState text="В проекте пока нет задач. Добавьте первую внизу." />
      ) : (
        <>
          <TaskTree tasks={active} tagsById={tagsById} projectsById={projectsById} checklistCounts={checklistCounts} sort={sort} />
          {done.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer px-2 py-1 text-xs uppercase tracking-wide text-faint">
                Выполнено · {done.length}
              </summary>
              <TaskTree tasks={done} tagsById={tagsById} projectsById={projectsById} checklistCounts={checklistCounts} sort={sort} />
            </details>
          )}
        </>
      )}
    </ViewShell>
  )
}
