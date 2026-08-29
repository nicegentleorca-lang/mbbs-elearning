import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { hasActiveSubscription } from '../lib/content'

export default function UnlockSubject() {
  const { subjectSlug } = useParams()
  const navigate = useNavigate()
  const { user, session, isAdmin } = useAuth()

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const scriptId = 'paystack-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.async = true
      document.body.appendChild(script)
    }

    checkExistingAccess()
  }, [user])

  async function checkExistingAccess() {
    setLoading(true)
    try {
      if (user) {
        const hasAccess = await hasActiveSubscription(user.id, isAdmin)
        if (hasAccess) {
          navigate(subjectSlug ? `/subjects/${subjectSlug}` : '/subjects', { replace: true })
          return
        }
      }
    } catch (err) {
      console.error('Failed to check access:', err)
    } finally {
      setLoading(false)
    }
  }

  function handlePaystackPayment() {
    if (!user || !session) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }

    const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
    if (!paystackPublicKey) {
      setErrorMessage('Paystack public key is missing in configuration.')
      return
    }

    if (!window.PaystackPop) {
      setErrorMessage('Payment gateway initializing... please try again in a moment.')
      return
    }

    setProcessing(true)
    setErrorMessage('')
    setStatusMessage('Opening payment portal...')

    const handler = window.PaystackPop.setup({
      key: paystackPublicKey,
      email: user.email,
      amount: 500000, // ₦5,000 in Kobo
      currency: 'NGN',
      ref: `DELTOID_PASS_${user.id.slice(0, 8)}_${Date.now()}`,
      callback: function (response) {
        verifyPaymentWithServer(response.reference)
      },
      onClose: function () {
        setProcessing(false)
        setStatusMessage('')
      }
    })

    handler.openIframe()
  }

  async function verifyPaymentWithServer(reference) {
    setStatusMessage('Verifying subscription with server...')
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ reference })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify transaction.')
      }

      setStatusMessage('Subscription active! Unlocking platform...')
      setTimeout(() => {
        navigate(subjectSlug ? `/subjects/${subjectSlug}` : '/subjects', { replace: true })
      }, 1000)
    } catch (err) {
      setErrorMessage(err.message || 'Payment verification failed.')
      setProcessing(false)
      setStatusMessage('')
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center font-mono text-xs text-slate">
        Checking access rights...
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white border border-paperDim rounded-card shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <span className="specimen-label inline-block">Platform Monthly Pass</span>
        <h1 className="font-display text-2xl font-bold text-ink">Unlock All Subjects & Quizzes</h1>
        <p className="text-xs text-slate">
          Get unlimited 30-day access to every course, interactive model, and quiz across the entire platform.
        </p>
      </div>

      <div className="bg-paper p-4 rounded border border-paperDim space-y-2 font-mono text-xs">
        <div className="flex justify-between text-slate">
          <span>Access Type:</span>
          <span className="text-ink font-bold">All-Access Monthly Pass</span>
        </div>
        <div className="flex justify-between text-slate">
          <span>Billing Amount:</span>
          <span className="text-ink font-bold text-base">₦5,000 / month</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-mono">
          {errorMessage}
        </div>
      )}

      {statusMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 font-mono text-center">
          {statusMessage}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handlePaystackPayment}
          disabled={processing}
          className="w-full py-3 bg-venous text-white font-bold rounded hover:bg-venousDark transition disabled:opacity-50 text-sm"
        >
          {processing ? 'Processing...' : 'Subscribe for ₦5,000 / Month'}
        </button>

        <div className="text-center">
          <Link to={subjectSlug ? `/subjects/${subjectSlug}` : '/subjects'} className="text-xs text-slate hover:underline">
            Cancel and return
          </Link>
        </div>
      </div>
    </div>
  )
}
