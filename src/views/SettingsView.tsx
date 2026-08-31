import { useEffect, useRef, useState } from 'react'
import { Download, Upload, Trash2, Database, Info, Bell, PackageOpen, Sparkles } from 'lucide-react'
import { db } from '../db/db'
import { ViewShell } from './shell'
import { importSingularityBackup, type ImportStats } from '../integrations/singularityImport'
import { loadAISettings, saveAISettings, type AISettings } from '../services/ai'
import { loadBridgeSettings, saveBridgeSettings, pingBridge, type BridgeSettings } from '../integrations/captureBridge'
import { Send, Plug } from 'lucide-react'
import { loadConnectorConfig, saveConnectorConfig, makeConnector, importViaConnector, syncNow } from '../integrations/sync'
import type { ConnectorConfig } from '../integrations/connector'

const STORES = [
  'projects', 'tasks', 'checklistItems', 'events', 'habits', 'habitProgress',
  'tags', 'kanbanStatuses', 'smartFilters', 'notes', 'settings', 'focusSessions',
] as const

export function SettingsView() {
  const fileRef = useRef<HTMLInputElement>(null)
  const singRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [singStats, setSingStats] = useState<ImportStats | null>(null)
  const [notif, setNotif] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [ai, setAi] = useState<AISettings | null>(null)
  useEffect(() => { loadAISettings().then(setAi) }, [])
  const updAi = (patch: Partial<AISettings>) => { setAi((a) => (a ? { ...a, ...patch } : a)); saveAISettings(patch) }

  const [bridge, setBridge] = useState<BridgeSettings | null>(null)
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'ok' | 'fail'>('idle')
  useEffect(() => { loadBridgeSettings().then(setBridge) }, [])
  const updBridge = (patch: Partial<BridgeSettings>) => { setBridge((b) => (b ? { ...b, ...patch } : b)); saveBridgeSettings(patch) }

  const [conn, setConn] = useState<ConnectorConfig | null>(null)
  const [connBusy, setConnBusy] = useState(false)
  useEffect(() => { loadConnectorConfig().then(setConn) }, [])
  const updConn = (patch: Partial<ConnectorConfig>) => { setConn((c) => (c ? { ...c, ...patch } : c)); saveConnectorConfig(patch) }

  const connTest = async () => {
    if (!conn) return
    setConnBusy(true); setMsg(null)
    const ok = await makeConnector(conn).testConnection()
    setMsg(ok ? 'Подключение успешно ✓' : 'Не удалось подключиться (проверьте URL и токен).')
    setConnBusy(false)
  }
  const connImport = async () => {
    if (!conn) return
    setConnBusy(true); setMsg(null)
    try {
      const r = await importViaConnector(makeConnector(conn))
      setMsg(`Импортировано из источника: проектов ${r.projects}, задач ${r.tasks}. Обновите страницу.`)
    } catch (e) { setMsg('Ошибка импорта: ' + (e instanceof Error ? e.message : 'неизвестно')) }
    setConnBusy(false)
  }
  const connSync = async () => {
    if (!conn) return
    setConnBusy(true); setMsg(null)
    try {
      const r = await syncNow(makeConnector(conn))
      setMsg(`Синхронизация: получено ${r.pulled}, отправлено ${r.pushed}, создано ${r.created}.`)
    } catch (e) { setMsg('Ошибка синхронизации: ' + (e instanceof Error ? e.message : 'неизвестно')) }
    setConnBusy(false)
  }

  const importSingularity = async (file: File) => {
    if (!confirm('Импорт заменит текущие проекты, задачи, теги, привычки и канбан данными из SingularityApp. Продолжить?')) return
    setImporting(true); setMsg(null); setSingStats(null)
    try {
      const data = JSON.parse(await file.text())
      const stats = await importSingularityBackup(data)
      setSingStats(stats)
      setMsg('Импорт из SingularityApp завершён. Обновите страницу.')
    } catch (e) {
      setMsg('Ошибка импорта SingularityApp: ' + (e instanceof Error ? e.message : 'неверный файл'))
    } finally {
      setImporting(false)
    }
  }

  const exportData = async () => {
    const dump: Record<string, unknown> = { _app: 'fokus-gtd', _version: 2, _exportedAt: new Date().toISOString() }
    for (const s of STORES) dump[s] = await (db as any)[s].toArray()
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fokus-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('Бэкап выгружен.')
  }

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      await db.transaction('rw', db.tables, async () => {
        for (const s of STORES) {
          if (Array.isArray(data[s])) {
            await (db as any)[s].clear()
            await (db as any)[s].bulkAdd(data[s])
          }
        }
      })
      setMsg('Данные импортированы. Обновите страницу.')
    } catch (e) {
      setMsg('Ошибка импорта: неверный файл.')
    }
  }

  const resetAll = async () => {
    if (!confirm('Удалить ВСЕ данные приложения без возможности восстановления?')) return
    await db.transaction('rw', db.tables, async () => {
      for (const s of STORES) await (db as any)[s].clear()
    })
    setMsg('Все данные удалены. Обновите страницу.')
  }

  const askNotif = async () => {
    if (typeof Notification === 'undefined') return
    const p = await Notification.requestPermission()
    setNotif(p)
  }

  return (
    <ViewShell>
      <h2 className="mb-4 px-1 text-lg font-semibold">Настройки</h2>

      <Section icon={<Bell size={16} />} title="Уведомления">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">
            Статус: {notif === 'granted' ? 'разрешены ✓' : notif === 'denied' ? 'запрещены' : 'не запрошены'}
          </span>
          {notif !== 'granted' && (
            <button className="btn btn-accent" onClick={askNotif}>Разрешить уведомления</button>
          )}
        </div>
        <p className="mt-1 text-xs text-faint">Нужны для напоминаний и сигналов таймера фокуса.</p>
      </Section>

      <Section icon={<Database size={16} />} title="Данные (privacy-first)">
        <p className="mb-2 text-xs text-faint">Все данные хранятся только на этом устройстве (IndexedDB). Бэкап — обычный JSON-файл.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn bg-surface-3 text-text" onClick={exportData}><Download size={15} /> Экспорт бэкапа</button>
          <button className="btn bg-surface-3 text-text" onClick={() => fileRef.current?.click()}><Upload size={15} /> Импорт бэкапа</button>
          <input
            ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = '' }}
          />
        </div>
      </Section>

      <Section icon={<Sparkles size={16} />} title="AI-захват">
        <p className="mb-2 text-xs text-faint">
          Для разбора заметок в задачи. Ключ хранится <b>только на этом устройстве</b> и шлётся напрямую провайдеру.
        </p>
        {ai && (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-faint">API-ключ (Anthropic / Claude)</label>
            <input
              type="password" value={ai.apiKey} placeholder="sk-ant-…"
              onChange={(e) => updAi({ apiKey: e.target.value })}
              className="input rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm"
            />
            <label className="text-xs text-faint">Модель</label>
            <input
              value={ai.model} onChange={(e) => updAi({ model: e.target.value })}
              className="input rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm"
            />
            <span className={ai.apiKey ? 'text-xs text-emerald-400' : 'text-xs text-faint'}>
              {ai.apiKey ? 'Ключ задан ✓ — захват с AI доступен' : 'Ключ не задан — доступен только захват «в Inbox»'}
            </span>
          </div>
        )}
      </Section>

      <Section icon={<Plug size={16} />} title="Интеграции · SingularityApp (API)">
        <p className="mb-2 text-xs text-faint">
          Двусторонняя синхронизация по API. Адрес и токен — из вашего личного кабинета и официальной
          документации SingularityApp. Токен хранится <b>только на этом устройстве</b>.
        </p>
        {conn && (
          <div className="flex flex-col gap-2">
            <input
              value={conn.apiBaseUrl} onChange={(e) => updConn({ apiBaseUrl: e.target.value })}
              placeholder="apiBaseUrl (напр. https://api.singularity-app.…)"
              className="input rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm"
            />
            <input
              type="password" value={conn.apiToken} onChange={(e) => updConn({ apiToken: e.target.value })}
              placeholder="API-токен"
              className="input rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={conn.syncEnabled} onChange={(e) => updConn({ syncEnabled: e.target.checked })} />
              Включить синхронизацию
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={conn.pushOnChange} onChange={(e) => updConn({ pushOnChange: e.target.checked })} />
              Отправлять изменения сразу (иначе — по кнопке «Синхронизировать»)
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="btn bg-surface-3 text-text" disabled={connBusy} onClick={connTest}>Проверить подключение</button>
              <button className="btn bg-surface-3 text-text" disabled={connBusy} onClick={connImport}>Импортировать</button>
              <button className="btn btn-accent" disabled={connBusy || !conn.syncEnabled} onClick={connSync}>Синхронизировать сейчас</button>
            </div>
          </div>
        )}
      </Section>

      <Section icon={<Send size={16} />} title="Telegram-захват (мост)">
        <p className="mb-2 text-xs text-faint">
          Локальный мост Telegram-бота (папка <code>bot/</code>). Приложение опрашивает его и импортирует
          захваты в Inbox. Бот запускается отдельно: <code>cd bot && npm i && npm start</code>.
        </p>
        {bridge && (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bridge.enabled} onChange={(e) => updBridge({ enabled: e.target.checked })} />
              Включить синхронизацию с мостом
            </label>
            <div className="flex gap-2">
              <input
                value={bridge.url} onChange={(e) => updBridge({ url: e.target.value })}
                placeholder="http://localhost:8787"
                className="input flex-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm"
              />
              <button
                className="btn bg-surface-3 text-text shrink-0"
                onClick={async () => setBridgeStatus((await pingBridge(bridge.url)) ? 'ok' : 'fail')}
              >
                Проверить
              </button>
            </div>
            {bridgeStatus === 'ok' && <span className="text-xs text-emerald-400">Мост доступен ✓</span>}
            {bridgeStatus === 'fail' && <span className="text-xs text-rose-300">Мост недоступен — запущен ли бот?</span>}
          </div>
        )}
      </Section>

      <Section icon={<PackageOpen size={16} />} title="Импорт из SingularityApp">
        <p className="mb-2 text-xs text-faint">
          Загрузите файл бэкапа SingularityApp (JSON). Импортируются проекты, задачи с подзадачами,
          чек-листы, теги, привычки, канбан-статусы и события. Повтор задач и формат напоминаний переносятся частично.
        </p>
        <button className="btn btn-accent" disabled={importing} onClick={() => singRef.current?.click()}>
          <PackageOpen size={15} /> {importing ? 'Импортирую…' : 'Выбрать файл бэкапа'}
        </button>
        <input
          ref={singRef} type="file" accept="application/json,.json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importSingularity(f); e.target.value = '' }}
        />
        {singStats && (
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted sm:grid-cols-4">
            <Stat label="Проекты" v={singStats.projects} />
            <Stat label="Задачи" v={singStats.tasks} />
            <Stat label="Чек-листы" v={singStats.checklists} />
            <Stat label="Теги" v={singStats.tags} />
            <Stat label="Привычки" v={singStats.habits} />
            <Stat label="Прогресс" v={singStats.habitProgress} />
            <Stat label="Канбан" v={singStats.kanban} />
            <Stat label="События" v={singStats.events} />
          </div>
        )}
      </Section>

      <Section icon={<Trash2 size={16} />} title="Опасная зона">
        <button className="btn border border-rose-500/40 text-rose-300 hover:bg-rose-500/10" onClick={resetAll}>
          <Trash2 size={15} /> Удалить все данные
        </button>
      </Section>

      <Section icon={<Info size={16} />} title="О приложении">
        <p className="text-sm text-muted">«Фокус» — личный таск-менеджер по методологии GTD. Offline-first PWA.</p>
        <p className="mt-1 text-xs text-faint">Локальное хранилище · тёмная тема · клавиатурно-дружелюбно.</p>
      </Section>

      {msg && (
        <div className="sticky bottom-2 mt-2 rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-text">
          {msg}
        </div>
      )}
    </ViewShell>
  )
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-1.5 text-center">
      <div className="text-base font-semibold text-text">{v}</div>
      <div className="text-faint">{label}</div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-xl border border-border bg-surface-2/50 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span className="text-accent">{icon}</span> {title}
      </div>
      {children}
    </div>
  )
}
