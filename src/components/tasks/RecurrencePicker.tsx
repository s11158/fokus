import type { Recurrence, RecurrenceUnit } from '../../db/types'
import { cn } from '../../lib/cn'

const WEEKDAYS = [
  { d: 1, l: 'Пн' }, { d: 2, l: 'Вт' }, { d: 3, l: 'Ср' }, { d: 4, l: 'Чт' },
  { d: 5, l: 'Пт' }, { d: 6, l: 'Сб' }, { d: 0, l: 'Вс' },
]
const UNITS: { u: RecurrenceUnit; l: string }[] = [
  { u: 'day', l: 'День' }, { u: 'week', l: 'Неделя' }, { u: 'month', l: 'Месяц' },
]

export function RecurrencePicker({
  value, onChange,
}: {
  value: Recurrence | null
  onChange: (r: Recurrence | null) => void
}) {
  const set = (patch: Partial<Recurrence>) =>
    onChange({ unit: value?.unit ?? 'day', interval: value?.interval ?? 1, weekdays: value?.weekdays, ...patch })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(value ? null : { unit: 'day', interval: 1 })}
          className={cn(
            'flex h-8 flex-1 items-center justify-center rounded-lg border text-xs transition-colors',
            value ? 'border-border text-muted hover:bg-surface-3' : 'border-accent bg-accent-soft text-text',
          )}
        >
          Не повторять
        </button>
        {UNITS.map((u) => (
          <button
            key={u.u}
            onClick={() => set({ unit: u.u })}
            className={cn(
              'flex h-8 flex-1 items-center justify-center rounded-lg border text-xs transition-colors',
              value?.unit === u.u ? 'border-accent bg-accent-soft text-text' : 'border-border text-muted hover:bg-surface-3',
            )}
          >
            {u.l}
          </button>
        ))}
      </div>

      {value && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Каждые</span>
            <input
              type="number" min={1} value={value.interval}
              onChange={(e) => set({ interval: Math.max(1, Number(e.target.value) || 1) })}
              className="w-16 rounded-lg border border-border bg-surface-2 px-2 py-1 text-center outline-none [color-scheme:dark]"
            />
            <span>{value.unit === 'day' ? 'дн.' : value.unit === 'week' ? 'нед.' : 'мес.'}</span>
          </div>

          {value.unit === 'week' && (
            <div className="flex gap-1">
              {WEEKDAYS.map((w) => {
                const active = value.weekdays?.includes(w.d)
                return (
                  <button
                    key={w.d}
                    onClick={() => {
                      const cur = value.weekdays ?? []
                      const nw = active ? cur.filter((x) => x !== w.d) : [...cur, w.d]
                      set({ weekdays: nw.length ? nw : undefined })
                    }}
                    className={cn(
                      'h-7 w-8 rounded-lg border text-xs transition-colors',
                      active ? 'border-accent bg-accent-soft text-text' : 'border-border text-muted hover:bg-surface-3',
                    )}
                  >
                    {w.l}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
