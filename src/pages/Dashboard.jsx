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

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-venous border-t-transparent rounded-full animate-spin" />
        <p className="text-slate font-mono text-xs tracking-wider">LOADING CURRICULUM…</p>
      </div>
    )
  }

  if (subjects.length === 0) {
    return (
      <div className="text-center py-20 bg-white/50 border border-paperDim rounded-card">
        <span className="specimen-label mb-4 inline-block">SYSTEM EMPTY</span>
        <p className="text-slate text-sm">No subjects available right now. Check back soon!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <span className="specimen-label mb-2 block w-fit">Welcome, Medic!🩺</span>
        <h1 className="font-display text-3xl font-bold text-ink">Subjects</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {subjects.map(subject => {
          const isOwned = purchasedIds.has(subject.id)
          return (
            <Link 
              key={subject.id} 
              to={`/subjects/${subject.slug}`} 
              className="index-card p-6 block group"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-ink group-hover:text-venous transition-colors">
                  {subject.name}
                </h2>
                {isOwned && (
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gold bg-gold/10 border border-gold/30 rounded px-2 py-0.5 font-semibold shrink-0">
                    Unlocked
                  </span>
                )}
              </div>
              {subject.description && (
                <p className="text-slate text-sm mt-2.5 leading-relaxed">
                  {subject.description}
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
