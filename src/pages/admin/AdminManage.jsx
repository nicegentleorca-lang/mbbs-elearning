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

  // Modal deletion state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null, // 'subject' | 'topic' | 'lesson' | 'quiz'
    item: null,
    parentId: null
  })
  const [isDeleting, setIsDeleting] = useState(false)

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

  function promptDelete(type, item, parentId = null) {
    setDeleteModal({ isOpen: true, type, item, parentId })
  }

  async function confirmDeletion() {
    const { type, item, parentId } = deleteModal
    if (!type || !item) return

    setIsDeleting(true)
    setError('')

    try {
      if (type === 'subject') {
        await deleteSubject(item.id)
        loadSubjects()
        setExpandedSubject(null)
      } else if (type === 'topic') {
        await deleteTopic(item.id)
        const topics = await getTopicsBySubject(parentId)
        setTopicsBySubject(prev => ({ ...prev, [parentId]: topics }))
        setExpandedTopic(null)
      } else if (type === 'lesson') {
        await deleteLesson(item.id)
        const lessons = await getAllLessonsByTopicAdmin(parentId)
        setLessonsByTopic(prev => ({ ...prev, [parentId]: lessons }))
      } else if (type === 'quiz') {
        const { error } = await supabase.from('quizzes').delete().eq('id', item.id)
        if (error) throw error
        setQuizzesByTopic(prev => ({
          ...prev,
          [parentId]: (prev[parentId] || []).filter(q => q.id !== item.id)
        }))
      }
      setDeleteModal({ isOpen: false, type: null, item: null, parentId: null })
    } catch (err) {
      setError('Deletion failed: ' + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) return <p className="text-slate font-mono text-sm p-4">Loading structure tree...</p>

  return (
    <div className="space-y-6">
      <div>
        <span className="specimen-label mb-2 block w-fit">Admin</span>
        <h1 className="font-display text-3xl font-semibold text-ink">Manage Content Hierarchy</h1>
      </div>

      {error && (
        <div className="p-3 bg-vital/10 border border-vital/30 rounded text-vital text-xs font-mono">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {subjects.map(subject => (
          <div key={subject.id} className="index-card">
            <div className="p-4 flex items-center justify-between gap-3">
              <button
                onClick={() => toggleSubject(subject)}
                className="text-left flex-1 flex items-center gap-2"
              >
                <span className="font-display text-lg text-ink font-semibold">{subject.name}</span>
                <span className="text-slate-light text-xs font-mono">
                  {expandedSubject === subject.id ? '▾' : '▸'}
                </span>
              </button>
              <Link to={`/admin/subjects/${subject.id}/edit`} className="btn-secondary text-xs py-1 px-3">Edit</Link>
              <button 
                onClick={() => promptDelete('subject', subject)} 
                className="text-vital text-xs hover:underline font-medium"
              >
                Delete
              </button>
            </div>

            {expandedSubject === subject.id && (
              <div className="border-t border-paperDim px-4 py-3 space-y-2 bg-paper/30">
                {(topicsBySubject[subject.id] || []).map(topic => (
                  <div key={topic.id} className="bg-white rounded-card border border-paperDim">
                    <div className="p-3 flex items-center justify-between gap-3">
                      <button onClick={() => toggleTopic(topic)} className="text-left flex-1 flex items-center gap-2">
                        <span className="font-sans text-sm font-medium text-ink">{topic.name}</span>
                        <span className="text-slate-light text-xs font-mono">
                          {expandedTopic === topic.id ? '▾' : '▸'}
                        </span>
                      </button>
                      <Link to={`/admin/topics/${topic.id}/edit`} className="btn-secondary text-xs py-1 px-2">Edit</Link>
                      <button 
                        onClick={() => promptDelete('topic', topic, subject.id)} 
                        className="text-vital text-xs hover:underline font-medium"
                      >
                        Delete
                      </button>
                    </div>

                    {expandedTopic === topic.id && (
                      <div className="border-t border-paperDim px-3 py-2 space-y-3 bg-paper/20">
                        {/* Lessons List */}
                        <div>
                          <span className="text-[10px] font-mono text-slate uppercase font-bold block mb-1">Lessons</span>
                          {(lessonsByTopic[topic.id] || []).map(lesson => (
                            <div key={lesson.id} className="flex items-center justify-between gap-3 py-1 border-b border-paperDim/40 last:border-b-0">
                              <span className="text-xs flex-1 text-ink">
                                {lesson.title}
                                {lesson.status === 'draft' && (
                                  <span className="ml-2 text-[10px] font-mono text-gold bg-gold/10 px-1.5 py-0.5 rounded">draft</span>
                                )}
                              </span>
                              <Link to={`/admin/lessons/${lesson.id}/edit`} className="btn-secondary text-xs py-0.5 px-2">Edit</Link>
                              <button 
                                onClick={() => promptDelete('lesson', lesson, topic.id)} 
                                className="text-vital text-xs hover:underline font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                          {(lessonsByTopic[topic.id] || []).length === 0 && (
                            <p className="text-slate text-xs italic">No lessons in this topic.</p>
                          )}
                        </div>

                        {/* Quizzes List */}
                        <div className="pt-2 border-t border-paperDim/50">
                          <span className="text-[10px] font-mono text-slate uppercase font-bold block mb-1">Quizzes</span>
                          {(quizzesByTopic[topic.id] || []).map(quiz => {
                            const isLocked = quiz.is_premium !== false
                            return (
                              <div key={quiz.id} className="flex items-center justify-between gap-2 py-1 border-b border-paperDim/40 last:border-b-0">
                                <span className="text-xs flex-1 font-medium truncate text-ink">
                                  📝 {quiz.title}
                                </span>
                                <button
                                  onClick={() => toggleQuizLock(quiz, topic.id)}
                                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition ${
                                    isLocked 
                                      ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200' 
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                  }`}
                                  title="Toggle Premium Lock"
                                >
                                  {isLocked ? '🔒 Locked' : '🔓 Free'}
                                </button>
                                <Link to={`/admin/quizzes/${quiz.id}/edit`} className="btn-secondary text-xs py-0.5 px-2">Edit</Link>
                                <button 
                                  onClick={() => promptDelete('quiz', quiz, topic.id)} 
                                  className="text-vital text-xs hover:underline font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            )
                          })}
                          {(quizzesByTopic[topic.id] || []).length === 0 && (
                            <p className="text-slate text-xs italic">No quizzes attached.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(topicsBySubject[subject.id] || []).length === 0 && (
                  <p className="text-slate text-xs italic">No topics created under this subject.</p>
                )}
              </div>
            )}
          </div>
        ))}
        {subjects.length === 0 && (
          <p className="text-slate text-sm">No subjects exist in database.</p>
        )}
      </div>

      {/* Styled Safe Deletion Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <div className="bg-white rounded-card max-w-sm w-full p-5 shadow-glass space-y-4 border border-paperDim">
            <h3 className="font-display font-bold text-lg text-ink">Confirm Permanent Deletion</h3>
            <p className="text-slate text-xs leading-relaxed">
              Are you sure you want to delete <strong className="text-ink">{deleteModal.item?.name || deleteModal.item?.title}</strong>? 
              {deleteModal.type === 'subject' && ' This will cascade-delete all child topics, lessons, and quizzes.'}
              {deleteModal.type === 'topic' && ' This will delete all attached lessons and quizzes.'}
              {' '}This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteModal({ isOpen: false, type: null, item: null, parentId: null })}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={confirmDeletion}
                className="bg-vital hover:bg-vital/90 text-white rounded px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
