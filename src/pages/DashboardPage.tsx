import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CreditCard,
  FilePlus2,
  PackagePlus,
  Smartphone,
  UserPlus,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { PaymentBadge } from '@/components/ui/Badge'
import {
  customers,
  dashboardStats,
  invoices,
  lowStockProducts,
  payments,
} from '@/data/mock'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const quickActions = [
  { to: '/bills/new', title: 'Create Invoice', desc: 'Generate new invoice', icon: FilePlus2, color: 'bg-[#7539FF]/10 text-[#7539FF]' },
  { to: '/customers', title: 'Add Customer', desc: 'New customer entry', icon: UserPlus, color: 'bg-emerald-50 text-emerald-600' },
  { to: '/products', title: 'Add Product', desc: 'Add to catalogue', icon: PackagePlus, color: 'bg-amber-50 text-amber-600' },
  { to: '/payments', title: 'Record Payment', desc: 'Capture payment', icon: Wallet, color: 'bg-sky-50 text-sky-600' },
]

const paymentDistribution = [
  { label: 'UPI', count: 542, pct: 52, icon: Smartphone, color: 'bg-[#7539FF]' },
  { label: 'Bank Transfer', count: 318, pct: 34, icon: Banknote, color: 'bg-[#22C55E]' },
  { label: 'Card', count: 156, pct: 11, icon: CreditCard, color: 'bg-[#F59E0B]' },
  { label: 'Cash', count: 89, pct: 4, icon: Wallet, color: 'bg-[#3B82F6]' },
]

const recentActivity = [
  { title: 'New Invoice Created', detail: 'INV-2026-00125 for John Mathew', time: '5 min' },
  { title: 'Payment Received', detail: '₹20,650 via UPI', time: '7 min' },
  { title: 'New Customer Added', detail: 'Anand Homes', time: '12 min' },
  { title: 'Low Stock Alert', detail: 'PVC Bathroom Door — 3 units', time: '16 min' },
  { title: 'Payment Received', detail: '₹50,000 from GreenBuild', time: '25 min' },
]

