import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { PageHeader, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table'
import { categories, products } from '@/data/mock'
import { formatCurrency } from '@/lib/utils'

export function ProductsPage() {
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.product_code.toLowerCase().includes(q) ||
        (p.category_name ?? '').toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Sanro door catalogue and pricing."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Product Name" placeholder="Door model name" />
            <Input label="Product Code" placeholder="SKU" />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Category</label>
              <select className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm">
                {categories.map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Input label="Size" placeholder="7×3 ft" />
            <Input label="Selling Price" type="number" placeholder="0" />
            <Input label="GST Rate %" type="number" placeholder="18" />
            <Input label="Stock Quantity" type="number" placeholder="0" />
            <Input label="Minimum Stock" type="number" placeholder="5" />
            <Input label="HSN Code" placeholder="3925" />
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm">Save Product</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="border-b border-border px-5 py-4">
          <Input
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" strokeWidth={1.75} />}
          />
        </div>
        <Table>
          <THead>
            <TH>Product</TH>
            <TH>Code</TH>
            <TH>Category</TH>
            <TH>Size</TH>
            <TH>Price</TH>
            <TH>GST</TH>
            <TH>Stock</TH>
            <TH>Action</TH>
          </THead>
          <TBody>
            {filtered.map((p) => (
              <TR key={p.id}>
                <TD>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-ink-muted">
                    {[p.colour, p.finish].filter(Boolean).join(' · ')}
                  </div>
                </TD>
                <TD className="text-ink-secondary">{p.product_code}</TD>
                <TD>{p.category_name}</TD>
                <TD>{p.size ?? '—'}</TD>
                <TD className="font-medium">{formatCurrency(p.selling_price)}</TD>
                <TD>{p.gst_rate}%</TD>
                <TD
                  className={
                    p.stock_quantity <= p.minimum_stock
                      ? 'font-medium text-warning'
                      : ''
                  }
                >
                  {p.stock_quantity}
                </TD>
                <TD>
                  <button type="button" className="font-medium text-[#7539FF]">
                    Edit
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
