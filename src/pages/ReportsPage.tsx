import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  eachDayOfInterval,
  format,
  parseISO,
  differenceInCalendarDays,
  subDays,
} from 'date-fns'
import {
  ArrowUpRight,
  Clock3,
  Download,
  FileText,
  MoreVertical,
  ShoppingCart,
  Tag,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PaymentBadge } from '@/components/ui/Badge'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import {
  fetchCustomers,
  fetchInvoiceItemSales,
  fetchInvoices,
  fetchProducts,
} from '@/lib/data'
import { useAsync } from '@/lib/useAsync'
import { cn, currentMonthRange, formatCurrency, formatDate } from '@/lib/utils'
import type { Customer, Invoice, PaymentMethod, Product } from '@/types'

type ReportTab =
  | 'sales'
  | 'purchases'
  | 'customers'
  | 'products'
  | 'payments'
  | 'tax'
  | 'pnl'

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'sales', label: 'Sales' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'customers', label: 'Customers' },
  { id: 'products', label: 'Products' },
  { id: 'payments', label: 'Payments' },
  { id: 'tax', label: 'Tax' },
  { id: 'pnl', label: 'Profit & Loss' },
]

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  credit: 'Credit',
  partial: 'Partial',
}

const METHOD_COLORS: Record<string, string> = {
  upi: '#1e3a5f',
  cash: '#3B82F6',
  card: '#93C5FD',
  bank_transfer: '#BFDBFE',
  credit: '#64748B',
  partial: '#94A3B8',
}

async function loadReportData() {
  const [invoices, customers, products, itemSales] = await Promise.all([
    fetchInvoices(),
    fetchCustomers(),
    fetchProducts(),
    fetchInvoiceItemSales(),
  ])
  return { invoices, customers, products, itemSales }
}

function sum(values: number[]) {
  return values.reduce((s, v) => s + v, 0)
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

function previousRange(from: string, to: string) {
  const start = parseISO(from)
  const end = parseISO(to)
  const days = Math.max(1, differenceInCalendarDays(end, start) + 1)
  const prevEnd = subDays(start, 1)
  const prevStart = subDays(prevEnd, days - 1)
  return {
    from: format(prevStart, 'yyyy-MM-dd'),
    to: format(prevEnd, 'yyyy-MM-dd'),
  }
}

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to
}

