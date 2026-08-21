import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function QuizView() {
  const { quizId } = useParams()
  const canvasRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [userAnswers, setUserAnswers] = useState({})
  
  const [timeLeft, setTimeLeft] = useState(0)
  const [quizStarted, setQuizStarted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [score, setScore] = useState(0)
  const [rankBadge, setRankBadge] = useState({ text: '', desc: '' })
  const [alreadyAttempted, setAlreadyAttempted] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

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

      const { data: qData, error: qErr } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single()

      if (qErr) throw qErr
      setQuiz(qData)
      setTimeLeft(qData.time_limit_minutes * 60)

      const { data: questData, error: questErr } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('sort_order', { ascending: true })

      if (questErr) throw questErr
      setQuestions(questData || [])

      if (user) {
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
          .insert([{
            quiz_id: quizId,
            user_id: currentUser.id,
            score: calculatedScore,
            total_questions: totalQuestions,
            percentage: percentage,
            answers: userAnswers
          }])
      }

      setScore(calculatedScore)
      setSubmitted(true)
      await computeRank(quizId, calculatedScore, totalQuestions)
    } catch (err) {
      alert('Submission failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Fair ranking algorithm
  async function computeRank(quizId, userScore, totalQuestions) {
    const pct = Math.round((userScore / totalQuestions) * 100)
    
    const { data: allAttempts } = await supabase
      .from('quiz_attempts')
      .select('score')
      .eq('quiz_id', quizId)

    if (!allAttempts || allAttempts.length < 5) {
      if (pct >= 90) setRankBadge({ text: 'Top 5%', desc: 'Outstanding! Excellent performance.' })
      else if (pct >= 66) setRankBadge({ text: 'Top 20%', desc: 'Great job! Strong grasp of core concepts.' })
      else if (pct >= 50) setRankBadge({ text: 'Top 50%', desc: 'Good effort. A quick review will sharpen your knowledge.' })
      else setRankBadge({ text: 'Needs Work', desc: 'Review the topic materials and try again!' })
      return
    }

    const lower = allAttempts.filter(a => a.score < userScore).length
    const equal = allAttempts.filter(a => a.score === userScore).length
    const percentile = Math.round(((lower + 0.5 * equal) / allAttempts.length) * 100)
    const topRank = Math.max(1, 100 - percentile)

    setRankBadge({
      text: `Top ${topRank}%`,
      desc: `Scored better than ${percentile}% of medical students on this quiz.`
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
    ctx.fillText('MBBS ACADEMY', 40, 90)

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
    ctx.fillText('mbbs-elearning.app • Master MBBS Concepts', 40, 520)

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

  if (loading) return <div className="p-8 text-center font-mono text-slate">Loading quiz...</div>

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
            <p className="text-xs text-slate font-mono uppercase">Attempts</p>
            <p className="text-xl font-bold text-amber-600">1 Only</p>
          </div>
        </div>

        <button
          onClick={() => setQuizStarted(true)}
          className="w-full py-3 bg-venous text-white rounded-card font-medium hover:bg-venousDark transition shadow-md"
        >
          Begin Quiz
        </button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="bg-slate-900 text-white p-6 rounded-card text-center space-y-4 shadow-lg">
          {alreadyAttempted && (
            <span className="bg-amber-500/20 text-amber-300 text-xs font-mono px-3 py-1 rounded-full border border-amber-500/30">
              Completed Attempt
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

            let statusBadge = null
            if (hasChosen) {
              statusBadge = (
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
                }`}>
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              )
            }

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
                  {statusBadge}
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
                        {q.question_type === 'reason_assertion' ? `(${String.fromCharCode(65 + oIdx)}) ${opt}` : opt}
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

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="sticky top-2 z-10 bg-white/95 backdrop-blur border border-paperDim p-4 rounded-card flex items-center justify-between shadow-sm">
        <div>
          <h2 className="font-bold text-ink text-sm md:text-base">{quiz?.title}</h2>
          <p className="text-xs text-slate">{questions.length} Questions</p>
        </div>
        <div className={`font-mono font-bold text-lg px-3 py-1 rounded ${
          timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-paper text-ink'
        }`}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((q, qIdx) => (
          <div key={q.id} className="bg-white p-5 border border-paperDim rounded-card space-y-4 shadow-sm">
            <span className="font-mono text-xs text-slate font-bold">Question #{qIdx + 1}</span>
            <p className="font-medium text-ink text-sm md:text-base whitespace-pre-line">{q.prompt}</p>

            <div className="space-y-2">
              {q.options.map((opt, oIdx) => {
                const isSelected = userAnswers[q.id] === opt
                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSelectAnswer(q.id, opt)}
                    className={`w-full text-left p-3 rounded-card text-xs md:text-sm border transition ${
                      isSelected
                        ? 'border-venous bg-venous/10 font-medium text-ink'
                        : 'border-paperDim hover:bg-paper text-ink'
                    }`}
                  >
                    {q.question_type === 'reason_assertion' ? `(${String.fromCharCode(65 + oIdx)}) ${opt}` : opt}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 bg-venous text-white rounded-card font-bold hover:bg-venousDark transition disabled:opacity-50"
      >
        {submitting ? 'Submitting Answers...' : 'Submit Quiz'}
      </button>
    </div>
  )
                             }
              
