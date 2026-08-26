import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Helper function to shuffle questions (Fisher-Yates Shuffle)
function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Robust helper to locate user's chosen option regardless of key structure (ID, index, sort_order, array)
function getUserChoice(userAnswers, question, index) {
  if (!userAnswers) return null

  let answers = userAnswers
  if (typeof answers === 'string') {
    try { answers = JSON.parse(answers) } catch (e) {}
    if (typeof answers === 'string') {
      try { answers = JSON.parse(answers) } catch (e) {}
    }
  }

  if (!answers || typeof answers !== 'object') return null

  const qId = question?.id
  const qSortOrder = question?.sort_order

  // 1. Array of items
  if (Array.isArray(answers)) {
    const foundObj = answers.find(item =>
      item && typeof item === 'object' && (
        String(item.question_id || item.questionId || item.id) === String(qId) ||
        String(item.sort_order || item.sortOrder) === String(qSortOrder)
      )
    )
    if (foundObj) return foundObj.answer || foundObj.choice || foundObj.selectedOption || null
    if (answers[index] !== undefined && typeof answers[index] === 'string') {
      return answers[index]
    }
  }

  // 2. Direct Object Key by Question ID
  if (qId !== undefined && qId !== null) {
    if (answers[qId] !== undefined) return answers[qId]
    if (answers[String(qId)] !== undefined) return answers[String(qId)]
  }

  // 3. Fallback by sort_order or 0-based index
  if (qSortOrder !== undefined && qSortOrder !== null) {
    if (answers[qSortOrder] !== undefined) return answers[qSortOrder]
    if (answers[String(qSortOrder)] !== undefined) return answers[String(qSortOrder)]
  }

  if (answers[index] !== undefined) return answers[index]
  if (answers[String(index)] !== undefined) return answers[String(index)]

  // 4. Fuzzy Key Match
  if (qId !== undefined && qId !== null) {
    const key = Object.keys(answers).find(k => String(k).trim() === String(qId).trim())
    if (key && answers[key] !== undefined) return answers[key]
  }

  return null
}

const normalize = (val) => String(val ?? '').trim().toLowerCase()

