import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSubjectBySlug, getTopicBySlug, getLessonsByTopic } from '../lib/content'
import { supabase } from '../lib/supabase'

export default function TopicPage() {
  const { subjectSlug, topicSlug } = useParams()
  const [subject, setSubject] = useState(null)
  const [topic, setTopic] = useState(null)
  const [lessons, setLessons] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const subj = await getSubjectBySlug(subjectSlug)
        const top = await getTopicBySlug(subj.id, topicSlug)
        const lsns = await getLessonsByTopic(top.id)

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
          {quizzes.map(quiz => (
            <div key={quiz.id} className="index-card p-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">{quiz.title}</h3>
                <p className="text-xs text-slate">⏱ {quiz.time_limit_minutes} Mins</p>
              </div>
              <Link
                to={`/quiz/${quiz.id}`}
                className="btn-primary text-sm py-2 px-4"
              >
                Start Quiz
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
