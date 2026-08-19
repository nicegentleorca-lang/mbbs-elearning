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
    <div className="max-w-sm mx-auto mt-8">
      <span className="specimen-label mb-4 block w-fit">Sign in</span>
      <h1 className="font-display text-2xl font-semibold mb-6">Welcome back</h1>
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
      <p className="text-sm text-slate mt-4">
        New here? <Link to="/signup" className="text-venous hover:underline">Create an account</Link>
      </p>
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
