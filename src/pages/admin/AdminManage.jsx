import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getSubjects, getTopicsBySubject, getAllLessonsByTopicAdmin,
  deleteSubject, deleteTopic, deleteLesson
} from '../../lib/content'
import { supabase } from '../../lib/supabase'

export default function AdminManage() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedSubject, setExpandedSubject] = useState(null)
  const [topicsBySubject, setTopicsBySubject] = useState({})
  const [expandedTopic, setExpandedTopic] = useState(null)
  const [lessonsByTopic, setLessonsByTopic] = useState({})
  const [quizzesByTopic, setQuizzesByTopic] = useState({})

  useEffect(() => {
    loadSubjects()
  }, [])

  function loadSubjects() {
    setLoading(true)
    getSubjects()
      .then(setSubjects)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  async function toggleSubject(subject) {
    if (expandedSubject === subject.id) {
      setExpandedSubject(null)
      return
    }
    setExpandedSubject(subject.id)
    setExpandedTopic(null)
    if (!topicsBySubject[subject.id]) {
      try {
        const topics = await getTopicsBySubject(subject.id)
        setTopicsBySubject(prev => ({ ...prev, [subject.id]: topics }))
      } catch (err) {
        setError(err.message)
      }
    }
  }

  async function toggleTopic(topic) {
    if (expandedTopic === topic.id) {
      setExpandedTopic(null)
      return
    }
    setExpandedTopic(topic.id)
    if (!lessonsByTopic[topic.id]) {
      try {
        const lessons = await getAllLessonsByTopicAdmin(topic.id)
        setLessonsByTopic(prev => ({ ...prev, [topic.id]: lessons }))
      } catch (err) {
        setError(err.message)
      }
    }
    if (!quizzesByTopic[topic.id]) {
      try {
        const { data: qData, error: qErr } = await supabase
          .from('quizzes')
          .select('*')
          .eq('topic_id', topic.id)
        if (qErr) throw qErr
        setQuizzesByTopic(prev => ({ ...prev, [topic.id]: qData || [] }))
      } catch (err) {
        setError(err.message)
      }
    }
  }

  async function toggleQuizLock(quiz, topicId) {
    const isCurrentlyPremium = quiz.is_premium !== false
    const newStatus = !isCurrentlyPremium

    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_premium: newStatus })
        .eq('id', quiz.id)

      if (error) throw error

      setQuizzesByTopic(prev => ({
        ...prev,
        [topicId]: (prev[topicId] || []).map(q => 
          q.id === quiz.id ? { ...q, is_premium: newStatus } : q
        )
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteSubject(subject) {
    if (!window.confirm(`Delete "${subject.name}"? This also deletes all its topics and lessons. This cannot be undone.`)) return
    try {
      await deleteSubject(subject.id)
      loadSubjects()
      setExpandedSubject(null)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteTopic(topic, subjectId) {
    if (!window.confirm(`Delete "${topic.name}"? This also deletes all its lessons. This cannot be undone.`)) return
    try {
      await deleteTopic(topic.id)
      const topics = await getTopicsBySubject(subjectId)
      setTopicsBySubject(prev => ({ ...prev, [subjectId]: topics }))
      setExpandedTopic(null)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteLesson(lesson, topicId) {
    if (!window.confirm(`Delete "${lesson.title}"? This cannot be undone.`)) return
    try {
      await deleteLesson(lesson.id)
      const lessons = await getAllLessonsByTopicAdmin(topicId)
      setLessonsByTopic(prev => ({ ...prev, [topicId]: lessons }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteQuiz(quiz, topicId) {
    if (!window.confirm(`Delete quiz "${quiz.title}"? This will delete all its questions and student attempts.`)) return
    try {
      const { error } = await supabase.from('quizzes').delete().eq('id', quiz.id)
      if (error) throw error
      setQuizzesByTopic(prev => ({
        ...prev,
        [topicId]: prev[topicId].filter(q => q.id !== quiz.id)
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="text-slate font-mono text-sm">Loading…</p>

  return (
    <div>
      <span className="specimen-label mb-3 block w-fit">Admin</span>
      <h1 className="font-display text-3xl font-semibold mb-6">Manage content</h1>

      {error && <p className="text-vital text-sm mb-4">{error}</p>}

      <div className="space-y-3">
        {subjects.map(subject => (
          <div key={subject.id} className="index-card">
            <div className="p-4 flex items-center justify-between gap-3">
              <button
                onClick={() => toggleSubject(subject)}
                className="text-left flex-1"
              >
                <span className="font-display text-lg">{subject.name}</span>
                <span className="text-slate-light text-xs font-mono ml-2">
                  {expandedSubject === subject.id ? '▾' : '▸'}
                </span>
              </button>
              <Link to={`/admin/subjects/${subject.id}/edit`} className="btn-secondary text-sm py-1 px-3">Edit</Link>
              <button onClick={() => handleDeleteSubject(subject)} className="text-vital text-sm hover:underline">Delete</button>
            </div>

            {expandedSubject === subject.id && (
              <div className="border-t border-paperDim px-4 py-3 space-y-2">
                {(topicsBySubject[subject.id] || []).map(topic => (
                  <div key={topic.id} className="bg-paper rounded-card">
                    <div className="p-3 flex items-center justify-between gap-3">
                      <button onClick={() => toggleTopic(topic)} className="text-left flex-1">
                        <span className="font-sans text-sm font-medium">{topic.name}</span>
                        <span className="text-slate-light text-xs font-mono ml-2">
                          {expandedTopic === topic.id ? '▾' : '▸'}
                        </span>
                      </button>
                      <Link to={`/admin/topics/${topic.id}/edit`} className="btn-secondary text-xs py-1 px-2">Edit</Link>
                      <button onClick={() => handleDeleteTopic(topic, subject.id)} className="text-vital text-xs hover:underline">Delete</button>
                    </div>

                    {expandedTopic === topic.id && (
                      <div className="border-t border-paperDim px-3 py-2 space-y-3">
                        {/* Lessons List */}
                        <div>
                          <span className="text-[10px] font-mono text-slate uppercase font-bold block mb-1">Lessons</span>
                          {(lessonsByTopic[topic.id] || []).map(lesson => (
                            <div key={lesson.id} className="flex items-center justify-between gap-3 py-1">
                              <span className="text-sm flex-1">
                                {lesson.title}
                                {lesson.status === 'draft' && (
                                  <span className="ml-2 text-xs font-mono text-gold">draft</span>
                                )}
                              </span>
                              <Link to={`/admin/lessons/${lesson.id}/edit`} className="btn-secondary text-xs py-1 px-2">Edit</Link>
                              <button onClick={() => handleDeleteLesson(lesson, topic.id)} className="text-vital text-xs hover:underline">Delete</button>
                            </div>
                          ))}
                          {(lessonsByTopic[topic.id] || []).length === 0 && (
                            <p className="text-slate text-xs">No lessons yet.</p>
                          )}
                        </div>

                        {/* Quizzes List */}
                        <div className="pt-2 border-t border-paperDim/50">
                          <span className="text-[10px] font-mono text-slate uppercase font-bold block mb-1">Quizzes</span>
                          {(quizzesByTopic[topic.id] || []).map(quiz => {
                            const isLocked = quiz.is_premium !== false
                            return (
                              <div key={quiz.id} className="flex items-center justify-between gap-2 py-1">
                                <span className="text-sm flex-1 font-medium truncate">
                                  📝 {quiz.title}
                                </span>
                                <button
                                  onClick={() => toggleQuizLock(quiz, topic.id)}
                                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition ${
                                    isLocked 
                                      ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200' 
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                  }`}
                                  title="Click to toggle lock status"
                                >
                                  {isLocked ? '🔒 Locked' : '🔓 Free'}
                                </button>
                                <Link to={`/admin/quizzes/${quiz.id}/edit`} className="btn-secondary text-xs py-1 px-2">Edit</Link>
                                <button onClick={() => handleDeleteQuiz(quiz, topic.id)} className="text-vital text-xs hover:underline">Delete</button>
                              </div>
                            )
                          })}
                          {(quizzesByTopic[topic.id] || []).length === 0 && (
                            <p className="text-slate text-xs">No quizzes yet.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(topicsBySubject[subject.id] || []).length === 0 && (
                  <p className="text-slate text-sm">No topics yet.</p>
                )}
              </div>
            )}
          </div>
        ))}
        {subjects.length === 0 && (
          <p className="text-slate text-sm">No subjects yet.</p>
        )}
      </div>
    </div>
  )
        }
                        
