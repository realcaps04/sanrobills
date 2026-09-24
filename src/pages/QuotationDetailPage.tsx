import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Loader2, Pencil, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { companyStateCode, useCompanySettings } from '@/lib/company'
import type { Customer } from '@/types'
import type { Quotation, QuotationType } from '@/types/quotation'
import { isSupabaseConfigured } from '@/lib/supabase'
import { fetchQuotation, quotationStatusLabel } from '@/lib/quotations'
import { isUuid } from '@/lib/salesInvoices'
import { amountInWords, cn, formatCurrencyExact, formatDate } from '@/lib/utils'

const TYPE_LABELS: Record<QuotationType, string> = {
  standard: 'Standard',
  dealer: 'Dealer',
  project: 'Project',
  estimation: 'Estimation',
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; quotation: Quotation; customer: Customer | null; editable: boolean }
  | { status: 'missing' }
  | { status: 'error'; message: string }

export function QuotationDetailPage() {
  const { id = '' } = useParams()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ status: 'error', message: 'Connect Supabase in .env to view quotations.' })
      return
    }
    if (!isUuid(id)) {
      setState({ status: 'missing' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })
    fetchQuotation(id)
      .then((loaded) => {
        if (cancelled) return
        setState(
          loaded
            ? { status: 'ready', ...loaded, editable: true }
            : { status: 'missing' },
        )
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Could not load the quotation.',
        })
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (state.status === 'ready') {
    return (
      <QuotationView
        quotation={state.quotation}
        customer={state.customer}
        editable={state.editable}
      />
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-white py-20 text-sm text-ink-muted sanro-panel">
      {state.status === 'loading' ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading quotation…
        </>
      ) : (
        <>
          <p className={state.status === 'error' ? 'text-danger' : ''}>
            {state.status === 'error' ? state.message : 'This quotation could not be found.'}
          </p>
          <Link to="/quotations" className="font-medium text-[#1e3a5f] hover:underline">
            Back to quotations
          </Link>
        </>
      )}
    </div>
  )
}

