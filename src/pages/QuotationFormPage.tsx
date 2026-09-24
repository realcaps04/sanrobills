import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  FileDown,
  FileText,
  Loader2,
  ChevronsRight,
  Plus,
  Printer,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react'
import { NewCustomerDialog } from '@/components/customers/NewCustomerDialog'
import { DatePicker } from '@/components/ui/DatePicker'
import { useSidebar } from '@/components/layout/SidebarContext'
import { companyStateCode, getCompanySettings, useCompanySettings } from '@/lib/company'
import { fetchCustomers, fetchProducts } from '@/lib/data'
import { useAsync } from '@/lib/useAsync'
import type { Customer, Product } from '@/types'
import type {
  Quotation,
  QuotationItem,
  QuotationStatus,
  QuotationType,
} from '@/types/quotation'
import { cn, formatCurrencyExact, toISODate } from '@/lib/utils'
import {
  commitQuotationNumber,
  formatQuotationNumber,
  getNextQuotationNumber,
} from '@/lib/quotationNumber'
import { isSupabaseConfigured } from '@/lib/supabase'
import {
  fetchQuotation,
  fetchLastQuotationSeq,
  saveQuotation,
  type LoadedQuotation,
} from '@/lib/quotations'
import { addDays, parseISO } from 'date-fns'

interface BillLine {
  key: string
  productId: string | null
  description: string
  spec: string
  hsn: string
  quantity: number
  rate: number
  discount: number
  gst_rate: number
}

const GST_RATES = [0, 5, 12, 18, 28]
const MIN_ROWS = 5

const DEFAULT_TERMS = `1. Prices are valid till the date mentioned above.
2. Payment terms as agreed upon confirmation of order.
3. Delivery schedule to be confirmed on order.
4. Goods once sold will not be taken back.
5. Subject to Kerala jurisdiction.`

const QUOTATION_TYPES: { value: QuotationType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'project', label: 'Project' },
  { value: 'estimation', label: 'Estimation' },
]

const QUOTATION_STATUSES: { value: QuotationStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'converted', label: 'Converted' },
  { value: 'expired', label: 'Expired' },
]

const STATES: { code: string; name: string }[] = [
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '18', name: 'Assam' },
  { code: '10', name: 'Bihar' },
  { code: '04', name: 'Chandigarh' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '07', name: 'Delhi' },
  { code: '30', name: 'Goa' },
  { code: '24', name: 'Gujarat' },
  { code: '06', name: 'Haryana' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '20', name: 'Jharkhand' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '38', name: 'Ladakh' },
  { code: '31', name: 'Lakshadweep' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '27', name: 'Maharashtra' },
  { code: '14', name: 'Manipur' },
  { code: '17', name: 'Meghalaya' },
  { code: '15', name: 'Mizoram' },
  { code: '13', name: 'Nagaland' },
  { code: '21', name: 'Odisha' },
  { code: '34', name: 'Puducherry' },
  { code: '03', name: 'Punjab' },
  { code: '08', name: 'Rajasthan' },
  { code: '11', name: 'Sikkim' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '16', name: 'Tripura' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '19', name: 'West Bengal' },
]

const fieldClass =
  'h-9 w-full rounded-md bg-white sanro-control px-3 text-[13px] text-ink outline-none placeholder:text-[#9CA3AF]'

const cellInputClass =
  'h-8 w-full rounded-md bg-white sanro-control px-2.5 text-[13px] text-ink outline-none placeholder:text-[#9CA3AF]'

function defaultValidTill(dateStr: string) {
  return toISODate(addDays(parseISO(dateStr), 7))
}

const emptyLine = (): BillLine => ({
  key: crypto.randomUUID(),
  productId: null,
  description: '',
  spec: '',
  hsn: '',
  quantity: 1,
  rate: 0,
  discount: 0,
  gst_rate: getCompanySettings().default_gst,
})

function lineTaxable(line: BillLine) {
  return Math.max(0, line.quantity * line.rate - line.discount)
}

function lineAmount(line: BillLine) {
  return lineTaxable(line) * (1 + line.gst_rate / 100)
}

