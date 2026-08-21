import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function QuizView() {
  const { quizId } = useParams()
  const canvasRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [userAnswers, setUserAnswers] = useState({})
  
  // Pagination & Navigation Grid State
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showGrid, setShowGrid] = useState(false)

  const [timeLeft, setTimeLeft] = useState(0)
  const [quizStarted, setQuizStarted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [score, setScore] = useState(0)
  const [rankBadge, setRankBadge] = useState({ text: '', desc: '' })
  const [alreadyAttempted, setAlreadyAttempted] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [dailyLimitReached, setDailyLimitReached] = useState(false)

  useEffect(() => {
    loadQuizData()
  }, [quizId])

  useEffect(() => {
    if (!quizStarted || submitted || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [quizStarted, submitted, timeLeft])

  async function loadQuizData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // Fetch Quiz Meta
      const { data: qData, error: qErr } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single()

      if (qErr) throw qErr
      setQuiz(qData)
      setTimeLeft(qData.time_limit_minutes * 60)

      // Fetch Questions
      const { data: questData, error: questErr } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('sort_order', { ascending: true })

      if (questErr) throw questErr
      setQuestions(questData || [])

      if (user) {
        // Daily Cap Check (300 Questions Max / Day)
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)

        const { data: todayAttempts } = await supabase
          .from('quiz_attempts')
          .select('total_questions')
          .eq('user_id', user.id)
          .gte('created_at', startOfToday.toISOString())

        const totalToday = todayAttempts?.reduce((sum, a) => sum + (a.total_questions || 0), 0) || 0
        if (totalToday >= 300) {
          setDailyLimitReached(true)
        }

        // Fetch Existing Attempt
        const { data: attemptData } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', quizId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (attemptData) {
          setAlreadyAttempted(true)
          setScore(attemptData.score)
          if (attemptData.answers) {
            setUserAnswers(attemptData.answers)
          }
          setSubmitted(true)
          await computeRank(quizId, attemptData.score, questData.length)
        }
      }
    } catch (err) {
      console.error('Error loading quiz:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectAnswer(questionId, option) {
    if (submitted) return
    setUserAnswers(prev => ({ ...prev, [questionId]: option }))
  }

  async function handleAutoSubmit() {
    alert('Time is up! Submitting your answers automatically.')
    await handleSubmit()
  }

  async function handleSubmit() {
    if (submitted || submitting) return
    setSubmitting(true)

    let calculatedScore = 0
    questions.forEach(q => {
      if (userAnswers[q.id] === q.correct_answer) {
        calculatedScore += 1
      }
    })

    const totalQuestions = questions.length
    const percentage = Number(((calculatedScore / totalQuestions) * 100).toFixed(2))

    try {
      if (currentUser) {
        await supabase
          .from('quiz_attempts')
          .upsert([{
            quiz_id: quizId,
            user_id: currentUser.id,
            score: calculatedScore,
            total_questions: totalQuestions,
            percentage: percentage,
            answers: userAnswers
          }], { onConflict: 'quiz_id,user_id' })
      }

      setScore(calculatedScore)
      setSubmitted(true)
      setShowGrid(false)
      await computeRank(quizId, calculatedScore, totalQuestions)
    } catch (err) {
      alert('Submission failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function computeRank(quizId, userScore, totalQuestions) {
    const pct = Math.round((userScore / totalQuestions) * 100)
    
    const { data: allAttempts } = await supabase
      .from('quiz_attempts')
      .select('score')
      .eq('quiz_id', quizId)

    if (!allAttempts || allAttempts.length < 5) {
      if (pct >= 90) setRankBadge({ text: 'Top 5%', desc: 'Outstanding performance!' })
      else if (pct >= 66) setRankBadge({ text: 'Top 20%', desc: 'Great job! Strong mastery.' })
      else if (pct >= 50) setRankBadge({ text: 'Top 50%', desc: 'Good effort. Review weaker topics.' })
      else setRankBadge({ text: 'Needs Work', desc: 'Review topic notes and try again!' })
      return
    }

    const lower = allAttempts.filter(a => a.score < userScore).length
    const equal = allAttempts.filter(a => a.score === userScore).length
    const percentile = Math.round(((lower + 0.5 * equal) / allAttempts.length) * 100)
    const topRank = Math.max(1, 100 - percentile)

    setRankBadge({
      text: `Top ${topRank}%`,
      desc: `Scored better than ${percentile}% of students on this quiz.`
    })
  }

  function handleShareCard() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#0F172A'
    ctx.fillRect(0, 0, 600, 600)
    ctx.fillStyle = '#22C55E'
    ctx.fillRect(40, 40, 520, 12)

    ctx.fillStyle = '#F8FAFC'
    ctx.font = 'bold 28px sans-serif'
    ctx.fillText('PRECLINICAL NOTES', 40, 90)

    ctx.fillStyle = '#94A3B8'
    ctx.font = '18px sans-serif'
    ctx.fillText(quiz?.title || 'Topic Quiz', 40, 125)

    ctx.fillStyle = '#1E293B'
    ctx.beginPath()
    ctx.roundRect(40, 160, 520, 280, 16)
    ctx.fill()

    ctx.fillStyle = '#38BDF8'
    ctx.font = 'bold 64px sans-serif'
    ctx.fillText(rankBadge.text, 70, 250)

    ctx.fillStyle = '#F8FAFC'
    ctx.font = '20px sans-serif'
    ctx.fillText(rankBadge.desc, 70, 300)

    ctx.fillStyle = '#94A3B8'
    ctx.font = '20px sans-serif'
    ctx.fillText(`Score: ${score} / ${questions.length} (${Math.round((score / questions.length) * 100)}%)`, 70, 360)

    ctx.fillStyle = '#64748B'
    ctx.font = '16px monospace'
    ctx.fillText('preclinicalnotes.app • Active Recall Practice', 40, 520)

    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'quiz-rank-card.png', { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: 'My Quiz Score',
          text: `I scored ${score}/${questions.length} on ${quiz?.title}!`
        }).catch(() => {})
      } else {
        const link = document.createElement('a')
        link.download = `quiz-rank-${quizId}.png`
        link.href = canvas.toDataURL()
        link.click()
      }
    })
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  if (loading) return <div className="p-8 text-center font-mono text-slate">Loading practice session...</div>

  // Daily 300 Questions Soft Cap Screen
  if (dailyLimitReached && !alreadyAttempted && !submitted) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-6">
        <span className="specimen-label">Daily Goal Reached</span>
        <h1 className="text-2xl font-display font-bold text-ink">300 Questions Complete!</h1>
        <p className="text-slate text-sm">
          You've hit your daily practice ceiling. Take time to digest today's learning and come back tomorrow for fresh sessions.
        </p>
        <Link to="/quizzes" className="btn-primary inline-block py-2.5 px-6">
          Back to Quizzes
        </Link>
      </div>
    )
  }

  // Quiz Intro Screen
  if (!quizStarted && !submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-6">
        <span className="specimen-label">Timed Topic Quiz</span>
        <h1 className="text-3xl font-display font-bold text-ink">{quiz?.title}</h1>
        <p className="text-slate text-sm">{quiz?.description}</p>

        <div className="bg-paper p-4 rounded-card border border-paperDim flex justify-around text-center">
          <div>
            <p className="text-xs text-slate font-mono uppercase">Questions</p>
            <p className="text-xl font-bold text-ink">{questions.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate font-mono uppercase">Time Allowed</p>
            <p className="text-xl font-bold text-ink">{quiz?.time_limit_minutes} Mins</p>
          </div>
          <div>
            <p className="text-xs text-slate font-mono uppercase">Mode</p>
            <p className="text-xl font-bold text-venous">Paginated</p>
          </div>
        </div>

        <button
          onClick={() => setQuizStarted(true)}
          className="w-full py-3 bg-venous text-white rounded-card font-medium hover:bg-venousDark transition shadow-md"
        >
          Begin Practice Session
        </button>
      </div>
    )
  }

  // Review Screen (All Questions Displayed for Active Recall Review)
  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="bg-slate-900 text-white p-6 rounded-card text-center space-y-4 shadow-lg">
          {alreadyAttempted && (
            <span className="bg-amber-500/20 text-amber-300 text-xs font-mono px-3 py-1 rounded-full border border-amber-500/30">
              Saved Attempt
            </span>
          )}
          <h1 className="text-2xl font-display font-bold">{quiz?.title} Results</h1>
          
          <div className="flex justify-center items-center gap-6 my-4">
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="text-xs text-slate-400 font-mono">YOUR SCORE</p>
              <p className="text-3xl font-bold text-emerald-400">{score} / {questions.length}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="text-xs text-slate-400 font-mono">RANK TIER</p>
              <p className="text-3xl font-bold text-sky-400">{rankBadge.text}</p>
            </div>
          </div>

          <p className="text-sm text-slate-300">{rankBadge.desc}</p>

          <button
            onClick={handleShareCard}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-full text-sm transition flex items-center justify-center gap-2 mx-auto"
          >
            <span>📲 Share Stats Card</span>
          </button>
        </div>

        <canvas ref={canvasRef} width="600" height="600" className="hidden" />

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-ink">Answer Review & Explanations</h2>
          {questions.map((q, idx) => {
            const userChoice = userAnswers[q.id]
            const hasChosen = userChoice !== undefined
            const isCorrect = userChoice === q.correct_answer

            return (
              <div
                key={q.id}
                className={`p-5 rounded-card border ${
                  hasChosen
                    ? isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'
                    : 'bg-white border-paperDim'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate">Question #{idx + 1}</span>
                  {hasChosen && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
                    }`}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  )}
                </div>

                <p className="font-medium text-ink mb-4 whitespace-pre-line">{q.prompt}</p>

                <div className="space-y-2 mb-4">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = userChoice === opt
                    const isCorrectOpt = q.correct_answer === opt

                    let style = "border-paperDim bg-white text-ink"
                    if (isCorrectOpt) style = "border-emerald-500 bg-emerald-100/80 font-semibold text-emerald-900"
                    else if (isSelected && !isCorrect) style = "border-red-500 bg-red-100/80 text-red-900"

                    return (
                      <div key={oIdx} className={`p-2.5 rounded text-xs md:text-sm border ${style}`}>
                        {opt}
                      </div>
                    )
                  })}
                </div>

                {q.explanation && (
                  <div className="bg-white p-3 rounded border border-paperDim text-xs text-slate">
                    <strong className="text-ink">Explanation: </strong> {q.explanation}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Active Quiz Mode (1 Question at a Time)
  const currentQ = questions[currentIndex]
  const answeredCount = Object.keys(userAnswers).length

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 relative">
      {/* Top Header Bar */}
      <div className="bg-white/95 backdrop-blur border border-paperDim p-4 rounded-card flex items-center justify-between shadow-sm">
        <div>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="text-xs font-mono font-bold text-venous hover:underline flex items-center gap-1"
          >
            📊 Grid ({answeredCount}/{questions.length})
          </button>
          <p className="text-xs text-slate font-medium">Question {currentIndex + 1} of {questions.length}</p>
        </div>

        <div className={`font-mono font-bold text-sm px-3 py-1 rounded ${
          timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-paper text-ink'
        }`}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {/* Slide-out / Collapsible Navigation Grid */}
      {showGrid && (
        <div className="bg-white border border-paperDim p-4 rounded-card space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate uppercase">Question Navigator</span>
            <button onClick={() => setShowGrid(false)} className="text-xs text-slate hover:text-ink">Close ✕</button>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = userAnswers[q.id] !== undefined
              const isCurrent = idx === currentIndex

              let btnStyle = "bg-paper text-slate border-paperDim"
              if (isAnswered) btnStyle = "bg-venous/20 text-venous border-venous/40 font-bold"
              if (isCurrent) btnStyle += " ring-2 ring-venous border-venous"

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(idx)
                    setShowGrid(false)
                  }}
                  className={`p-2 rounded text-xs font-mono border transition ${btnStyle}`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Single Question Display Card */}
      {currentQ && (
        <div className="bg-white p-6 border border-paperDim rounded-card space-y-5 shadow-sm min-h-[300px] flex flex-col justify-between">
          <div className="space-y-4">
            <span className="font-mono text-xs text-slate font-bold">Item #{currentIndex + 1}</span>
            <p className="font-medium text-ink text-base md:text-lg whitespace-pre-line">{currentQ.prompt}</p>

            <div className="space-y-2.5">
              {currentQ.options.map((opt, oIdx) => {
                const isSelected = userAnswers[currentQ.id] === opt
                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSelectAnswer(currentQ.id, opt)}
                    className={`w-full text-left p-3.5 rounded-card text-xs md:text-sm border transition ${
                      isSelected
                        ? 'border-venous bg-venous/10 font-semibold text-ink shadow-sm'
                        : 'border-paperDim hover:bg-paper text-ink'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bottom Pagination Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-paperDim mt-6">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-xs font-mono font-bold bg-paper text-slate rounded border border-paperDim hover:bg-paperDim disabled:opacity-30 transition"
            >
              ← Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2 text-xs font-mono font-bold bg-venous text-white rounded hover:bg-venousDark transition shadow-sm"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 text-xs font-mono font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Finish & Submit'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
                 }
            
