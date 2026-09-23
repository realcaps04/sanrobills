import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table'
import { invoices, payments } from '@/data/mock'
import { formatCurrency, formatDate } from '@/lib/utils'

export function PaymentsPage() {
  const [tab, setTab] = useState<'received' | 'pending' | 'history'>('received')
  const [showForm, setShowForm] = useState(false)

  const pending = useMemo(
    () => invoices.filter((i) => i.balance_due > 0),
    [],
  )

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Received, pending, and payment history."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Customer" placeholder="Customer name" />
            <Input label="Invoice" placeholder="INV-…" />
            <Input label="Amount" type="number" placeholder="0" />
            <Input label="Date" type="date" />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Method</label>
              <select className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm">
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
                <option>Card</option>
              </select>
            </div>
            <Input label="Reference" placeholder="Txn / cheque no." />
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm">Save Payment</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-white p-1 w-fit">
        {(
          [
            ['received', 'Received Payments'],
            ['pending', 'Pending Payments'],
            ['history', 'Payment History'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === key
                ? 'bg-[#7539FF] text-white'
                : 'text-ink-secondary hover:bg-surface-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        {tab === 'pending' ? (
          <Table>
            <THead>
              <TH>Customer</TH>
              <TH>Invoice</TH>
              <TH>Due Amount</TH>
              <TH>Date</TH>
              <TH>Status</TH>
            </THead>
            <TBody>
              {pending.map((inv) => (
                <TR key={inv.id}>
                  <TD className="font-medium">{inv.customer_name}</TD>
                  <TD>{inv.invoice_number}</TD>
                  <TD className="font-semibold text-warning">
                    {formatCurrency(inv.balance_due)}
                  </TD>
                  <TD>{formatDate(inv.invoice_date)}</TD>
                  <TD className="capitalize">{inv.payment_status}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <Table>
            <THead>
              <TH>Payment ID</TH>
              <TH>Customer</TH>
              <TH>Invoice</TH>
              <TH>Amount</TH>
              <TH>Date</TH>
              <TH>Method</TH>
              <TH>Reference</TH>
            </THead>
            <TBody>
              {payments.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium text-[#7539FF]">{p.payment_id}</TD>
                  <TD>{p.customer_name}</TD>
                  <TD>{p.invoice_number}</TD>
                  <TD className="font-semibold">{formatCurrency(p.amount)}</TD>
                  <TD>{formatDate(p.payment_date)}</TD>
                  <TD className="capitalize">{p.method.replace('_', ' ')}</TD>
                  <TD className="text-ink-secondary">{p.reference ?? '—'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
