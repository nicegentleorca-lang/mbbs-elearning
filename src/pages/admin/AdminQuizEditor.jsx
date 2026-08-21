import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const REASON_ASSERTION_OPTIONS = [
  "Both Assertion and Reason are true, and Reason is the correct explanation.",
  "Both Assertion and Reason are true, but Reason is NOT the correct explanation.",
  "Assertion is true, but Reason is false.",
  "Assertion is false, but Reason is true.",
  "Both Assertion and Reason are false."
]

export default function AdminQuizEditor() {
  const navigate = useNavigate()

  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(10)
  
  const [questions, setQuestions] = useState([
    {
      question_type: 'mcq',
      prompt: '',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: ''
    }
  ])

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: subData }, { data: topData }] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('topics').select('*').order('sort_order', { ascending: true })
    ])
    setSubjects(subData || [])
    setTopics(topData || [])
    setLoading(false)
  }

  function handleAddQuestion() {
    setQuestions([
      ...questions,
      {
        question_type: 'mcq',
        prompt: '',
        options: ['', '', '', ''],
        correct_answer: '',
        explanation: ''
      }
    ])
  }

  function handleTypeChange(qIndex, type) {
    const updated = [...questions]
    updated[qIndex].question_type = type
    
    if (type === 'true_false') {
      updated[qIndex].options = ['True', 'False']
      updated[qIndex].correct_answer = 'True'
    } else if (type === 'reason_assertion') {
      updated[qIndex].options = REASON_ASSERTION_OPTIONS
      updated[qIndex].correct_answer = REASON_ASSERTION_OPTIONS[0]
    } else {
      updated[qIndex].options = ['', '', '', '']
      updated[qIndex].correct_answer = ''
    }
    
    setQuestions(updated)
  }

  function handleQuestionChange(qIndex, field, value) {
    const updated = [...questions]
    updated[qIndex][field] = value
    setQuestions(updated)
  }

  function handleOptionChange(qIndex, optIndex, value) {
    const updated = [...questions]
    updated[qIndex].options[optIndex] = value
    setQuestions(updated)
  }

  function handleRemoveQuestion(qIndex) {
    if (questions.length === 1) return
    setQuestions(questions.filter((_, idx) => idx !== qIndex))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedTopic) return alert('Please select a topic.')
    if (!quizTitle.trim()) return alert('Please enter a quiz title.')

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].prompt.trim()) {
        return alert(`Question #${i + 1} is missing a prompt.`)
      }
      if (!questions[i].correct_answer) {
        return alert(`Question #${i + 1} is missing a correct answer selection.`)
      }
    }

    setSaving(true)

    try {
      // 1. Create Quiz with Time Limit
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert([{
          topic_id: selectedTopic,
          title: quizTitle,
          description: quizDescription,
          time_limit_minutes: Number(timeLimitMinutes) || 10
        }])
        .select()
        .single()

      if (quizError) throw quizError

      // 2. Prepare and insert Questions
      const questionsToInsert = questions.map((q, index) => ({
        quiz_id: quizData.id,
        question_type: q.question_type,
        prompt: q.prompt,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        sort_order: index
      }))

      const { error: qError } = await supabase
        .from('questions')
        .insert(questionsToInsert)

      if (qError) throw qError

      alert('Quiz published successfully!')
      navigate('/admin')
    } catch (err) {
      alert('Error saving quiz: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-slate font-mono">Loading data...</div>

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-display font-bold text-ink">Create New Quiz</h1>

      {/* Topic Dropdown */}
      <div>
        <label className="block text-sm font-medium text-slate mb-1">Topic</label>
        <select
          value={selectedTopic}
          onChange={e => setSelectedTopic(e.target.value)}
          required
          className="w-full p-2 border border-paperDim rounded bg-paper text-ink"
        >
          <option value="">-- Select Topic --</option>
          {subjects.map(s => {
            const subjectTopics = topics.filter(t => String(t.subject_id) === String(s.id))
            if (subjectTopics.length === 0) return null
            return (
              <optgroup key={s.id} label={s.name}>
                {subjectTopics.map(t => (
                  <option key={t.id} value={String(t.id)}>{t.name}</option>
                ))}
              </optgroup>
            )
          })}
        </select>
      </div>

      {/* Quiz Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate mb-1">Quiz Title</label>
          <input
            type="text"
            value={quizTitle}
            onChange={e => setQuizTitle(e.target.value)}
            placeholder="e.g. Scapular Osteology Practice MCQs"
            required
            className="w-full p-2 border border-paperDim rounded bg-paper text-ink"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate mb-1">Description (Optional)</label>
            <input
              type="text"
              value={quizDescription}
              onChange={e => setQuizDescription(e.target.value)}
              placeholder="e.g. Test your understanding of bony landmarks"
              className="w-full p-2 border border-paperDim rounded bg-paper text-ink"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Time Limit (Minutes)</label>
            <input
              type="number"
              min="1"
              max="180"
              value={timeLimitMinutes}
              onChange={e => setTimeLimitMinutes(e.target.value)}
              required
              className="w-full p-2 border border-paperDim rounded bg-paper text-ink font-mono"
            />
          </div>
        </div>
      </div>

      <hr className="border-paperDim" />

      {/* Questions Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-ink">Questions ({questions.length})</h2>

        {questions.map((q, qIdx) => (
          <div key={qIdx} className="bg-white p-4 border border-paperDim rounded-card space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase text-slate">Question #{qIdx + 1}</span>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(qIdx)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove Question
                </button>
              )}
            </div>

            {/* Format Selector */}
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Format</label>
              <select
                value={q.question_type}
                onChange={e => handleTypeChange(qIdx, e.target.value)}
                className="w-full p-2 border border-paperDim rounded bg-paper text-ink text-sm"
              >
                <option value="mcq">Standard MCQ (4 Options)</option>
                <option value="true_false">True / False</option>
                <option value="reason_assertion">Reason & Assertion (5 Options)</option>
              </select>
            </div>

            {/* Prompt */}
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Prompt / Statement</label>
              <textarea
                rows={2}
                value={q.prompt}
                onChange={e => handleQuestionChange(qIdx, 'prompt', e.target.value)}
                placeholder={q.question_type === 'reason_assertion' ? "Assertion: ... \nReason: ..." : "Enter question prompt..."}
                required
                className="w-full p-2 border border-paperDim rounded bg-paper text-ink text-sm"
              />
            </div>

            {/* MCQ Options */}
            {q.question_type === 'mcq' && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate">Options & Select Correct Choice</label>
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qIdx}`}
                      checked={q.correct_answer === opt && opt !== ''}
                      onChange={() => handleQuestionChange(qIdx, 'correct_answer', opt)}
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={e => handleOptionChange(qIdx, oIdx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                      className="w-full p-2 border border-paperDim rounded bg-paper text-ink text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* True/False */}
            {q.question_type === 'true_false' && (
              <div>
                <label className="block text-xs font-medium text-slate mb-1">Correct Answer</label>
                <div className="flex gap-4">
                  {['True', 'False'].map((val) => (
                    <label key={val} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                      <input
                        type="radio"
                        name={`tf-${qIdx}`}
                        checked={q.correct_answer === val}
                        onChange={() => handleQuestionChange(qIdx, 'correct_answer', val)}
                      />
                      {val}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Reason & Assertion */}
            {q.question_type === 'reason_assertion' && (
              <div>
                <label className="block text-xs font-medium text-slate mb-1">Correct Answer Choice</label>
                <div className="space-y-2">
                  {REASON_ASSERTION_OPTIONS.map((opt, rIdx) => (
                    <label key={rIdx} className="flex items-start gap-2 text-xs text-ink cursor-pointer">
                      <input
                        type="radio"
                        name={`ra-${qIdx}`}
                        checked={q.correct_answer === opt}
                        onChange={() => handleQuestionChange(qIdx, 'correct_answer', opt)}
                        className="mt-0.5"
                      />
                      <span><strong>({String.fromCharCode(65 + rIdx)})</strong> {opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation */}
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Explanation (Revealed after submission)</label>
              <input
                type="text"
                value={q.explanation}
                onChange={e => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                placeholder="Brief reason why this choice is correct..."
                className="w-full p-2 border border-paperDim rounded bg-paper text-ink text-sm"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddQuestion}
          className="w-full py-2 border-2 border-dashed border-paperDim rounded-card text-sm font-medium text-slate hover:border-venous hover:text-venous transition"
        >
          + Add Another Question
        </button>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-venous text-white rounded font-medium hover:bg-venousDark transition disabled:opacity-50"
      >
        {saving ? 'Publishing Quiz...' : 'Save & Publish Quiz'}
      </button>
    </form>
  )
  }
        
