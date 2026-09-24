import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { deleteProduct, fetchProducts } from '@/lib/data'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { cn, formatCurrency, stockStatusLabel } from '@/lib/utils'
import type { Product, StockStatus } from '@/types'

const PAGE_SIZE = 10

const STATUS_STYLES: Record<StockStatus, string> = {
  in_stock: 'bg-emerald-50 text-emerald-700',
  low_stock: 'bg-amber-50 text-amber-700',
  out_of_stock: 'bg-red-50 text-red-600',
}

function productStockStatus(p: Product): StockStatus {
  if (p.stock_quantity <= 0) return 'out_of_stock'
  if (p.stock_quantity <= p.minimum_stock) return 'low_stock'
  return 'in_stock'
}

export function ProductsPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [stockStatus, setStockStatus] = useState<StockStatus | 'all'>('all')
  const [brand, setBrand] = useState('all')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const { data, loading, error, reload } = useAsync(fetchProducts, [])
  const products = useMemo(() => data ?? [], [data])

  const categories = useMemo(() => {
    const names = new Set<string>()
    for (const p of products) {
      if (p.category_name) names.add(p.category_name)
    }
    return [...names].sort()
  }, [products])

  const brands = useMemo(() => {
    const names = new Set<string>()
    for (const p of products) {
      if (p.brand?.trim()) names.add(p.brand.trim())
      else if (p.material?.trim()) names.add(p.material.trim())
    }
    return [...names].sort()
  }, [products])

  const stats = useMemo(() => {
    let inStock = 0
    let lowStock = 0
    let outOfStock = 0
    for (const p of products) {
      const s = productStockStatus(p)
      if (s === 'in_stock') inStock += 1
      else if (s === 'low_stock') lowStock += 1
      else outOfStock += 1
    }
    return { total: products.length, inStock, lowStock, outOfStock }
  }, [products])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return products.filter((p) => {
      const status = productStockStatus(p)
      const productBrand = (p.brand || p.material || '').trim()
      const matchesCategory = category === 'all' || p.category_name === category
      const matchesStatus = stockStatus === 'all' || status === stockStatus
      const matchesBrand = brand === 'all' || productBrand === brand
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.product_code.toLowerCase().includes(q) ||
        (p.hsn_code ?? '').toLowerCase().includes(q) ||
        productBrand.toLowerCase().includes(q) ||
        (p.category_name ?? '').toLowerCase().includes(q)
      return matchesCategory && matchesStatus && matchesBrand && matchesQuery
    })
  }, [products, query, category, stockStatus, brand])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const showingFrom = filtered.length === 0 ? 0 : pageStart + 1
  const showingTo = Math.min(pageStart + PAGE_SIZE, filtered.length)

  function clearFilters() {
    setQuery('')
    setCategory('all')
    setStockStatus('all')
    setBrand('all')
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
          <h1 className="text-xl font-semibold text-ink">Products</h1>
          <p className="mt-0.5 text-sm text-ink-muted">Manage your products and stock</p>
        </div>
        <Link to="/products/new">
          <Button size="sm">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add Product
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Products"
          value={loading ? '—' : String(stats.total)}
          icon={Package}
          tone="bg-sky-50 text-sky-600"
        />
        <SummaryCard
          label="In Stock"
          value={loading ? '—' : String(stats.inStock)}
          icon={Boxes}
          tone="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          label="Low Stock"
          value={loading ? '—' : String(stats.lowStock)}
          icon={AlertTriangle}
          tone="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          label="Out of Stock"
          value={loading ? '—' : String(stats.outOfStock)}
          icon={XCircle}
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
              placeholder="Search by product name, code, brand or HSN..."
              className="h-10 w-full rounded-md bg-[#F8F9FC] px-3 pl-10 text-sm outline-none placeholder:text-[#9CA3AF] sanro-control focus:bg-white"
            />
          </div>

          <Select
            className="sanro-select--sm w-auto min-w-[150px]"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">All Categories</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>

          <Select
            className="sanro-select--sm w-auto min-w-[140px]"
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value as StockStatus | 'all')
              setPage(1)
            }}
          >
            <option value="all">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </Select>

          <Select
            className="sanro-select--sm w-auto min-w-[140px]"
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">All Brands</option>
            {brands.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
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
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] text-[11px] font-semibold uppercase tracking-wide text-ink-muted sanro-divider">
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Product Code</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">HSN Code</th>
                <th className="px-4 py-3 text-right">Purchase Rate (Rs)</th>
                <th className="px-4 py-3 text-right">Sale Rate (Rs)</th>
                <th className="px-4 py-3 text-right">Current Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F4]">
              {pageItems.map((p, index) => {
                const status = productStockStatus(p)
                return (
                  <tr key={p.id} className="hover:bg-[#F8F9FC]/80">
                    <td className="px-4 py-3.5 text-ink-muted">{pageStart + index + 1}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-ink">{p.name}</div>
                      {(p.size || p.colour || p.brand) && (
                        <div className="mt-0.5 text-xs text-ink-muted">
                          {[p.brand || p.material, p.size, p.colour].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[#1e3a5f]">{p.product_code}</td>
                    <td className="px-4 py-3.5 text-ink-muted">{p.category_name || '—'}</td>
                    <td className="px-4 py-3.5 font-mono text-[12px] text-ink-secondary">
                      {p.hsn_code || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-ink-muted">
                      {formatCurrency(p.dealer_price)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-ink">
                      {formatCurrency(p.selling_price)}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3.5 text-right font-semibold',
                        status === 'out_of_stock' || status === 'low_stock'
                          ? 'text-red-600'
                          : 'text-emerald-600',
                      )}
                    >
                      {p.stock_quantity}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium',
                          STATUS_STYLES[status],
                        )}
                      >
                        {stockStatusLabel(status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/products/${p.id}/edit`}
                          className="rounded-md bg-sky-50 px-2.5 py-1 text-[12px] font-medium text-sky-700 hover:bg-sky-100"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('')
                            setDeleting(p)
                          }}
                          className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                          aria-label={`Delete ${p.name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
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
                      ? 'Loading products…'
                      : error
                        ? error
                        : products.length === 0
                          ? 'No products yet. Run supabase/seed_products.sql or add a product.'
                          : 'No products found for this filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(15,23,42,0.06)]">
          <div className="text-sm text-ink-muted">
            Showing {showingFrom} to {showingTo} of {filtered.length} products
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
                  …
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

      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onMouseDown={() => {
            if (!deletingBusy) {
              setDeleting(null)
              setDeleteError('')
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white sanro-panel"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Delete product"
          >
            <div className="px-5 py-4 sanro-divider">
              <h2 className="text-base font-semibold text-ink">Delete product?</h2>
              <p className="mt-1 text-[13px] text-ink-muted">
                This will permanently remove{' '}
                <span className="font-medium text-ink">{deleting.name}</span> (
                {deleting.product_code}). This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4">
              {deleteError && (
                <p className="mr-auto max-w-[60%] text-[13px] text-danger">{deleteError}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={deletingBusy}
                onClick={() => {
                  setDeleting(null)
                  setDeleteError('')
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={deletingBusy}
                onClick={() => {
                  void (async () => {
                    setDeletingBusy(true)
                    setDeleteError('')
                    try {
                      if (!isSupabaseConfigured) {
                        throw new Error('Connect Supabase in .env to delete products.')
                      }
                      await deleteProduct(deleting.id)
                      setDeleting(null)
                      reload()
                    } catch (err) {
                      setDeleteError(
                        err instanceof Error ? err.message : 'Could not delete the product.',
                      )
                    } finally {
                      setDeletingBusy(false)
                    }
                  })()
                }}
              >
                {deletingBusy ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
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
  icon: typeof Package
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
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', tone)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}
