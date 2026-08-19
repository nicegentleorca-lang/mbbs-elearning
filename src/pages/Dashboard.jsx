import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSubjects, hasPurchasedSubject } from '../lib/content'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState([])
  const [purchasedIds, setPurchasedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const subs = await getSubjects()
        if (cancelled) return
        setSubjects(subs)

        if (user) {
          const results = await Promise.all(
            subs.map(s => hasPurchasedSubject(user.id, s.id).then(has => [s.id, has]))
          )
          if (!cancelled) {
            setPurchasedIds(new Set(results.filter(([, has]) => has).map(([id]) => id)))
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  if (loading) return <p className="text-slate font-mono text-sm">Loading subjects…</p>

  if (subjects.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="specimen-label mb-4 block w-fit mx-auto">Nothing here yet</span>
        <p className="text-slate">Subjects will appear here once they're added.</p>
      </div>
    )
  }

  return (
    <div>
      <span className="specimen-label mb-3 block w-fit">Preclinical Years</span>
      <h1 className="font-display text-3xl font-semibold mb-6">Subjects</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {subjects.map(subject => (
          <Link key={subject.id} to={`/subjects/${subject.slug}`} className="index-card p-5 block">
            <div className="flex items-start justify-between">
              <h2 className="font-display text-xl font-semibold text-ink">{subject.name}</h2>
              {purchasedIds.has(subject.id) && (
                <span className="text-xs font-mono uppercase tracking-wide text-gold border border-gold rounded-card px-2 py-0.5">
                  Owned
                </span>
              )}
            </div>
            {subject.description && (
              <p className="text-slate text-sm mt-2">{subject.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
