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
const UNITS = ['Nos', 'Set', 'Box', 'Meter', 'Sq.Ft', 'Kg', 'Pair']
const BRANDS = ['Sanro', 'Godrej', 'Yale', 'Ebco', 'Dorma', 'Saint-Gobain', 'Local']
const PRODUCT_TYPES = ['Normal', 'Service', 'Bundle']
const DESC_MAX = 500

const fieldClass =
  'h-10 w-full rounded-md bg-white px-3 text-[13px] text-ink outline-none placeholder:text-[#9CA3AF] sanro-control'

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
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white py-24 text-sm text-ink-muted sanro-panel">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading product…
      </div>
    )
  }

  if (isEdit && (loadError || !existing)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white py-24 text-sm sanro-panel">
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
      existing={existing}
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
  const [barcode, setBarcode] = useState('')
  const [category, setCategory] = useState(existing?.category_id ?? '')
  const [brand, setBrand] = useState(existing?.brand ?? '')
  const [hsn, setHsn] = useState(existing?.hsn_code ?? '')
  const [unit, setUnit] = useState(existing?.unit ?? 'Nos')
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
  const [reorderLevel, setReorderLevel] = useState('0')
  const [location, setLocation] = useState('')
  const [supplier, setSupplier] = useState('')
  const [rack, setRack] = useState('')
  const [productType, setProductType] = useState('Normal')
  const [active, setActive] = useState(true)
  const [description, setDescription] = useState('')
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

  const errors = {
    name: !name.trim() ? 'Enter product name' : '',
    code: !code.trim() ? 'Enter product code' : '',
    category: !category ? 'Select category' : '',
    unit: !unit ? 'Select unit' : '',
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
        unit: unit || 'Nos',
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/products"
            className="rounded-md bg-white p-2 text-ink-muted sanro-control hover:bg-surface-muted hover:text-ink"
            aria-label="Back to products"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-ink">
              {isEdit ? 'Edit Product' : 'Add Product'}
            </h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              {isEdit
                ? 'Update product details'
                : 'Enter product details to add it to your catalog'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saveError && (
            <p className="mr-2 max-w-xs text-[13px] text-danger" role="alert">
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

      {/* Basic Details */}
      <Section title="Basic Details">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Product Name" required error={submitted ? errors.name : ''}>
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
          <Field label="Barcode (Optional)">
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Enter barcode"
              className={fieldClass}
            />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Category" required error={submitted ? errors.category : ''}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="sanro-select !h-10 !text-[13px]"
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
          <Field label="Brand (Optional)">
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="sanro-select !h-10 !text-[13px]"
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
            <input
              value={hsn}
              onChange={(e) => setHsn(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Enter HSN code"
              className={fieldClass}
            />
          </Field>
          <Field label="Unit" required error={submitted ? errors.unit : ''}>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="sanro-select !h-10 !text-[13px]"
            >
              <option value="">Select unit</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Pricing & Tax */}
      <Section title="Pricing & Tax">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <Field label="MRP (Rs) (Optional)">
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
              className="sanro-select !h-10 !text-[13px]"
            >
              {GST_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 grid gap-3 rounded-lg bg-sky-50/80 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="Purchase Rate (Rs)" value={formatCurrencyExact(purchase)} />
          <SummaryStat label="Sale Rate (Rs)" value={formatCurrencyExact(sale)} />
          <SummaryStat label="GST Amount (Rs)" value={formatCurrencyExact(gstAmount)} />
          <SummaryStat
            label="Total Sale Price (Rs)"
            value={formatCurrencyExact(totalSale)}
            emphasize
          />
        </div>
      </Section>

      {/* Stock & Other */}
      <Section title="Stock & Other Details">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <Field label="Reorder Level">
            <input
              type="number"
              min={0}
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Location (Optional)">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Main Store, Godown"
              className={fieldClass}
            />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Supplier (Optional)">
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="sanro-select !h-10 !text-[13px]"
            >
              <option value="">Select supplier</option>
              <option value="local">Local Supplier</option>
              <option value="factory">Factory Direct</option>
            </select>
          </Field>
          <Field label="Rack / Shelf (Optional)">
            <input
              value={rack}
              onChange={(e) => setRack(e.target.value)}
              placeholder="Enter rack / shelf"
              className={fieldClass}
            />
          </Field>
          <Field label="Product Type">
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="sanro-select !h-10 !text-[13px]"
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <div className="flex h-10 items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive((v) => !v)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  active ? 'bg-accent' : 'bg-[#D1D5DB]',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    active ? 'left-5' : 'left-0.5',
                  )}
                />
              </button>
              <span className="text-[13px] font-medium text-ink">
                {active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Description (Optional)">
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                placeholder="Enter product description..."
                rows={4}
                className="w-full resize-none rounded-md bg-white px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-[#9CA3AF] sanro-control"
              />
              <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-ink-muted">
                {description.length}/{DESC_MAX}
              </span>
            </div>
          </Field>
        </div>
      </Section>
    </form>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white sanro-panel">
      <div className="px-5 py-4 sanro-divider">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-[11px] text-danger">{error}</p> : null}
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
          'text-[11px] font-medium text-ink-muted',
          emphasize && 'text-accent',
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-[15px] font-semibold tabular-nums text-ink',
          emphasize && 'text-accent',
        )}
      >
        {value}
      </div>
    </div>
  )
}
