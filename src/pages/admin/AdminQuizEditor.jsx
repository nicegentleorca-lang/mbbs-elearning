import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const REASON_ASSERTION_OPTIONS = [
  "Both Assertion and Reason are true, and Reason is the correct explanation.",
  "Both Assertion and Reason are true, but Reason is NOT the correct explanation.",
  "Assertion is true, but Reason is false.",
  "Assertion is false, but Reason is true.",
  "Both Assertion and Reason are false."
]

const SAMPLE_JSON_TEMPLATE = JSON.stringify(
  [
    {
      "question_type": "mcq",
      "prompt": "Which nerve innervates the deltoid muscle?",
      "options": ["Radial nerve", "Axillary nerve", "Musculocutaneous nerve", "Median nerve"],
      "correct_answer": "Axillary nerve",
      "explanation": "The axillary nerve (C5-C6) innervates both the deltoid and teres minor muscles."
    }
  ],
  null,
  2
)

export default function AdminQuizEditor() {
  const { quizId } = useParams()
  const navigate = useNavigate()

  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(10)
  const [isPremium, setIsPremium] = useState(true)

  const [activeTab, setActiveTab] = useState('builder') // 'builder' | 'bulk'
  const [bulkInput, setBulkInput] = useState('')
  const [bulkError, setBulkError] = useState('')
  
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
  }, [quizId])

  async function fetchData() {
    setLoading(true)
    try {
      const [{ data: subData }, { data: topData }] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('topics').select('*').order('sort_order', { ascending: true })
      ])
      setSubjects(subData || [])
      setTopics(topData || [])

      if (quizId) {
        const { data: quiz, error: quizErr } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single()

        if (quizErr) throw quizErr

        setSelectedTopic(String(quiz.topic_id || ''))
        setQuizTitle(quiz.title || '')
        setQuizDescription(quiz.description || '')
        setTimeLimitMinutes(quiz.time_limit_minutes || 10)
        setIsPremium(quiz.is_premium !== false)

        const { data: qList, error: qErr } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('sort_order', { ascending: true })

        if (qErr) throw qErr

        if (qList && qList.length > 0) {
          setQuestions(qList.map(q => ({
            id: q.id,
            question_type: q.question_type || 'mcq',
            prompt: q.prompt || '',
            options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
            correct_answer: q.correct_answer || '',
            explanation: q.explanation || ''
          })))
        }
      }
    } catch (err) {
      alert('Error loading quiz data: ' + err.message)
    } finally {
      setLoading(false)
    }
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

  function handleDuplicateQuestion(qIdx) {
    const target = questions[qIdx]
    const duplicate = {
      ...target,
      id: undefined,
      options: [...target.options]
    }
    const updated = [...questions]
    updated.splice(qIdx + 1, 0, duplicate)
    setQuestions(updated)
  }

  function handleMoveQuestion(qIdx, direction) {
    if ((direction === -1 && qIdx === 0) || (direction === 1 && qIdx === questions.length - 1)) return
    const updated = [...questions]
    const temp = updated[qIdx]
    updated[qIdx] = updated[qIdx + direction]
    updated[qIdx + direction] = temp
    setQuestions(updated)
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

  function handleProcessBulkImport() {
    setBulkError('')
    if (!bulkInput.trim()) return

    try {
      const parsed = JSON.parse(bulkInput)
      if (!Array.isArray(parsed)) {
        throw new Error('Pasted content must be a valid JSON array of question objects.')
      }

      const formatted = parsed.map((item, idx) => {
        if (!item.prompt) throw new Error(`Item #${idx + 1} is missing a "prompt" field.`)
        
        const qType = item.question_type || 'mcq'
        let opts = item.options || []
        if (qType === 'true_false') opts = ['True', 'False']
        if (qType === 'reason_assertion') opts = REASON_ASSERTION_OPTIONS

        return {
          question_type: qType,
          prompt: String(item.prompt).trim(),
          options: opts.map(o => String(o)),
          correct_answer: String(item.correct_answer || opts[0] || '').trim(),
          explanation: item.explanation ? String(item.explanation).trim() : ''
        }
      })

      setQuestions(prev => (prev.length === 1 && !prev[0].prompt ? formatted : [...prev, ...formatted]))
      setActiveTab('builder')
      setBulkInput('')
      alert(`Successfully imported ${formatted.length} questions into the editor!`)
    } catch (err) {
      setBulkError(err.message)
    }
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
      let activeQuizId = quizId

      if (quizId) {
        const { error: updateErr } = await supabase
          .from('quizzes')
          .update({
            topic_id: selectedTopic,
            title: quizTitle,
            description: quizDescription,
            time_limit_minutes: Number(timeLimitMinutes) || 10,
            is_premium: isPremium
          })
          .eq('id', quizId)

        if (updateErr) throw updateErr

        const { error: delErr } = await supabase
          .from('questions')
          .delete()
          .eq('quiz_id', quizId)

        if (delErr) throw delErr
      } else {
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .insert([{
            topic_id: selectedTopic,
            title: quizTitle,
            description: quizDescription,
            time_limit_minutes: Number(timeLimitMinutes) || 10,
            is_premium: isPremium
          }])
          .select()
          .single()

        if (quizError) throw quizError
        activeQuizId = quizData.id
      }

      const questionsToInsert = questions.map((q, index) => ({
        quiz_id: activeQuizId,
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

      alert(quizId ? 'Quiz updated successfully!' : 'Quiz published successfully!')
      navigate('/admin/manage')
    } catch (err) {
      alert('Error saving quiz: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-slate font-mono">Loading data...</div>

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold text-ink">
          {quizId ? 'Edit Quiz' : 'Create New Quiz'}
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('builder')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition ${activeTab === 'builder' ? 'bg-venous text-white' : 'bg-paperDim text-slate'}`}
          >
            Manual Builder ({questions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition ${activeTab === 'bulk' ? 'bg-venous text-white' : 'bg-paperDim text-slate'}`}
          >
            + Bulk Paste JSON
          </button>
        </div>
      </div>

      {/* Basic Metadata */}
      <div className="space-y-4 bg-white p-4 border border-paperDim rounded-card shadow-sm">
        <div>
          <label className="block text-xs font-mono text-slate uppercase font-bold mb-1">Target Topic</label>
          <select
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
            required
            className="w-full p-2.5 border border-paperDim rounded bg-paper text-ink text-sm"
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

        <div>
          <label className="block text-xs font-mono text-slate uppercase font-bold mb-1">Quiz Title</label>
          <input
            type="text"
            value={quizTitle}
            onChange={e => setQuizTitle(e.target.value)}
            placeholder="e.g. Scapular Osteology Practice MCQs"
            required
            className="w-full p-2.5 border border-paperDim rounded bg-paper text-ink text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-slate uppercase font-bold mb-1">Description (Optional)</label>
            <input
              type="text"
              value={quizDescription}
              onChange={e => setQuizDescription(e.target.value)}
              placeholder="e.g. Test your understanding of bony landmarks"
              className="w-full p-2.5 border border-paperDim rounded bg-paper text-ink text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-slate uppercase font-bold mb-1">Time Limit (Minutes)</label>
            <input
              type="number"
              min="1"
              max="180"
              value={timeLimitMinutes}
              onChange={e => setTimeLimitMinutes(e.target.value)}
              required
              className="w-full p-2.5 border border-paperDim rounded bg-paper text-ink font-mono text-sm"
            />
          </div>
        </div>

        {/* Lock / Premium Toggle */}
        <div className="pt-2 border-t border-paperDim flex items-center gap-3">
          <input
            type="checkbox"
            id="is_premium"
            checked={isPremium}
            onChange={e => setIsPremium(e.target.checked)}
            className="w-4 h-4 rounded border-paperDim text-venous focus:ring-venous cursor-pointer"
          />
          <label htmlFor="is_premium" className="text-xs font-mono uppercase font-bold text-ink cursor-pointer select-none flex items-center gap-1.5">
            <span>🔒 Require Subject Access (Locked Quiz)</span>
          </label>
        </div>
      </div>

      {/* Bulk Importer Tab */}
      {activeTab === 'bulk' && (
        <div className="bg-white p-4 border border-paperDim rounded-card space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-ink">Bulk Question Importer</h3>
            <button
              type="button"
              onClick={() => setBulkInput(SAMPLE_JSON_TEMPLATE)}
              className="text-xs text-venous hover:underline font-mono"
            >
              Load Sample Format
            </button>
          </div>
          <p className="text-xs text-slate">
            Paste a JSON array of questions generated from Claude or your bank. Importing will parse them directly into the interactive editor above.
          </p>
          <textarea
            rows={10}
            value={bulkInput}
            onChange={e => setBulkInput(e.target.value)}
            placeholder={`[\n  {\n    "question_type": "mcq",\n    "prompt": "...",\n    "options": ["A", "B", "C", "D"],\n    "correct_answer": "A",\n    "explanation": "..."\n  }\n]`}
            className="w-full p-3 border border-paperDim rounded bg-paper font-mono text-xs text-ink"
          />
          {bulkError && <p className="text-xs text-red-600 font-mono">{bulkError}</p>}
          <button
            type="button"
            onClick={handleProcessBulkImport}
            className="w-full py-2.5 bg-venous text-white rounded font-medium text-sm hover:bg-venousDark transition"
          >
            Import Questions into Form
          </button>
        </div>
      )}

      {/* Manual Builder Tab */}
      {activeTab === 'builder' && (
        <div className="space-y-6">
          {questions.map((q, qIdx) => (
            <div key={qIdx} className="bg-white p-4 border border-paperDim rounded-card space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-paperDim/50 pb-2">
                <span className="font-mono text-xs font-bold uppercase text-slate">Question #{qIdx + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(qIdx, -1)}
                    disabled={qIdx === 0}
                    className="px-2 py-0.5 text-xs bg-paperDim rounded disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(qIdx, 1)}
                    disabled={qIdx === questions.length - 1}
                    className="px-2 py-0.5 text-xs bg-paperDim rounded disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateQuestion(qIdx)}
                    className="text-xs text-venous font-medium hover:underline ml-1"
                  >
                    Duplicate
                  </button>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-xs text-red-600 font-medium hover:underline ml-1"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

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

              {q.question_type === 'mcq' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate">Options & Direct Answer Selection</label>
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
         )}

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

              <div>
                <label className="block text-xs font-medium text-slate mb-1">Explanation (Revealed after submission)</label>
                <input
                  type="text"
                  value={q.explanation}
                  onChange={e => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                  placeholder="Brief explanation..."
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
            + Add Another Question Manually
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-venous text-white rounded font-medium hover:bg-venousDark transition disabled:opacity-50"
      >
        {saving ? 'Saving Quiz...' : quizId ? 'Update Quiz' : 'Save & Publish Quiz'}
      </button>
    </form>
  )
                  }
