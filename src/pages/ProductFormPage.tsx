import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  createProduct,
  fetchCategories,
  fetchProduct,
  updateProduct,
} from '@/lib/data'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { cn, formatCurrencyExact } from '@/lib/utils'
import type { Product } from '@/types'

const GST_OPTIONS = [0, 5, 12, 18, 28]
const BRANDS = ['Sanro', 'Godrej', 'Yale', 'Ebco', 'Dorma', 'Saint-Gobain', 'Local']
const DEFAULT_UNIT = 'Nos'

const HSN_OPTIONS = [
  {
    code: '39252000',
    label: 'Fibre / FRP door (3925 / 39252000)',
  },
  {
    code: '7007',
    label: 'Toughened / tempered door glass (7007)',
  },
  {
    code: '7005',
    label: 'Float / plain sheet glass (7005)',
  },
  {
    code: '7008',
    label: 'Insulating glass / DGU (7008)',
  },
  {
    code: '7009',
    label: 'Mirrors (7009)',
  },
  {
    code: '8301',
    label: 'Door lock (8301)',
  },
] as const

const fieldClass =
  'h-9 w-full rounded-md border border-[#D1D5DB] bg-white px-3 text-[13px] text-ink outline-none placeholder:text-[#9CA3AF] shadow-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'

const selectClass =
  'sanro-select !h-9 !rounded-md !border !border-solid !border-[#D1D5DB] !bg-white !text-[13px] !shadow-none hover:!bg-white focus:!border-accent focus:!shadow-[0_0_0_2px_rgba(37,99,235,0.2)]'

export function ProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { data: categories = [] } = useAsync(fetchCategories, [])
  const { data: existing, loading: loadingProduct, error: loadError } = useAsync(
    () => (id ? fetchProduct(id) : Promise.resolve(null)),
    [id],
  )

  if (isEdit && (loadingProduct || !existing) && !loadError) {
    return (
      <div className="flex h-[calc(100vh-2rem)] flex-col items-center justify-center gap-3 rounded-xl bg-white text-sm text-ink-muted sanro-panel">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading product…
      </div>
    )
  }

  if (isEdit && (loadError || !existing)) {
    return (
      <div className="flex h-[calc(100vh-2rem)] flex-col items-center justify-center gap-3 rounded-xl bg-white text-sm sanro-panel">
        <p className="text-danger">{loadError || 'This product could not be found.'}</p>
        <Link to="/products" className="font-medium text-accent hover:underline">
          Back to products
        </Link>
      </div>
    )
  }

  return (
    <ProductForm
      key={existing?.id ?? 'new'}
      existing={existing ?? null}
      categories={categories}
      onCancel={() => navigate('/products')}
      onSaved={() => navigate('/products')}
    />
  )
}

