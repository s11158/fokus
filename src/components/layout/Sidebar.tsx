import { useLiveQuery } from 'dexie-react-hooks'
import {
  Inbox, Star, CalendarDays, ClipboardList, Clock,
  Trash2, Plus, ChevronLeft, ChevronRight, Settings as Cog, Timer, Repeat,
  SlidersHorizontal,
} from 'lucide-react'
import { db } from '../../db/db'
import { createProject, createSmartFilter } from '../../db/repo'
import { useUI, type ViewKind } from '../../store/ui'
import { useFocus } from '../../store/focus'
import { cn } from '../../lib/cn'

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active: boolean
  collapsed: boolean
  badge?: number
  onClick: () => void
}
function NavItem({ icon, label, active, collapsed, badge, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
        active ? 'bg-accent-soft text-text' : 'text-muted hover:bg-surface-3 hover:text-text',
        collapsed && 'justify-center px-0',
      )}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="flex-1 truncate text-left">{label}</span>}
      {!collapsed && badge ? (
        <span className="rounded-full bg-surface-3 px-1.5 text-xs text-muted">{badge}</span>
      ) : null}
    </button>
  )
}

export function Sidebar() {
  const { view, setView, openProject, sidebarCollapsed, toggleSidebar } = useUI()
  const openFocus = useFocus((s) => s.setOpen)
  const collapsed = sidebarCollapsed

  const projects = useLiveQuery(
    () => db.projects.filter((p) => !p.removed && !p.archived).toArray(),
    [],
  )?.sort((a, b) => a.order - b.order)

  const filters = useLiveQuery(() => db.smartFilters.toArray(), [])?.sort((a, b) => a.order - b.order)

  const counts = useLiveQuery(async () => {
    const all = await db.tasks.filter((t) => !t.removed && !t.complete).toArray()
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const today = all.filter(
      (t) => !t.deferred && ((t.start && t.start <= todayEnd.getTime()) || (t.deadline && t.deadline <= todayEnd.getTime())),
    ).length
    const inbox = all.filter((t) => !t.projectId && !t.deferred).length
    const trash = await db.tasks.filter((t) => t.removed).count()
    return { today, inbox, trash }
  }, [])

  const is = (k: ViewKind['kind']) => view.kind === k

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-surface transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-64',
      )}
    >
      <div className={cn('flex items-center gap-2 px-3 py-3', collapsed && 'justify-center')}>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white font-bold">Ф</div>
        {!collapsed && <span className="font-semibold tracking-tight">Фокус</span>}
      </div>

      <nav className="flex flex-col gap-0.5 px-2">
        <NavItem icon={<Inbox size={18} />} label="Входящие" badge={counts?.inbox}
          active={is('inbox')} collapsed={collapsed} onClick={() => setView({ kind: 'inbox' })} />
        <NavItem icon={<Star size={18} />} label="Сегодня" badge={counts?.today}
          active={is('today')} collapsed={collapsed} onClick={() => setView({ kind: 'today' })} />
        <NavItem icon={<ClipboardList size={18} />} label="Планы"
          active={is('planner')} collapsed={collapsed} onClick={() => setView({ kind: 'planner' })} />
        <NavItem icon={<Clock size={18} />} label="Когда-нибудь"
          active={is('someday')} collapsed={collapsed} onClick={() => setView({ kind: 'someday' })} />
        <NavItem icon={<CalendarDays size={18} />} label="Календарь"
          active={is('calendar')} collapsed={collapsed} onClick={() => setView({ kind: 'calendar' })} />
      </nav>

      <div className="mt-3 flex items-center justify-between px-3 pb-1">
        {!collapsed && <span className="text-xs uppercase tracking-wide text-faint">Проекты</span>}
        <button
          className="icon-btn h-6 w-6"
          title="Новый проект"
          onClick={async () => { const id = await createProject(); openProject(id) }}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {projects?.map((p) => (
          <button
            key={p.id}
            onClick={() => openProject(p.id)}
            title={collapsed ? p.title : undefined}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
              view.kind === 'project' && view.projectId === p.id
                ? 'bg-accent-soft text-text'
                : 'text-muted hover:bg-surface-3 hover:text-text',
              collapsed && 'justify-center px-0',
            )}
          >
            {p.emoji ? (
              <span className="text-base leading-none">{p.emoji}</span>
            ) : (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
            )}
            {!collapsed && <span className="flex-1 truncate text-left">{p.title}</span>}
          </button>
        ))}

        {/* Умные фильтры */}
        {!collapsed && (
          <div className="mt-3 mb-1 flex items-center justify-between pl-1 pr-1">
            <span className="text-xs uppercase tracking-wide text-faint">Фильтры</span>
            <button className="icon-btn h-6 w-6" title="Новый фильтр"
              onClick={async () => setView({ kind: 'smartFilter', id: await createSmartFilter() })}>
              <Plus size={16} />
            </button>
          </div>
        )}
        {filters?.map((f) => (
          <button
            key={f.id}
            onClick={() => setView({ kind: 'smartFilter', id: f.id })}
            title={collapsed ? f.title : undefined}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
              view.kind === 'smartFilter' && view.id === f.id ? 'bg-accent-soft text-text' : 'text-muted hover:bg-surface-3 hover:text-text',
              collapsed && 'justify-center px-0',
            )}
          >
            <SlidersHorizontal size={15} className="shrink-0" />
            {!collapsed && <span className="flex-1 truncate text-left">{f.title}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-border px-2 py-2">
        <NavItem icon={<Timer size={18} />} label="Фокус" active={false}
          collapsed={collapsed} onClick={() => openFocus(true)} />
        <NavItem icon={<Repeat size={18} />} label="Привычки"
          active={is('habits')} collapsed={collapsed} onClick={() => setView({ kind: 'habits' })} />
        <NavItem icon={<Trash2 size={18} />} label="Корзина" badge={counts?.trash}
          active={is('trash')} collapsed={collapsed} onClick={() => setView({ kind: 'trash' })} />
      </div>
      <div className={cn('flex border-t border-border px-2 py-2', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <button
            className={cn('icon-btn', is('settings') && 'text-text bg-surface-3')}
            title="Настройки" onClick={() => setView({ kind: 'settings' })}
          >
            <Cog size={18} />
          </button>
        )}
        <button className="icon-btn" onClick={toggleSidebar} title={collapsed ? 'Развернуть' : 'Свернуть'}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  )
}
