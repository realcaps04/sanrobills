import { useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'
import type { CompanySettings } from '@/types'

export const DEFAULT_COMPANY_STATE = '32'

const DEFAULT_SETTINGS: CompanySettings = {
  company_name: 'Sanro Fibre Glass Industries',
  address: 'Thankamany, Near Kuttankavala, Idukki, Kerala, India - 685515',
  phone: '7902914120',
  email: 'sajisanro@gmail.com',
  gstin: '',
  bank_name: '',
  bank_account: '',
  bank_ifsc: '',
  invoice_prefix: 'INV',
  starting_invoice_number: 1,
  default_gst: 18,
  terms_conditions: '',
}

let current: CompanySettings = DEFAULT_SETTINGS
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCompanySettings(): CompanySettings {
  return current
}

export function companyStateCode(settings = current): string {
  return settings.gstin?.slice(0, 2) || DEFAULT_COMPANY_STATE
}

export function loadCompanySettings(): Promise<void> {
  if (!supabase) return Promise.resolve()
  if (!loading) {
    loading = (async () => {
      const { data, error } = await supabase!
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (error || !data) return
      const merged = { ...DEFAULT_SETTINGS }
      for (const [key, value] of Object.entries(data)) {
        if (value === null || !(key in merged)) continue
        // Keep app defaults when the DB row has blank contact fields
        if (
          typeof value === 'string' &&
          value.trim() === '' &&
          ['company_name', 'address', 'phone', 'email'].includes(key)
        ) {
          continue
        }
        ;(merged as Record<string, unknown>)[key] =
          typeof DEFAULT_SETTINGS[key as keyof CompanySettings] === 'number'
            ? Number(value)
            : value
      }
      current = merged
      listeners.forEach((l) => l())
    })()
  }
  return loading
}

export function useCompanySettings(): CompanySettings {
  if (!loading) void loadCompanySettings()
  return useSyncExternalStore(subscribe, getCompanySettings)
}
