import type { PostgrestError } from '@supabase/supabase-js'
import { getCompanySettings } from '@/lib/company'
import { supabase } from '@/lib/supabase'
import { invoiceNumberPrefix } from '@/lib/invoiceNumber'
import type {
  Customer,
  Invoice,
  InvoiceItem,
  PaymentMethod,
  PaymentStatus,
} from '@/types'

export interface SalesInvoiceItemInput {
  product_id?: string | null
  product_code?: string
  product_name: string
  description?: string
  size?: string
  hsn_code?: string
  quantity: number
  rate: number
  discount: number
  gst_rate: number
  total: number
}

export interface SalesInvoiceInput {
  invoice_number: string
  invoice_date: string
  subtotal: number
  discount: number
  taxable_amount: number
  cgst: number
  sgst: number
  igst: number
  grand_total: number
  amount_paid: number
  balance_due: number
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  notes?: string
  billing_address?: string
  customer_gstin?: string
  place_of_supply?: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value)
}

const round2 = (n: number) => Math.round(n * 100) / 100

function describeError(error: PostgrestError): string {
  if (error.code === '23505') {
    return 'This invoice number is already used. Please use the next number.'
  }
  if (error.code === 'PGRST202' || error.code === '42883') {
    return 'The database is not set up for saving invoices yet. Run supabase/sales_invoice.sql in the Supabase SQL editor.'
  }
  if (error.code === '42501') {
    return 'You do not have permission to save invoices. Please sign in again.'
  }
  return error.message
}

export async function saveSalesInvoice(
  customer: Customer,
  invoice: SalesInvoiceInput,
  items: SalesInvoiceItemInput[],
  existingInvoiceId?: string,
): Promise<{ invoiceId: string }> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add your project URL and anon key to .env.')
  }

  const params = {
    p_customer: {
      id: isUuid(customer.id) ? customer.id : null,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      gstin: customer.gstin,
      customer_type: customer.customer_type,
      contact_person: customer.contact_person,
      alt_phone: customer.alt_phone,
      city: customer.city,
      state_code: customer.state_code,
      pincode: customer.pincode,
      gst_registration: customer.gst_registration,
      pan: customer.pan,
      payment_terms_days: customer.payment_terms_days,
      credit_limit: customer.credit_limit,
      opening_balance: customer.opening_balance,
      notes: customer.notes,
    },
    p_invoice: {
      ...invoice,
      subtotal: round2(invoice.subtotal),
      discount: round2(invoice.discount),
      taxable_amount: round2(invoice.taxable_amount),
      cgst: round2(invoice.cgst),
      sgst: round2(invoice.sgst),
      igst: round2(invoice.igst),
      grand_total: round2(invoice.grand_total),
      amount_paid: round2(invoice.amount_paid),
      balance_due: round2(invoice.balance_due),
    },
    p_items: items.map((item) => ({
      ...item,
      product_id: isUuid(item.product_id) ? item.product_id : null,
      rate: round2(item.rate),
      discount: round2(item.discount),
      total: round2(item.total),
    })),
  }

  const { data, error } = existingInvoiceId
    ? await supabase.rpc('update_sales_invoice', {
        p_invoice_id: existingInvoiceId,
        ...params,
      })
    : await supabase.rpc('create_sales_invoice', params)

  if (error) throw new Error(describeError(error))
  return { invoiceId: (data as { invoice_id: string }).invoice_id }
}

export async function fetchLastInvoiceSeq(year: number): Promise<number | null> {
  if (!supabase) return null
  const prefix = invoiceNumberPrefix(year)
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
  if (error) return null
  const last = data?.[0]?.invoice_number as string | undefined
  if (!last) return getCompanySettings().starting_invoice_number - 1
  const seq = Number(last.slice(prefix.length))
  return Number.isInteger(seq) ? seq : null
}

export interface LoadedInvoice {
  invoice: Invoice
  customer: Customer | null
}

export async function fetchInvoice(id: string): Promise<LoadedInvoice | null> {
  if (!supabase || !isUuid(id)) return null
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customer:customers(*), items:invoice_items(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  const customer = (data.customer ?? null) as Customer | null
  const items = ((data.items ?? []) as Record<string, unknown>[]).map(
    (row): InvoiceItem => ({
      id: String(row.id),
      product_id: (row.product_id as string) ?? '',
      product_name: String(row.product_name),
      size: (row.size as string) ?? undefined,
      hsn_code: (row.hsn_code as string) ?? undefined,
      quantity: Number(row.quantity),
      rate: Number(row.rate),
      discount: Number(row.discount),
      gst_rate: Number(row.gst_rate),
      total: Number(row.total),
    }),
  )

  const invoice: Invoice = {
    id: data.id,
    invoice_number: data.invoice_number,
    customer_id: data.customer_id,
    customer_name: customer?.name ?? '',
    invoice_date: data.invoice_date,
    subtotal: Number(data.subtotal),
    discount: Number(data.discount),
    taxable_amount: Number(data.taxable_amount),
    cgst: Number(data.cgst),
    sgst: Number(data.sgst),
    igst: Number(data.igst ?? 0),
    grand_total: Number(data.grand_total),
    amount_paid: Number(data.amount_paid),
    balance_due: Number(data.balance_due),
    payment_status: data.payment_status,
    payment_method: data.payment_method,
    notes: data.notes,
    billing_address: data.billing_address,
    customer_gstin: data.customer_gstin,
    place_of_supply: data.place_of_supply,
    items,
    created_at: data.created_at,
  }
  return { invoice, customer }
}

export async function deleteInvoice(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!isUuid(id)) throw new Error('Invalid invoice id.')

  // payments.invoice_id has no ON DELETE CASCADE in schema
  const { error: payError } = await supabase.from('payments').delete().eq('invoice_id', id)
  if (payError) throw new Error(payError.message)

  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error?.code === '23503') {
    throw new Error('This invoice cannot be deleted because related records still exist.')
  }
  if (error) throw new Error(error.message)
}
