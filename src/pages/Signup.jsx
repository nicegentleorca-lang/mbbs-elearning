import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

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

  if (checkEmail) {
    return (
      <div className="max-w-sm mx-auto mt-8 text-center">
        <span className="specimen-label mb-4 block w-fit mx-auto">Almost there</span>
        <h1 className="font-display text-2xl font-semibold mb-3">Check your email</h1>
        <p className="text-slate">
          We sent a confirmation link to <strong>{email}</strong>. Confirm it, then come back and sign in.
        </p>
        <Link to="/login" className="btn-secondary inline-block mt-6">Go to sign in</Link>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto mt-8">
      <span className="specimen-label mb-4 block w-fit">Create account</span>
      <h1 className="font-display text-2xl font-semibold mb-6">Join Preclinical Notes</h1>
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
          <input
            type="password" required value={password}
            onChange={e => setPassword(e.target.value)}
            className="input" placeholder="At least 6 characters"
          />
        </Field>
        {error && <p className="text-vital text-sm">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="text-sm text-slate mt-4">
        Already have an account? <Link to="/login" className="text-venous hover:underline">Sign in</Link>
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
