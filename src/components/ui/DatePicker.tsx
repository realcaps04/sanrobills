import { useEffect, useRef, useState } from 'react'
import { parseISO } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { Calendar } from '@/components/ui/Calendar'
import { formatDate, cn } from '@/lib/utils'

interface DatePickerProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  required,
  className,
  error,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() =>
    value ? parseISO(value) : new Date(),
  )
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) setMonth(parseISO(value))
  }, [value])

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

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {required ? ' *' : ''}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-lg bg-white sanro-control px-3 text-left text-sm transition',
          'hover:bg-[#F8F9FC]',
          open && 'sanro-control--active bg-white',
          error && 'sanro-control--error',
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-[#1e3a5f]" strokeWidth={1.75} />
        <span className={cn('flex-1', value ? 'font-medium text-[#1F2937]' : 'text-[#9CA3AF]')}>
          {value ? formatDate(value) : placeholder}
        </span>
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}

      {open && (
        <div className="absolute left-0 z-40 mt-2 rounded-lg bg-white sanro-panel p-4 shadow-xl shadow-black/10">
          <Calendar
            month={month}
            onMonthChange={setMonth}
            mode="single"
            selected={value || null}
            onSelect={(iso) => {
              onChange(iso)
              setOpen(false)
            }}
          />
          <div className="mt-3 flex items-center justify-between shadow-[inset_0_1px_0_0_rgba(15,23,42,0.06)] pt-3">
            <button
              type="button"
              className="text-xs font-medium text-[#1e3a5f] hover:underline"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10)
                onChange(today)
                setMonth(new Date())
                setOpen(false)
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="text-xs font-medium text-[#9CA3AF] hover:text-[#6B7280]"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
