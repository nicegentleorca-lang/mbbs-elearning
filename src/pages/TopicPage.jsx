import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSubjectBySlug, getTopicBySlug, getLessonsByTopic, hasPurchasedSubject } from '../lib/content'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function TopicPage() {
  const { subjectSlug, topicSlug } = useParams()
  const { user, isAdmin } = useAuth()
  const [subject, setSubject] = useState(null)
  const [topic, setTopic] = useState(null)
  const [lessons, setLessons] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [owned, setOwned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const subj = await getSubjectBySlug(subjectSlug)
        const top = await getTopicBySlug(subj.id, topicSlug)
        const lsns = await getLessonsByTopic(top.id)
        const has = await hasPurchasedSubject(user?.id, subj.id, isAdmin)

        // Fetch quizzes connected to this topic
        const { data: quizData } = await supabase
          .from('quizzes')
          .select('*')
          .eq('topic_id', top.id)

        if (cancelled) return
        setSubject(subj)
        setTopic(top)
        setLessons(lsns)
        setQuizzes(quizData || [])
        setOwned(has)
      } catch (err) {
        if (!cancelled) setError('Could not load this topic.')
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [subjectSlug, topicSlug, user, isAdmin])

  if (loading) return <p className="text-slate font-mono text-sm">Loading…</p>
  if (error) return <p className="text-vital">{error}</p>

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/subjects/${subjectSlug}`} className="text-venous text-sm hover:underline">
          ← {subject.name}
        </Link>
        <span className="specimen-label mt-4 mb-3 block w-fit">{subject.name} · Topic</span>
        <h1 className="font-display text-3xl font-semibold">{topic.name}</h1>
      </div>

      {/* Lessons List */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-slate tracking-wider">Lessons</h2>
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

      {/* Topic Quizzes */}
      {quizzes.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-paperDim">
          <h2 className="text-xs font-mono uppercase text-slate tracking-wider">Practice Quiz</h2>
          {quizzes.map(quiz => {
            const isPremium = quiz.is_premium !== false
            const hasAccess = isAdmin || !isPremium || owned

            return (
              <div key={quiz.id} className="index-card p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{quiz.title}</h3>
                    {!hasAccess && <span className="text-xs">🔒</span>}
                  </div>
                  <p className="text-xs text-slate">⏱ {quiz.time_limit_minutes} Mins</p>
                </div>
                {hasAccess ? (
                  <Link
                    to={`/quiz/${quiz.id}`}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    Start Quiz
                  </Link>
                ) : (
                  <Link
                    to={`/subjects/${subjectSlug}/unlock`}
                    className="btn-primary text-sm py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Unlock Quiz
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
