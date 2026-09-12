import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { supabase } from '../../lib/supabase'
import { getLessonById } from '../../lib/content'

// Utility function to compress images client-side before uploading
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.src = URL.createObjectURL(file)
    image.onload = () => {
      const canvas = document.createElement('canvas')
      let width = image.width
      let height = image.height

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: 'image/webp',
              lastModified: Date.now()
            })
            resolve(newFile)
          } else {
            reject(new Error('Image canvas compression failed'))
          }
        },
        'image/webp',
        quality
      )
    }
    image.onerror = (err) => reject(err)
  })
}

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
  const [errorMessage, setErrorMessage] = useState('')

  const previewFileInputRef = useRef(null)
  const fullFileInputRef = useRef(null)

  const previewQuillRef = useRef(null)
  const fullQuillRef = useRef(null)

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'clean']
    ]
  }), [])

  useEffect(() => {
    fetchInitialData()
  }, [id])

  async function fetchInitialData() {
    setLoading(true)
    setErrorMessage('')
    
    try {
      const [{ data: subData, error: subErr }, { data: topData, error: topErr }] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('topics').select('*').order('sort_order', { ascending: true })
      ])

      if (subErr) throw subErr
      if (topErr) throw topErr

      setSubjects(subData || [])
      setTopics(topData || [])

      if (id) {
        const lesson = await getLessonById(id)
        if (lesson) {
          setTitle(lesson.title || '')
          setPreviewContent(lesson.preview_html || '')
          setFullContent(lesson.content_html || '')
          setSelectedTopic(String(lesson.topic_id || ''))
        }
      }
    } catch (err) {
      setErrorMessage('Error initializing editor: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleImageUpload(e, quillRef) {
    const rawFile = e.target.files?.[0]
    if (!rawFile) return

    const buttonEl = e.target.previousElementSibling
    const originalText = buttonEl ? buttonEl.innerText : ''
    if (buttonEl) buttonEl.innerText = 'Compressing & Uploading...'

    try {
      // Compress asset client-side before sending to bucket
      const fileToUpload = await compressImage(rawFile)
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.webp`
      const filePath = `lessons/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('lesson-images')
        .upload(filePath, fileToUpload, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('lesson-images')
        .getPublicUrl(filePath)

      if (!data?.publicUrl) throw new Error('Could not resolve image public URL')

      const imageUrl = data.publicUrl

      const quill = quillRef.current?.getEditor()
      if (quill) {
        const range = quill.getSelection(true)
        const index = range ? range.index : quill.getLength()
        quill.insertEmbed(index, 'image', imageUrl)
        quill.setSelection(index + 1)
      }
    } catch (err) {
      alert('Failed to process image: ' + err.message)
    } finally {
      e.target.value = ''
      if (buttonEl) buttonEl.innerText = originalText
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedTopic) {
      alert('Please select a topic for this lesson.')
      return
    }

    setSaving(true)
    setErrorMessage('')
    
    const payload = {
      title: title.trim(),
      topic_id: selectedTopic,
      preview_html: previewContent,
      content_html: fullContent,
      updated_at: new Date()
    }

    try {
      let error
      if (id) {
        ;({ error } = await supabase.from('lessons').update(payload).eq('id', id))
      } else {
        ;({ error } = await supabase.from('lessons').insert([payload]))
      }

      if (error) throw error

      navigate('/admin/manage')
    } catch (err) {
      setErrorMessage('Failed to save lesson: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate font-mono text-sm">Loading editor engine...</div>

  const unassignedTopics = topics.filter(
    t => !subjects.some(s => String(s.id) === String(t.subject_id))
  )

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-ink">
          {id ? 'Edit Lesson Notes' : 'Create New Lesson'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/admin/manage')}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          Cancel
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-vital/10 border border-vital/30 rounded text-vital text-xs font-mono">
          {errorMessage}
        </div>
      )}

      {/* Topic Selection */}
      <div>
        <label className="block text-xs font-mono uppercase text-slate font-bold mb-1">Target Topic</label>
        <select
          value={selectedTopic}
          onChange={e => setSelectedTopic(e.target.value)}
          required
          className="w-full p-2.5 border border-paperDim rounded bg-white text-ink text-sm focus:outline-none focus:border-venous"
        >
          <option value="">-- Choose Target Topic --</option>
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

      {/* Title */}
      <div>
        <label className="block text-xs font-mono uppercase text-slate font-bold mb-1">Lesson Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Brachial Plexus Anatomy & Lesions"
          required
          className="w-full p-2.5 border border-paperDim rounded bg-white text-ink text-sm focus:outline-none focus:border-venous"
        />
      </div>

      {/* Free Preview */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-mono uppercase text-slate font-bold">Free Preview Snippet</label>
          <button
            type="button"
            onClick={() => previewFileInputRef.current?.click()}
            className="text-xs text-venous hover:underline font-medium"
          >
            + Embed Compressed Image
          </button>
          <input
            type="file"
            ref={previewFileInputRef}
            onChange={e => handleImageUpload(e, previewQuillRef)}
            accept="image/*"
            className="hidden"
          />
        </div>
        <div className="bg-white rounded">
          <ReactQuill 
            ref={previewQuillRef} 
            theme="snow" 
            value={previewContent} 
            onChange={setPreviewContent} 
            modules={quillModules}
          />
        </div>
      </div>

      {/* Full Notes */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-mono uppercase text-slate font-bold">Full Notes (Paywalled Content)</label>
          <button
            type="button"
            onClick={() => fullFileInputRef.current?.click()}
            className="text-xs text-venous hover:underline font-medium"
          >
            + Embed Compressed Image
          </button>
          <input
            type="file"
            ref={fullFileInputRef}
            onChange={e => handleImageUpload(e, fullQuillRef)}
            accept="image/*"
            className="hidden"
          />
        </div>
        <div className="bg-white rounded">
          <ReactQuill 
            ref={fullQuillRef} 
            theme="snow" 
            value={fullContent} 
            onChange={setFullContent} 
            modules={quillModules}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-venous text-white rounded font-medium hover:bg-venousDark transition disabled:opacity-50 text-sm shadow-sm"
      >
        {saving ? 'Saving Lesson Data...' : 'Publish Lesson'}
      </button>
    </form>
  )
        }
