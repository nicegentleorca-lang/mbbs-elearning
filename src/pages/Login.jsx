import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-[75vh] grid md:grid-cols-[1.1fr_1fr] rounded-card overflow-hidden border border-paperDim shadow-sm">

      {/* Left: brand panel with layered deltoid motif */}
      <div className="relative hidden md:flex flex-col justify-between bg-ink text-white px-10 py-12 overflow-hidden">
        {/* Layered triangle motif, echoing the deltoid mark at scale */}
        <svg
          className="absolute -right-24 -top-16 w-[420px] h-[420px] opacity-[0.14]"
          viewBox="0 0 64 64" fill="none"
        >
          <polygon points="32,4 60,56 4,56" stroke="#529EA3" strokeWidth="1.2" fill="none" />
          <polygon points="32,18 48,50 16,50" stroke="#529EA3" strokeWidth="1.2" fill="none" />
          <polygon points="32,30 40,46 24,46" stroke="#E5593F" strokeWidth="1.2" fill="none" />
        </svg>
        <svg
          className="absolute -left-16 bottom-0 w-64 h-64 opacity-[0.08]"
          viewBox="0 0 64 64" fill="none"
        >
          <polygon points="32,4 60,56 4,56" stroke="#F0F2F0" strokeWidth="0.8" fill="none" />
        </svg>

        <div className="relative">
          <span className="font-display text-xl font-bold tracking-wide">DELTOID</span>
          <p className="text-sm text-white/50 mt-1">Active recall for the wards ahead.</p>
        </div>

        <blockquote className="relative font-display text-2xl leading-snug text-white/90 max-w-sm">
          Every muscle has an origin, an insertion, and a reason it's tested.
          <span className="block text-sm font-sans text-white/40 mt-4 not-italic">
            — what preclinicals actually feel like
          </span>
        </blockquote>
      </div>

      {/* Right: form panel */}
      <div className="flex flex-col justify-center px-6 sm:px-12 py-12 bg-paper">
        <div className="w-full max-w-sm mx-auto md:mx-0">
          {/* Mobile-only compact brand mark, since the left panel is hidden below md */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" className="w-7 h-7">
              <defs>
                <linearGradient id="deltoid-bg-m" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1B2A4A" />
                  <stop offset="100%" stopColor="#0E1726" />
                </linearGradient>
                <linearGradient id="deltoid-teal-m" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#529EA3" />
                  <stop offset="100%" stopColor="#2C5254" />
                </linearGradient>
                <linearGradient id="deltoid-vital-m" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E5593F" />
                  <stop offset="100%" stopColor="#A8321C" />
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="14" fill="url(#deltoid-bg-m)" />
              <polygon points="32,12 52,48 12,48" fill="url(#deltoid-teal-m)" />
              <polygon points="32,22 43,43 21,43" fill="url(#deltoid-bg-m)" />
              <circle cx="32" cy="35" r="3.5" fill="url(#deltoid-vital-m)" />
            </svg>
            <span className="font-display text-base font-bold tracking-wide text-ink">DELTOID</span>
          </div>

          <h1 className="font-display text-3xl font-semibold text-ink mb-2">Welcome back</h1>
          <p className="text-sm text-slate mb-8">Pick up your prep where you left off.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email">
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="input" placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-16" placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate hover:text-ink px-2 py-1"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
            {error && <p className="text-vital text-sm">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-slate mt-6">
            New here? <Link to="/signup" className="text-venous hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm text-slate mb-1">{label}</span>
      {children}
    </label>
  )
}
