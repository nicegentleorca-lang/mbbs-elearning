import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSubjectBySlug, getTopicsBySubject, hasPurchasedSubject } from '../lib/content'
import { useAuth } from '../contexts/AuthContext'

export default function SubjectPage() {
  const { subjectSlug } = useParams()
  const { user } = useAuth()
  const [subject, setSubject] = useState(null)
  const [topics, setTopics] = useState([])
  const [owned, setOwned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const subj = await getSubjectBySlug(subjectSlug)
        if (cancelled) return
        setSubject(subj)
        const [tps, has] = await Promise.all([
          getTopicsBySubject(subj.id),
          user ? hasPurchasedSubject(user.id, subj.id) : Promise.resolve(false)
        ])
        if (cancelled) return
        setTopics(tps)
        setOwned(has)
      } catch (err) {
        if (!cancelled) setError('Could not load this subject.')
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [subjectSlug, user])

  if (loading) return <p className="text-slate font-mono text-sm">Loading…</p>
  if (error) return <p className="text-vital">{error}</p>

  return (
    <div>
      <span className="specimen-label mb-3 block w-fit">{subject.name}</span>
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl font-semibold">{subject.name}</h1>
        {!owned && (
          <Link to={`/subjects/${subjectSlug}/unlock`} className="btn-primary whitespace-nowrap">
            Unlock full notes
          </Link>
        )}
      </div>
      {subject.description && <p className="text-slate mb-6">{subject.description}</p>}

      <div className="space-y-3">
        {topics.map(topic => (
          <Link
            key={topic.id}
            to={`/subjects/${subjectSlug}/${topic.slug}`}
            className="index-card p-4 flex items-center justify-between"
          >
            <span className="font-display text-lg">{topic.name}</span>
            <span className="text-slate-light text-sm font-mono">→</span>
          </Link>
        ))}
        {topics.length === 0 && (
          <p className="text-slate text-sm">No topics added yet — check back soon.</p>
        )}
      </div>
    </div>
  )
                    }
