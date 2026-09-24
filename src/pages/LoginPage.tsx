import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Sun,
  Gem,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'

export function LoginPage() {
  const { user, loading, signIn, signInWithGoogle, isDemoMode } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(isDemoMode ? 'rahul@sanro.in' : '')
  const [password, setPassword] = useState(isDemoMode ? 'demo1234' : '')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const result = await signIn(email, password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (remember) {
      localStorage.setItem('sanro_remember', email)
    }
    navigate('/')
  }

  async function handleGoogleSignIn() {
    setError('')
    setGoogleLoading(true)
    const result = await signInWithGoogle()
    if (result.error) {
      setGoogleLoading(false)
      setError(result.error)
    }
  }

  return (
    <div className="sanro-canvas flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="m-auto flex h-[min(920px,100vh)] w-full max-w-[1200px] overflow-hidden bg-white sanro-panel lg:h-[min(820px,92vh)] lg:rounded-lg">
        <div className="relative hidden w-[46%] overflow-hidden lg:block">
          <img
            src="/logobg.png"
            alt="Premium fibre glass door"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-slate-900/30" />

          <div className="absolute right-6 top-6 flex items-center gap-1.5 rounded-full bg-white/12 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-white backdrop-blur-md">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
            Secure Access
          </div>

          <div className="relative z-10 flex h-full flex-col px-11 py-11 text-white">
            <div>
              <div className="text-[1.75rem] font-extrabold tracking-[0.2em]">SANRO</div>
              <div className="mt-1.5 text-[11px] font-semibold tracking-[0.22em] text-white/70">
                FIBRE GLASS INDUSTRIES
              </div>
              <div className="mt-4 h-0.5 w-12 rounded-full bg-white" />
            </div>

            <div className="mt-auto max-w-md pb-6">
              <h1 className="text-[2.35rem] font-extrabold leading-[1.15] tracking-tight">
                Strong Doors for a Better Tomorrow.
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-white/75">
                Premium fibre glass doors for modern spaces.
              </p>

              <ul className="mt-9 space-y-3.5 text-sm font-medium text-white/90">
                <li className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                    <Shield className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  </span>
                  Durable construction
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                    <Sun className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  </span>
                  Weather resistant
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                    <Gem className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  </span>
                  Modern design language
                </li>
              </ul>

              <p className="mt-10 text-sm font-medium text-white/55">
                Smart billing. Simple business management.
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-[54%] lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-[400px]">
            <div className="mb-9 text-center lg:text-left">
              <div className="text-xl font-extrabold tracking-[0.16em] text-brand-600">
                SANRO
              </div>
              <div className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-slate-400">
                FIBRE GLASS INDUSTRIES
              </div>
            </div>

            <h2 className="text-[1.85rem] font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Sign in to continue to your business dashboard.
            </p>

            <form onSubmit={handleSubmit} className="mt-9 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-[13px] font-semibold text-slate-700"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.75}
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-12 w-full rounded-xl bg-white sanro-control pl-11 pr-3 text-sm outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-[13px] font-semibold text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.75}
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl bg-white sanro-control pl-11 pr-11 text-sm outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-2.5 text-slate-500">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#1e3a5f] shadow-[0_0_0_1px_rgba(15,23,42,0.12)]"
                  />
                  Remember me
                </label>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600 shadow-[0_1px_3px_rgba(220,38,38,0.1)]">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign In'}
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </form>

            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                or
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={googleLoading || submitting}
              onClick={handleGoogleSignIn}
            >
              <GoogleIcon />
              {googleLoading ? 'Redirecting to Google…' : 'Sign in with Google'}
            </Button>

            <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
              <Shield className="h-3.5 w-3.5" strokeWidth={1.75} />
              Secure access for authorized Sanro personnel.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44c-.28 1.5-1.12 2.77-2.39 3.62v3.01h3.87c2.26-2.08 3.57-5.14 3.57-8.66z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3.01c-1.08.72-2.46 1.15-4.06 1.15-3.12 0-5.76-2.11-6.7-4.94H1.28v3.1C3.25 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.39-2.29V6.61H1.28A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.02-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.94 1.19 15.23 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4.02 3.1C6.24 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  )
}
