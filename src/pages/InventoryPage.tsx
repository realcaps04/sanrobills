import { Link } from 'react-router-dom'
import { PageHeader, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StockBadge } from '@/components/ui/Badge'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table'
import { inventory } from '@/data/mock'

export function InventoryPage() {
  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Stock levels across Sanro products."
        actions={
          <Link to="/products">
            <Button variant="outline">Manage Products</Button>
          </Link>
        }
      />

      <Card>
        <Table>
          <THead>
            <TH>Product</TH>
            <TH>SKU</TH>
            <TH>Opening</TH>
            <TH>Purchases</TH>
            <TH>Sales</TH>
            <TH>Current Stock</TH>
            <TH>Min Stock</TH>
            <TH>Status</TH>
          </THead>
          <TBody>
            {inventory.map((row) => (
              <TR key={row.id}>
                <TD className="font-medium">{row.product_name}</TD>
                <TD className="text-ink-secondary">{row.sku}</TD>
                <TD>{row.opening_stock}</TD>
                <TD>{row.purchases}</TD>
                <TD>{row.sales}</TD>
                <TD className="font-semibold">{row.current_stock}</TD>
                <TD>{row.minimum_stock}</TD>
                <TD>
                  <StockBadge status={row.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  )
}
