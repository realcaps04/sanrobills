import { useMemo, useState, type ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { NewCustomerDialog } from '@/components/customers/NewCustomerDialog'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import {
  createCustomer,
  deleteCustomer,
  fetchCustomers,
  updateCustomer,
} from '@/lib/data'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { Customer, CustomerType } from '@/types'

const PAGE_SIZE = 10

const TYPE_LABELS: Record<CustomerType, string> = {
  retail: 'Retail',
  dealer: 'Dealer',
  contractor: 'Contractor',
}

const TYPE_STYLES: Record<CustomerType, string> = {
  retail: 'bg-sky-50 text-sky-700',
  dealer: 'bg-violet-50 text-violet-700',
  contractor: 'bg-amber-50 text-amber-700',
}

const STATE_NAMES: Record<string, string> = {
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '29': 'Karnataka',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '27': 'Maharashtra',
  '24': 'Gujarat',
  '07': 'Delhi',
}

type ActivityStatus = 'active' | 'inactive'

function customerStatus(c: Customer): ActivityStatus {
  if (c.outstanding > 0) return 'active'
  if (c.last_purchase) {
    const last = new Date(c.last_purchase).getTime()
    const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
    if (last >= yearAgo) return 'active'
  }
  const created = new Date(c.created_at).getTime()
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000
  if (created >= ninetyDaysAgo) return 'active'
  return 'inactive'
}

function placeOf(c: Customer) {
  return c.city?.trim() || c.address?.split('\n')[0]?.trim() || '-'
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  return phone || '-'
}

function isThisMonth(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export function CustomersPage() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<CustomerType | 'all'>('all')
  const [state, setState] = useState<string>('all')
  const [status, setStatus] = useState<ActivityStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [viewing, setViewing] = useState<Customer | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [actionError, setActionError] = useState('')
  const [deletingBusy, setDeletingBusy] = useState(false)
  const { data, loading, error, reload } = useAsync(fetchCustomers, [])
  const customers = useMemo(() => data ?? [], [data])

  const stateOptions = useMemo(() => {
    const codes = new Set<string>()
    for (const c of customers) {
      if (c.state_code) codes.add(c.state_code)
    }
    if (codes.size === 0) codes.add('32')
    return [...codes].sort().map((code) => ({
      code,
      name: STATE_NAMES[code] ?? `State ${code}`,
    }))
  }, [customers])

  const stats = useMemo(() => {
    const statuses = customers.map(customerStatus)
    return {
      total: customers.length,
      newThisMonth: customers.filter((c) => isThisMonth(c.created_at)).length,
      active: statuses.filter((s) => s === 'active').length,
      inactive: statuses.filter((s) => s === 'inactive').length,
    }
  }, [customers])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return customers.filter((c) => {
      const matchesType = type === 'all' || c.customer_type === type
      const matchesState = state === 'all' || c.state_code === state
      const matchesStatus = status === 'all' || customerStatus(c) === status
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.gstin ?? '').toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      return matchesType && matchesState && matchesStatus && matchesQuery
    })
  }, [customers, query, type, state, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const showingFrom = filtered.length === 0 ? 0 : pageStart + 1
  const showingTo = Math.min(pageStart + PAGE_SIZE, filtered.length)

  function clearFilters() {
    setQuery('')
    setType('all')
    setState('all')
    setStatus('all')
    setPage(1)
  }

  const pageButtons = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 4) return [1, 2, 3, 4, 5, -1, totalPages]
    if (currentPage >= totalPages - 3) {
      return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, -1, currentPage - 1, currentPage, currentPage + 1, -2, totalPages]
  }, [currentPage, totalPages])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Customers</h1>
          <p className="mt-0.5 text-sm text-ink-muted">Manage all your customers</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add Customer
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Customers"
          value={loading ? '-' : String(stats.total)}
          icon={Users}
          tone="bg-sky-50 text-sky-600"
        />
        <SummaryCard
          label="New This Month"
          value={loading ? '-' : String(stats.newThisMonth)}
          icon={UserPlus}
          tone="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          label="Active Customers"
          value={loading ? '-' : String(stats.active)}
          icon={ShoppingCart}
          tone="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          label="Inactive Customers"
          value={loading ? '-' : String(stats.inactive)}
          icon={Clock3}
          tone="bg-red-50 text-red-600"
        />
      </div>

      <div className="overflow-hidden rounded-xl bg-white sanro-panel">
        <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 sanro-divider">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search by customer name, phone, code or GSTIN..."
              className="h-10 w-full rounded-md bg-[#F8F9FC] px-3 pl-10 text-sm outline-none placeholder:text-[#9CA3AF] sanro-control focus:bg-white"
            />
          </div>

          <Select
            className="sanro-select--sm w-auto min-w-[140px]"
            value={type}
            onChange={(e) => {
              setType(e.target.value as CustomerType | 'all')
              setPage(1)
            }}
          >
            <option value="all">All Types</option>
            {(Object.keys(TYPE_LABELS) as CustomerType[]).map((key) => (
              <option key={key} value={key}>
                {TYPE_LABELS[key]}
              </option>
            ))}
          </Select>

          <Select
            className="sanro-select--sm w-auto min-w-[130px]"
            value={state}
            onChange={(e) => {
              setState(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">All States</option>
            {stateOptions.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </Select>

          <Select
            className="sanro-select--sm w-auto min-w-[130px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ActivityStatus | 'all')
              setPage(1)
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink sanro-control"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
            Clear
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] text-[11px] font-semibold uppercase tracking-wide text-ink-muted sanro-divider">
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">GSTIN</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Place</th>
                <th className="px-4 py-3 text-right">Total Purchases (Rs)</th>
                <th className="px-4 py-3 text-right">Outstanding (Rs)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F4]">
              {pageItems.map((c, index) => {
                const activity = customerStatus(c)
                return (
                  <tr key={c.id} className="hover:bg-[#F8F9FC]/80">
                    <td className="px-4 py-3.5 text-ink-muted">{pageStart + index + 1}</td>
                    <td className="px-4 py-3.5 font-medium text-ink">{c.name}</td>
                    <td className="px-4 py-3.5 text-ink-muted">{formatPhone(c.phone)}</td>
                    <td className="px-4 py-3.5 font-mono text-[12px] text-ink-secondary">
                      {c.gstin || '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium',
                          TYPE_STYLES[c.customer_type],
                        )}
                      >
                        {TYPE_LABELS[c.customer_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-ink-muted">{placeOf(c)}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-ink">
                      {formatCurrency(c.total_purchases)}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3.5 text-right font-medium',
                        c.outstanding > 0 ? 'text-warning' : 'text-ink',
                      )}
                    >
                      {formatCurrency(c.outstanding)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium',
                          activity === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {activity === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActionError('')
                            setViewing(c)
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2.5 py-1 text-[12px] font-medium text-sky-700 hover:bg-sky-100"
                        >
                          <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionError('')
                            setEditing(c)
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-700 hover:bg-amber-100"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionError('')
                            setDeleting(c)
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-[12px] font-medium text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-ink-muted">
                    {loading
                      ? 'Loading customers...'
                      : error
                        ? error
                        : customers.length === 0
                          ? 'No customers yet. Add your first customer.'
                          : 'No customers found for this filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(15,23,42,0.06)]">
          <div className="text-sm text-ink-muted">
            Showing {showingFrom} to {showingTo} of {filtered.length} customers
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md p-2 text-ink-muted hover:bg-surface-muted disabled:opacity-40 sanro-control"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageButtons.map((n, i) =>
              n < 0 ? (
                <span key={`e-${i}`} className="px-1 text-ink-muted">
                  ...
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    'min-w-9 rounded-md px-2.5 py-1.5 text-sm font-medium',
                    n === currentPage
                      ? 'bg-[#1e3a5f] text-white'
                      : 'text-ink-muted hover:bg-surface-muted',
                  )}
                >
                  {n}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md p-2 text-ink-muted hover:bg-surface-muted disabled:opacity-40 sanro-control"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showAdd && (
        <NewCustomerDialog
          onClose={() => setShowAdd(false)}
          onSave={() => {
            setShowAdd(false)
            reload()
          }}
        />
      )}

      {editing && (
        <CustomerFormDialog
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}

      {viewing && (
        <ViewCustomerDialog
          customer={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing)
            setViewing(null)
          }}
        />
      )}

      {deleting && (
        <DeleteCustomerDialog
          customer={deleting}
          busy={deletingBusy}
          error={actionError}
          onClose={() => {
            if (deletingBusy) return
            setDeleting(null)
            setActionError('')
          }}
          onConfirm={() => {
            void (async () => {
              setDeletingBusy(true)
              setActionError('')
              try {
                if (!isSupabaseConfigured) {
                  throw new Error('Connect Supabase in .env to delete customers.')
                }
                await deleteCustomer(deleting.id)
                setDeleting(null)
                reload()
              } catch (err) {
                setActionError(
                  err instanceof Error ? err.message : 'Could not delete the customer.',
                )
              } finally {
                setDeletingBusy(false)
              }
            })()
          }}
        />
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof Users
  tone: string
}) {
  return (
    <div className="rounded-xl bg-white p-5 sanro-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-medium text-ink-muted">{label}</div>
          <div className="mt-2 text-[1.5rem] font-semibold tracking-tight text-ink">
            {value}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', tone)}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
          <ChevronRight className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}

const MOBILE_RE = /^[6-9]\d{9}$/

function CustomerFormDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer?: Customer
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!customer
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone.replace(/\D/g, '').slice(-10) ?? '')
  const [customerType, setCustomerType] = useState<CustomerType>(
    customer?.customer_type ?? 'retail',
  )
  const [address, setAddress] = useState(customer?.address ?? '')
  const [city, setCity] = useState(customer?.city ?? '')
  const [gstin, setGstin] = useState(customer?.gstin ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const errors = {
    name: !name.trim() ? 'Enter the customer name' : '',
    phone: !MOBILE_RE.test(phone) ? 'Enter a valid 10-digit mobile number' : '',
  }

  async function handleSave() {
    setSubmitted(true)
    setSaveError('')
    if (errors.name || errors.phone) return
    if (!isSupabaseConfigured) {
      setSaveError('Connect Supabase in .env to save customers.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        phone,
        customer_type: customerType,
        address: address.trim() || null,
        city: city.trim() || null,
        state_code: customer?.state_code ?? '32',
        gstin: gstin.trim() || null,
        gst_registration: (gstin.trim()
          ? 'registered'
          : customer?.gst_registration ?? 'unregistered') as Customer['gst_registration'],
      }
      if (isEdit && customer) {
        await updateCustomer(customer.id, payload)
      } else {
        await createCustomer({
          ...payload,
          email: null,
          contact_person: null,
          alt_phone: null,
          pincode: null,
          pan: null,
          payment_terms_days: 0,
          credit_limit: 0,
          opening_balance: 0,
          notes: null,
        })
      }
      onSaved()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the customer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white sanro-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit customer' : 'Add customer'}
      >
        <div className="flex items-center justify-between px-5 py-4 sanro-divider">
          <div>
            <h2 className="text-base font-semibold text-ink">
              {isEdit ? 'Edit Customer' : 'Add Customer'}
            </h2>
            <p className="text-[13px] text-ink-muted">
              {isEdit ? 'Update customer details' : 'Create a new customer record'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-surface-muted"
          >
            Close
          </button>
        </div>

        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <Field label="Customer Name" error={submitted ? errors.name : ''} className="sm:col-span-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name / business name"
              className="h-9 w-full rounded-md bg-white px-3 text-[13px] sanro-control outline-none"
            />
          </Field>
          <Field label="Phone" error={submitted ? errors.phone : ''}>
            <div className="flex h-9 overflow-hidden rounded-md sanro-control">
              <span className="flex items-center bg-[#F9FAFB] px-2.5 text-[13px] text-ink-muted">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile"
                className="h-full w-full bg-white px-3 text-[13px] outline-none"
              />
            </div>
          </Field>
          <Field label="Customer Type">
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value as CustomerType)}
              className="sanro-select !h-9 !text-[13px]"
            >
              {(Object.keys(TYPE_LABELS) as CustomerType[]).map((key) => (
                <option key={key} value={key}>
                  {TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="City / Place">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Kattappana"
              className="h-9 w-full rounded-md bg-white px-3 text-[13px] sanro-control outline-none"
            />
          </Field>
          <Field label="GSTIN (optional)">
            <input
              value={gstin}
              onChange={(e) =>
                setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15))
              }
              placeholder="15-character GSTIN"
              className="h-9 w-full rounded-md bg-white px-3 text-[13px] sanro-control outline-none"
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Billing address"
              rows={2}
              className="w-full resize-none rounded-md bg-white px-3 py-2 text-[13px] sanro-control outline-none"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 sanro-divider">
          {saveError && <p className="mr-auto text-[13px] text-danger">{saveError}</p>}
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Customer' : 'Save Customer'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ViewCustomerDialog({
  customer,
  onClose,
  onEdit,
}: {
  customer: Customer
  onClose: () => void
  onEdit: () => void
}) {
  const activity = customerStatus(customer)
  const stateName =
    STATE_NAMES[customer.state_code ?? ''] ??
    (customer.state_code ? `State ${customer.state_code}` : '-')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white sanro-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="View customer"
      >
        <div className="flex items-center justify-between px-5 py-4 sanro-divider">
          <div>
            <h2 className="text-base font-semibold text-ink">{customer.name}</h2>
            <p className="text-[13px] text-ink-muted">Customer details</p>
          </div>
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium',
              activity === 'active'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-600',
            )}
          >
            {activity === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>

        <dl className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <Detail label="Phone" value={formatPhone(customer.phone)} />
          <Detail label="Type" value={TYPE_LABELS[customer.customer_type]} />
          <Detail label="GSTIN" value={customer.gstin || '-'} />
          <Detail label="Place" value={placeOf(customer)} />
          <Detail label="State" value={stateName} />
          <Detail
            label="Last Purchase"
            value={customer.last_purchase ? formatDate(customer.last_purchase) : '-'}
          />
          <Detail label="Total Purchases" value={formatCurrency(customer.total_purchases)} />
          <Detail label="Outstanding" value={formatCurrency(customer.outstanding)} />
          <Detail
            label="Address"
            value={customer.address?.trim() || '-'}
            className="sm:col-span-2"
          />
        </dl>

        <div className="flex items-center justify-end gap-2 px-5 py-4 sanro-divider">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            Edit
          </Button>
        </div>
      </div>
    </div>
  )
}

function DeleteCustomerDialog({
  customer,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  customer: Customer
  busy: boolean
  error: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white sanro-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Delete customer"
      >
        <div className="px-5 py-4 sanro-divider">
          <h2 className="text-base font-semibold text-ink">Delete customer?</h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            This will permanently remove <span className="font-medium text-ink">{customer.name}</span>.
            This action cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4">
          {error && <p className="mr-auto max-w-[60%] text-[13px] text-danger">{error}</p>}
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-[13px] text-ink">{value}</dd>
    </div>
  )
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-ink-secondary">{label}</label>
      {children}
      {error ? <p className="mt-1 text-[11px] text-danger">{error}</p> : null}
    </div>
  )
}