function ProductForm({
  existing,
  categories,
  onCancel,
  onSaved,
}: {
  existing: Product | null
  categories: { id: string; name: string }[]
  onCancel: () => void
  onSaved: () => void
}) {
  const isEdit = !!existing
  const [name, setName] = useState(existing?.name ?? '')
  const [code, setCode] = useState(existing?.product_code ?? '')
  const [category, setCategory] = useState(existing?.category_id ?? '')
  const [brand, setBrand] = useState(existing?.brand ?? '')
  const [hsn, setHsn] = useState(existing?.hsn_code ?? '')
  const [purchaseRate, setPurchaseRate] = useState(
    existing ? String(existing.dealer_price) : '',
  )
  const [saleRate, setSaleRate] = useState(existing ? String(existing.selling_price) : '')
  const [mrp, setMrp] = useState(existing && existing.mrp ? String(existing.mrp) : '')
  const [gst, setGst] = useState(String(existing?.gst_rate ?? 18))
  const [openingStock, setOpeningStock] = useState(
    existing ? String(existing.stock_quantity) : '0',
  )
  const [minStock, setMinStock] = useState(
    existing ? String(existing.minimum_stock) : '0',
  )
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!isEdit && !code) {
      const n = Math.floor(1 + Math.random() * 999)
      setCode(`PD-${String(n).padStart(3, '0')}`)
    }
  }, [isEdit, code])

  const purchase = Number(purchaseRate) || 0
  const sale = Number(saleRate) || 0
  const gstRate = Number(gst) || 0
  const gstAmount = (sale * gstRate) / 100
  const totalSale = sale + gstAmount

  const brandOptions = useMemo(() => {
    const set = new Set(BRANDS)
    if (brand.trim()) set.add(brand.trim())
    return [...set]
  }, [brand])

  const hsnOptions = useMemo(() => {
    if (hsn && !HSN_OPTIONS.some((o) => o.code === hsn)) {
      return [...HSN_OPTIONS, { code: hsn, label: `Other (${hsn})` }]
    }
    return [...HSN_OPTIONS]
  }, [hsn])

  const errors = {
    name: !name.trim() ? 'Enter product name' : '',
    code: !code.trim() ? 'Enter product code' : '',
    category: !category ? 'Select category' : '',
    purchaseRate: purchase < 0 ? 'Invalid rate' : '',
    saleRate: !saleRate.trim() || sale < 0 ? 'Enter sale rate' : '',
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSubmitted(true)
    setSaveError('')
    if (Object.values(errors).some(Boolean)) return
    if (!isSupabaseConfigured) {
      setSaveError('Connect Supabase in .env to save products.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        product_code: code.trim(),
        category_id: category || null,
        hsn_code: hsn.trim() || null,
        unit: DEFAULT_UNIT,
        brand: brand.trim() || null,
        gst_rate: gstRate,
        selling_price: sale,
        dealer_price: purchase,
        mrp: Number(mrp) || sale,
        stock_quantity: Math.round(Number(openingStock) || 0),
        minimum_stock: Math.round(Number(minStock) || 0),
      }
      if (isEdit && existing) {
        await updateProduct(existing.id, payload)
      } else {
        await createProduct(payload)
      }
      onSaved()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl bg-white sanro-panel"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#EEF0F3] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to="/products"
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink"
            aria-label="Back to products"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-ink">
              {isEdit ? 'Edit Product' : 'Add Product'}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saveError && (
            <p className="max-w-[200px] truncate text-[12px] text-danger" role="alert" title={saveError}>
              {saveError}
            </p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update Product' : 'Save Product'}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Product Name" required error={submitted ? errors.name : ''} className="sm:col-span-2 lg:col-span-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              className={fieldClass}
            />
          </Field>
          <Field label="Product Code" required error={submitted ? errors.code : ''}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. PD-001"
              className={fieldClass}
            />
          </Field>
          <Field label="Category" required error={submitted ? errors.category : ''}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectClass}
            >
              <option value="">
                {categories.length === 0 ? 'No categories yet' : 'Select category'}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Brand">
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className={selectClass}
            >
              <option value="">Select brand</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
          <Field label="HSN Code">
            <select
              value={hsn}
              onChange={(e) => setHsn(e.target.value)}
              className={selectClass}
            >
              <option value="">Select HSN</option>
              {hsnOptions.map((o) => (
                <option key={o.code} value={o.code} title={o.label}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="border-t border-[#EEF0F3] pt-4">
          <p className="mb-2.5 text-[12px] font-semibold text-ink">Pricing</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Purchase Rate (Rs)"
              required
              error={submitted ? errors.purchaseRate : ''}
            >
              <input
                type="number"
                min={0}
                step="0.01"
                value={purchaseRate}
                onChange={(e) => setPurchaseRate(e.target.value)}
                placeholder="0.00"
                className={fieldClass}
              />
            </Field>
            <Field label="Sale Rate (Rs)" required error={submitted ? errors.saleRate : ''}>
              <input
                type="number"
                min={0}
                step="0.01"
                value={saleRate}
                onChange={(e) => setSaleRate(e.target.value)}
                placeholder="0.00"
                className={fieldClass}
              />
            </Field>
            <Field label="MRP (Rs)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="0.00"
                className={fieldClass}
              />
            </Field>
            <Field label="GST %" required>
              <select
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                className={selectClass}
              >
                {GST_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-sky-50/80 px-3 py-2.5 lg:grid-cols-4">
            <SummaryStat label="Purchase" value={formatCurrencyExact(purchase)} />
            <SummaryStat label="Sale" value={formatCurrencyExact(sale)} />
            <SummaryStat label="GST" value={formatCurrencyExact(gstAmount)} />
            <SummaryStat label="Total" value={formatCurrencyExact(totalSale)} emphasize />
          </div>
        </div>

        <div className="border-t border-[#EEF0F3] pt-4">
          <p className="mb-2.5 text-[12px] font-semibold text-ink">Stock</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Opening Stock" required>
              <input
                type="number"
                min={0}
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Minimum Stock">
              <input
                type="number"
                min={0}
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>
        </div>
      </div>
    </form>
  )
}

function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] font-medium text-ink-secondary">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error ? <p className="mt-0.5 text-[11px] text-danger">{error}</p> : null}
    </div>
  )
}

function SummaryStat({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div>
      <div
        className={cn(
          'text-[10px] font-medium uppercase tracking-wide text-ink-muted',
          emphasize && 'text-accent',
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 text-[13px] font-semibold tabular-nums text-ink',
          emphasize && 'text-accent',
        )}
      >
        {value}
      </div>
    </div>
  )
}