function rateForAmount(line: BillLine, amount: number) {
  const taxable = amount / (1 + line.gst_rate / 100)
  return Math.max(0, (taxable + line.discount) / line.quantity)
}

function lineFromProduct(line: BillLine, product: Product): BillLine {
  return {
    ...line,
    productId: product.id,
    description: product.name,
    spec: [product.size, product.colour].filter(Boolean).join(', '),
    hsn: product.hsn_code ?? '',
    rate: product.selling_price,
    gst_rate: product.gst_rate,
  }
}

function lineFromQuotationItem(item: QuotationItem, products: Product[]): BillLine {
  const product = products.find((p) => p.id === item.product_id)
  return {
    key: crypto.randomUUID(),
    productId: item.product_id || null,
    description: item.product_name,
    spec: item.size ?? '',
    hsn: item.hsn_code ?? product?.hsn_code ?? '',
    quantity: item.quantity,
    rate: item.rate,
    discount: item.discount,
    gst_rate: item.gst_rate,
  }
}

function billingFieldsFor(c: Customer) {
  const cityLine = [c.city, c.pincode].filter(Boolean).join(' - ')
  const code = c.state_code || c.gstin?.slice(0, 2) || ''
  const state = STATES.some((s) => s.code === code) ? code : companyStateCode()
  return {
    address: [c.address, cityLine].filter(Boolean).join('\n'),
    gstin: c.gstin ?? '',
    state,
  }
}

const ProductsContext = createContext<Product[]>([])

function useProductMatches(query: string) {
  const products = useContext(ProductsContext)
  const q = query.toLowerCase().trim()
  if (!q) return products.slice(0, 8)
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.product_code.toLowerCase().includes(q) ||
      (p.hsn_code ?? '').includes(q),
  )
}

interface BillData {
  customers: Customer[]
  products: Product[]
  existing?: LoadedQuotation
}

async function loadBillData(quotationId: string | undefined): Promise<BillData> {
  if (!isSupabaseConfigured) return { customers: [], products: [] }
  const [customers, products, existing] = await Promise.all([
    fetchCustomers(),
    fetchProducts(),
    quotationId ? fetchQuotation(quotationId) : Promise.resolve(null),
  ])
  if (quotationId && !existing) throw new Error('This quotation could not be found.')
  return { customers, products, existing: existing ?? undefined }
}

export function QuotationFormPage() {
  const { id } = useParams()
  useCompanySettings()
  const { data, loading, error } = useAsync(() => loadBillData(id), [id])

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white py-24 text-sm text-ink-muted sanro-panel">
        {error ? (
          <p className="text-danger">{error}</p>
        ) : (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </>
        )}
      </div>
    )
  }

  return (
    <ProductsContext.Provider value={data.products}>
      <QuotationForm
        key={data.existing?.quotation.id ?? 'new'}
        customers={data.customers}
        products={data.products}
        existing={data.existing?.quotation}
        existingCustomer={data.existing?.customer ?? null}
      />
    </ProductsContext.Provider>
  )
}

