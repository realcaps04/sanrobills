import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { SidebarProvider, useSidebar } from './SidebarContext'
import { cn } from '@/lib/utils'

const INVOICE_EDITOR_RE = /^\/(bills\/new|invoices\/new|invoices\/[^/]+\/edit)\/?$/
const QUOTATION_EDITOR_RE = /^\/quotations\/(new|[^/]+\/edit)\/?$/
const PRODUCTS_RE = /^\/products(\/.*)?\/?$/
const REPORTS_RE = /^\/reports\/?$/

function isInvoiceEditor(pathname: string) {
  return INVOICE_EDITOR_RE.test(pathname)
}

function isQuotationEditor(pathname: string) {
  return QUOTATION_EDITOR_RE.test(pathname)
}

function isProductsRoute(pathname: string) {
  return PRODUCTS_RE.test(pathname)
}

function isReportsRoute(pathname: string) {
  return REPORTS_RE.test(pathname)
}

function isFocusRoute(pathname: string) {
  return (
    isInvoiceEditor(pathname) ||
    isQuotationEditor(pathname) ||
    isProductsRoute(pathname) ||
    isReportsRoute(pathname)
  )
}

function LayoutShell() {
  const { open, setOpen } = useSidebar()
  const location = useLocation()
  const previousOpenRef = useRef(open)
  // Keep header on products list; only editors hide it
  const hideHeader = isInvoiceEditor(location.pathname) || isQuotationEditor(location.pathname)

  useEffect(() => {
    const focus = isFocusRoute(location.pathname)

    if (focus) {
      previousOpenRef.current = open
      setOpen(false)
      return
    }

    // Restore sidebar when leaving focused routes
    if (!open && previousOpenRef.current) {
      setOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to route changes
  }, [location.pathname, setOpen])

  return (
    <div className="flex h-full min-h-screen bg-[#F3F4F6]">
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/30 transition-opacity duration-200 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {!hideHeader && <TopHeader />}
        <main className="flex-1 overflow-y-auto">
          <div
            className={cn(
              'mx-auto max-w-[1400px] px-5 py-5 lg:px-6 lg:py-6',
              hideHeader && 'max-w-none px-4 py-4 lg:px-5 lg:py-5',
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <LayoutShell />
    </SidebarProvider>
  )
}
