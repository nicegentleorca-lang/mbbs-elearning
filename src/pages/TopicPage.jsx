import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSubjectBySlug, getTopicBySlug, getLessonsByTopic } from '../lib/content'

export default function TopicPage() {
  const { subjectSlug, topicSlug } = useParams()
  const [subject, setSubject] = useState(null)
  const [topic, setTopic] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const subj = await getSubjectBySlug(subjectSlug)
        const top = await getTopicBySlug(subj.id, topicSlug)
        const lsns = await getLessonsByTopic(top.id)
        if (cancelled) return
        setSubject(subj)
        setTopic(top)
        setLessons(lsns)
      } catch (err) {
        if (!cancelled) setError('Could not load this topic.')
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [subjectSlug, topicSlug])

  if (loading) return <p className="text-slate font-mono text-sm">Loading…</p>
  if (error) return <p className="text-vital">{error}</p>

  return (
    <div>
      <Link to={`/subjects/${subjectSlug}`} className="text-venous text-sm hover:underline">
        ← {subject.name}
      </Link>
      <span className="specimen-label mt-4 mb-3 block w-fit">{subject.name} · Topic</span>
      <h1 className="font-display text-3xl font-semibold mb-6">{topic.name}</h1>

      <div className="space-y-3">
        {lessons.map(lesson => (
          <Link
            key={lesson.id}
            to={`/subjects/${subjectSlug}/${topicSlug}/${lesson.slug}`}
            className="index-card p-4 block"
          >
            <span className="font-display text-lg">{lesson.title}</span>
          </Link>
        ))}
        {lessons.length === 0 && (
          <p className="text-slate text-sm">No lessons published yet — check back soon.</p>
        )}
      </div>
    </div>
  )
}
