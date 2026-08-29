import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getSubjectBySlug, hasPurchasedSubject } from '../lib/content'

export default function UnlockSubject() {
  const { subjectSlug } = useParams()
  const navigate = useNavigate()
  const { user, session, isAdmin } = useAuth()

  const [subject, setSubject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    // Dynamically inject Paystack inline script
    const scriptId = 'paystack-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.async = true
      document.body.appendChild(script)
    }

    loadSubjectData()
  }, [subjectSlug, user])

  async function loadSubjectData() {
    setLoading(true)
    setErrorMessage('')
    try {
      const subData = await getSubjectBySlug(subjectSlug)
      if (!subData) {
        setErrorMessage('Subject not found.')
        return
      }
      setSubject(subData)

      // Redirect if user already owns active subscription or is admin
      if (user) {
        const alreadyUnlocked = await hasPurchasedSubject(user.id, subData.id, isAdmin)
        if (alreadyUnlocked) {
          navigate(`/subjects/${subjectSlug}`, { replace: true })
          return
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load subject details.')
    } finally {
      setLoading(false)
    }
  }

  function handlePaystackPayment() {
    if (!user || !session) {
      navigate('/login', { state: { from: `/subjects/${subjectSlug}/unlock` } })
      return
    }

    const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
    if (!paystackPublicKey) {
      setErrorMessage('Paystack public key is missing in application settings.')
      return
    }

    if (!window.PaystackPop) {
      setErrorMessage('Payment gateway is still initializing. Please try again in a few seconds.')
      return
    }

    setProcessing(true)
    setErrorMessage('')
    setStatusMessage('Opening secure payment gateway...')

    const amountInKobo = Math.round(Number(subject.price_ngn) * 100)
    const reference = `DELTOID_SUB_${subject.id}_${Date.now()}`

    const handler = window.PaystackPop.setup({
      key: paystackPublicKey,
      email: user.email,
      amount: amountInKobo,
      currency: 'NGN',
      ref: reference,
      metadata: {
        subject_id: subject.id,
        user_id: user.id
      },
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
    setStatusMessage('Payment received! Verifying subscription with server...')
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          reference,
          subject_id: subject.id
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify transaction with backend.')
      }

      setStatusMessage('Access granted! Redirecting to subject...')
      setTimeout(() => {
        navigate(`/subjects/${subjectSlug}`, { replace: true })
      }, 1200)
    } catch (err) {
      setErrorMessage(err.message || 'Payment verification failed. Please contact support.')
      setProcessing(false)
      setStatusMessage('')
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 text-center font-mono text-xs text-slate">
        Loading checkout details...
      </div>
    )
  }

  if (errorMessage && !subject) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white border border-paperDim rounded-card text-center space-y-4">
        <p className="text-xs text-red-600 font-mono">{errorMessage}</p>
        <Link to="/subjects" className="btn-secondary inline-block">
          ← Back to Catalog
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white border border-paperDim rounded-card shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <span className="specimen-label inline-block">Monthly Subscription Access</span>
        <h1 className="font-display text-2xl font-bold text-ink">Unlock {subject.name}</h1>
        <p className="text-xs text-slate">
          Get 30 days of complete access to all lessons, interactive diagrams, and quizzes under this subject.
        </p>
      </div>

      <div className="bg-paper p-4 rounded border border-paperDim space-y-2 font-mono text-xs">
        <div className="flex justify-between text-slate">
          <span>Subscription Duration:</span>
          <span className="text-ink font-bold">30 Days (Monthly)</span>
        </div>
        <div className="flex justify-between text-slate">
          <span>Billing Amount:</span>
          <span className="text-ink font-bold text-base">₦{Number(subject.price_ngn).toLocaleString()}</span>
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
          {processing ? 'Processing Payment...' : `Pay ₦${Number(subject.price_ngn).toLocaleString()} with Paystack`}
        </button>

        <div className="text-center">
          <Link to={`/subjects/${subjectSlug}`} className="text-xs text-slate hover:underline">
            Cancel and return to subject
          </Link>
        </div>
      </div>
    </div>
  )
}
