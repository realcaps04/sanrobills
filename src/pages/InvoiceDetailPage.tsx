import { Link, useParams } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { PageHeader, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PaymentBadge } from '@/components/ui/Badge'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table'
import { companySettings, customers, invoices } from '@/data/mock'
import { formatCurrencyExact, formatDate } from '@/lib/utils'

export function InvoiceDetailPage() {
  const { id } = useParams()
  const invoice = invoices.find((i) => i.id === id) ?? invoices[0]
  const customer = customers.find((c) => c.id === invoice.customer_id)

  function handlePrint() {
    window.print()
  }

  return (
    <div>
      <PageHeader
        title={invoice.invoice_number}
        subtitle={`Invoice dated ${formatDate(invoice.invoice_date)}`}
        actions={
          <>
            <Link to="/invoices">
              <Button variant="outline">Back</Button>
            </Link>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>
            <Button onClick={handlePrint}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </>
        }
      />

      <Card className="print:border-0">
        <div id="invoice-print" className="p-8">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
            <div>
              <div className="text-xl font-bold tracking-[0.12em] text-brand-600">SANRO</div>
              <div className="text-xs font-medium tracking-[0.14em] text-ink-muted">
                FIBRE GLASS INDUSTRIES
              </div>
              <div className="mt-3 space-y-0.5 text-sm text-ink-secondary">
                <div>{companySettings.address}</div>
                <div>{companySettings.phone}</div>
                <div>{companySettings.email}</div>
                <div>GSTIN: {companySettings.gstin}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-ink">INVOICE</div>
              <div className="mt-2 space-y-1 text-sm text-ink-secondary">
                <div>
                  <span className="text-ink-muted">No. </span>
                  <span className="font-medium text-ink">{invoice.invoice_number}</span>
                </div>
                <div>
                  <span className="text-ink-muted">Date </span>
                  <span className="font-medium text-ink">
                    {formatDate(invoice.invoice_date)}
                  </span>
                </div>
                <div className="pt-1">
                  <PaymentBadge status={invoice.payment_status} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Bill To
              </div>
              <div className="mt-1 text-sm font-semibold text-ink">{invoice.customer_name}</div>
              {customer?.address && (
                <div className="mt-1 text-sm text-ink-secondary">{customer.address}</div>
              )}
              {customer?.phone && (
                <div className="text-sm text-ink-secondary">{customer.phone}</div>
              )}
              {customer?.gstin && (
                <div className="text-sm text-ink-secondary">GSTIN: {customer.gstin}</div>
              )}
            </div>
            <div className="sm:text-right">
              <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Payment
              </div>
              <div className="mt-1 text-sm capitalize text-ink">
                {(invoice.payment_method ?? '—').replace('_', ' ')}
              </div>
              <div className="text-sm text-ink-secondary">
                Paid: {formatCurrencyExact(invoice.amount_paid)}
              </div>
              <div className="text-sm text-ink-secondary">
                Balance: {formatCurrencyExact(invoice.balance_due)}
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-lg border border-border">
            <Table>
              <THead>
                <TH>Product</TH>
                <TH>Qty</TH>
                <TH>Rate</TH>
                <TH>Discount</TH>
                <TH>GST</TH>
                <TH className="text-right">Total</TH>
              </THead>
              <TBody>
                {invoice.items.map((item) => (
                  <TR key={item.id}>
                    <TD>
                      <div className="font-medium">{item.product_name}</div>
                      {item.size && (
                        <div className="text-xs text-ink-muted">Size: {item.size}</div>
                      )}
                    </TD>
                    <TD>{item.quantity}</TD>
                    <TD>{formatCurrencyExact(item.rate)}</TD>
                    <TD>{formatCurrencyExact(item.discount)}</TD>
                    <TD>{item.gst_rate}%</TD>
                    <TD className="text-right font-medium">
                      {formatCurrencyExact(item.total)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-end">
            <dl className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd>{formatCurrencyExact(invoice.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Discount</dt>
                <dd>{formatCurrencyExact(invoice.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Taxable</dt>
                <dd>{formatCurrencyExact(invoice.taxable_amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">CGST</dt>
                <dd>{formatCurrencyExact(invoice.cgst)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">SGST</dt>
                <dd>{formatCurrencyExact(invoice.sgst)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Grand Total</dt>
                <dd>{formatCurrencyExact(invoice.grand_total)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-10 grid gap-8 border-t border-border pt-6 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Terms & Conditions
              </div>
              <p className="mt-2 text-sm text-ink-secondary">
                {companySettings.terms_conditions}
              </p>
            </div>
            <div className="sm:text-right">
              <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Authorized Signature
              </div>
              <div className="mt-12 text-sm font-medium text-ink">
                For {companySettings.company_name}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
