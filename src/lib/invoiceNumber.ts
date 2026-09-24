import { getCompanySettings } from '@/lib/company'

const STORAGE_KEY = 'sanro_invoice_seq'

function storageKey(year: number) {
  return `${STORAGE_KEY}_${year}`
}

function prefixFor(year: number) {
  return `${getCompanySettings().invoice_prefix}-${year}-`
}

export function formatInvoiceNumber(year: number, seq: number) {
  return `${prefixFor(year)}${String(seq).padStart(5, '0')}`
}

export function invoiceNumberPrefix(year: number) {
  return prefixFor(year)
}

function lastUsedSeq(year: number) {
  const stored = Number(localStorage.getItem(storageKey(year)) ?? 0)
  return Math.max(getCompanySettings().starting_invoice_number - 1, stored)
}

/** Next unused invoice number for the given date's year. Does not reserve it. */
export function getNextInvoiceNumber(date = new Date()) {
  const year = date.getFullYear()
  return formatInvoiceNumber(year, lastUsedSeq(year) + 1)
}

/** Mark an invoice number as used so the next bill gets the following number. */
export function commitInvoiceNumber(invoiceNumber: string) {
  const match = invoiceNumber.match(/-(\d{4})-(\d+)$/)
  if (!match) return
  const year = Number(match[1])
  const seq = Number(match[2])
  if (seq > lastUsedSeq(year)) {
    localStorage.setItem(storageKey(year), String(seq))
  }
}
