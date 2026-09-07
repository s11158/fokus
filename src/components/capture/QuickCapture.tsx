import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Mic, Sparkles, X, Inbox, Check, Loader2, Settings as Cog } from 'lucide-react'
import { db } from '../../db/db'
import { createTask, createTag } from '../../db/repo'
import { useCapture } from '../../store/capture'
import { useUI } from '../../store/ui'
import { useSpeech } from '../../lib/useSpeech'
import { parseCapture, type ParsedCapture } from '../../services/ai'
import { todayKey } from '../../lib/date'
import { cn } from '../../lib/cn'
import type { Priority } from '../../db/types'

const PRIORITY_LABEL = ['-', 'Низкий', 'Средний', 'Высокий']

export function QuickCapture() {
  const { open, setOpen } = useCapture()
  const setView = useUI((s) => s.setView)
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'input' | 'loading' | 'preview'>('input')
  const [parsed, setParsed] = useState<ParsedCapture | null>(null)
  const [error, setError] = useState<string | null>(null)

  const projects = useLiveQuery(() => db.projects.filter((p) => !p.removed && !p.archived).toArray(), [])
  const allTags = useLiveQuery(() => db.tags.toArray(), [])

  const speech = useSpeech((t) => setText((prev) => (prev ? prev + ' ' : '') + t))

  useEffect(() => {
    if (!open) { setText(''); setPhase('input'); setParsed(null); setError(null) }
  }, [open])

  if (!open) return null

  const addRaw = async () => {
    const v = text.trim()
    if (!v) return
    await createTask({ title: v })
    setOpen(false)
    setView({ kind: 'inbox' })
  }

  const runAI = async () => {
    const v = text.trim()
    if (!v) return
    setPhase('loading'); setError(null)
    try {
      const ctx = {
        projects: (projects ?? []).map((p) => ({ id: p.id, title: p.title })),
        tags: (allTags ?? []).map((t) => t.title),
        today: todayKey(),
      }
      const result = await parseCapture(v, ctx)
      setParsed({ priority: 0, tags: [], subtasks: [], ...result })
      setPhase('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка AI')
      setPhase('input')
    }
  }

  const accept = async () => {
    if (!parsed) return
    // Маппинг названий тегов в id (создаём недостающие).
    const tagIds: string[] = []
    for (const title of parsed.tags ?? []) {
      const existing = (allTags ?? []).find((t) => t.title.toLowerCase() === title.toLowerCase())
      tagIds.push(existing ? existing.id : await createTag(title))
    }
    const toMs = (s?: string | null) => (s ? new Date(s).getTime() : null)
    const start = toMs(parsed.start)
    const parentId = await createTask({
      title: parsed.title,
      note: parsed.note ?? '',
      projectId: parsed.projectId ?? null,
      priority: (parsed.priority ?? 0) as Priority,
      start,
      useTime: !!(parsed.start && parsed.start.length > 10),
      deadline: toMs(parsed.deadline),
      tags: tagIds,
    })
    for (const st of parsed.subtasks ?? []) {
      if (st.trim()) await createTask({ title: st.trim(), projectId: parsed.projectId ?? null, parentId })
    }
    setOpen(false)
    if (parsed.projectId) setView({ kind: 'project', projectId: parsed.projectId })
    else setView({ kind: 'inbox' })
  }

  const upd = (patch: Partial<ParsedCapture>) => setParsed((p) => (p ? { ...p, ...patch } : p))

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div className="w-[520px] max-w-full rounded-2xl border border-border bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium"><Sparkles size={16} className="text-accent" /> Быстрый захват</span>
          <button className="icon-btn" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        {phase !== 'preview' && (
          <div className="p-4">
            <div className="relative">
              <textarea
                autoFocus value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runAI() }}
                rows={3}
                placeholder="Запишите мысль… напр. «позвонить Лёше завтра в 15:00 по проекту 3Parusa, высокий приоритет»"
                className="input resize-none rounded-xl bg-surface-2 p-3 text-sm"
              />
              {speech.supported && (
                <button
                  onClick={speech.toggle}
                  title="Голосовой ввод"
                  className={cn('absolute bottom-2 right-2 icon-btn', speech.listening && 'animate-pulse bg-rose-500/20 text-rose-300')}
                >
                  <Mic size={18} />
                </button>
              )}
            </div>

            {error && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                <span className="truncate">{error}</span>
                <button className="btn h-7 shrink-0" onClick={() => { setOpen(false); setView({ kind: 'settings' }) }}>
                  <Cog size={14} /> Настройки
                </button>
              </div>
            )}

            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="btn bg-surface-3 text-text" onClick={addRaw} disabled={!text.trim() || phase === 'loading'}>
                <Inbox size={15} /> В Inbox
              </button>
              <button className="btn btn-accent" onClick={runAI} disabled={!text.trim() || phase === 'loading'}>
                {phase === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                Разобрать с AI
              </button>
            </div>
            <p className="mt-2 text-xs text-faint">Ctrl/⌘ + Enter - разобрать. AI-ключ хранится только на этом устройстве.</p>
          </div>
        )}

        {phase === 'preview' && parsed && (
          <div className="flex flex-col gap-3 p-4">
            <input
              value={parsed.title} onChange={(e) => upd({ title: e.target.value })}
              className="input rounded-lg bg-surface-2 px-3 py-2 text-base font-medium" placeholder="Заголовок"
            />
            {parsed.note != null && parsed.note !== '' && (
              <textarea value={parsed.note} onChange={(e) => upd({ note: e.target.value })} rows={2}
                className="input resize-none rounded-lg bg-surface-2 px-3 py-2 text-sm" placeholder="Описание" />
            )}
            <div className="flex flex-wrap gap-2">
              <select value={parsed.projectId ?? ''} onChange={(e) => upd({ projectId: e.target.value || null })}
                className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none">
                <option value="">Входящие</option>
                {projects?.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.title}</option>)}
              </select>
              <select value={parsed.priority ?? 0} onChange={(e) => upd({ priority: Number(e.target.value) as Priority })}
                className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none">
                {PRIORITY_LABEL.map((l, i) => <option key={i} value={i}>{l}</option>)}
              </select>
              <input type="datetime-local"
                value={parsed.start ? parsed.start.slice(0, 16) : ''}
                onChange={(e) => upd({ start: e.target.value || null })}
                className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none [color-scheme:dark]" />
            </div>
            {(parsed.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {parsed.tags!.map((t, i) => (
                  <span key={i} className="chip bg-surface-3 text-muted">#{t}
                    <button onClick={() => upd({ tags: parsed.tags!.filter((_, j) => j !== i) })}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            {(parsed.subtasks?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-border bg-surface-2 p-2">
                <div className="mb-1 text-xs text-faint">Подзадачи</div>
                {parsed.subtasks!.map((st, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="text-faint">•</span>
                    <input value={st} onChange={(e) => { const a = [...parsed.subtasks!]; a[i] = e.target.value; upd({ subtasks: a }) }}
                      className="input text-sm" />
                    <button className="icon-btn h-6 w-6" onClick={() => upd({ subtasks: parsed.subtasks!.filter((_, j) => j !== i) })}><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button className="btn bg-surface-3 text-text" onClick={() => setPhase('input')}>Назад</button>
              <button className="btn btn-accent" onClick={accept}><Check size={15} /> Принять</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
