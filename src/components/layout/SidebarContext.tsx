import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface SidebarContextValue {
  open: boolean
  toggle: () => void
  setOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

const STORAGE_KEY = 'sanro_sidebar_open'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === null) return true
    return saved === '1'
  })

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value)
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  }, [])

  const toggle = useCallback(() => {
    setOpenState((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  // Close overlay sidebar on escape (mobile)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && window.innerWidth < 1024) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  const value = useMemo(
    () => ({ open, toggle, setOpen }),
    [open, toggle, setOpen],
  )

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