function QuotationForm({
  customers,
  products,
  existing,
  existingCustomer,
}: {
  customers: Customer[]
  products: Product[]
  existing?: Quotation
  existingCustomer: Customer | null
}) {
  const navigate = useNavigate()
  const { toggle } = useSidebar()
  const isEdit = !!existing
  const COMPANY_STATE = companyStateCode()
  const initialBilling = existingCustomer ? billingFieldsFor(existingCustomer) : null

  const [quotationDate, setQuotationDate] = useState(
    () => existing?.quotation_date ?? toISODate(new Date()),
  )
  const [validTill, setValidTill] = useState(
    () =>
      existing?.valid_till ??
      defaultValidTill(existing?.quotation_date ?? toISODate(new Date())),
  )
  const [quotationNumber, setQuotationNumber] = useState(
    () => existing?.quotation_number ?? getNextQuotationNumber(),
  )
  const [editNumber, setEditNumber] = useState(false)
  const [numberEdited, setNumberEdited] = useState(isEdit)

  useEffect(() => {
    if (numberEdited) return
    const year = parseISO(quotationDate).getFullYear()
    setQuotationNumber(getNextQuotationNumber(parseISO(quotationDate)))
    if (!isSupabaseConfigured) return
    let cancelled = false
    void fetchLastQuotationSeq(year).then((seq) => {
      if (!cancelled && seq !== null) setQuotationNumber(formatQuotationNumber(year, seq + 1))
    })
    return () => {
      cancelled = true
    }
  }, [quotationDate, numberEdited])

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [customer, setCustomer] = useState<Customer | null>(existingCustomer)
  const [customerQuery, setCustomerQuery] = useState(
    existingCustomer?.name ?? existing?.customer_name ?? '',
  )
  const [customerOpen, setCustomerOpen] = useState(false)
  const [address, setAddress] = useState(
    existing?.billing_address ?? initialBilling?.address ?? '',
  )
  const [gstin, setGstin] = useState(existing?.customer_gstin ?? initialBilling?.gstin ?? '')
  const [state, setState] = useState(initialBilling?.state ?? '')
  const [placeOfSupply, setPlaceOfSupply] = useState(
    existing?.place_of_supply ?? initialBilling?.state ?? COMPANY_STATE,
  )
  const [quotationType, setQuotationType] = useState<QuotationType>(
    existing?.quotation_type ?? 'standard',
  )
  const [status, setStatus] = useState<QuotationStatus>(existing?.status ?? 'draft')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [customerList, setCustomerList] = useState(customers)

  useEffect(() => {
    setCustomerList(customers)
  }, [customers])

  const [lines, setLines] = useState<BillLine[]>(() =>
    existing?.items.length
      ? existing.items.map((item) => lineFromQuotationItem(item, products))
      : [emptyLine()],
  )
  const [activeRow, setActiveRow] = useState<string | null>(null)
  const [itemSearch, setItemSearch] = useState('')
  const [itemSearchOpen, setItemSearchOpen] = useState(false)

  // Notes & terms are not shown on the form UI; they still appear on the quotation PDF.
  const notes = existing?.notes ?? ''
  const terms = existing?.terms ?? DEFAULT_TERMS
  const [remarks, setRemarks] = useState(existing?.remarks ?? '')

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.toLowerCase().trim()
    if (!q) return customerList.slice(0, 8)
    return customerList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.gstin ?? '').toLowerCase().includes(q),
    )
  }, [customerQuery, customerList])

  const interState = placeOfSupply !== '' && placeOfSupply !== COMPANY_STATE

  const totals = useMemo(() => {
    let subtotal = 0
    let discount = 0
    let tax = 0
    for (const line of lines) {
      subtotal += line.quantity * line.rate
      discount += line.discount
      tax += (lineTaxable(line) * line.gst_rate) / 100
    }
    const taxable = Math.max(0, subtotal - discount)
    const grand = taxable + tax
    const rates = [...new Set(lines.map((l) => l.gst_rate))]
    return {
      subtotal,
      discount,
      taxable,
      tax,
      grand,
      singleRate: rates.length === 1 ? rates[0] : null,
    }
  }, [lines])

  function selectCustomer(c: Customer) {
    setCustomer(c)
    setCustomerQuery(c.name)
    setCustomerOpen(false)
    const billing = billingFieldsFor(c)
    setAddress(billing.address)
    setGstin(billing.gstin)
    setState(billing.state)
    setPlaceOfSupply(billing.state)
  }

  function handleGstinChange(value: string) {
    const v = value.toUpperCase()
    setGstin(v)
    const code = v.slice(0, 2)
    if (v.length >= 2 && STATES.some((s) => s.code === code)) {
      setState(code)
      setPlaceOfSupply(code)
    }
  }

  function updateLine(key: string, patch: Partial<BillLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function pickProductForRow(key: string, product: Product) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? lineFromProduct(l, product) : l)),
    )
    setActiveRow(null)
  }

  function addProductFromSearch(product: Product) {
    setLines((prev) => {
      const emptyIndex = prev.findIndex((l) => !l.productId && !l.description)
      if (emptyIndex >= 0) {
        return prev.map((l, i) => (i === emptyIndex ? lineFromProduct(l, product) : l))
      }
      return [...prev, lineFromProduct(emptyLine(), product)]
    })
    setItemSearch('')
    setItemSearchOpen(false)
  }

  function removeLine(key: string) {
    setLines((prev) =>
      prev.length === 1 ? [emptyLine()] : prev.filter((l) => l.key !== key),
    )
  }

  async function persist(asDraft: boolean) {
    if (saving) return
    setSaveError('')
    const filledLines = lines.filter((l) => l.description.trim())
    if (!customer) {
      setSaveError('Please select or add a customer.')
      return
    }
    if (filledLines.length === 0) {
      setSaveError('Please add at least one item.')
      return
    }
    if (!quotationNumber.trim()) {
      setSaveError('Please enter a quotation number.')
      return
    }
    if (!isSupabaseConfigured) {
      setSaveError('Connect Supabase in .env to save quotations.')
      return
    }

    const saveStatus: QuotationStatus = asDraft ? 'draft' : isEdit ? status : 'pending'
    if (asDraft) setStatus('draft')
    else if (!isEdit) setStatus('pending')

    setSaving(true)
    try {
      const { quotationId } = await saveQuotation(
        { ...customer, address: address.trim() || customer.address, gstin: gstin || null },
        {
          quotation_number: quotationNumber.trim(),
          quotation_date: quotationDate,
          valid_till: validTill || undefined,
          quotation_type: quotationType,
          billing_address: address.trim() || undefined,
          customer_gstin: gstin || undefined,
          place_of_supply: placeOfSupply || undefined,
          subtotal: totals.subtotal,
          discount: totals.discount,
          taxable_amount: totals.taxable,
          cgst: interState ? 0 : totals.tax / 2,
          sgst: interState ? 0 : totals.tax / 2,
          igst: interState ? totals.tax : 0,
          grand_total: totals.grand,
          status: saveStatus,
          notes: notes.trim() || undefined,
          terms: terms.trim() || undefined,
          remarks: remarks.trim() || undefined,
        },
        filledLines.map((l) => ({
          product_id: l.productId,
          product_code: products.find((p) => p.id === l.productId)?.product_code,
          product_name: l.description.trim(),
          size: l.spec.trim() || undefined,
          hsn_code: l.hsn.trim() || undefined,
          quantity: l.quantity,
          rate: l.rate,
          discount: l.discount,
          gst_rate: l.gst_rate,
          total: lineAmount(l),
        })),
        existing?.id,
      )
      if (!existing) commitQuotationNumber(quotationNumber.trim())
      navigate(`/quotations/${quotationId}`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the quotation.')
    } finally {
      setSaving(false)
    }
  }

  function handleGenerate() {
    void persist(false)
  }

  function handleSaveDraft() {
    void persist(true)
  }

  const halfRate = totals.singleRate !== null ? totals.singleRate / 2 : null
  const placeholderRows = Math.max(0, MIN_ROWS - lines.length)

  return (
    <div className="rounded-xl bg-white p-4 sanro-panel sm:p-5">
      {/* Title bar */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink lg:hidden"
            aria-label="Show sidebar"
          >
            <ChevronsRight className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-accent">
            <FileText className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-ink">
              {isEdit ? 'Edit Quotation' : 'Quotation'}
            </h1>
            <p className="text-[13px] text-ink-muted">
              Create a new quotation for your customer.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[190px]">
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Quotation No.
            </label>
            <div className="relative">
              <input
                value={quotationNumber}
                onChange={(e) => {
                  setQuotationNumber(e.target.value)
                  setNumberEdited(true)
                }}
                readOnly={!editNumber}
                className={cn(fieldClass, 'pr-9 font-medium', !editNumber && 'bg-[#F9FAFB]')}
              />
              <button
                type="button"
                onClick={() => setEditNumber((v) => !v)}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-muted hover:text-ink',
                  editNumber && 'text-accent',
                )}
                aria-label="Edit quotation number"
                title="Edit quotation number"
              >
                <Settings2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <div className="w-[170px]">
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Date
            </label>
            <DatePicker
              value={quotationDate}
              onChange={(v) => {
                setQuotationDate(v)
                if (!isEdit) setValidTill(defaultValidTill(v))
              }}
            />
          </div>
          <div className="w-[170px]">
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Valid Till
            </label>
            <DatePicker value={validTill} onChange={setValidTill} />
          </div>
        </div>
      </div>

      {/* Customer + Additional Details */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Customer Details">
          <div className="space-y-3">
            <FieldRow label="Customer">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                    strokeWidth={1.75}
                  />
                  <input
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value)
                      setCustomerOpen(true)
                      if (customer && e.target.value !== customer.name) setCustomer(null)
                    }}
                    onFocus={() => setCustomerOpen(true)}
                    onBlur={() => setCustomerOpen(false)}
                    placeholder="Search customer by name, phone or code"
                    className={cn(fieldClass, 'pl-9 pr-8')}
                  />
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                    strokeWidth={1.75}
                  />
                  {customerOpen && (
                    <Dropdown>
                      {filteredCustomers.length === 0 ? (
                        <DropdownEmpty>No customers found</DropdownEmpty>
                      ) : (
                        filteredCustomers.map((c) => (
                          <DropdownItem key={c.id} onSelect={() => selectCustomer(c)}>
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-medium text-ink">
                                {c.name}
                              </div>
                              <div className="text-xs text-ink-muted">
                                {c.phone}
                                {c.gstin ? ` · ${c.gstin}` : ''}
                              </div>
                            </div>
                            <span className="text-[11px] capitalize text-ink-muted">
                              {c.customer_type}
                            </span>
                          </DropdownItem>
                        ))
                      )}
                    </Dropdown>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(true)}
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-blue-50 px-3 text-[13px] font-medium text-accent hover:bg-blue-100"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  New
                </button>
              </div>
            </FieldRow>
            <FieldRow label="Address" alignTop>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Customer address will appear here"
                className="min-h-[76px] w-full resize-none rounded-md bg-white sanro-control px-3 py-2 text-[13px] text-ink outline-none placeholder:text-[#9CA3AF]"
              />
            </FieldRow>
          </div>
        </Section>

        <Section title="Additional Details">
          <div className="grid gap-3 sm:grid-cols-2">
            <CompactField label="GSTIN">
              <input
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="Enter GSTIN (optional)"
                maxLength={15}
                className={fieldClass}
              />
            </CompactField>
            <CompactField label="Quotation Type">
              <div className="relative">
                <select
                  value={quotationType}
                  onChange={(e) => setQuotationType(e.target.value as QuotationType)}
                  className="sanro-select !h-9 !text-[13px]"
                >
                  {QUOTATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                  strokeWidth={1.75}
                />
              </div>
            </CompactField>
            <CompactField label="State">
              <StateSelect value={state} onChange={setState} placeholder="Select state" />
            </CompactField>
            <CompactField label="Place of Supply">
              <StateSelect
                value={placeOfSupply}
                onChange={setPlaceOfSupply}
                placeholder="Select place of supply"
              />
            </CompactField>
          </div>
        </Section>
      </div>

      {/* Items */}
      <Section
        title="Items"
        className="mt-4"
        bodyClassName="p-0"
        action={
          <div className="flex items-center gap-2">
            <div className="relative w-[240px] max-w-[55vw]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                strokeWidth={1.75}
              />
              <input
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value)
                  setItemSearchOpen(true)
                }}
                onFocus={() => setItemSearchOpen(true)}
                onBlur={() => setItemSearchOpen(false)}
                placeholder="Search product (name, code or HSN)"
                className={cn(fieldClass, 'pl-9')}
              />
              {itemSearchOpen && (
                <ProductDropdown
                  query={itemSearch}
                  onSelect={addProductFromSearch}
                  align="right"
                  wide
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-blue-50 px-3 text-[13px] font-medium text-accent hover:bg-blue-100"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Add Item
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto lg:overflow-visible">
          <table className="w-full min-w-[960px] text-left text-[13px]">
            <thead>
              <tr className="bg-[#F9FAFB] text-xs font-semibold text-ink-secondary">
                <Th className="w-10 text-center">#</Th>
                <Th className="w-[22%]">Product / Description</Th>
                <Th className="w-[15%]">Size / Specification</Th>
                <Th className="w-[9%]">HSN</Th>
                <Th className="w-[7%]">Qty</Th>
                <Th className="w-[11%] text-right">Rate (Rs)</Th>
                <Th className="w-[11%] text-right">Discount (Rs)</Th>
                <Th className="w-[9%]">GST %</Th>
                <Th className="w-[11%] text-right">
                  Amount (Rs)
                  <span className="block text-[10px] font-medium text-ink-muted">incl. GST</span>
                </Th>
                <Th className="w-10 text-center">
                  <Trash2 className="mx-auto h-4 w-4" strokeWidth={1.75} />
                </Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.key} className="align-middle">
                  <Td className="text-center text-ink-muted">{index + 1}</Td>
                  <Td>
                    <div className="relative">
                      <input
                        value={line.description}
                        onChange={(e) => {
                          updateLine(line.key, {
                            description: e.target.value,
                            productId: null,
                          })
                          setActiveRow(line.key)
                        }}
                        onFocus={() => setActiveRow(line.key)}
                        onBlur={() => setActiveRow(null)}
                        placeholder="Type or search product..."
                        className={cellInputClass}
                      />
                      {activeRow === line.key && (
                        <ProductDropdown
                          query={line.description}
                          onSelect={(p) => pickProductForRow(line.key, p)}
                          wide
                        />
                      )}
                    </div>
                  </Td>
                  <Td>
                    <input
                      value={line.spec}
                      onChange={(e) => updateLine(line.key, { spec: e.target.value })}
                      placeholder='e.g. 30" x 80", White'
                      className={cellInputClass}
                    />
                  </Td>
                  <Td>
                    <input
                      value={line.hsn}
                      onChange={(e) => updateLine(line.key, { hsn: e.target.value })}
                      placeholder="e.g. 3925"
                      className={cellInputClass}
                    />
                  </Td>
                  <Td>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.key, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className={cellInputClass}
                    />
                  </Td>
                  <Td>
                    <NumberCell
                      value={line.rate}
                      onValueChange={(rate) => updateLine(line.key, { rate })}
                      ariaLabel={`Rate for item ${index + 1}`}
                    />
                  </Td>
                  <Td>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.discount}
                      onChange={(e) =>
                        updateLine(line.key, { discount: Number(e.target.value) || 0 })
                      }
                      className={cn(cellInputClass, 'text-right')}
                    />
                  </Td>
                  <Td>
                    <div className="relative">
                      <select
                        value={line.gst_rate}
                        onChange={(e) =>
                          updateLine(line.key, { gst_rate: Number(e.target.value) })
                        }
                        className="sanro-select sanro-select--sm !h-8 !text-[13px]"
                      >
                        {GST_RATES.map((r) => (
                          <option key={r} value={r}>
                            {r}%
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
                        strokeWidth={1.75}
                      />
                    </div>
                  </Td>
                  <Td className="bg-[#F9FAFB]">
                    <NumberCell
                      value={lineAmount(line)}
                      onValueChange={(amount) =>
                        updateLine(line.key, { rate: rateForAmount(line, amount) })
                      }
                      ariaLabel={`Amount including GST for item ${index + 1}`}
                      className="font-medium"
                    />
                  </Td>
                  <Td className="text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="rounded p-1 text-ink-muted hover:bg-red-50 hover:text-danger"
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </Td>
                </tr>
              ))}

              {Array.from({ length: placeholderRows }).map((_, i) => (
                <tr
                  key={`placeholder-${i}`}
                  onClick={() => setLines((prev) => [...prev, emptyLine()])}
                  className="cursor-pointer hover:bg-[#FAFBFC]"
                  title="Click to add an item"
                >
                  <Td className="h-11 text-center text-ink-muted">
                    {lines.length + i + 1}
                  </Td>
                  <Td />
                  <Td />
                  <Td />
                  <Td />
                  <Td />
                  <Td />
                  <Td />
                  <Td />
                  <Td className="text-center">
                    <Trash2 className="mx-auto h-4 w-4 text-[#D1D5DB]" strokeWidth={1.75} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Totals - single horizontal line; notes & terms stay on PDF only */}
      <div className="mt-4 overflow-x-auto rounded-lg bg-[#F9FAFB] shadow-[0_0_0_1px_#EEF0F3]">
        <div className="flex min-w-max items-stretch divide-x divide-[#EEF0F3]">
          <TotalCell label="Sub Total" value={totals.subtotal} />
          <TotalCell label="Discount" value={totals.discount} />
          <TotalCell label="Taxable Amount" value={totals.taxable} />
          {interState ? (
            <TotalCell
              label={`IGST${totals.singleRate !== null ? ` (${totals.singleRate}%)` : ''}`}
              value={totals.tax}
            />
          ) : (
            <>
              <TotalCell
                label={`CGST${halfRate !== null ? ` (${halfRate}%)` : ''}`}
                value={totals.tax / 2}
              />
              <TotalCell
                label={`SGST${halfRate !== null ? ` (${halfRate}%)` : ''}`}
                value={totals.tax / 2}
              />
            </>
          )}
          <TotalCell label="Grand Total" value={totals.grand} emphasize />
        </div>
      </div>

      {/* Status, remarks + actions */}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
          <div className="w-[160px]">
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Quotation Status
            </label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QuotationStatus)}
                className="sanro-select !h-9 !text-[13px]"
              >
                {QUOTATION_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                strokeWidth={1.75}
              />
            </div>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Remarks (Internal)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Internal notes - not shown on the quotation"
              rows={1}
              className="h-9 w-full resize-none rounded-md bg-white sanro-control px-3 py-2 text-[13px] text-ink outline-none placeholder:text-[#9CA3AF]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveError && (
            <p className="mr-2 max-w-sm text-[13px] text-danger" role="alert">
              {saveError}
            </p>
          )}
          <ActionButton onClick={() => window.print()}>
            <Printer className="h-4 w-4" strokeWidth={1.75} />
            Print
          </ActionButton>
          <ActionButton onClick={() => window.print()}>
            <FileDown className="h-4 w-4" strokeWidth={1.75} />
            Save as PDF
          </ActionButton>
          <ActionButton
            className="bg-[#F3F4F6]"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            Save Draft
          </ActionButton>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-5 text-[13px] font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <FileText className="h-4 w-4" strokeWidth={1.75} />
            )}
            {saving ? 'Saving...' : isEdit ? 'Update Quotation' : 'Generate Quotation'}
          </button>
        </div>
      </div>

      {showNewCustomer && (
        <NewCustomerDialog
          onClose={() => setShowNewCustomer(false)}
          onSave={(c) => {
            setCustomerList((prev) => [c, ...prev.filter((x) => x.id !== c.id)])
            selectCustomer(c)
            setShowNewCustomer(false)
          }}
        />
      )}
    </div>
  )
}

