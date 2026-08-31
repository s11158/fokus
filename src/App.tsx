import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { ContentRouter } from './views/ContentRouter'
import { TaskDetail } from './components/tasks/TaskDetail'
import { FocusTimer } from './components/focus/FocusTimer'
import { QuickCapture } from './components/capture/QuickCapture'
import { useUI } from './store/ui'
import { useReminderScheduler } from './lib/useReminderScheduler'
import { useCaptureBridge } from './lib/useCaptureBridge'
import { useFocus } from './store/focus'
import { useCapture } from './store/capture'
import { useEffect } from 'react'

export default function App() {
  const selectedTaskId = useUI((s) => s.selectedTaskId)
  useReminderScheduler()
  useCaptureBridge()

  // Deep-link при старте: ?page=&id=T-… или protocol_handlers.
  useEffect(() => { import('./lib/deeplink').then((m) => m.applyDeepLink()) }, [])

  // Глобальная горячая клавиша захвата: Ctrl/⌘ + Shift + A.
  const toggleCapture = useCapture((s) => s.toggle)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        toggleCapture()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleCapture])

  // Тикер таймера фокуса (1 раз в секунду).
  const tick = useFocus((s) => s.tick)
  useEffect(() => {
    const id = setInterval(() => tick(), 1000)
    return () => clearInterval(id)
  }, [tick])
  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <ContentRouter />
          </main>
          {selectedTaskId && (
            <TaskDetail key={selectedTaskId} taskId={selectedTaskId} />
          )}
        </div>
      </div>
      <FocusTimer />
      <QuickCapture />
    </div>
  )
}
