import { useState } from 'react'
import { PageHeader, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { companySettings } from '@/data/mock'

export function SettingsPage() {
  const [tab, setTab] = useState<'company' | 'invoice' | 'users'>('company')
  const [company, setCompany] = useState(companySettings)

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Company information, invoice defaults and users."
      />

      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-white p-1 w-fit">
        {(
          [
            ['company', 'Company Information'],
            ['invoice', 'Invoice Settings'],
            ['users', 'User Management'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === key
                ? 'bg-[#7539FF] text-white'
                : 'text-ink-secondary hover:bg-surface-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'company' && (
        <Card className="p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Company Name"
              value={company.company_name}
              onChange={(e) =>
                setCompany((c) => ({ ...c, company_name: e.target.value }))
              }
            />
            <Input
              label="GSTIN"
              value={company.gstin}
              onChange={(e) => setCompany((c) => ({ ...c, gstin: e.target.value }))}
            />
            <Input
              label="Phone"
              value={company.phone}
              onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))}
            />
            <Input
              label="Email"
              value={company.email}
              onChange={(e) => setCompany((c) => ({ ...c, email: e.target.value }))}
            />
            <Input
              label="Address"
              value={company.address}
              onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))}
              className="sm:col-span-2"
            />
            <Input
              label="Bank Name"
              value={company.bank_name ?? ''}
              onChange={(e) =>
                setCompany((c) => ({ ...c, bank_name: e.target.value }))
              }
            />
            <Input
              label="Account Number"
              value={company.bank_account ?? ''}
              onChange={(e) =>
                setCompany((c) => ({ ...c, bank_account: e.target.value }))
              }
            />
            <Input
              label="IFSC"
              value={company.bank_ifsc ?? ''}
              onChange={(e) =>
                setCompany((c) => ({ ...c, bank_ifsc: e.target.value }))
              }
            />
          </div>
          <Button className="mt-4" size="sm">
            Save Company Settings
          </Button>
        </Card>
      )}

      {tab === 'invoice' && (
        <Card className="p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Invoice Prefix"
              value={company.invoice_prefix}
              onChange={(e) =>
                setCompany((c) => ({ ...c, invoice_prefix: e.target.value }))
              }
            />
            <Input
              label="Starting Invoice Number"
              type="number"
              value={company.starting_invoice_number}
              onChange={(e) =>
                setCompany((c) => ({
                  ...c,
                  starting_invoice_number: Number(e.target.value) || 1,
                }))
              }
            />
            <Input
              label="Default GST %"
              type="number"
              value={company.default_gst}
              onChange={(e) =>
                setCompany((c) => ({
                  ...c,
                  default_gst: Number(e.target.value) || 0,
                }))
              }
            />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">
                Terms & Conditions
              </label>
              <textarea
                className="min-h-[100px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#7539FF] focus:ring-2 focus:ring-[#7539FF]/15"
                value={company.terms_conditions}
                onChange={(e) =>
                  setCompany((c) => ({ ...c, terms_conditions: e.target.value }))
                }
              />
            </div>
          </div>
          <Button className="mt-4" size="sm">
            Save Invoice Settings
          </Button>
        </Card>
      )}

      {tab === 'users' && (
        <Card className="p-5">
          <p className="text-sm text-ink-muted">
            Owner/admin can manage authorized staff accounts. Connect Supabase Auth to
            enable real user management.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-3 font-medium">Rahul Nair</td>
                  <td className="px-4 py-3">rahul@sanro.in</td>
                  <td className="px-4 py-3 capitalize">Owner</td>
                  <td className="px-4 py-3 text-success">Active</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3 font-medium">Anita George</td>
                  <td className="px-4 py-3">anita@sanro.in</td>
                  <td className="px-4 py-3 capitalize">Manager</td>
                  <td className="px-4 py-3 text-success">Active</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3 font-medium">Suresh Kumar</td>
                  <td className="px-4 py-3">suresh@sanro.in</td>
                  <td className="px-4 py-3 capitalize">Staff</td>
                  <td className="px-4 py-3 text-success">Active</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Button className="mt-4" size="sm" variant="outline">
            Invite Staff
          </Button>
        </Card>
      )}
    </div>
  )
}