export function ReportsPage() {
  const [dateRange, setDateRange] = useState(currentMonthRange)
  const [tab, setTab] = useState<ReportTab>('sales')
  const { data, loading, error } = useAsync(loadReportData, [])

  const view = useMemo(() => {
    const invoices = data?.invoices ?? []
    const customers = data?.customers ?? []
    const products = data?.products ?? []
    const itemSales = data?.itemSales ?? []
    const prev = previousRange(dateRange.from, dateRange.to)

    const ranged = invoices.filter((i) => inRange(i.invoice_date, dateRange.from, dateRange.to))
    const prevRanged = invoices.filter((i) => inRange(i.invoice_date, prev.from, prev.to))
    const rangedItems = itemSales.filter((i) => inRange(i.invoice_date, dateRange.from, dateRange.to))

    const totalSales = sum(ranged.map((i) => i.grand_total))
    const prevSales = sum(prevRanged.map((i) => i.grand_total))
    const avgBill = ranged.length ? totalSales / ranged.length : 0
    const prevAvg = prevRanged.length ? prevSales / prevRanged.length : 0

    const customersInRange = new Set(ranged.map((i) => i.customer_id)).size
    const prevCustomers = new Set(prevRanged.map((i) => i.customer_id)).size

    const productMap = new Map<string, { name: string; qty: number; sales: number }>()
    for (const item of rangedItems) {
      const key = item.product_name || 'Unknown'
      const cur = productMap.get(key) ?? { name: key, qty: 0, sales: 0 }
      cur.qty += item.quantity
      cur.sales += item.total
      productMap.set(key, cur)
    }
    const topProducts = [...productMap.values()]
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
    const topProduct = topProducts[0] ?? null

    const days = eachDayOfInterval({
      start: parseISO(dateRange.from),
      end: parseISO(dateRange.to),
    })
    const salesByDay = days.map((day) => {
      const key = format(day, 'yyyy-MM-dd')
      return {
        key,
        label: format(day, 'd MMM'),
        total: sum(ranged.filter((i) => i.invoice_date === key).map((i) => i.grand_total)),
      }
    })
    const maxDaySales = Math.max(1, ...salesByDay.map((d) => d.total))

    const methodTotals = new Map<string, number>()
    for (const inv of ranged) {
      const method = inv.payment_method || 'cash'
      methodTotals.set(method, (methodTotals.get(method) ?? 0) + inv.grand_total)
    }
    const paymentSlices = [...methodTotals.entries()]
      .map(([method, amount]) => ({
        method,
        label: METHOD_LABELS[method as PaymentMethod] ?? method,
        amount,
        color: METHOD_COLORS[method] ?? '#94A3B8',
      }))
      .sort((a, b) => b.amount - a.amount)
    const paymentTotal = sum(paymentSlices.map((s) => s.amount)) || 1

    const taxable = sum(ranged.map((i) => i.taxable_amount))
    const cgst = sum(ranged.map((i) => i.cgst))
    const sgst = sum(ranged.map((i) => i.sgst))
    const igst = sum(ranged.map((i) => i.igst ?? 0))
    const collected = sum(ranged.map((i) => i.amount_paid))
    const outstanding = sum(ranged.map((i) => i.balance_due))

    return {
      ranged,
      customers,
      products,
      totalSales,
      salesChange: percentChange(totalSales, prevSales),
      invoiceCount: ranged.length,
      invoiceChange: percentChange(ranged.length, prevRanged.length),
      customersInRange,
      customerChange: percentChange(customersInRange, prevCustomers),
      topProduct,
      avgBill,
      avgChange: percentChange(avgBill, prevAvg),
      salesByDay,
      maxDaySales,
      topProducts,
      paymentSlices,
      paymentTotal,
      taxable,
      cgst,
      sgst,
      igst,
      collected,
      outstanding,
      lowStock: products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.minimum_stock)
        .length,
      outOfStock: products.filter((p) => p.stock_quantity <= 0).length,
    }
  }, [data, dateRange])

  function exportSalesCsv() {
    const rows = [
      ['Date', 'Invoice No.', 'Customer', 'Items', 'Total Amount', 'Payment Method', 'Status'],
      ...view.ranged.map((inv) => [
        formatDate(inv.invoice_date),
        inv.invoice_number,
        inv.customer_name,
        String(inv.item_count ?? inv.items.length),
        String(inv.grand_total),
        inv.payment_method
          ? METHOD_LABELS[inv.payment_method] ?? inv.payment_method
          : '',
        inv.payment_status,
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-report-${dateRange.from}-to-${dateRange.to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Reports</h1>
          <p className="mt-0.5 text-sm text-ink-muted">Analyze your business performance</p>
        </div>
        <DateRangeFilter
          from={dateRange.from}
          to={dateRange.to}
          onChange={setDateRange}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-md px-3.5 py-2 text-[13px] font-medium transition',
              tab === t.id
                ? 'bg-accent text-white'
                : 'bg-white text-ink-secondary sanro-control hover:bg-surface-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sales' && (
        <SalesTab
          loading={loading}
          view={view}
          onExport={exportSalesCsv}
        />
      )}
      {tab === 'customers' && (
        <CustomersTab loading={loading} customers={view.customers} invoices={view.ranged} />
      )}
      {tab === 'products' && (
        <ProductsTab
          loading={loading}
          products={view.products}
          topProducts={view.topProducts}
          lowStock={view.lowStock}
          outOfStock={view.outOfStock}
        />
      )}
      {tab === 'payments' && (
        <PaymentsTab loading={loading} view={view} />
      )}
      {tab === 'tax' && (
        <TaxTab loading={loading} view={view} />
      )}
      {tab === 'purchases' && (
        <PlaceholderTab
          title="Purchases"
          message="Purchase bills are not tracked yet. Stock purchase rates on products can be reviewed under Products."
        />
      )}
      {tab === 'pnl' && (
        <PnlTab loading={loading} view={view} />
      )}
    </div>
  )
}

type SalesViewShape = {
  ranged: Invoice[]
  customers: Customer[]
  products: Product[]
  totalSales: number
  salesChange: number | null
  invoiceCount: number
  invoiceChange: number | null
  customersInRange: number
  customerChange: number | null
  topProduct: { name: string; qty: number; sales: number } | null
  avgBill: number
  avgChange: number | null
  salesByDay: { key: string; label: string; total: number }[]
  maxDaySales: number
  topProducts: { name: string; qty: number; sales: number }[]
  paymentSlices: { method: string; label: string; amount: number; color: string }[]
  paymentTotal: number
  taxable: number
  cgst: number
  sgst: number
  igst: number
  collected: number
  outstanding: number
  lowStock: number
  outOfStock: number
}

function SalesTab({
  loading,
  view,
  onExport,
}: {
  loading: boolean
  view: SalesViewShape
  onExport: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total Sales"
          value={loading ? '-' : formatCurrency(view.totalSales)}
          icon={FileText}
          change={view.salesChange}
        />
        <KpiCard
          label="Total Invoices"
          value={loading ? '-' : String(view.invoiceCount)}
          icon={ShoppingCart}
          change={view.invoiceChange}
        />
        <KpiCard
          label="Total Customers"
          value={loading ? '-' : String(view.customersInRange)}
          icon={Users}
          change={view.customerChange}
        />
        <KpiCard
          label="Top Selling Product"
          value={loading ? '-' : view.topProduct?.name ?? 'No sales'}
          icon={Tag}
          hint={
            view.topProduct
              ? `${view.topProduct.qty} units sold`
              : undefined
          }
        />
        <KpiCard
          label="Avg. Bill Value"
          value={loading ? '-' : formatCurrency(view.avgBill)}
          icon={Clock3}
          change={view.avgChange}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Sales Trend" action={<span className="text-[12px] text-ink-muted">This period</span>} className="xl:col-span-1">
          <SalesTrendChart days={view.salesByDay} max={view.maxDaySales} />
        </Panel>
        <Panel title="Top Products by Sales">
          <TopProductsBars products={view.topProducts} />
        </Panel>
        <Panel title="Sales by Payment Method">
          <PaymentPie slices={view.paymentSlices} total={view.paymentTotal} />
        </Panel>
      </div>

      <Panel
        title="Sales Details"
        action={
          <Button variant="outline" size="sm" onClick={onExport} disabled={view.ranged.length === 0}>
            <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
            Export
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] text-[11px] font-semibold uppercase tracking-wide text-ink-muted sanro-divider">
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Invoice No.</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Total Amount (Rs)</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F4]">
              {view.ranged.slice(0, 50).map((inv, index) => (
                <tr key={inv.id} className="hover:bg-[#F8F9FC]/80">
                  <td className="px-4 py-3.5 text-ink-muted">{index + 1}</td>
                  <td className="px-4 py-3.5 text-ink-muted">{formatDate(inv.invoice_date)}</td>
                  <td className="px-4 py-3.5 font-medium text-[#1e3a5f]">
                    <Link to={`/invoices/${inv.id}`} className="hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-ink">
                    {inv.customer_name || '-'}
                  </td>
                  <td className="px-4 py-3.5 text-ink-muted">
                    {inv.item_count ?? 0} Item{(inv.item_count ?? 0) === 1 ? '' : 's'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-ink">
                    {formatCurrency(inv.grand_total)}
                  </td>
                  <td className="px-4 py-3.5 text-ink-muted">
                    {inv.payment_method
                      ? METHOD_LABELS[inv.payment_method]
                      : '-'}
                  </td>
                  <td className="px-4 py-3.5">
                    <PaymentBadge status={inv.payment_status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="rounded-md p-1 text-ink-muted hover:bg-surface-muted"
                      aria-label="View invoice"
                    >
                      <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                    </Link>
                  </td>
                </tr>
              ))}
              {view.ranged.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-ink-muted">
                    {loading ? 'Loading sales…' : 'No sales in this date range.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function CustomersTab({
  loading,
  customers,
  invoices,
}: {
  loading: boolean
  customers: Customer[]
  invoices: Invoice[]
}) {
  const top = useMemo(() => {
    const map = new Map<string, { name: string; sales: number; bills: number }>()
    for (const inv of invoices) {
      const cur = map.get(inv.customer_id) ?? {
        name: inv.customer_name,
        sales: 0,
        bills: 0,
      }
      cur.sales += inv.grand_total
      cur.bills += 1
      map.set(inv.customer_id, cur)
    }
    return [...map.values()].sort((a, b) => b.sales - a.sales).slice(0, 10)
  }, [invoices])

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total Customers" value={loading ? '-' : String(customers.length)} icon={Users} />
        <KpiCard
          label="With Outstanding"
          value={loading ? '-' : String(customers.filter((c) => c.outstanding > 0).length)}
          icon={FileText}
        />
        <KpiCard
          label="Total Outstanding"
          value={loading ? '-' : formatCurrency(sum(customers.map((c) => c.outstanding)))}
          icon={Clock3}
        />
      </div>
      <Panel title="Top Customers (this period)">
        <SimpleTable
          headers={['#', 'Customer', 'Invoices', 'Sales']}
          rows={top.map((c, i) => [
            String(i + 1),
            c.name,
            String(c.bills),
            formatCurrency(c.sales),
          ])}
          empty={loading ? 'Loading…' : 'No customer sales in this range.'}
        />
      </Panel>
    </div>
  )
}

function ProductsTab({
  loading,
  products,
  topProducts,
  lowStock,
  outOfStock,
}: {
  loading: boolean
  products: Product[]
  topProducts: { name: string; qty: number; sales: number }[]
  lowStock: number
  outOfStock: number
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Products" value={loading ? '-' : String(products.length)} icon={Tag} />
        <KpiCard label="Low Stock" value={loading ? '-' : String(lowStock)} icon={Clock3} />
        <KpiCard label="Out of Stock" value={loading ? '-' : String(outOfStock)} icon={FileText} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Top Products by Sales">
          <TopProductsBars products={topProducts} />
        </Panel>
        <Panel title="Catalog Snapshot">
          <SimpleTable
            headers={['Product', 'Code', 'Stock', 'Sale Rate']}
            rows={products.slice(0, 10).map((p) => [
              p.name,
              p.product_code,
              String(p.stock_quantity),
              formatCurrency(p.selling_price),
            ])}
            empty={loading ? 'Loading…' : 'No products yet.'}
          />
        </Panel>
      </div>
    </div>
  )
}

function PaymentsTab({
  loading,
  view,
}: {
  loading: boolean
  view: SalesViewShape
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Collected" value={loading ? '-' : formatCurrency(view.collected)} icon={ShoppingCart} />
        <KpiCard label="Outstanding" value={loading ? '-' : formatCurrency(view.outstanding)} icon={Clock3} />
        <KpiCard label="Invoices" value={loading ? '-' : String(view.invoiceCount)} icon={FileText} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="By Payment Method">
          <PaymentPie slices={view.paymentSlices} total={view.paymentTotal} />
        </Panel>
        <Panel title="Breakdown">
          <SimpleTable
            headers={['Method', 'Amount', 'Share']}
            rows={view.paymentSlices.map((s) => [
              s.label,
              formatCurrency(s.amount),
              `${Math.round((s.amount / view.paymentTotal) * 100)}%`,
            ])}
            empty={loading ? 'Loading…' : 'No payments in this range.'}
          />
        </Panel>
      </div>
    </div>
  )
}

function TaxTab({ loading, view }: { loading: boolean; view: SalesViewShape }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Taxable Value" value={loading ? '-' : formatCurrency(view.taxable)} icon={FileText} />
        <KpiCard label="CGST" value={loading ? '-' : formatCurrency(view.cgst)} icon={Tag} />
        <KpiCard label="SGST" value={loading ? '-' : formatCurrency(view.sgst)} icon={Tag} />
        <KpiCard label="IGST" value={loading ? '-' : formatCurrency(view.igst)} icon={Tag} />
      </div>
      <Panel title="Tax Summary">
        <SimpleTable
          headers={['Component', 'Amount']}
          rows={[
            ['Taxable Amount', formatCurrency(view.taxable)],
            ['CGST', formatCurrency(view.cgst)],
            ['SGST', formatCurrency(view.sgst)],
            ['IGST', formatCurrency(view.igst)],
            ['Total Tax', formatCurrency(view.cgst + view.sgst + view.igst)],
          ]}
          empty={loading ? 'Loading…' : 'No tax data.'}
        />
      </Panel>
    </div>
  )
}

function PnlTab({ loading, view }: { loading: boolean; view: SalesViewShape }) {
  const estimatedCost = view.topProducts.reduce((s, p) => s + p.sales * 0.65, 0)
  const gross = view.totalSales - estimatedCost
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Revenue" value={loading ? '-' : formatCurrency(view.totalSales)} icon={FileText} />
        <KpiCard
          label="Est. Cost of Goods"
          value={loading ? '-' : formatCurrency(estimatedCost)}
          icon={Tag}
          hint="Approx. from dealer rates"
        />
        <KpiCard label="Est. Gross Profit" value={loading ? '-' : formatCurrency(gross)} icon={ShoppingCart} />
      </div>
      <Panel title="Note">
        <p className="px-4 py-6 text-sm text-ink-muted">
          Profit &amp; Loss is estimated from sales in the selected period. Exact COGS requires purchase tracking.
        </p>
      </Panel>
    </div>
  )
}

function PlaceholderTab({ title, message }: { title: string; message: string }) {
  return (
    <Panel title={title}>
      <p className="px-4 py-10 text-center text-sm text-ink-muted">{message}</p>
    </Panel>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  change,
  hint,
}: {
  label: string
  value: string
  icon: typeof FileText
  change?: number | null
  hint?: string
}) {
  return (
    <div className="rounded-xl bg-white p-5 sanro-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-ink-muted">{label}</div>
          <div className="mt-2 truncate text-[1.35rem] font-semibold tracking-tight text-ink">
            {value}
          </div>
          {hint && <div className="mt-1.5 text-[12px] text-ink-muted">{hint}</div>}
          {change != null && (
            <span
              className={cn(
                'mt-2 inline-flex items-center gap-0.5 text-[12px] font-medium',
                change >= 0 ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              <ArrowUpRight
                className={cn('h-3.5 w-3.5', change < 0 && 'rotate-180')}
                strokeWidth={2}
              />
              {`${change >= 0 ? '' : ''}${Math.abs(change).toFixed(0)}% vs last period`}
            </span>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-xl bg-white sanro-panel', className)}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 sanro-divider">
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function SalesTrendChart({
  days,
  max,
}: {
  days: { key: string; label: string; total: number }[]
  max: number
}) {
  const labelEvery = Math.max(1, Math.ceil(days.length / 6))
  return (
    <div className="px-4 pb-4 pt-3">
      <div className="flex h-44 items-end gap-1">
        {days.map((d, i) => {
          const height = Math.max(d.total > 0 ? 4 : 2, (d.total / max) * 100)
          return (
            <div key={d.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className="w-full max-w-[14px] rounded-t bg-accent/90"
                style={{ height: `${height}%` }}
                title={`${d.label}: ${formatCurrency(d.total)}`}
              />
              {(i === 0 || i === days.length - 1 || i % labelEvery === 0) && (
                <span className="truncate text-[9px] text-ink-muted">{format(parseISO(d.key), 'd')}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TopProductsBars({
  products,
}: {
  products: { name: string; qty: number; sales: number }[]
}) {
  const max = Math.max(1, ...products.map((p) => p.sales))
  if (products.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-ink-muted">No product sales in this range.</p>
  }
  return (
    <ul className="space-y-3 px-4 py-4">
      {products.map((p) => (
        <li key={p.name}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
            <span className="truncate font-medium text-ink">{p.name}</span>
            <span className="shrink-0 font-semibold text-ink">{formatCurrency(p.sales)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#EEF2F7]">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(p.sales / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function PaymentPie({
  slices,
  total,
}: {
  slices: { label: string; amount: number; color: string }[]
  total: number
}) {
  if (slices.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-ink-muted">No payment data.</p>
  }
  let angle = 0
  const gradients = slices.map((s) => {
    const start = angle
    const sweep = (s.amount / total) * 360
    angle += sweep
    return `${s.color} ${start}deg ${angle}deg`
  })

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-5 sm:flex-row sm:items-start">
      <div
        className="h-36 w-36 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${gradients.join(', ')})` }}
        aria-hidden
      />
      <ul className="w-full space-y-2 text-[13px]">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-ink-secondary">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-medium text-ink">
              {Math.round((s.amount / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SimpleTable({
  headers,
  rows,
  empty,
}: {
  headers: string[]
  rows: string[][]
  empty: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-[#F8F9FC] text-[11px] font-semibold uppercase tracking-wide text-ink-muted sanro-divider">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF0F4]">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={cn(
                    'px-4 py-3 text-ink',
                    j === row.length - 1 && 'text-right font-medium',
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-10 text-center text-ink-muted">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