function CompactField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-secondary">{label}</label>
      {children}
    </div>
  )
}

function NumberCell({
  value,
  onValueChange,
  ariaLabel,
  className,
}: {
  value: number
  onValueChange: (value: number) => void
  ariaLabel: string
  className?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <input
      type="number"
      min={0}
      step="0.01"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={draft ?? (value ? value.toFixed(2) : '0')}
      onFocus={(e) => {
        setDraft(value ? String(Math.round(value * 100) / 100) : '')
        e.currentTarget.select()
      }}
      onChange={(e) => {
        setDraft(e.target.value)
        onValueChange(Math.max(0, Number(e.target.value) || 0))
      }}
      onBlur={() => setDraft(null)}
      className={cn(cellInputClass, 'text-right', className)}
    />
  )
}

function Section({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={cn('rounded-lg bg-[#FCFCFD] shadow-[0_0_0_1px_#EEF0F3]', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className={cn('px-4 pb-4', bodyClassName)}>{children}</div>
    </section>
  )
}

function FieldRow({
  label,
  alignTop,
  children,
}: {
  label: string
  alignTop?: boolean
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-3">
      <label
        className={cn(
          'text-[13px] font-medium text-ink-secondary',
          alignTop ? 'sm:pt-2' : 'sm:self-center',
        )}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function StateSelect({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('sanro-select !h-9 !text-[13px]', !value && '!text-[#9CA3AF]')}
      >
        <option value="">{placeholder}</option>
        {STATES.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        strokeWidth={1.75}
      />
    </div>
  )
}

function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'px-3 py-2.5 font-semibold shadow-[inset_-1px_-1px_0_0_#EEF0F3,inset_0_1px_0_0_#EEF0F3] last:shadow-[inset_0_-1px_0_0_#EEF0F3,inset_0_1px_0_0_#EEF0F3]',
        className,
      )}
    >
      {children}
    </th>
  )
}

