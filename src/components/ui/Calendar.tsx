import { useMemo } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CalendarMode = 'single' | 'range'

interface CalendarProps {
  month: Date
  onMonthChange: (month: Date) => void
  mode?: CalendarMode
  selected?: string | null
  rangeFrom?: string | null
  rangeTo?: string | null
  onSelect?: (isoDate: string) => void
  className?: string
}

function toISO(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

export function Calendar({
  month,
  onMonthChange,
  mode = 'single',
  selected,
  rangeFrom,
  rangeTo,
  onSelect,
  className,
}: CalendarProps) {
  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
    const days = eachDayOfInterval({ start, end })
    const rows: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7))
    }
    return rows
  }, [month])

  const fromDate = rangeFrom ? parseISO(rangeFrom) : null
  const toDate = rangeTo ? parseISO(rangeTo) : null
  const selectedDate = selected ? parseISO(selected) : null

  return (
    <div className={cn('w-[280px] select-none', className)}>
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, -1))}
          className="rounded-lg p-1.5 text-[#6B7280] transition hover:bg-[#F5F6FA] hover:text-[#1F2937]"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <div className="text-sm font-semibold text-[#1F2937]">
          {format(month, 'MMMM yyyy')}
        </div>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="rounded-lg p-1.5 text-[#6B7280] transition hover:bg-[#F5F6FA] hover:text-[#1F2937]"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5 px-0.5">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {weeks.flat().map((day) => {
          const iso = toISO(day)
          const inMonth = isSameMonth(day, month)
          const isSelected =
            mode === 'single' && selectedDate
              ? isSameDay(day, selectedDate)
              : false

          const isRangeStart =
            mode === 'range' && fromDate ? isSameDay(day, fromDate) : false
          const isRangeEnd =
            mode === 'range' && toDate ? isSameDay(day, toDate) : false
          const inRange =
            mode === 'range' &&
            fromDate &&
            toDate &&
            isWithinInterval(day, {
              start: fromDate <= toDate ? fromDate : toDate,
              end: fromDate <= toDate ? toDate : fromDate,
            })

          const isEdge = isRangeStart || isRangeEnd || isSelected

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect?.(iso)}
              className={cn(
                'relative flex h-9 items-center justify-center rounded-lg text-sm transition',
                !inMonth && 'text-[#D1D5DB]',
                inMonth && !isEdge && !inRange && 'text-[#1F2937] hover:bg-[#F3F0FF]',
                inRange && !isEdge && 'bg-[#1e3a5f]/10 text-[#1e3a5f]',
                isEdge && 'bg-[#1e3a5f] font-semibold text-white shadow-sm shadow-[#1e3a5f]/25',
                isToday(day) && !isEdge && 'ring-1 ring-inset ring-[#1e3a5f]/40',
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
