import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [attempts, setAttempts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: qData, error: qErr } = await supabase
        .from('quizzes')
        .select(`
          *,
          topics (
            id,
            name,
            subjects ( id, name )
          )
        `)
        .order('created_at', { ascending: false })

      if (qErr) throw qErr
      setQuizzes(qData || [])

      if (user) {
        const { data: attData } = await supabase
          .from('quiz_attempts')
          .select('quiz_id, score, total_questions')
          .eq('user_id', user.id)

        const attemptMap = {}
        attData?.forEach(a => {
          attemptMap[a.quiz_id] = a
        })
        setAttempts(attemptMap)
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-venous border-t-transparent rounded-full animate-spin" />
        <p className="text-slate font-mono text-xs tracking-wider uppercase">Loading Quizzes…</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="border-b border-paperDim pb-4">
        <span className="specimen-label mb-1 block w-fit">Practice</span>
        <h1 className="font-display text-3xl font-bold text-ink">Topic Quizzes</h1>
      </div>

      {quizzes.length === 0 ? (
        <div className="p-8 border border-paperDim rounded-card text-center text-slate bg-white shadow-sm">
          No quizzes published yet. Check back soon!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {quizzes.map(quiz => {
            const attempt = attempts[quiz.id]
            const subjectName = quiz.topics?.subjects?.name || 'General'
            const topicName = quiz.topics?.name || 'Topic'

            return (
              <div key={quiz.id} className="index-card p-5 flex flex-col justify-between space-y-4 bg-white border border-paperDim rounded-card shadow-sm hover:border-venous/40 transition">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate mb-2">
                    <span className="uppercase text-venous font-bold">{subjectName}</span>
                    <span className="font-medium">⏱ {quiz.time_limit_minutes} Mins</span>
                  </div>
                  <h2 className="font-display text-lg font-semibold text-ink leading-snug">{quiz.title}</h2>
                  <p className="text-xs text-slate mt-1 font-medium">{topicName}</p>
                </div>

                <div>
                  {attempt ? (
                    <div className="flex items-center justify-between bg-paper p-3 rounded-card border border-paperDim">
                      <span className="text-xs font-mono text-emerald-700 font-bold">Completed</span>
                      <Link
                        to={`/quiz/${quiz.id}`}
                        className="text-xs font-bold font-mono text-venous hover:underline"
                      >
                        Review ({attempt.score}/{attempt.total_questions}) →
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to={`/quiz/${quiz.id}`}
                      className="btn-primary block text-center text-sm py-2 tracking-wide"
                    >
                      Start Quiz
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
