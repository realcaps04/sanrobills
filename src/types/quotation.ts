export type QuotationStatus = 'draft' | 'pending' | 'converted' | 'expired'
export type QuotationType = 'standard' | 'dealer' | 'project' | 'estimation'

export interface QuotationItem {
  id: string
  product_id?: string | null
  product_name: string
  description?: string | null
  size?: string | null
  hsn_code?: string | null
  quantity: number
  rate: number
  discount: number
  gst_rate: number
  total: number
}

export interface Quotation {
  id: string
  quotation_number: string
  customer_id: string
  customer_name: string
  customer_phone?: string | null
  quotation_date: string
  valid_till?: string | null
  quotation_type: QuotationType
  reference?: string | null
  sales_person?: string | null
  billing_address?: string | null
  customer_gstin?: string | null
  place_of_supply?: string | null
  subtotal: number
  discount: number
  taxable_amount: number
  cgst: number
  sgst: number
  igst: number
  grand_total: number
  status: QuotationStatus
  notes?: string | null
  terms?: string | null
  remarks?: string | null
  item_count?: number
  items: QuotationItem[]
  created_at: string
}

/** @deprecated use quotation_number */
export type QuotationListItem = Quotation
