import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSubjectBySlug, getTopicBySlug, getLessonBySlug } from '../lib/content'
import { useAuth } from '../contexts/AuthContext'

export default function LessonPage() {
  const { subjectSlug, topicSlug, lessonSlug } = useParams()
  const { user } = useAuth()
  const [subject, setSubject] = useState(null)
  const [topic, setTopic] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const subj = await getSubjectBySlug(subjectSlug)
        const top = await getTopicBySlug(subj.id, topicSlug)
        // content_html only arrives populated if the caller is
        // entitled — that check runs server-side inside the
        // get_lesson_gated() Postgres function. `lesson.owned`
        // reflects the same check, computed in the same query.
        const lsn = await getLessonBySlug(top.id, lessonSlug)
        if (cancelled) return
        setSubject(subj)
        setTopic(top)
        setLesson(lsn)
      } catch (err) {
        if (!cancelled) setError('Could not load this lesson.')
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [subjectSlug, topicSlug, lessonSlug, user])

  if (loading) return <p className="text-slate font-mono text-sm">Loading…</p>
  if (error) return <p className="text-vital">{error}</p>

  return (
    <div>
      <Link to={`/subjects/${subjectSlug}/${topicSlug}`} className="text-venous text-sm hover:underline">
        ← {topic.name}
      </Link>
      <span className="specimen-label mt-4 mb-3 block w-fit">{subject.name} · {topic.name}</span>
      <h1 className="font-display text-3xl font-semibold mb-6">{lesson.title}</h1>

      <div
        className="prose max-w-none font-display text-lg leading-relaxed mb-4"
        dangerouslySetInnerHTML={{ __html: lesson.preview_html || '' }}
      />

      {lesson.owned ? (
        <div
          className="prose max-w-none font-display text-lg leading-relaxed"
          dangerouslySetInnerHTML={{ __html: lesson.content_html || '' }}
        />
      ) : (
        <div className="index-card px-6 py-5 text-center max-w-xs mt-2">
          <p className="font-display text-lg font-semibold mb-2">Unlock {subject.name}</p>
          <p className="text-slate text-sm mb-4">
            100% Access to All Quizzes and Crash Courses, monthly.
          </p>
          <Link to={`/subjects/${subjectSlug}/unlock`} className="btn-primary inline-block">
            See price
          </Link>
        </div>
      )}
    </div>
  )
}
