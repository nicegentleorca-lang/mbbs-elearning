import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function QuizHistory() {
  const [historyList, setHistoryList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes (
            title,
            time_limit_minutes,
            topics ( name, subjects ( name ) )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setHistoryList(data || [])
    } catch (err) {
      console.error('Error fetching quiz history:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6 text-center font-mono text-slate">Loading history...</div>

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="border-b border-paperDim pb-4">
        <span className="specimen-label mb-1 block w-fit">Your Activity</span>
        <h1 className="font-display text-3xl font-bold text-ink">Quiz History</h1>
      </div>

      {historyList.length === 0 ? (
        <div className="p-8 border border-paperDim rounded-card text-center text-slate">
          You haven't attempted any quizzes yet.
        </div>
      ) : (
        <div className="space-y-3">
          {historyList.map(att => (
            <div key={att.id} className="index-card p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-slate uppercase">
                  {att.quizzes?.topics?.subjects?.name || 'Subject'}
                </span>
                <h3 className="font-display font-semibold text-ink">{att.quizzes?.title || 'Topic Quiz'}</h3>
                <p className="text-xs text-slate">
                  Attempted on {new Date(att.updated_at || att.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-600">{att.score} / {att.total_questions}</p>
                  <p className="text-xs font-mono text-slate">{att.percentage}% Score</p>
                </div>
                <Link to={`/quiz/${attempt.quiz_id}?attemptId=${attempt.id}`} className="btn-primary text-xs py-2 px-3"
>
  Review
</Link>
                
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
