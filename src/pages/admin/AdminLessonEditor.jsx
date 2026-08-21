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
    
    // Fetch subjects and topics
    const [{ data: subData }, { data: topData }] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('topics').select('*').order('sort_order', { ascending: true })
    ])

    setSubjects(subData || [])
    setTopics(topData || [])

    // Fetch existing lesson data with exact column names (preview_html, content_html)
    if (id) {
      const { data: lesson } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id)
        .single()

      if (lesson) {
        setTitle(lesson.title || '')
        setPreviewContent(lesson.preview_html || '')
        setFullContent(lesson.content_html || '')
        setSelectedTopic(String(lesson.topic_id || ''))
      }
    }
    setLoading(false)
  }

  async function handleImageUpload(e, setContent) {
    const file = e.target.files?.[0]
    if (!file) return

    // Show visual status feedback on the upload button
    const buttonEl = e.target.previousElementSibling
    const originalText = buttonEl ? buttonEl.innerText : ''
    if (buttonEl) buttonEl.innerText = 'Uploading...'

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `lessons/${fileName}`

      // Upload to Supabase Storage bucket 'lesson-images'
      const { error: uploadError } = await supabase.storage
        .from('lesson-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      // Fetch public URL
      const { data } = supabase.storage
        .from('lesson-images')
        .getPublicUrl(filePath)

      if (!data?.publicUrl) throw new Error('Could not generate public URL')

      const imageUrl = data.publicUrl
      
      // Append the image HTML to the active editor's state
      setContent(prev => `${prev || ''}<p><img src="${imageUrl}" alt="Uploaded image" /></p>`)
      alert('Image uploaded and embedded successfully!')
    } catch (err) {
      alert('Failed to upload image: ' + err.message)
    } finally {
      // Reset input value so selecting the same file again triggers onChange
      e.target.value = ''
      if (buttonEl) buttonEl.innerText = originalText
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedTopic) {
      alert('Please select a topic.')
      return
    }

    setSaving(true)
    
    // Payload matching exact Supabase column names
    const payload = {
      title,
      topic_id: selectedTopic,
      preview_html: previewContent,
      content_html: fullContent,
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

  const unassignedTopics = topics.filter(
    t => !subjects.some(s => String(s.id) === String(t.subject_id))
  )

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-display font-bold text-ink">
        {id ? 'Edit Lesson' : 'Create Lesson'}
      </h1>

      {/* Grouped Topic Dropdown */}
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
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )
          })}
          {unassignedTopics.length > 0 && (
            <optgroup label="Other Topics">
              {unassignedTopics.map(t => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
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
        
