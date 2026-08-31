import { useLiveQuery } from 'dexie-react-hooks'
import { RotateCcw, Trash2 } from 'lucide-react'
import { db } from '../db/db'
import { restoreTask, purgeTask } from '../db/repo'
import { ViewShell, EmptyState } from './shell'

export function TrashView() {
  const tasks = useLiveQuery(() => db.tasks.filter((t) => t.removed).toArray(), [])

  return (
    <ViewShell>
      {tasks && tasks.length === 0 ? (
        <EmptyState text="Корзина пуста." />
      ) : (
        <div className="flex flex-col gap-0.5">
          <div className="mb-1 px-2 text-xs text-faint">{tasks?.length} в корзине</div>
          {tasks?.map((t) => (
            <div key={t.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2">
              <span className="flex-1 truncate text-sm text-muted line-through">
                {t.title || '(без названия)'}
              </span>
              <button className="icon-btn h-7 w-7" title="Восстановить" onClick={() => restoreTask(t.id)}>
                <RotateCcw size={15} />
              </button>
              <button
                className="icon-btn h-7 w-7 hover:text-rose-400"
                title="Удалить навсегда"
                onClick={() => { if (confirm('Удалить навсегда?')) purgeTask(t.id) }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ViewShell>
  )
}
