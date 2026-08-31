import { useUI } from '../store/ui'
import { InboxView } from './InboxView'
import { TodayView } from './TodayView'
import { SomedayView } from './SomedayView'
import { TrashView } from './TrashView'
import { ProjectView } from './ProjectView'
import { SearchView } from './SearchView'
import { PlannerView } from './PlannerView'
import { CalendarView } from './CalendarView'
import { HabitsView } from './HabitsView'
import { SettingsView } from './SettingsView'
import { SmartFilterView } from './SmartFilterView'

export function ContentRouter() {
  const view = useUI((s) => s.view)
  const search = useUI((s) => s.search)

  if (search.trim()) return <SearchView />

  switch (view.kind) {
    case 'inbox': return <InboxView />
    case 'today': return <TodayView />
    case 'someday': return <SomedayView />
    case 'trash': return <TrashView />
    case 'project': return <ProjectView projectId={view.projectId} />
    case 'planner': return <PlannerView />
    case 'calendar': return <CalendarView />
    case 'habits': return <HabitsView />
    case 'settings': return <SettingsView />
    case 'smartFilter': return <SmartFilterView id={view.id} />
    default: return null
  }
}