function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <td
      className={cn(
        'bg-white px-2 py-1.5 shadow-[inset_-1px_-1px_0_0_#EEF0F3] last:shadow-[inset_0_-1px_0_0_#EEF0F3]',
        className,
      )}
    >
      {children}
    </td>
  )
}

function TotalCell({
  label,
  value,
  emphasize,
}: {
  label: string
  value: number
  emphasize?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-[120px] flex-1 flex-col justify-center gap-0.5 px-4 py-3',
        emphasize && 'bg-blue-50',
      )}
    >
      <span
        className={cn(
          'text-[11px] font-medium text-ink-secondary',
          emphasize && 'text-ink',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-[13px] font-semibold text-ink tabular-nums',
          emphasize && 'text-[15px] font-bold text-accent',
        )}
      >
        {formatCurrencyExact(value)}
      </span>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  className,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-[13px] font-medium text-ink-secondary sanro-control hover:text-ink disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}

function Dropdown({
  children,
  align = 'left',
  wide = false,
}: {
  children: ReactNode
  align?: 'left' | 'right'
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        'absolute top-full z-30 mt-1 min-w-full overflow-auto rounded-md bg-white py-1 sanro-panel',
        wide ? 'max-h-80 w-[520px] max-w-[calc(100vw-2rem)]' : 'max-h-64 w-[340px] max-w-[80vw]',
        align === 'right' ? 'right-0' : 'left-0',
      )}
    >
      {children}
    </div>
  )
}

