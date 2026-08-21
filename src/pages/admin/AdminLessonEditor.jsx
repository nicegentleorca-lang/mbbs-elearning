import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { supabase } from '../../lib/supabase'

export default function AdminLessonEditor() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  
  const [title, setTitle] = useState('')
  const [previewContent, setPreviewContent] = useState('')
  const [fullContent, setFullContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const previewFileInputRef = useRef(null)
  const fullFileInputRef = useRef(null)

  useEffect(() => {
    fetchInitialData()
  }, [id])

  async function fetchInitialData() {
    setLoading(true)
    
    // Fetch all subjects and topics
    const [{ data: subData }, { data: topData }] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('topics').select('*').order('title')
    ])

    setSubjects(subData || [])
    setTopics(topData || [])

    // If editing an existing lesson, fetch its details
    if (id) {
      const { data: lesson, error } = await supabase
        .from('lessons')
        .select('*, topics(id, subject_id)')
        .eq('id', id)
        .single()

      if (!error && lesson) {
        setTitle(lesson.title || '')
        setPreviewContent(lesson.preview_content || '')
        setFullContent(lesson.content || '')
        setSelectedTopic(lesson.topic_id || '')
        
        if (lesson.topics?.subject_id) {
          setSelectedSubject(lesson.topics.subject_id)
        }
      }
    }
    setLoading(false)
  }

  const filteredTopics = topics.filter(t => t.subject_id === selectedSubject)

  function handleSubjectChange(e) {
    const subId = e.target.value
    setSelectedSubject(subId)
    setSelectedTopic('')
  }

  async function handleImageUpload(e, setContent) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `lessons/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('lesson-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('lesson-images')
        .getPublicUrl(filePath)

      const imageUrl = data.publicUrl
      setContent(prev => prev + `<p><img src="${imageUrl}" alt="Uploaded image" /></p>`)
    } catch (err) {
      alert('Failed to upload image: ' + err.message)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedTopic) {
      alert('Please select a topic.')
      return
    }

    setSaving(true)
    const payload = {
      title,
      topic_id: selectedTopic,
      preview_content: previewContent,
      content: fullContent,
      updated_at: new Date()
    }

    let error
    if (id) {
      ;({ error } = await supabase.from('lessons').update(payload).eq('id', id))
    } else {
      ;({ error } = await supabase.from('lessons').insert([payload]))
    }

    setSaving(false)

    if (error) {
      alert('Error saving lesson: ' + error.message)
    } else {
      navigate('/admin')
    }
  }

  if (loading) return <div className="p-6 text-center text-slate font-mono">Loading editor...</div>

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-display font-bold text-ink">
        {id ? 'Edit Lesson' : 'Create Lesson'}
      </h1>

      {/* Subject Dropdown */}
      <div>
        <label className="block text-sm font-medium text-slate mb-1">Subject</label>
        <select
          value={selectedSubject}
          onChange={handleSubjectChange}
          required
          className="w-full p-2 border border-paperDim rounded bg-paper text-ink"
        >
          <option value="">-- Select Subject --</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Topic Dropdown */}
      <div>
        <label className="block text-sm font-medium text-slate mb-1">Topic</label>
        <select
          value={selectedTopic}
          onChange={e => setSelectedTopic(e.target.value)}
          required
          disabled={!selectedSubject}
          className="w-full p-2 border border-paperDim rounded bg-paper text-ink disabled:opacity-50"
        >
          <option value="">-- Select Topic --</option>
          {filteredTopics.map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      {/* Lesson Title */}
      <div>
        <label className="block text-sm font-medium text-slate mb-1">Lesson Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="w-full p-2 border border-paperDim rounded bg-paper text-ink"
        />
      </div>

      {/* Free Preview Content */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-slate">Free Preview Content</label>
          <button
            type="button"
            onClick={() => previewFileInputRef.current?.click()}
            className="text-xs text-venous hover:underline font-medium"
          >
            + Embed image
          </button>
          <input
            type="file"
            ref={previewFileInputRef}
            onChange={e => handleImageUpload(e, setPreviewContent)}
            accept="image/*"
            className="hidden"
          />
        </div>
        <ReactQuill theme="snow" value={previewContent} onChange={setPreviewContent} />
      </div>

      {/* Full Notes Content */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-slate">Full Notes (Paywalled)</label>
          <button
            type="button"
            onClick={() => fullFileInputRef.current?.click()}
            className="text-xs text-venous hover:underline font-medium"
          >
            + Embed image
          </button>
          <input
            type="file"
            ref={fullFileInputRef}
            onChange={e => handleImageUpload(e, setFullContent)}
            accept="image/*"
            className="hidden"
          />
        </div>
        <ReactQuill theme="snow" value={fullContent} onChange={setFullContent} />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-venous text-white rounded font-medium hover:bg-venousDark transition disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Publish Lesson'}
      </button>
    </form>
  )
}
