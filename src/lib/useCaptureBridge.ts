import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { syncBridgeOnce, DEFAULT_BRIDGE, type BridgeSettings } from '../integrations/captureBridge'

// Периодический опрос локального моста Telegram-бота (когда включён в настройках).
export function useCaptureBridge() {
  const settings = useLiveQuery(async () => {
    const row = await db.settings.get('bridge')
    return { ...DEFAULT_BRIDGE, ...(row?.value as Partial<BridgeSettings> | undefined) }
  }, [])

  const enabled = settings?.enabled
  const url = settings?.url

  useEffect(() => {
    if (!enabled || !url) return
    let stopped = false
    const tick = async () => {
      if (stopped) return
      try { await syncBridgeOnce(url) } catch { /* мост недоступен — молча ждём */ }
    }
    tick()
    const id = setInterval(tick, 8000)
    return () => { stopped = true; clearInterval(id) }
  }, [enabled, url])
}