function DropdownItem({
  children,
  onSelect,
}: {
  children: ReactNode
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onSelect()
      }}
      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#F3F4F6]"
    >
      {children}
    </button>
  )
}

function DropdownEmpty({ children }: { children: ReactNode }) {
  return <div className="px-3 py-4 text-center text-[13px] text-ink-muted">{children}</div>
}

function ProductDropdown({
  query,
  onSelect,
  align,
  wide,
}: {
  query: string
  onSelect: (product: Product) => void
  align?: 'left' | 'right'
  wide?: boolean
}) {
  const results = useProductMatches(query)
  return (
    <Dropdown align={align} wide={wide}>
      {results.length === 0 ? (
        <DropdownEmpty>No products found</DropdownEmpty>
      ) : (
        results.map((p) => (
          <DropdownItem key={p.id} onSelect={() => onSelect(p)}>
            <div className="min-w-0">
              <div
                className={cn(
                  'text-[13px] font-medium text-ink',
                  wide ? 'leading-snug' : 'truncate',
                )}
              >
                {p.name}
              </div>
              <div className="text-xs text-ink-muted">
                {p.product_code}
                {p.hsn_code ? ` · HSN ${p.hsn_code}` : ''} · Stock {p.stock_quantity}
              </div>
            </div>
            <span className="shrink-0 text-[13px] font-medium text-ink">
              {formatCurrencyExact(p.selling_price)}
            </span>
          </DropdownItem>
        ))
      )}
    </Dropdown>
  )
}

