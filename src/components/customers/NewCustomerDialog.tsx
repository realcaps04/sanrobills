import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, Loader2, X } from 'lucide-react'
import { createCustomer } from '@/lib/data'
import { isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Customer, CustomerType, GstRegistration } from '@/types'

const fieldClass =
  'h-9 w-full rounded-md bg-white sanro-control px-3 text-[13px] text-ink outline-none placeholder:text-[#9CA3AF]'

export function NewCustomerDialog({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (customer: Customer) => void
}) {
  const [form, setForm] = useState<CustomerForm>(emptyCustomerForm)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const needsGstin = form.gst_registration === 'registered' || form.gst_registration === 'composition'
  const errors = validateCustomerForm(form, needsGstin)
  const showError = (field: keyof CustomerForm) => (submitted ? errors[field] : undefined)

  function set<K extends keyof CustomerForm>(field: K, value: CustomerForm[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleGstin(value: string) {
    const gstin = value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15)
    set('gstin', gstin)
  }

  function handleRegistration(value: GstRegistration) {
    setForm((f) => ({
      ...f,
      gst_registration: value,
      gstin: value === 'registered' || value === 'composition' ? f.gstin : '',
    }))
  }

  async function handleSave() {
    setSubmitted(true)
    setSaveError('')
    if (Object.keys(errors).length > 0) return
    if (!isSupabaseConfigured) {
      setSaveError('Connect Supabase in .env to save customers.')
      return
    }

    setSaving(true)
    try {
      const saved = await createCustomer({
        name: form.name.trim(),
        customer_type: form.customer_type,
        contact_person: null,
        phone: form.phone,
        alt_phone: form.alt_phone || null,
        email: null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state_code: '32',
        pincode: form.pincode || null,
        gst_registration: form.gst_registration,
        gstin: needsGstin ? form.gstin : null,
        pan: needsGstin && form.gstin.length >= 12 ? form.gstin.slice(2, 12) : null,
        payment_terms_days: 0,
        credit_limit: 0,
        opening_balance: 0,
        notes: null,
      })
      onSave(saved)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the customer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-lg bg-white sanro-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="New customer"
      >
        <div className="flex items-center justify-between px-5 py-4 sanro-divider">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">New Customer</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Fields marked * are required.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-muted hover:bg-surface-muted hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <DialogGroup title="Basic Details">
            <DialogField label="Customer Type *">
              <DialogSelect
                value={form.customer_type}
                onChange={(v) => set('customer_type', v as CustomerType)}
                options={CUSTOMER_TYPES}
              />
            </DialogField>
            <DialogField label="Customer / Business Name *" error={showError('name')}>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Sreedevi Constructions"
                className={cn(fieldClass, showError('name') && 'sanro-control--error')}
              />
            </DialogField>
            <DialogField label="Mobile Number *" error={showError('phone')}>
              <PhoneInput
                value={form.phone}
                onChange={(v) => set('phone', v)}
                invalid={!!showError('phone')}
              />
            </DialogField>
            <DialogField label="Alternate Number" error={showError('alt_phone')}>
              <PhoneInput
                value={form.alt_phone}
                onChange={(v) => set('alt_phone', v)}
                invalid={!!showError('alt_phone')}
              />
            </DialogField>
          </DialogGroup>

          <DialogGroup title="Billing Address">
            <DialogField label="Address" className="sm:col-span-2">
              <textarea
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Building, street, area"
                className="min-h-[64px] w-full resize-none rounded-md bg-white sanro-control px-3 py-2 text-[13px] text-ink outline-none placeholder:text-[#9CA3AF]"
              />
            </DialogField>
            <DialogField label="City / Town">
              <input
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="e.g. Kochi"
                className={fieldClass}
              />
            </DialogField>
            <DialogField label="PIN Code" error={showError('pincode')}>
              <input
                inputMode="numeric"
                value={form.pincode}
                onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 digits"
                className={cn(fieldClass, showError('pincode') && 'sanro-control--error')}
              />
            </DialogField>
          </DialogGroup>

          <DialogGroup title="Tax">
            <DialogField label="GST Registration *">
              <DialogSelect
                value={form.gst_registration}
                onChange={(v) => handleRegistration(v as GstRegistration)}
                options={GST_REGISTRATIONS}
              />
            </DialogField>
            <DialogField
              label={needsGstin ? 'GSTIN *' : 'GSTIN'}
              error={showError('gstin')}
              hint={needsGstin ? undefined : 'Not needed for unregistered customers'}
            >
              <input
                value={form.gstin}
                onChange={(e) => handleGstin(e.target.value)}
                disabled={!needsGstin}
                placeholder="e.g. 32ABCDE1234F1Z5"
                className={cn(
                  fieldClass,
                  'font-mono uppercase tracking-wide disabled:cursor-not-allowed disabled:bg-[#F3F4F6]',
                  showError('gstin') && 'sanro-control--error',
                )}
              />
            </DialogField>
          </DialogGroup>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 shadow-[inset_0_1px_0_0_#EEF0F3]">
          <p className="text-xs text-danger" role="alert">
            {saveError ||
              (submitted && Object.keys(errors).length > 0
                ? 'Please fix the highlighted fields.'
                : '')}
          </p>
          <div className="flex gap-2">
            <ActionButton onClick={onClose} disabled={saving}>
              Cancel
            </ActionButton>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-[13px] font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />}
              {saving ? 'Saving…' : 'Save Customer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CustomerForm {
  customer_type: CustomerType
  name: string
  phone: string
  alt_phone: string
  address: string
  city: string
  pincode: string
  gst_registration: GstRegistration
  gstin: string
}

const emptyCustomerForm = (): CustomerForm => ({
  customer_type: 'retail',
  name: '',
  phone: '',
  alt_phone: '',
  address: '',
  city: '',
  pincode: '',
  gst_registration: 'unregistered',
  gstin: '',
})

const CUSTOMER_TYPES = [
  { value: 'retail', label: 'Retail' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'contractor', label: 'Contractor' },
]

const GST_REGISTRATIONS = [
  { value: 'unregistered', label: 'Unregistered Business' },
  { value: 'registered', label: 'Registered Business (Regular)' },
  { value: 'composition', label: 'Registered Business (Composition)' },
  { value: 'consumer', label: 'Consumer' },
]

const MOBILE_RE = /^[6-9]\d{9}$/
const PIN_RE = /^[1-9]\d{5}$/
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

function validateCustomerForm(form: CustomerForm, needsGstin: boolean) {
  const errors: Partial<Record<keyof CustomerForm, string>> = {}
  if (!form.name.trim()) errors.name = 'Enter the customer name'
  if (!MOBILE_RE.test(form.phone)) errors.phone = 'Enter a valid 10-digit mobile number'
  if (form.alt_phone && !MOBILE_RE.test(form.alt_phone)) {
    errors.alt_phone = 'Enter a valid 10-digit number'
  }
  if (form.pincode && !PIN_RE.test(form.pincode)) errors.pincode = 'PIN code must be 6 digits'
  if (needsGstin) {
    if (!GSTIN_RE.test(form.gstin)) errors.gstin = 'Enter a valid 15-character GSTIN'
  }
  return errors
}

function PhoneInput({
  value,
  onChange,
  invalid,
}: {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
}) {
  return (
    <div
      className={cn(
        'flex h-9 items-center overflow-hidden rounded-md bg-white sanro-control',
        invalid && 'sanro-control--error',
      )}
    >
      <span className="flex h-full items-center bg-[#F9FAFB] px-2.5 text-[13px] text-ink-muted shadow-[inset_-1px_0_0_0_#EEF0F3]">
        +91
      </span>
      <input
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
        placeholder="98765 43210"
        className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[13px] text-ink outline-none placeholder:text-[#9CA3AF]"
      />
    </div>
  )
}

function DialogSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="sanro-select !h-9 !text-[13px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        strokeWidth={1.75}
      />
    </div>
  )
}

function DialogGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function DialogField({
  label,
  children,
  error,
  hint,
  className,
}: {
  label: string
  children: ReactNode
  error?: string
  hint?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-ink-secondary">{label}</label>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  className,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-[13px] font-medium text-ink-secondary sanro-control hover:text-ink disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}
