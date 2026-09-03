import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSubjectBySlug, getTopicBySlug, getLessonBySlug, hasPurchasedSubject } from '../lib/content'
import { useAuth } from '../contexts/AuthContext'

export default function LessonPage() {
  const { subjectSlug, topicSlug, lessonSlug } = useParams()
  const { user, isAdmin } = useAuth()
  const [subject, setSubject] = useState(null)
  const [topic, setTopic] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [owned, setOwned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const subj = await getSubjectBySlug(subjectSlug)
        const top = await getTopicBySlug(subj.id, topicSlug)
        const lsn = await getLessonBySlug(top.id, lessonSlug)
        const has = await hasPurchasedSubject(user?.id, subj.id, isAdmin)
        if (cancelled) return
        setSubject(subj)
        setTopic(top)
        setLesson(lsn)
        setOwned(has)
      } catch (err) {
        if (!cancelled) setError('Could not load this lesson.')
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [subjectSlug, topicSlug, lessonSlug, user, isAdmin])

  if (loading) return <p className="text-slate font-mono text-sm">Loadingâ€¦</p>
  if (error) return <p className="text-vital">{error}</p>

  return (
    <div>
      <Link to={`/subjects/${subjectSlug}/${topicSlug}`} className="text-venous text-sm hover:underline">
        â† {topic.name}
      </Link>
      <span className="specimen-label mt-4 mb-3 block w-fit">{subject.name} Â· {topic.name}</span>
      <h1 className="font-display text-3xl font-semibold mb-6">{lesson.title}</h1>

      <div
        className="prose max-w-none font-display text-lg leading-relaxed mb-4"
        dangerouslySetInnerHTML={{ __html: lesson.preview_html || '' }}
      />

      {owned ? (
        <div
          className="prose max-w-none font-display text-lg leading-relaxed"
          dangerouslySetInnerHTML={{ __html: lesson.content_html || '' }}
        />
      ) : (
        <div className="relative mt-2">
          <div
            className="prose max-w-none font-display text-lg leading-relaxed paywall-blur select-none"
            dangerouslySetInnerHTML={{ __html: lesson.content_html || '' }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-start justify-center pt-12 bg-gradient-to-b from-transparent to-paper">
            <div className="index-card px-6 py-5 text-center max-w-xs">
              <p className="font-display text-lg font-semibold mb-2">Unlock {subject.name}</p>
              <p className="text-slate text-sm mb-4">
                One-time payment. Full notes for every topic in {subject.name}, forever.
              </p>
              <Link to={`/subjects/${subjectSlug}/unlock`} className="btn-primary inline-block">
                See price
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
