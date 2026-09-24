import { useEffect, useRef, useState } from 'react'
import { parseISO } from 'date-fns'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { Calendar } from '@/components/ui/Calendar'
import { formatDate, cn } from '@/lib/utils'

interface DateRangeFilterProps {
  from: string
  to: string
  onChange: (range: { from: string; to: string }) => void
  className?: string
}

export function DateRangeFilter({
  from,
  to,
  onChange,
  className,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(from)
  const [draftTo, setDraftTo] = useState(to)
  const [picking, setPicking] = useState<'from' | 'to'>('from')
  const [month, setMonth] = useState(() => parseISO(from || to))
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraftFrom(from)
    setDraftTo(to)
    if (from) setMonth(parseISO(from))
  }, [from, to])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function apply(nextFrom = draftFrom, nextTo = draftTo) {
    const a = nextFrom <= nextTo ? nextFrom : nextTo
    const b = nextFrom <= nextTo ? nextTo : nextFrom
    onChange({ from: a, to: b })
    setOpen(false)
    setPicking('from')
  }

  function handleSelect(iso: string) {
    if (picking === 'from') {
      setDraftFrom(iso)
      setDraftTo(iso)
      setPicking('to')
      return
    }
    setDraftTo(iso)
    apply(draftFrom, iso)
  }

  function setPreset(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    const f = start.toISOString().slice(0, 10)
    const t = end.toISOString().slice(0, 10)
    setDraftFrom(f)
    setDraftTo(t)
    setMonth(start)
    onChange({ from: f, to: t })
    setOpen(false)
    setPicking('from')
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          setPicking('from')
        }}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-lg bg-white sanro-control px-3 text-sm transition hover:bg-[#F8F9FC]',
          open && 'sanro-control--active',
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarDays className="h-4 w-4 text-[#1e3a5f]" strokeWidth={1.75} />
        <span className="whitespace-nowrap font-medium text-[#1F2937]">
          {formatDate(from)} – {formatDate(to)}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-[#9CA3AF] transition-transform',
            open && 'rotate-180',
          )}
          strokeWidth={1.75}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[320px] rounded-lg bg-white sanro-panel p-4 shadow-xl shadow-black/10">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Filter by date
            </div>
            <div className="text-[11px] text-[#6B7280]">
              {picking === 'from' ? 'Select start date' : 'Select end date'}
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPicking('from')}
              className={cn(
                'rounded-lg sanro-control px-2.5 py-2 text-left transition',
                picking === 'from'
                  ? 'sanro-control--active bg-[#1e3a5f]/5'
                  : 'hover:bg-[#F8F9FC]',
              )}
            >
              <div className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                From
              </div>
              <div className="mt-0.5 text-sm font-semibold text-[#1F2937]">
                {formatDate(draftFrom)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPicking('to')}
              className={cn(
                'rounded-lg sanro-control px-2.5 py-2 text-left transition',
                picking === 'to'
                  ? 'sanro-control--active bg-[#1e3a5f]/5'
                  : 'hover:bg-[#F8F9FC]',
              )}
            >
              <div className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                To
              </div>
              <div className="mt-0.5 text-sm font-semibold text-[#1F2937]">
                {formatDate(draftTo)}
              </div>
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {[
              { label: 'Today', days: 0 },
              { label: '7 days', days: 6 },
              { label: '30 days', days: 29 },
              { label: 'This month', days: -1 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  if (p.days === -1) {
                    const now = new Date()
                    const f = new Date(now.getFullYear(), now.getMonth(), 1)
                      .toISOString()
                      .slice(0, 10)
                    const t = now.toISOString().slice(0, 10)
                    setDraftFrom(f)
                    setDraftTo(t)
                    setMonth(now)
                    onChange({ from: f, to: t })
                    setOpen(false)
                    return
                  }
                  setPreset(p.days)
                }}
                className="rounded-full sanro-control px-2.5 py-1 text-xs font-medium text-[#4B5563] transition hover:bg-[#1e3a5f]/5 hover:text-[#1e3a5f]"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-[#F8F9FC] p-2">
            <Calendar
              month={month}
              onMonthChange={setMonth}
              mode="range"
              rangeFrom={draftFrom}
              rangeTo={draftTo}
              onSelect={handleSelect}
              className="mx-auto w-full max-w-[280px]"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftFrom(from)
                setDraftTo(to)
                setOpen(false)
                setPicking('from')
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#6B7280] hover:bg-[#F5F6FA]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => apply()}
              className="rounded-lg bg-[#1e3a5f] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#17304f]"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
