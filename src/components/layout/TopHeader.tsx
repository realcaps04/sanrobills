import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  Menu,
  Plus,
  Search,
  Settings,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/bills/new': 'New Bill',
  '/invoices': 'Invoices',
  '/customers': 'Customers',
  '/products': 'Products',
  '/inventory': 'Inventory',
  '/payments': 'Payments',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

export function TopHeader() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const title =
    titles[location.pathname] ??
    (location.pathname.startsWith('/invoices/') ? 'Invoice Details' : 'Sanro')

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[#E6E8F0] bg-white px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F5F6FA] lg:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="min-w-0">
          <div className="text-xs text-[#9CA3AF]">
            Home <span className="mx-1">/</span>{' '}
            <span className="text-[#6B7280]">{title}</span>
          </div>
          <h1 className="truncate text-lg font-semibold text-[#1F2937]">{title}</h1>
        </div>
      </div>

      <div className="hidden max-w-sm flex-1 md:block">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
            strokeWidth={1.75}
          />
          <input
            type="search"
            placeholder="Search invoices, customers…"
            className="h-10 w-full rounded-lg border border-[#E6E8F0] bg-[#F8F9FC] pl-10 pr-3 text-sm text-[#1F2937] outline-none placeholder:text-[#9CA3AF] focus:border-[#7539FF] focus:bg-white focus:ring-2 focus:ring-[#7539FF]/15"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button size="sm" onClick={() => navigate('/bills/new')}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          <span className="hidden sm:inline">Create New</span>
        </Button>

        <button
          type="button"
          className="relative rounded-lg border border-[#E6E8F0] p-2 text-[#6B7280] hover:bg-[#F5F6FA]"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" strokeWidth={1.75} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="rounded-lg border border-[#E6E8F0] p-2 text-[#6B7280] hover:bg-[#F5F6FA]"
          aria-label="Settings"
        >
          <Settings className="h-4.5 w-4.5" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-[#E6E8F0] py-1.5 pl-1.5 pr-2 hover:bg-[#F5F6FA]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7539FF]/15 text-xs font-semibold text-[#7539FF]">
            {user?.full_name?.charAt(0) ?? 'U'}
          </div>
          <div className="hidden text-left sm:block">
            <div className="text-sm font-medium leading-tight text-[#1F2937]">
              {user?.full_name}
            </div>
            <div className="text-[11px] capitalize text-[#9CA3AF]">{user?.role}</div>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-[#9CA3AF] sm:block" />
        </button>
      </div>
    </header>
  )
}
