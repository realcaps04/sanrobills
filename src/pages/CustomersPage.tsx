import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { PageHeader, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table'
import { customers } from '@/data/mock'
import { formatCurrency, formatDate } from '@/lib/utils'

export function CustomersPage() {
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.gstin ?? '').toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage customers and outstanding balances."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Customer Name" placeholder="Full name" />
            <Input label="Phone" placeholder="Mobile number" />
            <Input label="GSTIN" placeholder="Optional" />
            <Input label="Address" placeholder="Address" className="sm:col-span-2" />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Customer Type</label>
              <select className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm">
                <option>Retail</option>
                <option>Dealer</option>
                <option>Contractor</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm">Save Customer</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="border-b border-border px-5 py-4">
          <Input
            placeholder="Search customers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" strokeWidth={1.75} />}
          />
        </div>
        <Table>
          <THead>
            <TH>Customer</TH>
            <TH>Phone</TH>
            <TH>GSTIN</TH>
            <TH>Total Purchases</TH>
            <TH>Outstanding</TH>
            <TH>Last Purchase</TH>
            <TH>Action</TH>
          </THead>
          <TBody>
            {filtered.map((c) => (
              <TR key={c.id}>
                <TD>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs capitalize text-ink-muted">{c.customer_type}</div>
                </TD>
                <TD>{c.phone}</TD>
                <TD className="text-ink-secondary">{c.gstin ?? '—'}</TD>
                <TD className="font-medium">{formatCurrency(c.total_purchases)}</TD>
                <TD className={c.outstanding > 0 ? 'font-medium text-warning' : ''}>
                  {formatCurrency(c.outstanding)}
                </TD>
                <TD className="text-ink-secondary">
                  {c.last_purchase ? formatDate(c.last_purchase) : '—'}
                </TD>
                <TD>
                  <button type="button" className="font-medium text-[#7539FF]">
                    View
                  </button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  )
}
