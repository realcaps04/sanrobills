export type UserRole = 'owner' | 'manager' | 'staff'

export type PaymentStatus = 'paid' | 'partial' | 'pending'
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'card' | 'credit' | 'partial'
export type CustomerType = 'retail' | 'dealer' | 'contractor'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url?: string | null
}

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string | null
  address?: string | null
  gstin?: string | null
  customer_type: CustomerType
  total_purchases: number
  outstanding: number
  last_purchase?: string | null
  created_at: string
}

export interface ProductCategory {
  id: string
  name: string
}

export interface Product {
  id: string
  name: string
  product_code: string
  category_id: string
  category_name?: string
  door_type?: string | null
  size?: string | null
  material?: string | null
  colour?: string | null
  finish?: string | null
  hsn_code?: string | null
  gst_rate: number
  mrp: number
  selling_price: number
  dealer_price: number
  stock_quantity: number
  minimum_stock: number
}

export interface DoorSpecs {
  door_size?: string
  height?: string
  width?: string
  thickness?: string
  colour?: string
  finish?: string
  frame_type?: string
  glass_type?: string
  lock_type?: string
  handle_type?: string
  opening_direction?: string
  custom_instructions?: string
}

export interface InvoiceItem {
  id: string
  product_id: string
  product_name: string
  size?: string
  quantity: number
  rate: number
  discount: number
  gst_rate: number
  total: number
  specs?: DoorSpecs
}

export interface Invoice {
  id: string
  invoice_number: string
  customer_id: string
  customer_name: string
  invoice_date: string
  subtotal: number
  discount: number
  taxable_amount: number
  cgst: number
  sgst: number
  grand_total: number
  amount_paid: number
  balance_due: number
  payment_status: PaymentStatus
  payment_method?: PaymentMethod | null
  items: InvoiceItem[]
  notes?: string | null
  created_at: string
}

export interface Payment {
  id: string
  payment_id: string
  customer_id: string
  customer_name: string
  invoice_id: string
  invoice_number: string
  amount: number
  payment_date: string
  method: PaymentMethod
  reference?: string | null
  notes?: string | null
}

export interface InventoryRow {
  id: string
  product_id: string
  product_name: string
  sku: string
  opening_stock: number
  purchases: number
  sales: number
  current_stock: number
  minimum_stock: number
  status: StockStatus
}

export interface CompanySettings {
  company_name: string
  address: string
  phone: string
  email: string
  gstin: string
  logo_url?: string | null
  bank_name?: string
  bank_account?: string
  bank_ifsc?: string
  invoice_prefix: string
  starting_invoice_number: number
  default_gst: number
  terms_conditions: string
}

export interface DashboardStats {
  todaySales: number
  todayInvoiceCount: number
  monthSales: number
  monthLabel: string
  pendingPayments: number
  pendingCustomerCount: number
  totalInvoicesMonth: number
}
