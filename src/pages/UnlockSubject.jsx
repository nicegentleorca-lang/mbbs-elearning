import { useParams, Link } from 'react-router-dom'

export default function UnlockSubject() {
  const { subjectSlug } = useParams()

  return (
    <div className="max-w-md mx-auto mt-8 text-center">
      <span className="specimen-label mb-4 block w-fit mx-auto">Coming soon</span>
      <h1 className="font-display text-2xl font-semibold mb-3">Payments aren't connected yet</h1>
      <p className="text-slate mb-6">
        This is where students will pay to unlock <strong>{subjectSlug}</strong> via Paystack.
        We're building this in the next stage.
      </p>
      <Link to={`/subjects/${subjectSlug}`} className="btn-secondary inline-block">
        ← Back to subject
      </Link>
    </div>
  )
}
