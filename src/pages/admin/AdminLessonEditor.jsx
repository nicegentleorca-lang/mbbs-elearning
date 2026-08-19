import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { getSubjects, getTopicsBySubject, upsertLesson, uploadLessonImage } from '../../lib/content'
import { slugify } from '../../lib/slugify'

export default function AdminLessonEditor() {
  const navigate = useNavigate()
  const quillRef = useRef(null)

  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [title, setTitle] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    getSubjects().then(subs => {
      setSubjects(subs)
      if (subs.length > 0) setSubjectId(subs[0].id)
    }).catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    if (!subjectId) return
    getTopicsBySubject(subjectId).then(tps => {
      setTopics(tps)
      setTopicId(tps[0]?.id ?? '')
    }).catch(err => setError(err.message))
  }, [subjectId])

  const lessonSlug = useMemo(() => slugify(title || 'untitled'), [title])

  function imageHandler() {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()
    input.onchange = async () => {
      const file = input.files[0]
      if (!file) return
      try {
        const url = await uploadLessonImage(file, lessonSlug)
        const editor = quillRef.current.getEditor()
        const range = editor.getSelection(true)
        editor.insertEmbed(range.index, 'image', url)
        editor.setSelection(range.index + 1)
      } catch (err) {
        setError(`Image upload failed: ${err.message}`)
      }
    }
  }

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['image'],
        ['clean']
      ],
      handlers: { image: imageHandler }
    }
  }), [lessonSlug])

  async function handleSave(status) {
    setSaving(true)
    setError('')
    setSavedMessage('')
    try {
      await upsertLesson({
        topic_id: topicId,
        title,
        slug: lessonSlug,
        preview_html: previewHtml,
        content_html: contentHtml,
        status,
        sort_order: 0
      })
      setSavedMessage(status === 'draft' ? 'Saved as draft.' : 'Published.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <span className="specimen-label mb-3 block w-fit">Admin · New lesson</span>
      <h1 className="font-display text-2xl font-semibold mb-6">Write a lesson</h1>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <Field label="Subject">
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="input">
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Topic">
          <select value={topicId} onChange={e => setTopicId(e.target.value)} className="input">
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Lesson title">
        <input value={title} onChange={e => setTitle(e.target.value)} className="input mb-4" placeholder="e.g. Brachial Plexus" />
      </Field>

      <Field label="Free preview (shown to everyone — keep this to one paragraph or image)">
        <div className="bg-white border border-paperDim rounded-card mb-4">
          <ReactQuill
            theme="snow"
            value={previewHtml}
            onChange={setPreviewHtml}
            modules={{ toolbar: [['bold', 'italic'], ['image'], ['clean']] }}
          />
        </div>
      </Field>

      <Field label="Full notes (paywalled until the subject is purchased)">
        <div className="bg-white border border-paperDim rounded-card mb-4">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={contentHtml}
            onChange={setContentHtml}
            modules={modules}
          />
        </div>
      </Field>

      {error && <p className="text-vital text-sm mb-3">{error}</p>}
      {savedMessage && <p className="text-venous text-sm mb-3">{savedMessage}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => handleSave('draft')}
          disabled={saving || !title || !topicId}
          className="btn-secondary"
        >
          Save as draft
        </button>
        <button
          onClick={() => handleSave('published')}
          disabled={saving || !title || !topicId}
          className="btn-primary"
        >
          {saving ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm text-slate mb-1">{label}</span>
      {children}
    </label>
  )
}
