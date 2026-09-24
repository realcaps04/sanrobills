import type { PostgrestError } from '@supabase/supabase-js'
import type { Customer } from '@/types'
import type { Quotation, QuotationItem, QuotationStatus, QuotationType } from '@/types/quotation'
import { supabase } from '@/lib/supabase'
import { isUuid } from '@/lib/salesInvoices'
import { formatQuotationNumber, quotationNumberPrefix } from '@/lib/quotationNumber'

const round2 = (n: number) => Math.round(n * 100) / 100

function num(value: unknown) {
  return Number(value ?? 0)
}

function describeError(error: PostgrestError): string {
  if (error.code === '23505') {
    return 'This quotation number is already used. Please use the next number.'
  }
  if (error.code === 'PGRST202' || error.code === '42883') {
    return 'Quotations are not set up yet. Run supabase/quotations.sql in the Supabase SQL editor.'
  }
  if (error.code === '42501') {
    return 'You do not have permission to save quotations. Please sign in again.'
  }
  return error.message
}

export interface QuotationItemInput {
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

export interface QuotationInput {
  quotation_number: string
  quotation_date: string
  valid_till?: string
  quotation_type: QuotationType
  reference?: string
  sales_person?: string
  billing_address?: string
  customer_gstin?: string
  place_of_supply?: string
  subtotal: number
  discount: number
  taxable_amount: number
  cgst: number
  sgst: number
  igst: number
  grand_total: number
  status: QuotationStatus
  notes?: string
  terms?: string
  remarks?: string
}

export async function fetchQuotations(): Promise<Quotation[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase
    .from('quotations')
    .select('*, customer:customers(name, phone), quotation_items(count)')
    .order('quotation_date', { ascending: false })
    .order('quotation_number', { ascending: false })
  if (error) throw new Error(describeError(error))

  return (data ?? []).map((row) => {
    const itemCount = Array.isArray(row.quotation_items)
      ? Number(row.quotation_items[0]?.count ?? 0)
      : 0
    return {
      ...row,
      customer_name: row.customer?.name ?? '',
      customer_phone: row.customer?.phone ?? null,
      item_count: itemCount,
      subtotal: num(row.subtotal),
      discount: num(row.discount),
      taxable_amount: num(row.taxable_amount),
      cgst: num(row.cgst),
      sgst: num(row.sgst),
      igst: num(row.igst),
      grand_total: num(row.grand_total),
      items: [],
    } as Quotation
  })
}

export interface LoadedQuotation {
  quotation: Quotation
  customer: Customer | null
}

export async function fetchQuotation(id: string): Promise<LoadedQuotation | null> {
  if (!supabase || !isUuid(id)) return null
  const { data, error } = await supabase
    .from('quotations')
    .select('*, customer:customers(*), items:quotation_items(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  const customer = (data.customer ?? null) as Customer | null
  const items = ((data.items ?? []) as Record<string, unknown>[]).map(
    (row): QuotationItem => ({
      id: String(row.id),
      product_id: (row.product_id as string) ?? null,
      product_name: String(row.product_name),
      description: (row.description as string) ?? null,
      size: (row.size as string) ?? null,
      hsn_code: (row.hsn_code as string) ?? null,
      quantity: num(row.quantity),
      rate: num(row.rate),
      discount: num(row.discount),
      gst_rate: num(row.gst_rate),
      total: num(row.total),
    }),
  )

  const quotation: Quotation = {
    id: data.id,
    quotation_number: data.quotation_number,
    customer_id: data.customer_id,
    customer_name: customer?.name ?? '',
    customer_phone: customer?.phone ?? null,
    quotation_date: data.quotation_date,
    valid_till: data.valid_till,
    quotation_type: data.quotation_type,
    reference: data.reference,
    sales_person: data.sales_person,
    billing_address: data.billing_address,
    customer_gstin: data.customer_gstin,
    place_of_supply: data.place_of_supply,
    subtotal: num(data.subtotal),
    discount: num(data.discount),
    taxable_amount: num(data.taxable_amount),
    cgst: num(data.cgst),
    sgst: num(data.sgst),
    igst: num(data.igst),
    grand_total: num(data.grand_total),
    status: data.status,
    notes: data.notes,
    terms: data.terms,
    remarks: data.remarks,
    item_count: items.length,
    items,
    created_at: data.created_at,
  }
  return { quotation, customer }
}

export async function fetchLastQuotationSeq(year: number): Promise<number | null> {
  if (!supabase) return null
  const prefix = quotationNumberPrefix(year)
  const { data, error } = await supabase
    .from('quotations')
    .select('quotation_number')
    .like('quotation_number', `${prefix}%`)
    .order('quotation_number', { ascending: false })
    .limit(1)
  if (error) return null
  const last = data?.[0]?.quotation_number as string | undefined
  if (!last) return 0
  const seq = Number(last.slice(prefix.length))
  return Number.isInteger(seq) ? seq : null
}

export async function saveQuotation(
  customer: Customer,
  quotation: QuotationInput,
  items: QuotationItemInput[],
  existingId?: string,
): Promise<{ quotationId: string }> {
  if (!supabase) throw new Error('Supabase is not configured.')

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
    p_quotation: {
      ...quotation,
      subtotal: round2(quotation.subtotal),
      discount: round2(quotation.discount),
      taxable_amount: round2(quotation.taxable_amount),
      cgst: round2(quotation.cgst),
      sgst: round2(quotation.sgst),
      igst: round2(quotation.igst),
      grand_total: round2(quotation.grand_total),
    },
    p_items: items.map((item) => ({
      ...item,
      product_id: isUuid(item.product_id) ? item.product_id : null,
      rate: round2(item.rate),
      discount: round2(item.discount),
      total: round2(item.total),
    })),
  }

  const { data, error } = existingId
    ? await supabase.rpc('update_quotation', { p_quotation_id: existingId, ...params })
    : await supabase.rpc('create_quotation', params)

  if (error) throw new Error(describeError(error))
  return { quotationId: (data as { quotation_id: string }).quotation_id }
}

export function quotationStatusLabel(status: QuotationStatus): string {
  const map: Record<QuotationStatus, string> = {
    draft: 'Draft',
    pending: 'Pending',
    converted: 'Converted',
    expired: 'Expired',
  }
  return map[status]
}

export async function deleteQuotation(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!isUuid(id)) throw new Error('Invalid quotation id.')

  const { error } = await supabase.from('quotations').delete().eq('id', id)
  if (error?.code === '23503') {
    throw new Error('This quotation cannot be deleted because related records still exist.')
  }
  if (error) throw new Error(describeError(error))
}

export { formatQuotationNumber }