export function DashboardPage() {
  const { user } = useAuth()
  const recent = invoices.slice(0, 6)
  const topCustomers = [...customers]
    .sort((a, b) => b.total_purchases - a.total_purchases)
    .slice(0, 5)

  const invoiceOverview = {
    total: dashboardStats.totalInvoicesMonth,
    paid: 168,
    pending: 42,
    partial: 28,
    overdue: 10,
  }

  const salesCards = [
    {
      label: "Today's Sales",
      value: formatCurrency(dashboardStats.todaySales),
      change: '+12%',
      up: true,
      hint: `${dashboardStats.todayInvoiceCount} invoices today`,
      accent: 'from-[#7539FF] to-[#9B6BFF]',
    },
    {
      label: 'This Month',
      value: formatCurrency(dashboardStats.monthSales),
      change: '+8.5%',
      up: true,
      hint: dashboardStats.monthLabel,
      accent: 'from-[#22C55E] to-[#4ADE80]',
    },
    {
      label: 'Pending Payments',
      value: formatCurrency(dashboardStats.pendingPayments),
      change: '-3%',
      up: false,
      hint: `${dashboardStats.pendingCustomerCount} customers`,
      accent: 'from-[#F59E0B] to-[#FBBF24]',
    },
    {
      label: 'Total Invoices',
      value: String(dashboardStats.totalInvoicesMonth),
      change: '+14%',
      up: true,
      hint: 'This month',
      accent: 'from-[#3B82F6] to-[#60A5FA]',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Page toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#1F2937]">
            Welcome back, {user?.full_name?.split(' ')[0]}
          </h2>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            Here&apos;s what&apos;s happening with Sanro today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-[#E6E8F0] bg-white px-3 py-2 text-sm text-[#4B5563]">
            23 Sep 2026 – 23 Sep 2026
          </div>
          <Button variant="outline" size="sm">
            Export
          </Button>
          <Link to="/bills/new">
            <Button size="sm">+ New Bill</Button>
          </Link>
        </div>
      </div>

      {/* Stat cards — Kanakku style */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {salesCards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <div className="flex items-start justify-between">
              <div className="text-sm font-medium text-[#6B7280]">{card.label}</div>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
                  card.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
                )}
              >
                {card.up ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {card.change}
              </span>
            </div>
            <div className="mt-3 text-[28px] font-bold leading-none tracking-tight text-[#111827]">
              {card.value}
            </div>
            <div className="mt-2 text-xs text-[#9CA3AF]">{card.hint}</div>
            <div
              className={cn(
                'absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r',
                card.accent,
              )}
            />
          </div>
        ))}
      </div>

      {/* Invoice Overview + Revenue target */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1F2937]">Invoice Overview</h3>
            <select className="rounded-lg border border-[#E6E8F0] bg-[#F8F9FC] px-2.5 py-1.5 text-xs text-[#4B5563] outline-none">
              <option>2026</option>
              <option>2025</option>
            </select>
          </div>

          <div className="grid gap-6 md:grid-cols-[200px_1fr]">
            <div className="flex flex-col items-center justify-center">
              <div className="relative h-40 w-40">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="48" fill="none" stroke="#F3F4F6" strokeWidth="12" />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="12"
                    strokeDasharray={`${(invoiceOverview.paid / invoiceOverview.total) * 301} 301`}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="12"
                    strokeDasharray={`${(invoiceOverview.partial / invoiceOverview.total) * 301} 301`}
                    strokeDashoffset={`-${(invoiceOverview.paid / invoiceOverview.total) * 301}`}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="12"
                    strokeDasharray={`${(invoiceOverview.pending / invoiceOverview.total) * 301} 301`}
                    strokeDashoffset={`-${((invoiceOverview.paid + invoiceOverview.partial) / invoiceOverview.total) * 301}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold text-[#111827]">{invoiceOverview.total}</div>
                  <div className="text-xs text-[#9CA3AF]">Invoices</div>
                </div>
              </div>
              <div className="mt-2 text-center text-xs text-[#6B7280]">
                Total Invoice Sales
                <div className="mt-0.5 text-lg font-bold text-[#111827]">
                  {formatCurrency(dashboardStats.monthSales)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Paid Invoices', value: invoiceOverview.paid, pct: '68%', color: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700' },
                { label: 'Partial', value: invoiceOverview.partial, pct: '11%', color: 'bg-amber-500', soft: 'bg-amber-50 text-amber-700' },
                { label: 'Pending', value: invoiceOverview.pending, pct: '17%', color: 'bg-red-500', soft: 'bg-red-50 text-red-700' },
                { label: 'Overdue', value: invoiceOverview.overdue, pct: '4%', color: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-[#E6E8F0] p-4">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', item.color)} />
                    <span className="text-xs font-medium text-[#6B7280]">{item.label}</span>
                  </div>
                  <div className="mt-2 text-xl font-bold text-[#111827]">{item.value}</div>
                  <div className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', item.soft)}>
                    {item.pct} of total
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="text-base font-semibold text-[#1F2937]">Revenue Target</h3>
          <div className="mt-6 flex flex-col items-center">
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#F3F4F6" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#7539FF"
                  strokeWidth="10"
                  strokeDasharray="144 314"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-[#7539FF]">46%</div>
                <div className="text-[11px] text-[#9CA3AF]">Achieved</div>
              </div>
            </div>
            <div className="mt-4 w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Target</span>
                <span className="font-semibold text-[#111827]">₹18,00,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Achieved</span>
                <span className="font-semibold text-[#111827]">
                  {formatCurrency(dashboardStats.monthSales)}
                </span>
              </div>
            </div>
            <Link to="/reports" className="mt-5 w-full">
              <Button variant="outline" className="w-full" size="sm">
                View Details
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Charts row: Revenue & Expenses + Weekly Sales */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-[#1F2937]">Revenue & Expenses</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-[#6B7280]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#7539FF]" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-[#6B7280]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" /> Expenses
              </span>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[#9CA3AF]">Total Revenue this year</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xl font-bold text-[#111827]">
                  {formatCurrency(dashboardStats.monthSales)}
                </span>
                <span className="text-xs font-medium text-emerald-600">+12%</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-[#9CA3AF]">Total Expense this year</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xl font-bold text-[#111827]">₹1,02,100</span>
                <span className="text-xs font-medium text-emerald-600">+8%</span>
              </div>
            </div>
          </div>

          {/* Simple bar chart */}
          <div className="flex h-44 items-end gap-2 pt-2">
            {[65, 48, 72, 55, 80, 68, 90, 76, 84, 70, 88, 82].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-end justify-center gap-0.5" style={{ height: '140px' }}>
                  <div
                    className="w-[45%] rounded-t bg-[#7539FF]/85"
                    style={{ height: `${h}%` }}
                  />
                  <div
                    className="w-[45%] rounded-t bg-[#F59E0B]/80"
                    style={{ height: `${h * 0.35}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#9CA3AF]">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="text-base font-semibold text-[#1F2937]">Weekly Sales</h3>
          <div className="mt-4">
            <div className="text-3xl font-bold text-[#111827]">₹1,26,100</div>
            <div className="mt-1 text-sm text-[#6B7280]">This week</div>
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
              <ArrowUpRight className="h-3 w-3" />
              12% Increased from last week
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-[#6B7280]">
              <span>Sales Target</span>
              <span className="font-medium text-[#111827]">78%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
              <div className="h-full w-[78%] rounded-full bg-[#7539FF]" />
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-[#1F2937]">Top Products</h4>
            <ul className="mt-3 space-y-3">
              {lowStockProducts.slice(0, 3).map((p, i) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F5F6FA] text-xs font-semibold text-[#7539FF]">
                      {i + 1}
                    </span>
                    <span className="text-[#4B5563]">{p.name.split('—')[0].trim()}</span>
                  </div>
                  <span className="font-medium text-[#111827]">
                    {formatCurrency(p.selling_price)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Payment + Cash flow + Activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="text-base font-semibold text-[#1F2937]">Payment Method</h3>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">Distribution by payment type</p>
          <ul className="mt-5 space-y-4">
            {paymentDistribution.map((m) => (
              <li key={m.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-[#4B5563]">
                    <m.icon className="h-4 w-4" strokeWidth={1.75} />
                    {m.label}
                  </div>
                  <span className="font-medium text-[#111827]">{m.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                  <div
                    className={cn('h-full rounded-full', m.color)}
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-[#9CA3AF]">
                  {m.count} transactions
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="text-base font-semibold text-[#1F2937]">Cash Flow</h3>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Inflow', value: '₹8.35L', tone: 'text-emerald-600' },
              { label: 'Outflow', value: '₹4.33L', tone: 'text-red-500' },
              { label: 'Net', value: '₹4.02L', tone: 'text-[#7539FF]' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-[#F8F9FC] px-3 py-4 text-center"
              >
                <div className="text-[11px] text-[#9CA3AF]">{item.label}</div>
                <div className={cn('mt-1 text-sm font-bold', item.tone)}>{item.value}</div>
              </div>
            ))}
          </div>

          <h4 className="mt-6 text-sm font-semibold text-[#1F2937]">Recent Payments</h4>
          <ul className="mt-3 space-y-3">
            {payments.slice(0, 4).map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-[#1F2937]">{p.customer_name}</div>
                  <div className="text-xs text-[#9CA3AF]">{p.payment_id}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-emerald-600">
                    +{formatCurrency(p.amount)}
                  </div>
                  <div className="text-[11px] capitalize text-[#9CA3AF]">
                    {p.method.replace('_', ' ')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="text-base font-semibold text-[#1F2937]">Recent Activity</h3>
          <ul className="mt-4 space-y-4">
            {recentActivity.map((a, i) => (
              <li key={i} className="flex gap-3">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#7539FF]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-[#1F2937]">{a.title}</div>
                    <div className="shrink-0 text-[11px] text-[#9CA3AF]">{a.time}</div>
                  </div>
                  <div className="mt-0.5 text-xs text-[#6B7280]">{a.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Quick Actions + Top Customers */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] xl:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-[#1F2937]">Quick Actions</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="rounded-xl border border-[#E6E8F0] p-4 transition hover:border-[#7539FF]/40 hover:shadow-sm"
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    action.color,
                  )}
                >
                  <action.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="mt-3 text-sm font-semibold text-[#1F2937]">{action.title}</div>
                <div className="mt-0.5 text-xs text-[#9CA3AF]">{action.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1F2937]">Top Customers</h3>
            <Link to="/customers" className="text-xs font-medium text-[#7539FF]">
              View all
            </Link>
          </div>
          <ul className="space-y-3">
            {topCustomers.map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7539FF]/10 text-xs font-semibold text-[#7539FF]">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#1F2937]">{c.name}</div>
                    <div className="text-[11px] text-[#9CA3AF]">{c.phone}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[#111827]">
                    {formatCurrency(c.total_purchases)}
                  </div>
                  <div className="text-[11px] text-[#9CA3AF]">Total</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent Invoices table */}
      <div className="rounded-xl border border-[#E6E8F0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-center justify-between border-b border-[#E6E8F0] px-5 py-4">
          <h3 className="text-base font-semibold text-[#1F2937]">Recent Invoices</h3>
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#7539FF] hover:underline"
          >
            View all Invoices
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#E6E8F0] bg-[#F8F9FC] text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Created On</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3">Payment Mode</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E8F0]">
              {recent.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#F8F9FC]/80">
                  <td className="px-5 py-3.5 font-medium text-[#7539FF]">
                    {inv.invoice_number}
                  </td>
                  <td className="px-5 py-3.5 text-[#1F2937]">{inv.customer_name}</td>
                  <td className="px-5 py-3.5 text-[#6B7280]">
                    {formatDate(inv.invoice_date)}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-[#111827]">
                    {formatCurrency(inv.grand_total)}
                  </td>
                  <td className="px-5 py-3.5 text-[#6B7280]">
                    {formatCurrency(inv.amount_paid)}
                  </td>
                  <td className="px-5 py-3.5 capitalize text-[#6B7280]">
                    {(inv.payment_method ?? '—').replace('_', ' ')}
                  </td>
                  <td className="px-5 py-3.5">
                    <PaymentBadge status={inv.payment_status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="font-medium text-[#7539FF] hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low stock strip */}
      {lowStockProducts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5">
          <div className="text-sm text-amber-800">
            <span className="font-semibold">Low Stock:</span>{' '}
            {lowStockProducts
              .map((p) => `${p.name.split('—')[0].trim()} (${p.stock_quantity})`)
              .join(' · ')}
          </div>
          <Link to="/inventory">
            <Button size="sm" variant="outline" className="border-amber-300 bg-white text-amber-800">
              View Inventory
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