export default function QuizView() {
  const { quizId } = useParams()
  const [searchParams] = useSearchParams()
  const targetAttemptId = searchParams.get('attemptId')
  const canvasRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [userAnswers, setUserAnswers] = useState({})
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showGrid, setShowGrid] = useState(false)

  const [timeLeft, setTimeLeft] = useState(0)
  const [quizStarted, setQuizStarted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [score, setScore] = useState(0)
  const [pastAttempt, setPastAttempt] = useState(null)
  const [rankBadge, setRankBadge] = useState({ text: '', desc: '' })
  const [currentUser, setCurrentUser] = useState(null)
  const [correctAnswers, setCorrectAnswers] = useState({})
  const [dailyLimitReached, setDailyLimitReached] = useState(false)

  useEffect(() => {
    loadQuizData()
  }, [quizId, targetAttemptId])

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
        .select('id, quiz_id, question_type, prompt, options, explanation, sort_order')
        .eq('quiz_id', quizId)
        .order('sort_order', { ascending: true })

      if (questErr) throw questErr
      setQuestions(questData || [])

      if (user) {
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

        let attemptQuery = supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', quizId)
          .eq('user_id', user.id)

        if (targetAttemptId) {
          attemptQuery = attemptQuery.eq('id', targetAttemptId)
        } else {
          attemptQuery = attemptQuery.order('created_at', { ascending: false }).limit(1)
        }

        const { data: attempts } = await attemptQuery
        const attemptData = attempts?.[0]

        if (attemptData) {
          setPastAttempt(attemptData)
          setScore(attemptData.score)
          if (attemptData.answers) {
            let parsedAnswers = attemptData.answers
            if (typeof parsedAnswers === 'string') {
              try { parsedAnswers = JSON.parse(parsedAnswers) } catch (e) {}
            }
            setUserAnswers(parsedAnswers || {})
          }
          await loadAnswerKey(quizId)
          await computeRank(quizId, attemptData.score, questData.length)

          if (targetAttemptId) {
            setSubmitted(true)
          }
        }
      }
    } catch (err) {
      console.error('Error loading quiz:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleStartFresh() {
    setQuestions(prev => shuffleArray(prev))
    setUserAnswers({})
    setCurrentIndex(0)
    setTimeLeft((quiz?.time_limit_minutes || 10) * 60)
    setSubmitted(false)
    setQuizStarted(true)
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

    try {
      if (!currentUser) {
        alert('Please sign in to submit and have your quiz graded.')
        return
      }

      const { data, error } = await supabase.rpc('submit_quiz_attempt', {
        p_quiz_id: quizId,
        p_answers: userAnswers
      })

      if (error) throw error

      setScore(data.score)
      setSubmitted(true)
      setShowGrid(false)
      await loadAnswerKey(quizId)
      await computeRank(quizId, data.score, data.total_questions)
    } catch (err) {
      alert('Submission failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function loadAnswerKey(quizId) {
    try {
      const { data, error } = await supabase.rpc('get_quiz_answers_for_review', {
        p_quiz_id: quizId
      })
      if (error) throw error

      const map = {}
      ;(data || []).forEach(row => {
        map[row.question_id] = row.correct_answer
      })
      setCorrectAnswers(map)
    } catch (err) {
      console.error('Error loading answer key:', err)
    }
  }

  async function computeRank(quizId, userScore, totalQuestions) {
    try {
      const { data, error } = await supabase.rpc('get_quiz_rank', {
        p_quiz_id: quizId,
        p_user_score: userScore,
        p_total_questions: totalQuestions
      })

      if (error) throw error

      setRankBadge({ text: data.text, desc: data.desc })
    } catch (err) {
      console.error('Error computing rank:', err)
    }
  }

  function drawDeltoidLogo(ctx, x, y, size) {
    ctx.save()
    const scale = size / 64
    ctx.translate(x, y)

    const bgGrad = ctx.createLinearGradient(0, 0, 64 * scale, 64 * scale)
    bgGrad.addColorStop(0, '#1B2A4A')
    bgGrad.addColorStop(1, '#0E1726')
    ctx.fillStyle = bgGrad
    ctx.beginPath()
    ctx.roundRect(0, 0, 64 * scale, 64 * scale, 14 * scale)
    ctx.fill()

    const tealGrad = ctx.createLinearGradient(0, 0, 64 * scale, 64 * scale)
    tealGrad.addColorStop(0, '#529EA3')
    tealGrad.addColorStop(1, '#2C5254')
    ctx.fillStyle = tealGrad
    ctx.beginPath()
    ctx.moveTo(32 * scale, 12 * scale)
    ctx.lineTo(52 * scale, 48 * scale)
    ctx.lineTo(12 * scale, 48 * scale)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = bgGrad
    ctx.beginPath()
    ctx.moveTo(32 * scale, 22 * scale)
    ctx.lineTo(43 * scale, 43 * scale)
    ctx.lineTo(21 * scale, 43 * scale)
    ctx.closePath()
    ctx.fill()

    const vitalGrad = ctx.createLinearGradient(28.5 * scale, 31.5 * scale, 35.5 * scale, 38.5 * scale)
    vitalGrad.addColorStop(0, '#E5593F')
    vitalGrad.addColorStop(1, '#A8321C')
    ctx.fillStyle = vitalGrad
    ctx.beginPath()
    ctx.arc(32 * scale, 35 * scale, 3.5 * scale, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  function handleShareCard() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const dpr = window.devicePixelRatio || 1
    canvas.width = 600 * dpr
    canvas.height = 600 * dpr
    ctx.scale(dpr, dpr)

    ctx.save()
    ctx.globalAlpha = 1.0

    ctx.fillStyle = '#0F172A'
    ctx.fillRect(0, 0, 600, 600)

    ctx.save()
    ctx.globalAlpha = 0.07
    const watermarkGrad = ctx.createLinearGradient(150, 100, 450, 500)
    watermarkGrad.addColorStop(0, '#38BDF8')
    watermarkGrad.addColorStop(1, '#C1442D')
    ctx.fillStyle = watermarkGrad

    ctx.beginPath()
    ctx.moveTo(300, 120)
    ctx.lineTo(510, 480)
    ctx.lineTo(90, 480)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    const topBarGrad = ctx.createLinearGradient(40, 0, 560, 0)
    topBarGrad.addColorStop(0, '#10B981')
    topBarGrad.addColorStop(0.5, '#38BDF8')
    topBarGrad.addColorStop(1, '#C1442D')
    ctx.fillStyle = topBarGrad
    ctx.fillRect(40, 36, 520, 8)

    drawDeltoidLogo(ctx, 40, 64, 34)

    ctx.fillStyle = '#F8FAFC'
    ctx.font = 'bold 26px sans-serif'
    ctx.fillText('Deltoid App', 84, 90)

    ctx.fillStyle = '#94A3B8'
    ctx.font = '16px sans-serif'
    ctx.fillText(quiz?.title || 'Medical Topic Quiz', 40, 130)

    ctx.fillStyle = '#1E293B'
    ctx.beginPath()
    ctx.roundRect(40, 160, 520, 270, 16)
    ctx.fill()

    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#38BDF8'
    ctx.font = 'bold 60px sans-serif'
    ctx.fillText(rankBadge.text, 70, 248)

    ctx.fillStyle = '#F1F5F9'
    ctx.font = '18px sans-serif'
    ctx.fillText(rankBadge.desc, 70, 296)

    const scorePct = Math.round((score / questions.length) * 100)
    ctx.fillStyle = '#34D399'
    ctx.font = 'bold 22px monospace'
    ctx.fillText(`Score: ${score} / ${questions.length} (${scorePct}%)`, 70, 358)

    ctx.fillStyle = '#64748B'
    ctx.font = '14px monospace'
    ctx.fillText('deltoid.app • Active Recall & Medical Practice', 40, 515)

    ctx.restore()

    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'deltoid-quiz-rank.png', { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: 'My Deltoid Quiz Score',
          text: `I scored ${score}/${questions.length} on ${quiz?.title} on Deltoid!`
        }).catch(() => {})
      } else {
        const link = document.createElement('a')
        link.download = `deltoid-rank-${quizId}.png`
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

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-venous border-t-transparent rounded-full animate-spin" />
        <p className="text-slate font-mono text-xs tracking-wider">LOADING PRACTICE SESSION…</p>
      </div>
    )
  }

  if (dailyLimitReached && !quizStarted && !submitted) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-6 bg-white border border-paperDim rounded-card shadow-sm">
        <span className="specimen-label">Daily Ceiling Reached</span>
        <h1 className="text-2xl font-display font-bold text-ink">300 Questions Complete!</h1>
        <p className="text-slate text-sm leading-relaxed">
          You've reached your daily practice limit. Review today's topics and rest your active memory until tomorrow.
        </p>
        <Link to="/quizzes" className="btn-primary inline-block py-2.5 px-6">
          Back to Quizzes
        </Link>
      </div>
    )
  }

  if (!quizStarted && !submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-6 bg-white border border-paperDim rounded-card shadow-sm">
        <span className="specimen-label">Timed Practice Session</span>
        <h1 className="text-3xl font-display font-bold text-ink">{quiz?.title}</h1>
        {quiz?.description && <p className="text-slate text-sm leading-relaxed">{quiz?.description}</p>}

        <div className="bg-paper p-4 rounded-card border border-paperDim flex justify-around text-center">
          <div>
            <p className="text-[11px] text-slate font-mono uppercase tracking-wider">Questions</p>
            <p className="text-xl font-bold text-ink font-mono mt-0.5">{questions.length}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate font-mono uppercase tracking-wider">Time Limit</p>
            <p className="text-xl font-bold text-ink font-mono mt-0.5">{quiz?.time_limit_minutes} Mins</p>
          </div>
          <div>
            <p className="text-[11px] text-slate font-mono uppercase tracking-wider">Format</p>
            <p className="text-xl font-bold text-venous font-mono mt-0.5">Paginated</p>
          </div>
        </div>

        {pastAttempt ? (
          <div className="space-y-4 bg-venous/10 p-5 rounded-card border border-venous/30">
            <p className="text-xs font-mono text-venousDark font-bold uppercase tracking-wider">
              Previous Score: {pastAttempt.score} / {questions.length} ({pastAttempt.percentage}%)
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleStartFresh}
                className="btn-primary py-2.5 px-6 text-sm"
              >
                🔄 Retake Quiz
              </button>
              <button
                onClick={() => setSubmitted(true)}
                className="btn-secondary py-2.5 px-6 text-sm"
              >
                📖 Review Answers
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleStartFresh}
            className="w-full btn-primary py-3 text-sm tracking-wide"
          >
            Begin Practice Session
          </button>
        )}
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto p-2 space-y-6">
        <div className="bg-ink text-paper p-6 sm:p-8 rounded-card text-center space-y-5 shadow-lg">
          <div className="flex justify-center gap-2">
            <button
              onClick={handleStartFresh}
              className="bg-paper/10 text-paper text-xs font-mono px-3.5 py-1.5 rounded-full border border-paper/20 hover:bg-paper/20 transition"
            >
              🔄 Retake Quiz
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-bold">{quiz?.title} Results</h1>
          
          <div className="flex justify-center items-center gap-4 sm:gap-6 my-4">
            <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-card min-w-[120px]">
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">YOUR SCORE</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono mt-1">{score} / {questions.length}</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-card min-w-[120px]">
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">RANK TIER</p>
              <p className="text-2xl sm:text-3xl font-bold text-sky-400 font-display mt-1">{rankBadge.text}</p>
            </div>
          </div>

          <p className="text-sm text-slate-300">{rankBadge.desc}</p>

          <button
            onClick={handleShareCard}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-card text-sm transition flex items-center justify-center gap-2 mx-auto shadow-md"
          >
            <span>📲 Share Result Card</span>
          </button>
        </div>

        <canvas ref={canvasRef} width="600" height="600" className="hidden" />

        <div className="space-y-5">
          <h2 className="text-xl font-display font-bold text-ink">Answer Review & Explanations</h2>
          {questions.map((q, idx) => {
            const userChoice = getUserChoice(userAnswers, q, idx)
            const hasChosen = userChoice !== null && userChoice !== undefined
            
            const correctOpt = correctAnswers[q.id]
            const isCorrect = hasChosen && normalize(userChoice) === normalize(correctOpt)

            return (
              <div
                key={q.id || idx}
                className={`p-5 rounded-card border ${
                  hasChosen
                    ? isCorrect ? 'bg-venous/5 border-venous/30' : 'bg-vital/5 border-vital/30'
                    : 'bg-white border-paperDim'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-slate">Question #{idx + 1}</span>
                  {hasChosen ? (
                    <span className={`text-[11px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                      isCorrect ? 'bg-venous/20 text-venousDark' : 'bg-vital/20 text-vitalDark'
                    }`}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                      Unanswered
                    </span>
                  )}
                </div>

                <p className="font-medium text-ink mb-4 whitespace-pre-line text-sm sm:text-base leading-relaxed">{q.prompt}</p>

                <div className="space-y-2 mb-4">
                  {(q.options || []).map((opt, oIdx) => {
                    const isSelected = hasChosen && normalize(userChoice) === normalize(opt)
                    const isCorrectOpt = correctOpt !== undefined && normalize(correctOpt) === normalize(opt)

                    let style = "border-paperDim bg-white text-ink"
                    let badgeText = null

                    if (isSelected && isCorrectOpt) {
                      style = "border-venous bg-venous/15 font-semibold text-ink"
                      badgeText = "✓ Your Choice"
                    } else if (isSelected && !isCorrectOpt) {
                      style = "border-vital bg-vital/15 font-semibold text-vitalDark"
                      badgeText = "✕ Your Choice"
                    } else if (isCorrectOpt) {
                      style = "border-venous/60 bg-venous/5 font-semibold text-ink"
                      badgeText = "✓ Correct Answer"
                    }

                    return (
                      <div key={oIdx} className={`p-3 rounded-card text-xs sm:text-sm border flex items-center justify-between ${style}`}>
                        <span>{opt}</span>
                        {badgeText && (
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider ml-2 shrink-0">
                            {badgeText}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {q.explanation && (
                  <div className="bg-white p-3.5 rounded-card border border-paperDim text-xs text-slate leading-relaxed">
                    <strong className="text-ink font-semibold">Explanation: </strong> {q.explanation}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const currentQ = questions[currentIndex]
  const answeredCount = Object.keys(userAnswers || {}).length

  return (
    <div className="max-w-2xl mx-auto p-2 space-y-6 relative">
      <div className="bg-white border border-paperDim p-4 rounded-card flex items-center justify-between shadow-sm">
        <div>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="text-xs font-mono font-bold text-venous hover:underline flex items-center gap-1"
          >
            📊 Grid ({answeredCount}/{questions.length})
          </button>
          <p className="text-xs text-slate font-medium mt-0.5">Question {currentIndex + 1} of {questions.length}</p>
        </div>

        <div className={`font-mono font-bold text-sm px-3.5 py-1.5 rounded-card ${
          timeLeft < 60 ? 'bg-vital/15 text-vital animate-pulse border border-vital/30' : 'bg-paper text-ink border border-paperDim'
        }`}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      <div className="w-full h-1.5 rounded-full bg-paperDim overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%`,
            backgroundColor: '#3F8F6D'
          }}
        />
      </div>

      {showGrid && (
        <div className="bg-white border border-paperDim p-4 rounded-card space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate uppercase">Question Navigator</span>
            <button onClick={() => setShowGrid(false)} className="text-xs text-slate hover:text-ink font-mono">Close ✕</button>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = getUserChoice(userAnswers, q, idx) !== null
              const isCurrent = idx === currentIndex

              let btnStyle = "bg-paper text-slate border-paperDim hover:border-venous"
              if (isAnswered) btnStyle = "bg-venous/20 text-venousDark border-venous/40 font-bold"
              if (isCurrent) btnStyle += " ring-2 ring-vital border-vital"

              return (
                <button
                  key={q.id || idx}
                  onClick={() => {
                    setCurrentIndex(idx)
                    setShowGrid(false)
                  }}
                  className={`p-2 rounded-card text-xs font-mono border transition ${btnStyle}`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {currentQ && (
        <div className="bg-white p-6 border border-paperDim rounded-card space-y-5 shadow-sm min-h-[300px] flex flex-col justify-between">
          <div className="space-y-4">
            <span className="specimen-label">Item #{currentIndex + 1}</span>
            <p className="font-medium text-ink text-base md:text-lg whitespace-pre-line leading-relaxed">{currentQ.prompt}</p>

            <div className="space-y-2.5">
              {(currentQ.options || []).map((opt, oIdx) => {
                const isSelected = normalize(userAnswers[currentQ.id]) === normalize(opt)
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

          <div className="flex items-center justify-between pt-4 border-t border-paperDim mt-6">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-xs font-mono font-bold bg-paper text-slate rounded-card border border-paperDim hover:bg-paperDim disabled:opacity-30 transition"
            >
              ← Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2 text-xs font-mono font-bold bg-venous text-white rounded-card hover:bg-venousDark transition shadow-sm"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 text-xs font-mono font-bold bg-vital text-white rounded-card hover:bg-vitalDark transition shadow-sm disabled:opacity-50"
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
