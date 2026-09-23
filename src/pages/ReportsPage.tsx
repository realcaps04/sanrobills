import { PageHeader, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  customers,
  dashboardStats,
  inventory,
  invoices,
  lowStockProducts,
} from '@/data/mock'
import { formatCurrency } from '@/lib/utils'

const reportCards = [
  {
    title: 'Sales Report',
    items: [
      `Daily sales: ${formatCurrency(dashboardStats.todaySales)}`,
      `Monthly sales: ${formatCurrency(dashboardStats.monthSales)}`,
      'Custom date range supported',
    ],
  },
  {
    title: 'Invoice Report',
    items: [
      `Total invoices: ${invoices.length}`,
      `Paid: ${invoices.filter((i) => i.payment_status === 'paid').length}`,
      `Partial: ${invoices.filter((i) => i.payment_status === 'partial').length}`,
      `Pending: ${invoices.filter((i) => i.payment_status === 'pending').length}`,
    ],
  },
  {
    title: 'Customer Report',
    items: [
      `Top customers: ${customers.length}`,
      `Outstanding customers: ${customers.filter((c) => c.outstanding > 0).length}`,
      'Purchase history available per customer',
    ],
  },
  {
    title: 'Inventory Report',
    items: [
      `Current SKUs: ${inventory.length}`,
      `Low stock: ${lowStockProducts.length}`,
      'Stock movement tracked with sales/purchases',
    ],
  },
  {
    title: 'GST Report',
    items: [
      `CGST collected (sample): ${formatCurrency(invoices.reduce((s, i) => s + i.cgst, 0))}`,
      `SGST collected (sample): ${formatCurrency(invoices.reduce((s, i) => s + i.sgst, 0))}`,
      'Filter by invoice date range for filing',
    ],
  },
]

export function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Sales, invoices, customers, inventory and GST."
        actions={
          <>
            <input
              type="date"
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
              defaultValue="2026-09-01"
            />
            <input
              type="date"
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
              defaultValue="2026-09-23"
            />
            <Button variant="outline">Export</Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportCards.map((report) => (
          <Card key={report.title} className="p-5">
            <h3 className="text-base font-semibold text-ink">{report.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
              {report.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7539FF]" />
                  {item}
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="mt-4">
              Open Report
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
