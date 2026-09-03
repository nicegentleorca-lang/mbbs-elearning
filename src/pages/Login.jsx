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
    // Safe full-bleed technique: instead of forcing 100vw (which can add a
    // horizontal scrollbar on some browsers when a vertical scrollbar is
    // present), we just cancel out main's own padding exactly, using the
    // same values main already uses (px-4 sm:px-6 py-8 -> -mx-4 sm:-mx-6 -my-8).
    // This has no viewport-unit risk at all. On very wide desktop screens
    // this bleeds to the edge of main's max-w-5xl container rather than the
    // true screen edge — a reasonable tradeoff, and irrelevant on the
    // phone/tablet portrait screens this is actually being used on.
    <div className="relative -mx-4 sm:-mx-6 -my-8 flex-1 min-h-full bg-ink overflow-hidden flex flex-col">

      {/* Layered triangle motif */}
      <svg
        className="absolute -right-16 -top-20 w-72 h-72 sm:w-96 sm:h-96 opacity-[0.16] pointer-events-none"
        viewBox="0 0 64 64" fill="none"
      >
        <polygon points="32,4 60,56 4,56" stroke="#529EA3" strokeWidth="1.2" fill="none" />
        <polygon points="32,18 48,50 16,50" stroke="#529EA3" strokeWidth="1.2" fill="none" />
        <polygon points="32,30 40,46 24,46" stroke="#E5593F" strokeWidth="1.2" fill="none" />
      </svg>
      <svg
        className="absolute -left-20 -bottom-24 w-64 h-64 sm:w-80 sm:h-80 opacity-[0.12] pointer-events-none"
        viewBox="0 0 64 64" fill="none"
      >
        <polygon points="32,4 60,56 4,56" stroke="#F0F2F0" strokeWidth="0.9" fill="none" />
        <polygon points="32,18 48,50 16,50" stroke="#F0F2F0" strokeWidth="0.9" fill="none" />
      </svg>
      <svg
        className="absolute left-1/2 -translate-x-1/2 top-1/3 w-[500px] h-[500px] opacity-[0.05] pointer-events-none"
        viewBox="0 0 64 64" fill="none"
      >
        <polygon points="32,4 60,56 4,56" stroke="#529EA3" strokeWidth="0.6" fill="none" />
      </svg>
      <svg
        className="absolute -right-24 bottom-0 w-80 h-80 opacity-[0.07] pointer-events-none"
        viewBox="0 0 64 64" fill="none"
      >
        <polygon points="32,4 60,56 4,56" stroke="#F0F2F0" strokeWidth="0.7" fill="none" />
      </svg>

      {/* Content is re-padded here, independent of main's own padding
          which we just cancelled out above. */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-14 sm:py-20">

        <div className="text-center mb-10">
          <span className="font-display text-xl font-bold tracking-wide text-white">DELTOID</span>
          <p className="text-sm text-white/50 mt-1">Active recall for the wards ahead.</p>
        </div>

        <div className="w-full max-w-sm bg-paper rounded-card p-6 sm:p-8 shadow-sm">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-slate mb-7">Pick up your prep where you left off.</p>

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

        <blockquote className="relative text-center font-display text-lg sm:text-xl leading-snug text-white/85 max-w-sm mt-10">
          Every muscle has an origin, an insertion, and a reason it's tested.
          <span className="block text-xs font-sans text-white/40 mt-3 not-italic">
            — what preclinicals actually feel like
          </span>
        </blockquote>
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
