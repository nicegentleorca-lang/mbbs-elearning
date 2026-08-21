import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import {
  getSubjects, getTopicsBySubject, createLesson,
  getLessonById, updateLesson, uploadLessonImage
} from '../../lib/content'
import { slugify } from '../../lib/slugify'

export default function AdminLessonEditor() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [status, setStatus] = useState('draft')

  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      try {
        const subs = await getSubjects()
        setSubjects(subs)

        if (isEditing) {
          const lesson = await getLessonById(id)
          setTitle(lesson.title)
          setPreviewHtml(lesson.preview_html || '')
          setContentHtml(lesson.content_html || '')
          setStatus(lesson.status || 'draft')
          setTopicId(lesson.topic_id)
        } else if (subs.length > 0) {
          setSubjectId(subs[0].id)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, isEditing])

  useEffect(() => {
    if (!subjectId) return
    getTopicsBySubject(subjectId)
      .then(t => {
        setTopics(t)
        if (!isEditing && t.length > 0 && !topicId) setTopicId(t[0].id)
      })
      .catch(err => setError(err.message))
  }, [subjectId, isEditing, topicId])

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const url = await uploadLessonImage(file, slugify(title || 'lesson-image'))
      setContentHtml(prev => prev + `<p><img src="${url}" alt="Lesson image" /></p>`)
    } catch (err) {
      setError('Image upload failed: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!topicId) return setError('Please select a topic.')
    setSaving(true)
    setError('')
    try {
      const payload = {
        topic_id: topicId,
        title,
        slug: slugify(title),
        preview_html: previewHtml,
        content_html: contentHtml,
        status
      }

      if (isEditing) {
        await updateLesson(id, payload)
      } else {
        await createLesson({ ...payload, sort_order: 0 })
      }
      navigate('/admin/manage')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-slate font-mono text-sm">Loading…</p>

  return (
    <div className="max-w-3xl">
      <span className="specimen-label mb-3 block w-fit">Admin · {isEditing ? 'Edit lesson' : 'New lesson'}</span>
      <h1 className="font-display text-2xl font-semibold mb-6">{isEditing ? 'Edit lesson' : 'Write a lesson'}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm text-slate mb-1">Subject</span>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="input"
            >
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm text-slate mb-1">Topic</span>
            <select
              value={topicId}
              onChange={e => setTopicId(e.target.value)}
              className="input"
              required
            >
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="block text-sm text-slate mb-1">Lesson Title</span>
          <input
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input"
            placeholder="e.g. Brachial Plexus"
          />
        </label>

        <div>
          <span className="block text-sm text-slate mb-1">Free Preview Content</span>
          <ReactQuill theme="snow" value={previewHtml} onChange={setPreviewHtml} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="block text-sm text-slate">Full Notes (Paywalled)</span>
            <label className="text-xs text-venous cursor-pointer hover:underline">
              {uploadingImage ? 'Uploading image…' : '+ Embed image'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
            </label>
          </div>
          <ReactQuill theme="snow" value={contentHtml} onChange={setContentHtml} />
        </div>

        <div className="flex items-center gap-4">
          <label className="block">
            <span className="block text-sm text-slate mb-1">Status</span>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input w-32">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>

        {error && <p className="text-vital text-sm">{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Publish / Save'}
          </button>
        </div>
      </form>
    </div>
  )
  }
