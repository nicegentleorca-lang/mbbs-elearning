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
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            fill="none"
            className="w-12 h-12 mb-3"
          >
            <defs>
              <linearGradient id="deltoid-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1B2A4A" />
                <stop offset="100%" stopColor="#0E1726" />
              </linearGradient>
              <linearGradient id="deltoid-teal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#529EA3" />
                <stop offset="100%" stopColor="#2C5254" />
              </linearGradient>
              <linearGradient id="deltoid-vital" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E5593F" />
                <stop offset="100%" stopColor="#A8321C" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="14" fill="url(#deltoid-bg)" />
            <polygon points="32,12 52,48 12,48" fill="url(#deltoid-teal)" />
            <polygon points="32,22 43,43 21,43" fill="url(#deltoid-bg)" />
            <circle cx="32" cy="35" r="3.5" fill="url(#deltoid-vital)" />
          </svg>
          <span className="font-display text-lg font-bold tracking-wide text-ink">
            DELTOID
          </span>
          <span className="text-xs text-slate mt-1">
            Active Recall &amp; Medical Practice
          </span>
        </div>

        <span className="specimen-label mb-4 block w-fit mx-auto">Sign in</span>
        <h1 className="font-display text-2xl font-semibold mb-1 text-center">
          Welcome back
        </h1>
        <p className="text-sm text-slate text-center mb-6">
          Sign in to continue your prep.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-paperDim rounded-card shadow-sm p-6">
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

        <p className="text-sm text-slate mt-4 text-center">
          New here? <Link to="/signup" className="text-venous hover:underline">Create an account</Link>
        </p>
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
