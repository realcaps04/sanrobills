import { supabase } from '@/lib/supabase'
import type {
  Customer,
  Invoice,
  Product,
  ProductCategory,
} from '@/types'

function client() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add your project URL and anon key to .env.')
  }
  return supabase
}

function num(value: unknown): number {
  return Number(value ?? 0)
}

export async function fetchCategories(): Promise<ProductCategory[]> {
  const { data, error } = await client()
    .from('product_categories')
    .select('id, name')
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export interface NewProduct {
  name: string
  product_code: string
  category_id: string | null
  hsn_code: string | null
  unit?: string | null
  brand?: string | null
  gst_rate: number
  selling_price: number
  dealer_price: number
  mrp?: number
  stock_quantity: number
  minimum_stock: number
  size?: string | null
  material?: string | null
  colour?: string | null
}

export async function createProduct(product: NewProduct): Promise<void> {
  const { error } = await client().from('products').insert(product)
  if (error?.code === '23505') throw new Error('A product with this code already exists.')
  if (error) throw new Error(error.message)
}

export async function updateProduct(id: string, product: NewProduct): Promise<void> {
  const { error } = await client().from('products').update(product).eq('id', id)
  if (error?.code === '23505') throw new Error('A product with this code already exists.')
  if (error) throw new Error(error.message)
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await client()
    .from('products')
    .select('*, category:product_categories(name)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return {
    ...data,
    category_name: data.category?.name ?? undefined,
    gst_rate: num(data.gst_rate),
    mrp: num(data.mrp),
    selling_price: num(data.selling_price),
    dealer_price: num(data.dealer_price),
    stock_quantity: num(data.stock_quantity),
    minimum_stock: num(data.minimum_stock),
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await client().from('products').delete().eq('id', id)
  if (error?.code === '23503') {
    throw new Error(
      'This product is used on invoices or quotations and cannot be deleted.',
    )
  }
  if (error) throw new Error(error.message)
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await client()
    .from('products')
    .select('*, category:product_categories(name)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    ...row,
    category_name: row.category?.name ?? undefined,
    gst_rate: num(row.gst_rate),
    mrp: num(row.mrp),
    selling_price: num(row.selling_price),
    dealer_price: num(row.dealer_price),
    stock_quantity: num(row.stock_quantity),
    minimum_stock: num(row.minimum_stock),
  }))
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await client()
    .from('invoices')
    .select('*, customer:customers(name, phone), invoice_items(count)')
    .order('invoice_date', { ascending: false })
    .order('invoice_number', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => {
    const itemCount = Array.isArray(row.invoice_items)
      ? Number(row.invoice_items[0]?.count ?? 0)
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
      amount_paid: num(row.amount_paid),
      balance_due: num(row.balance_due),
      items: [],
    }
  })
}

export async function createCustomer(
  customer: Omit<Customer, 'id' | 'total_purchases' | 'outstanding' | 'last_purchase' | 'created_at'> & {
    id?: string
  },
): Promise<Customer> {
  const { data, error } = await client()
    .from('customers')
    .insert({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? null,
      address: customer.address ?? null,
      gstin: customer.gstin ?? null,
      customer_type: customer.customer_type,
      contact_person: customer.contact_person ?? null,
      alt_phone: customer.alt_phone ?? null,
      city: customer.city ?? null,
      state_code: customer.state_code ?? '32',
      pincode: customer.pincode ?? null,
      gst_registration: customer.gst_registration ?? 'unregistered',
      pan: customer.pan ?? null,
      payment_terms_days: customer.payment_terms_days ?? 0,
      credit_limit: customer.credit_limit ?? 0,
      opening_balance: customer.opening_balance ?? 0,
      notes: customer.notes ?? null,
    })
    .select('*')
    .single()

  if (error?.code === 'PGRST204' || error?.message?.includes('column')) {
    throw new Error(
      'Customer table is missing columns. Run supabase/sales_invoice.sql in the Supabase SQL editor.',
    )
  }
  if (error) throw new Error(error.message)
  return {
    ...data,
    total_purchases: 0,
    outstanding: Number(data.opening_balance ?? 0),
    last_purchase: null,
  }
}

export async function updateCustomer(
  id: string,
  customer: Pick<
    Customer,
    | 'name'
    | 'phone'
    | 'customer_type'
    | 'address'
    | 'city'
    | 'state_code'
    | 'gstin'
    | 'gst_registration'
  >,
): Promise<void> {
  const { error } = await client()
    .from('customers')
    .update({
      name: customer.name,
      phone: customer.phone,
      customer_type: customer.customer_type,
      address: customer.address ?? null,
      city: customer.city ?? null,
      state_code: customer.state_code ?? '32',
      gstin: customer.gstin ?? null,
      gst_registration: customer.gst_registration ?? 'unregistered',
    })
    .eq('id', id)

  if (error?.code === 'PGRST204' || error?.message?.includes('column')) {
    throw new Error(
      'Customer table is missing columns. Run supabase/sales_invoice.sql in the Supabase SQL editor.',
    )
  }
  if (error) throw new Error(error.message)
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await client().from('customers').delete().eq('id', id)
  if (error?.code === '23503') {
    throw new Error(
      'This customer has invoices or quotations and cannot be deleted. Remove those first.',
    )
  }
  if (error) throw new Error(error.message)
}

export async function fetchCustomers(): Promise<Customer[]> {
  const db = client()
  const [customersRes, invoicesRes] = await Promise.all([
    db.from('customers').select('*').order('name'),
    db.from('invoices').select('customer_id, grand_total, balance_due, invoice_date'),
  ])
  if (customersRes.error) throw new Error(customersRes.error.message)
  if (invoicesRes.error) throw new Error(invoicesRes.error.message)

  const totals = new Map<string, { purchases: number; outstanding: number; last: string }>()
  for (const inv of invoicesRes.data ?? []) {
    const t = totals.get(inv.customer_id) ?? { purchases: 0, outstanding: 0, last: '' }
    t.purchases += num(inv.grand_total)
    t.outstanding += num(inv.balance_due)
    if (inv.invoice_date > t.last) t.last = inv.invoice_date
    totals.set(inv.customer_id, t)
  }

  return (customersRes.data ?? []).map((row) => {
    const t = totals.get(row.id)
    return {
      ...row,
      total_purchases: t?.purchases ?? 0,
      outstanding: (t?.outstanding ?? 0) + num(row.opening_balance),
      last_purchase: t?.last || null,
    }
  })
}

export interface InvoiceItemSale {
  invoice_id: string
  invoice_date: string
  product_name: string
  quantity: number
  total: number
}

export async function fetchInvoiceItemSales(): Promise<InvoiceItemSale[]> {
  const db = client()
  const { data, error } = await db
    .from('invoice_items')
    .select('invoice_id, product_name, quantity, total, invoice:invoices(invoice_date)')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => {
    const invoice = row.invoice as { invoice_date?: string } | null
    return {
      invoice_id: String(row.invoice_id),
      invoice_date: invoice?.invoice_date ?? '',
      product_name: String(row.product_name ?? ''),
      quantity: num(row.quantity),
      total: num(row.total),
    }
  })
}
