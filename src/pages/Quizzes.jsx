import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getUserPurchases } from '../lib/content'

export default function Quizzes() {
  const { user, isAdmin } = useAuth()
  const [quizzes, setQuizzes] = useState([])
  const [attempts, setAttempts] = useState({})
  const [userPurchases, setUserPurchases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    try {
      const { data: qData, error: qErr } = await supabase
        .from('quizzes')
        .select(`
          *,
          topics (
            id,
            name,
            slug,
            subject_id,
            subjects ( id, name, slug )
          )
        `)
        .order('created_at', { ascending: false })

      if (qErr) throw qErr
      setQuizzes(qData || [])

      if (user) {
        const [attRes, purchases] = await Promise.all([
          supabase
            .from('quiz_attempts')
            .select('quiz_id, score, total_questions')
            .eq('user_id', user.id),
          getUserPurchases(user.id)
        ])

        const attemptMap = {}
        attRes.data?.forEach(a => {
          attemptMap[a.quiz_id] = a
        })
        setAttempts(attemptMap)
        setUserPurchases(purchases || [])
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
        <h1 className="font-display text-3xl font-bold text-ink">Past Questions</h1>
      </div>

      {quizzes.length === 0 ? (
        <div className="p-8 border border-paperDim rounded-card text-center text-slate bg-white shadow-sm">
          No quizzes published yet. Check back soon!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {quizzes.map(quiz => {
            const attempt = attempts[quiz.id]
            const subject = quiz.topics?.subjects
            const subjectName = subject?.name || 'General'
            const subjectSlug = subject?.slug
            const subjectId = subject?.id || quiz.topics?.subject_id
            const topicName = quiz.topics?.name || 'Topic'

            const isPremium = quiz.is_premium !== false
            const hasAccess = isAdmin || !isPremium || (subjectId && userPurchases.includes(subjectId))

            return (
              <div key={quiz.id} className="index-card p-5 flex flex-col justify-between space-y-4 bg-white border border-paperDim rounded-card shadow-sm hover:border-venous/40 transition">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate mb-2">
                    <span className="uppercase text-venous font-bold">{subjectName}</span>
                    <div className="flex items-center gap-2">
                      {!hasAccess && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                          🔒 Locked
                        </span>
                      )}
                      <span className="font-medium">⏱ {quiz.time_limit_minutes} Mins</span>
                    </div>
                  </div>
                  <h2 className="font-display text-lg font-semibold text-ink leading-snug">{quiz.title}</h2>
                  <p className="text-xs text-slate mt-1 font-medium">{topicName}</p>
                </div>

                <div>
                  {!hasAccess ? (
                    <Link
                      to={subjectSlug ? `/subjects/${subjectSlug}/unlock` : '#'}
                      className="btn-primary block text-center text-sm py-2 bg-amber-600 hover:bg-amber-700 text-white tracking-wide"
                    >
                      🔒 Unlock Subject
                    </Link>
                  ) : attempt ? (
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
