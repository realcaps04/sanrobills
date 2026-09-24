const STORAGE_KEY = 'sanro_quotation_seq'
const PREFIX = 'QT'

function storageKey(year: number) {
  return `${STORAGE_KEY}_${year}`
}

function prefixFor(year: number) {
  return `${PREFIX}-${year}-`
}

export function formatQuotationNumber(year: number, seq: number) {
  return `${prefixFor(year)}${String(seq).padStart(5, '0')}`
}

export function quotationNumberPrefix(year: number) {
  return prefixFor(year)
}

function lastUsedSeq(year: number) {
  return Math.max(0, Number(localStorage.getItem(storageKey(year)) ?? 0))
}

export function getNextQuotationNumber(date = new Date()) {
  const year = date.getFullYear()
  return formatQuotationNumber(year, lastUsedSeq(year) + 1)
}

export function commitQuotationNumber(quotationNumber: string) {
  const match = quotationNumber.match(/-(\d{4})-(\d+)$/)
  if (!match) return
  const year = Number(match[1])
  const seq = Number(match[2])
  if (seq > lastUsedSeq(year)) {
    localStorage.setItem(storageKey(year), String(seq))
  }
}