function QuotationView({
  quotation,
  customer,
  editable,
}: {
  quotation: Quotation
  customer: Customer | null
  editable: boolean
}) {
  const documentRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  async function handleDownload() {
    if (!documentRef.current || downloading) return
    setDownloading(true)
    setDownloadError('')
    try {
      await downloadQuotationPdf(documentRef.current, `${quotation.quotation_number}.pdf`)
    } catch (err) {
      console.error(err)
      setDownloadError('Could not create the PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/quotations"
            className="rounded-lg sanro-control p-2 text-[#6B7280] hover:bg-[#F5F6FA]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-ink">
              Quotation #{quotation.quotation_number}
            </h1>
            <div className="mt-1">
              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {quotationStatusLabel(quotation.status)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Link to={`/quotations/${quotation.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print Quotation
            </Button>
            <Button size="sm" onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloading ? 'Preparing PDF…' : 'Download PDF'}
            </Button>
          </div>
          {downloadError && <p className="text-xs text-danger">{downloadError}</p>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          ref={documentRef}
          className="mx-auto w-[794px] max-w-none bg-white p-8 sanro-panel"
        >
          <QuotationDocument quotation={quotation} customer={customer} />
        </div>
      </div>

      {createPortal(
        <div className="invoice-print-root">
          <QuotationDocument quotation={quotation} customer={customer} />
        </div>,
        document.body,
      )}
    </div>
  )
}

async function downloadQuotationPdf(element: HTMLElement, fileName: string) {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([
    import('html-to-image'),
    import('jspdf'),
  ])
  await document.fonts.ready
  const canvas = await toCanvas(element, {
    pixelRatio: 3,
    backgroundColor: '#ffffff',
    style: { boxShadow: 'none', margin: '0' },
  })

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgHeight = (canvas.height * pageWidth) / canvas.width
  const image = canvas.toDataURL('image/png')

  let offset = 0
  pdf.addImage(image, 'PNG', 0, 0, pageWidth, imgHeight, undefined, 'FAST')
  while (imgHeight - offset > pageHeight + 0.5) {
    offset += pageHeight
    pdf.addPage()
    pdf.addImage(image, 'PNG', 0, -offset, pageWidth, imgHeight, undefined, 'FAST')
  }
  pdf.save(fileName)
}

function QuotationDocument({
  quotation,
  customer,
}: {
  quotation: Quotation
  customer: Customer | null
}) {
  const companySettings = useCompanySettings()
  const companyState = companyStateCode(companySettings)
  const supplyState =
    quotation.place_of_supply || customer?.gstin?.slice(0, 2) || companyState
  const billingAddress = quotation.billing_address ?? customer?.address
  const customerGstin = quotation.customer_gstin ?? customer?.gstin
  const igst = quotation.igst ?? 0
  const placeOfSupply =
    supplyState === '32' ? 'Kerala (32)' : `State code ${supplyState}`
  const totalQty = quotation.items.reduce((sum, item) => sum + item.quantity, 0)
  const halfRates = [...new Set(quotation.items.map((i) => i.gst_rate / 2))]
  const halfRateLabel = halfRates.length === 1 ? ` (${halfRates[0]}%)` : ''
  const fullRateLabel = halfRates.length === 1 ? ` (${halfRates[0] * 2}%)` : ''
  const termsSource =
    quotation.terms?.trim() || companySettings.terms_conditions
  const terms = termsSource
    .split(/(?<=\.)\s+/)
    .filter(Boolean)

  return (
    <div className="bg-white text-[12.5px] text-[#111827]">
      <h2 className="mb-3 text-center text-2xl font-extrabold tracking-wide text-[#1e3a5f]">
        QUOTATION
      </h2>

      <div className="border border-[#4B5563]">
        {/* Company + quotation meta */}
        <div className="grid grid-cols-[1fr_minmax(0,260px)]">
          <div className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#1e3a5f] text-base font-extrabold text-white">
                S
              </div>
              <div>
                <div className="text-[15px] font-bold leading-tight">
                  {companySettings.company_name}
                </div>
                <div className="text-[11px] font-semibold text-[#2563eb]">
                  Sales Quotation
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-0.5 text-[#374151]">
              {companySettings.email && <div>{companySettings.email}</div>}
              {companySettings.phone && <div>{companySettings.phone}</div>}
              {companySettings.address && (
                <div className="whitespace-pre-line">{companySettings.address}</div>
              )}
              {companySettings.gstin && (
                <div>
                  GSTIN: <span className="font-semibold">{companySettings.gstin}</span>
                </div>
              )}
            </div>
          </div>
          <dl className="border-l border-[#4B5563]">
            <MetaRow label="Quotation #" value={quotation.quotation_number} />
            <MetaRow label="Quotation Date" value={formatDate(quotation.quotation_date)} />
            <MetaRow
              label="Valid Till"
              value={quotation.valid_till ? formatDate(quotation.valid_till) : '—'}
            />
            <MetaRow
              label="Type"
              value={TYPE_LABELS[quotation.quotation_type] ?? quotation.quotation_type}
            />
            <MetaRow
              label="Status"
              value={quotationStatusLabel(quotation.status)}
              last
            />
          </dl>
        </div>

        {/* Customer + supply */}
        <div className="grid grid-cols-2 border-t border-[#4B5563]">
          <SectionHead>Customer Details</SectionHead>
          <SectionHead className="border-l">Supply Details</SectionHead>
          <div className="space-y-0.5 p-3 text-[#374151]">
            <div className="font-semibold text-[#111827]">{quotation.customer_name}</div>
            {billingAddress && <div className="whitespace-pre-line">{billingAddress}</div>}
            {customer?.phone && <div>Phone: {customer.phone}</div>}
            {customerGstin && <div>GSTIN: {customerGstin}</div>}
          </div>
          <div className="space-y-0.5 border-l border-[#4B5563] p-3 text-[#374151]">
            <div>Place of Supply: {placeOfSupply}</div>
            <div>
              Valid Till:{' '}
              {quotation.valid_till ? formatDate(quotation.valid_till) : '—'}
            </div>
          </div>
        </div>

        {/* Items */}
        <table className="w-full border-t border-[#4B5563] text-left">
          <thead>
            <tr className="bg-[#EEF2F7] text-[11.5px] font-semibold">
              <ItemTh className="w-9 text-center">#</ItemTh>
              <ItemTh>Item</ItemTh>
              <ItemTh className="w-[72px] text-center">HSN</ItemTh>
              <ItemTh className="w-[96px] text-right">Rate</ItemTh>
              <ItemTh className="w-[52px] text-center">Qty</ItemTh>
              <ItemTh className="w-[84px] text-right">Discount</ItemTh>
              <ItemTh className="w-[56px] text-center">GST</ItemTh>
              <ItemTh className="w-[104px] text-right" last>
                Amount
              </ItemTh>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, index) => {
              const hsn = item.hsn_code
              return (
                <tr key={item.id} className="border-t border-[#4B5563] align-top">
                  <ItemTd className="text-center">{index + 1}</ItemTd>
                  <ItemTd>
                    <div className="font-medium">{item.product_name}</div>
                    {item.size && (
                      <div className="text-[11px] text-[#6B7280]">Size: {item.size}</div>
                    )}
                  </ItemTd>
                  <ItemTd className="text-center">{hsn ?? '—'}</ItemTd>
                  <ItemTd className="text-right">{formatCurrencyExact(item.rate)}</ItemTd>
                  <ItemTd className="text-center">{item.quantity}</ItemTd>
                  <ItemTd className="text-right">{formatCurrencyExact(item.discount)}</ItemTd>
                  <ItemTd className="text-center">{item.gst_rate}%</ItemTd>
                  <ItemTd className="text-right font-medium" last>
                    {formatCurrencyExact(item.total)}
                  </ItemTd>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="grid grid-cols-[1fr_minmax(0,320px)] border-t border-[#4B5563]">
          <div className="p-3 text-center">
            Total Items / Qty :{' '}
            <span className="font-semibold">
              {quotation.items.length} / {totalQty.toFixed(2)}
            </span>
          </div>
          <dl className="border-l border-[#4B5563]">
            <TotalRow label="Subtotal" value={quotation.subtotal} />
            <TotalRow label="Discount" value={quotation.discount} />
            <TotalRow label="Taxable Amount" value={quotation.taxable_amount} />
            {igst > 0 ? (
              <TotalRow label={`IGST${fullRateLabel}`} value={igst} />
            ) : (
              <>
                <TotalRow label={`CGST${halfRateLabel}`} value={quotation.cgst} />
                <TotalRow label={`SGST${halfRateLabel}`} value={quotation.sgst} />
              </>
            )}
            <TotalRow label="Grand Total" value={quotation.grand_total} strong last />
          </dl>
        </div>

        <div className="border-t border-[#4B5563] px-3 py-2">
          Total amount (in words):{' '}
          <span className="font-semibold">{amountInWords(quotation.grand_total)}</span>
        </div>

        {/* Bank + notes */}
        <div className="grid grid-cols-2 border-t border-[#4B5563]">
          <div className="space-y-0.5 p-3 text-[#374151]">
            <div className="mb-1 font-semibold text-[#111827]">Bank Details:</div>
            {companySettings.bank_account ? (
              <>
                <div>Account Name: {companySettings.company_name}</div>
                <div>Account Number: {companySettings.bank_account}</div>
                {companySettings.bank_ifsc && (
                  <div>IFSC Code: {companySettings.bank_ifsc}</div>
                )}
                {companySettings.bank_name && (
                  <div>Bank Name: {companySettings.bank_name}</div>
                )}
              </>
            ) : (
              <div className="text-[#9CA3AF]">Not provided</div>
            )}
          </div>
          <div className="border-l border-[#4B5563] p-3 text-[#374151]">
            <div className="mb-1 font-semibold text-[#111827]">Notes:</div>
            <div>{quotation.notes || 'Thank you for your interest.'}</div>
          </div>
        </div>

        <div className="border-t border-[#4B5563] p-3 text-[#374151]">
          <div className="mb-1 font-semibold text-[#111827]">Terms and conditions:</div>
          <ol className="space-y-0.5">
            {terms.map((t, i) => (
              <li key={i}>
                {i + 1}. {t}
              </li>
            ))}
            <li>
              {terms.length + 1}. All amounts are payable in Indian Rupees.
            </li>
          </ol>
        </div>
      </div>

      <div className="mt-14 flex break-inside-avoid justify-end print:mt-8">
        <div className="w-[200px] text-right">
          <div className="border-t border-[#4B5563] pt-1.5 font-semibold">
            Authorized Signatory
          </div>
          <div className="text-[11.5px] font-semibold text-[#2563eb]">
            {companySettings.company_name}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={cn('grid grid-cols-2', !last && 'border-b border-[#4B5563]')}>
      <dt className="px-2.5 py-1.5 font-semibold">{label}</dt>
      <dd className="border-l border-[#4B5563] px-2.5 py-1.5 break-all">{value}</dd>
    </div>
  )
}

function SectionHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border-b border-[#4B5563] bg-[#EEF2F7] px-3 py-1.5 text-[12px] font-semibold',
        className,
      )}
    >
      {children}
    </div>
  )
}

function ItemTh({
  children,
  className,
  last,
}: {
  children: ReactNode
  className?: string
  last?: boolean
}) {
  return (
    <th className={cn('px-2.5 py-1.5', !last && 'border-r border-[#4B5563]', className)}>
      {children}
    </th>
  )
}

function ItemTd({
  children,
  className,
  last,
}: {
  children: ReactNode
  className?: string
  last?: boolean
}) {
  return (
    <td className={cn('px-2.5 py-2', !last && 'border-r border-[#4B5563]', className)}>
      {children}
    </td>
  )
}

function TotalRow({
  label,
  value,
  strong,
  last,
}: {
  label: string
  value: number
  strong?: boolean
  last?: boolean
}) {
  return (
    <div className={cn('grid grid-cols-2', !last && 'border-b border-[#4B5563]')}>
      <dt className="px-2.5 py-1.5 font-semibold">{label}</dt>
      <dd
        className={cn(
          'border-l border-[#4B5563] px-2.5 py-1.5 text-right',
          strong && 'font-bold',
        )}
      >
        {formatCurrencyExact(value)}
      </dd>
    </div>
  )
}
