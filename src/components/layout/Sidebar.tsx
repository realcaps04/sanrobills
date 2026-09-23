import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  Users,
  Package,
  Warehouse,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const mainNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/bills/new', label: 'New Bill', icon: FilePlus2 },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/inventory', label: 'Inventory', icon: Warehouse },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="hidden h-full w-[250px] shrink-0 flex-col border-r border-[#E6E8F0] bg-white lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-[#E6E8F0] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7539FF] text-sm font-bold text-white">
          S
        </div>
        <div>
          <div className="text-[15px] font-bold tracking-wide text-[#1F2937]">SANRO</div>
          <div className="text-[10px] font-medium tracking-wider text-[#9CA3AF]">
            BILLING
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin">
        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Main
        </div>
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#7539FF] text-white shadow-sm shadow-[#7539FF]/25'
                  : 'text-[#4B5563] hover:bg-[#F5F6FA] hover:text-[#1F2937]',
              )
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-[#E6E8F0] px-3 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-[#7539FF] text-white'
                : 'text-[#4B5563] hover:bg-[#F5F6FA]',
            )
          }
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
          Settings
        </NavLink>

        <div className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7539FF]/15 text-xs font-semibold text-[#7539FF]">
            {user?.full_name?.charAt(0) ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-[#1F2937]">
              {user?.full_name}
            </div>
            <div className="truncate text-xs capitalize text-[#9CA3AF]">{user?.role}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#4B5563] transition-colors hover:bg-red-50 hover:text-[#DC2626]"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          Logout
        </button>
      </div>
    </aside>
  )
}
