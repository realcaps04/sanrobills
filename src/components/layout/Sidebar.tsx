import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  FileSpreadsheet,
  Users,
  Package,
  BarChart3,
  LogOut,
  ChevronsLeft,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from './SidebarContext'
import { cn } from '@/lib/utils'

const mainNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/bills/new', label: 'New Bill', icon: FilePlus2 },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/quotations', label: 'Quotations', icon: FileSpreadsheet },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const { open, toggle, setOpen } = useSidebar()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function handleNavClick() {
    if (window.innerWidth < 1024) setOpen(false)
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex h-full shrink-0 flex-col overflow-hidden bg-white',
        'shadow-[1px_0_0_0_#E5E7EB]',
        'transition-[width,transform] duration-200 ease-out',
        'lg:static lg:z-auto',
        open
          ? 'w-[240px] translate-x-0'
          : 'w-[240px] -translate-x-full lg:w-16 lg:translate-x-0',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 sanro-divider',
          open
            ? 'h-14 items-center justify-between gap-2 px-3'
            : 'flex-col items-center gap-2 px-2 py-3',
        )}
      >
        <NavLink
          to="/"
          onClick={handleNavClick}
          className={cn(
            'block min-w-0 overflow-hidden',
            open ? 'w-[88px]' : 'hidden w-8 lg:block',
          )}
          aria-label="Sanro Fibre Glass Industries — Dashboard"
        >
          <img
            src="/sanro_logo.png"
            alt="Sanro Fibre Glass Industries"
            className="h-auto w-full select-none object-contain"
            draggable={false}
          />
        </NavLink>

        <button
          type="button"
          onClick={toggle}
          className="shrink-0 rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink"
          aria-label={open ? 'Hide sidebar' : 'Show sidebar'}
          title={open ? 'Hide sidebar' : 'Show sidebar'}
        >
          <ChevronsLeft
            className={cn(
              'h-5 w-5 transition-transform duration-200',
              !open && 'rotate-180',
            )}
            strokeWidth={1.75}
          />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-thin">
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={handleNavClick}
            title={item.label}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-md text-[13px] font-medium transition-colors',
                open ? 'gap-2.5 px-2.5 py-2' : 'justify-center px-0 py-2',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
              )
            }
          >
            <item.icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap transition-all duration-200',
                open ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0',
              )}
            >
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="space-y-0.5 px-2 py-3 shadow-[inset_0_1px_0_0_#EEF0F3]">
        <div
          className={cn(
            'flex items-center rounded-md',
            open ? 'gap-2.5 px-2.5 py-2' : 'justify-center px-0 py-2',
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {user?.full_name?.charAt(0) ?? 'U'}
          </div>
          <div
            className={cn(
              'min-w-0 overflow-hidden transition-all duration-200',
              open ? 'max-w-[130px] flex-1 opacity-100' : 'max-w-0 opacity-0',
            )}
          >
            <div className="truncate text-sm font-medium text-ink">
              {user?.full_name}
            </div>
            <div className="truncate text-[11px] capitalize text-ink-muted">
              {user?.role}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          className={cn(
            'flex w-full items-center rounded-md text-[13px] font-medium text-ink-secondary transition-colors hover:bg-red-50 hover:text-danger',
            open ? 'gap-2.5 px-2.5 py-2' : 'justify-center px-0 py-2',
          )}
        >
          <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
          <span
            className={cn(
              'overflow-hidden whitespace-nowrap transition-all duration-200',
              open ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0',
            )}
          >
            Logout
          </span>
        </button>
      </div>
    </aside>
  )
}
