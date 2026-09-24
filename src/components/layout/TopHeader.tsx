import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronsRight, FileText, Plus, Search, X } from 'lucide-react'
import { useSidebar } from './SidebarContext'
import { cn } from '@/lib/utils'

const titles: Record<string, string> = {
  '/': '',
  '/bills/new': 'New Bill',
  '/invoices': 'Invoices',
  '/invoices/new': 'Create Invoice',
  '/quotations': 'Quotations',
  '/customers': 'Customers',
  '/products': 'Products',
  '/products/new': 'Add Product',
  '/reports': 'Reports',
}

export function TopHeader() {
  const { open, toggle } = useSidebar()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const title =
    titles[location.pathname] ??
    (location.pathname.startsWith('/invoices/')
      ? 'Invoice Details'
      : location.pathname.match(/^\/products\/[^/]+\/edit/)
        ? 'Edit Product'
        : location.pathname.startsWith('/quotations/')
          ? 'Quotation Details'
          : 'Sanro')

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return

    function onDocClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSearchOpen(false)
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [searchOpen])

  return (
    <header className="sticky top-0 z-20 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 bg-white px-5 lg:px-6 sanro-divider">
      <div className="flex min-w-0 items-center gap-2.5">
        {!open && (
          <button
            type="button"
            onClick={toggle}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink lg:hidden"
            aria-label="Show sidebar"
          >
            <ChevronsRight className="h-5 w-5" strokeWidth={1.75} />
          </button>
        )}
        {title && (
          <h1 className="truncate text-base font-semibold text-ink">{title}</h1>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        <Link
          to="/invoices/new"
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition',
            location.pathname === '/invoices/new' || location.pathname === '/bills/new'
              ? 'bg-accent text-white'
              : 'bg-blue-50 text-accent hover:bg-blue-100',
          )}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          <span className="hidden sm:inline">New Sales Bill</span>
          <span className="sm:hidden">Bill</span>
        </Link>
        <Link
          to="/quotations/new"
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition',
            location.pathname === '/quotations/new'
              ? 'bg-accent text-white'
              : 'bg-blue-50 text-accent hover:bg-blue-100',
          )}
        >
          <FileText className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">New Quotation</span>
          <span className="sm:hidden">Quote</span>
        </Link>
      </div>

      <div ref={searchRef} className="relative flex shrink-0 items-center justify-end">
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out',
            searchOpen
              ? 'mr-1 w-[min(260px,65vw)] opacity-100 sm:w-[280px]'
              : 'w-0 opacity-0',
          )}
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              strokeWidth={1.75}
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-9 w-full rounded-md bg-surface-muted sanro-control pl-9 pr-8 text-sm text-ink outline-none placeholder:text-ink-muted focus:bg-white"
              aria-hidden={!searchOpen}
              tabIndex={searchOpen ? 0 : -1}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          className={cn(
            'rounded-md p-2 text-ink-muted transition hover:bg-surface-muted hover:text-ink',
            searchOpen && 'bg-surface-muted text-brand-600',
          )}
          aria-label={searchOpen ? 'Close search' : 'Open search'}
          aria-expanded={searchOpen}
        >
          {searchOpen ? (
            <X className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Search className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>
      </div>
    </header>
  )
}
