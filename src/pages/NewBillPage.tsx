import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { customers as mockCustomers, products as mockProducts } from '@/data/mock'
import type { Customer, DoorSpecs, PaymentMethod, Product } from '@/types'
import { cn, formatCurrencyExact } from '@/lib/utils'

interface BillLine {
  key: string
  product: Product | null
  size: string
  quantity: number
  rate: number
  discount: number
  gst_rate: number
  specs: DoorSpecs
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'credit', label: 'Credit' },
  { value: 'partial', label: 'Partial Payment' },
]

const emptyLine = (): BillLine => ({
  key: crypto.randomUUID(),
  product: null,
  size: '',
  quantity: 1,
  rate: 0,
  discount: 0,
  gst_rate: 18,
  specs: {},
})

export function NewBillPage() {
  const navigate = useNavigate()
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    gstin: '',
    customer_type: 'retail' as Customer['customer_type'],
  })
  const [lines, setLines] = useState<BillLine[]>([emptyLine()])
  const [productQuery, setProductQuery] = useState('')
  const [activeLineKey, setActiveLineKey] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [amountPaid, setAmountPaid] = useState(0)
  const [expandedSpecs, setExpandedSpecs] = useState<string | null>(null)

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.toLowerCase()
    return mockCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.gstin ?? '').toLowerCase().includes(q),
    )
  }, [customerQuery])

  const filteredProducts = useMemo(() => {
    const q = productQuery.toLowerCase()
    return mockProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.product_code.toLowerCase().includes(q),
    )
  }, [productQuery])

  const totals = useMemo(() => {
    let subtotal = 0
    let discount = 0
    let tax = 0
    for (const line of lines) {
      const base = line.quantity * line.rate
      subtotal += base
      discount += line.discount
      const taxable = base - line.discount
      tax += (taxable * line.gst_rate) / 100
    }
    const taxableAmount = subtotal - discount
    const halfTax = tax / 2
    const grand = taxableAmount + tax
    return {
      subtotal,
      discount,
      taxableAmount,
      cgst: halfTax,
      sgst: halfTax,
      grand,
      balance: Math.max(0, grand - amountPaid),
    }
  }, [lines, amountPaid])

  function selectProduct(lineKey: string, product: Product) {
    setLines((prev) =>
      prev.map((l) =>
        l.key === lineKey
          ? {
              ...l,
              product,
              size: product.size ?? '',
              rate: product.selling_price,
              gst_rate: product.gst_rate,
              specs: {
                ...l.specs,
                colour: product.colour ?? undefined,
                finish: product.finish ?? undefined,
                door_size: product.size ?? undefined,
              },
            }
          : l,
      ),
    )
    setActiveLineKey(null)
    setProductQuery('')
  }

  function updateLine(key: string, patch: Partial<BillLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function updateSpecs(key: string, patch: Partial<DoorSpecs>) {
    setLines((prev) =>
      prev.map((l) =>
        l.key === key ? { ...l, specs: { ...l.specs, ...patch } } : l,
      ),
    )
  }

  function handleGenerate() {
    if (!selectedCustomer && !newCustomer.name) {
      alert('Please select or add a customer.')
      return
    }
    if (lines.every((l) => !l.product)) {
      alert('Please add at least one product.')
      return
    }
    navigate('/invoices/inv-1')
  }

  return (
    <div>
      <PageHeader
        title="New Bill"
        subtitle="Create a customer invoice quickly."
        actions={
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Customer */}
          <section className="rounded-xl border border-border bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">1. Customer</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewCustomer((v) => !v)}
              >
                <Plus className="h-4 w-4" />
                Add New Customer
              </Button>
            </div>

            {selectedCustomer ? (
              <div className="flex items-start justify-between rounded-lg border border-border bg-surface-muted/60 px-4 py-3">
                <div>
                  <div className="font-medium text-ink">{selectedCustomer.name}</div>
                  <div className="mt-0.5 text-sm text-ink-muted">
                    {selectedCustomer.phone}
                    {selectedCustomer.gstin ? ` · ${selectedCustomer.gstin}` : ''}
                  </div>
                  {selectedCustomer.address && (
                    <div className="mt-0.5 text-sm text-ink-muted">
                      {selectedCustomer.address}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-accent"
                  onClick={() => setSelectedCustomer(null)}
                >
                  Change
                </button>
              </div>
            ) : showNewCustomer ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Customer Name"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer((c) => ({ ...c, name: e.target.value }))
                  }
                  placeholder="Full name"
                />
                <Input
                  label="Phone"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer((c) => ({ ...c, phone: e.target.value }))
                  }
                  placeholder="10-digit mobile"
                />
                <Input
                  label="Address"
                  value={newCustomer.address}
                  onChange={(e) =>
                    setNewCustomer((c) => ({ ...c, address: e.target.value }))
                  }
                  placeholder="Billing address"
                  className="sm:col-span-2"
                />
                <Input
                  label="GSTIN"
                  value={newCustomer.gstin}
                  onChange={(e) =>
                    setNewCustomer((c) => ({ ...c, gstin: e.target.value }))
                  }
                  placeholder="Optional"
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    Customer Type
                  </label>
                  <select
                    className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"
                    value={newCustomer.customer_type}
                    onChange={(e) =>
                      setNewCustomer((c) => ({
                        ...c,
                        customer_type: e.target.value as Customer['customer_type'],
                      }))
                    }
                  >
                    <option value="retail">Retail</option>
                    <option value="dealer">Dealer</option>
                    <option value="contractor">Contractor</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!newCustomer.name || !newCustomer.phone) return
                      setSelectedCustomer({
                        id: 'new',
                        ...newCustomer,
                        total_purchases: 0,
                        outstanding: 0,
                        created_at: new Date().toISOString(),
                      })
                      setShowNewCustomer(false)
                    }}
                  >
                    Save Customer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Search existing customer…"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  leftIcon={<Search className="h-4 w-4" strokeWidth={1.75} />}
                />
                {customerQuery && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-white shadow-sm">
                    {filteredCustomers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-ink-muted">
                        No customers found
                      </div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="flex w-full flex-col items-start px-4 py-2.5 text-left hover:bg-surface-muted"
                          onClick={() => {
                            setSelectedCustomer(c)
                            setCustomerQuery('')
                          }}
                        >
                          <span className="text-sm font-medium text-ink">{c.name}</span>
                          <span className="text-xs text-ink-muted">{c.phone}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Products */}
          <section className="rounded-xl border border-border bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">2. Products</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                <Plus className="h-4 w-4" />
                Add Line
              </Button>
            </div>

            <div className="space-y-4">
              {lines.map((line, index) => {
                const lineTotal =
                  line.quantity * line.rate -
                  line.discount +
                  ((line.quantity * line.rate - line.discount) * line.gst_rate) /
                    100

                return (
                  <div
                    key={line.key}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                        Item {index + 1}
                      </span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          className="text-ink-muted hover:text-danger"
                          onClick={() =>
                            setLines((prev) => prev.filter((l) => l.key !== line.key))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="relative mb-3">
                      <Input
                        placeholder="Search product / door model…"
                        value={
                          activeLineKey === line.key
                            ? productQuery
                            : line.product?.name ?? ''
                        }
                        onFocus={() => {
                          setActiveLineKey(line.key)
                          setProductQuery('')
                        }}
                        onChange={(e) => {
                          setActiveLineKey(line.key)
                          setProductQuery(e.target.value)
                        }}
                        leftIcon={<Search className="h-4 w-4" strokeWidth={1.75} />}
                      />
                      {activeLineKey === line.key && (
                        <div className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-border bg-white shadow-sm">
                          {filteredProducts.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left hover:bg-surface-muted"
                              onClick={() => selectProduct(line.key, p)}
                            >
                              <div>
                                <div className="text-sm font-medium text-ink">
                                  {p.name}
                                </div>
                                <div className="text-xs text-ink-muted">
                                  {p.product_code} · Stock {p.stock_quantity} · GST{' '}
                                  {p.gst_rate}%
                                </div>
                              </div>
                              <div className="text-sm font-medium text-ink">
                                {formatCurrencyExact(p.selling_price)}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <Input
                        label="Size"
                        value={line.size}
                        onChange={(e) => updateLine(line.key, { size: e.target.value })}
                      />
                      <Input
                        label="Qty"
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.key, {
                            quantity: Number(e.target.value) || 1,
                          })
                        }
                      />
                      <Input
                        label="Rate"
                        type="number"
                        value={line.rate}
                        onChange={(e) =>
                          updateLine(line.key, { rate: Number(e.target.value) || 0 })
                        }
                      />
                      <Input
                        label="Discount"
                        type="number"
                        value={line.discount}
                        onChange={(e) =>
                          updateLine(line.key, {
                            discount: Number(e.target.value) || 0,
                          })
                        }
                      />
                      <Input
                        label="GST %"
                        type="number"
                        value={line.gst_rate}
                        onChange={(e) =>
                          updateLine(line.key, {
                            gst_rate: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        className="text-sm font-medium text-accent"
                        onClick={() =>
                          setExpandedSpecs((k) => (k === line.key ? null : line.key))
                        }
                      >
                        {expandedSpecs === line.key
                          ? 'Hide door specifications'
                          : 'Door specifications'}
                      </button>
                      <div className="text-sm font-semibold text-ink">
                        Total {formatCurrencyExact(lineTotal)}
                      </div>
                    </div>

                    {expandedSpecs === line.key && (
                      <div className="mt-3 grid gap-3 rounded-lg bg-surface-muted/70 p-3 sm:grid-cols-2 lg:grid-cols-3">
                        {(
                          [
                            ['door_size', 'Door Size'],
                            ['height', 'Height'],
                            ['width', 'Width'],
                            ['thickness', 'Thickness'],
                            ['colour', 'Colour'],
                            ['finish', 'Finish'],
                            ['frame_type', 'Frame Type'],
                            ['glass_type', 'Glass Type'],
                            ['lock_type', 'Lock Type'],
                            ['handle_type', 'Handle Type'],
                            ['opening_direction', 'Opening Direction'],
                          ] as const
                        ).map(([key, label]) => (
                          <Input
                            key={key}
                            label={label}
                            value={line.specs[key] ?? ''}
                            onChange={(e) =>
                              updateSpecs(line.key, { [key]: e.target.value })
                            }
                          />
                        ))}
                        <div className="sm:col-span-2 lg:col-span-3">
                          <label className="mb-1.5 block text-sm font-medium text-ink">
                            Custom Instructions
                          </label>
                          <textarea
                            className="min-h-[72px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-600/15"
                            value={line.specs.custom_instructions ?? ''}
                            onChange={(e) =>
                              updateSpecs(line.key, {
                                custom_instructions: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-xl border border-border bg-white p-5 xl:sticky xl:top-6">
          <h2 className="text-sm font-semibold text-ink">Invoice Summary</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="font-medium">{formatCurrencyExact(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Discount</dt>
              <dd className="font-medium">{formatCurrencyExact(totals.discount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Taxable Amount</dt>
              <dd className="font-medium">
                {formatCurrencyExact(totals.taxableAmount)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">CGST</dt>
              <dd className="font-medium">{formatCurrencyExact(totals.cgst)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">SGST</dt>
              <dd className="font-medium">{formatCurrencyExact(totals.sgst)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <dt className="font-semibold text-ink">Grand Total</dt>
              <dd className="font-semibold text-ink">
                {formatCurrencyExact(totals.grand)}
              </dd>
            </div>
          </dl>

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-ink">Payment</label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m.value)
                    if (m.value !== 'credit' && m.value !== 'partial') {
                      setAmountPaid(totals.grand)
                    }
                  }}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-xs font-medium transition',
                    paymentMethod === m.value
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-border text-ink-secondary hover:bg-surface-muted',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <Input
              label="Amount Paid"
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
            />
          </div>

          <div className="mt-3 flex justify-between text-sm">
            <span className="text-ink-muted">Balance Due</span>
            <span className="font-semibold text-ink">
              {formatCurrencyExact(totals.balance)}
            </span>
          </div>

          <Button className="mt-5 w-full" size="lg" onClick={handleGenerate}>
            Generate Invoice
          </Button>
        </aside>
      </div>
    </div>
  )
}
