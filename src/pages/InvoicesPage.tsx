import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageHeader, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PaymentBadge } from '@/components/ui/Badge'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table'
import { invoices } from '@/data/mock'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PaymentStatus } from '@/types'

const filters: Array<{ value: PaymentStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'pending', label: 'Pending' },
]

export function InvoicesPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all')

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus = status === 'all' || inv.payment_status === status
      const q = query.toLowerCase()
      const matchesQuery =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [query, status])

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="All customer invoices and payment status."
        actions={
          <Link to="/bills/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Bill
            </Button>
          </Link>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <div className="min-w-[240px] flex-1">
            <Input
              placeholder="Search invoices…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" strokeWidth={1.75} />}
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  status === f.value
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-secondary hover:bg-surface-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <Table>
          <THead>
            <TH>Invoice No.</TH>
            <TH>Customer</TH>
            <TH>Date</TH>
            <TH>Amount</TH>
            <TH>Paid</TH>
            <TH>Balance</TH>
            <TH>Status</TH>
            <TH>Action</TH>
          </THead>
          <TBody>
            {filtered.map((inv) => (
              <TR key={inv.id}>
                <TD className="font-medium">{inv.invoice_number}</TD>
                <TD>{inv.customer_name}</TD>
                <TD className="text-ink-secondary">{formatDate(inv.invoice_date)}</TD>
                <TD className="font-medium">{formatCurrency(inv.grand_total)}</TD>
                <TD>{formatCurrency(inv.amount_paid)}</TD>
                <TD>{formatCurrency(inv.balance_due)}</TD>
                <TD>
                  <PaymentBadge status={inv.payment_status} />
                </TD>
                <TD>
                  <Link
                    to={`/invoices/${inv.id}`}
                    className="font-medium text-accent hover:text-accent-hover"
                  >
                    View
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  )
}
