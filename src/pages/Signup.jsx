import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import DeltoidLogo from '../components/DeltoidLogo'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setSubmitting(true)
    const { error } = await signUp(email, password, fullName)
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setCheckEmail(true)
  }

  return (
    // Signup is rendered OUTSIDE <Layout /> (same as Login in App.jsx), so
    // it handles its own full height and its own footer, matching Login.jsx.
    <div className="min-h-screen bg-ink flex flex-col">

      <div className="relative flex-1 overflow-hidden">
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

        <div className="relative flex flex-col items-center justify-center px-6 py-14 sm:py-20">

          <div className="text-center mb-10">
            <span className="font-display text-xl font-bold tracking-wide text-white">DELTOID</span>
            <p className="text-sm text-white/50 mt-1">Active recall for the wards ahead.</p>
          </div>

          <div className="w-full max-w-sm bg-paper rounded-card p-6 sm:p-8 shadow-sm">
            {checkEmail ? (
              <div className="text-center">
                <span className="specimen-label mb-4 block w-fit mx-auto">Almost there</span>
                <h1 className="font-display text-2xl font-semibold mb-3 text-ink">Check your email</h1>
                <p className="text-slate">
                  We sent a confirmation link to <strong>{email}</strong>. Confirm it, then come back and sign in.
                </p>
                <Link to="/login" className="btn-secondary inline-block mt-6">Go to sign in</Link>
              </div>
            ) : (
              <>
                <span className="specimen-label mb-4 block w-fit">Create account</span>
                <h1 className="font-display text-2xl font-semibold mb-6 text-ink">Join Deltoid With Others!</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label="Full name">
                    <input
                      type="text" required value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="input" placeholder="Your name"
                    />
                  </Field>
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
                        className="input pr-16" placeholder="At least 6 characters"
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
                    {submitting ? 'Creating account…' : 'Create account'}
                  </button>
                </form>
                <p className="text-sm text-slate mt-4">
                  Already have an account? <Link to="/login" className="text-venous hover:underline">Sign in</Link>
                </p>
              </>
            )}
          </div>

          <blockquote className="relative text-center font-display text-lg sm:text-xl leading-snug text-white/85 max-w-sm mt-10">
            Every muscle has an origin, an insertion, and a reason it's tested.
            <span className="block text-xs font-sans text-white/40 mt-3 not-italic">
              — what preclinicals actually feel like
            </span>
          </blockquote>
        </div>
      </div>

      <footer className="border-t border-white/10 bg-ink py-6 text-xs text-white/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 text-center">
          <div className="flex items-center gap-2">
            <DeltoidLogo className="w-4 h-4" />
            <span className="font-display font-bold text-white tracking-wider">DELTOID</span>
            <span className="text-white/40">• Active Recall & Medical Practice</span>
          </div>
          <p className="font-mono text-white/30 text-[11px]">
            © {new Date().getFullYear()} Deltoid. All rights reserved.
          </p>
        </div>
      </footer>
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
