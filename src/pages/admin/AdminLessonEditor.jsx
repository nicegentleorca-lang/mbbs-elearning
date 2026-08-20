import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { getSubjects, getTopicsBySubject, upsertLesson, uploadLessonImage } from '../../lib/content'
import { slugify } from '../../lib/slugify'

export default function AdminLessonEditor() {
  const navigate = useNavigate()
  const previewQuillRef = useRef(null)
  const contentQuillRef = useRef(null)
  const lessonSlugRef = useRef('untitled')

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

  const [previewImageStatus, setPreviewImageStatus] = useState('No file chosen yet.')
  const [contentImageStatus, setContentImageStatus] = useState('No file chosen yet.')

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

  useEffect(() => {
    lessonSlugRef.current = lessonSlug
  }, [lessonSlug])

  async function handlePlainFileUpload(e, quillRef, setStatus) {
    const file = e.target.files[0]
    if (!file) {
      setStatus('No file was received from the picker. Try again.')
      return
    }

    setStatus(`File detected: ${file.name} (${Math.round(file.size / 1024)} KB). Uploading…`)
    setError('')
    try {
      const url = await uploadLessonImage(file, lessonSlugRef.current)
      setStatus(`Uploaded successfully. Inserting into the lesson…`)
      const editor = quillRef.current.getEditor()
      const range = editor.getSelection(true) || { index: editor.getLength() }
      editor.insertEmbed(range.index, 'image', url)
      editor.setSelection(range.index + 1)
      setStatus(`Done — image inserted.`)
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['clean']
      ]
    }
  }), [])

  const previewModules = useMemo(() => ({
    toolbar: [['bold', 'italic'], ['clean']]
  }), [])

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

      <p className="text-sm text-slate mb-1">Free preview (shown to everyone — keep this to one paragraph or image)</p>
      <div className="bg-white border border-paperDim rounded-card mb-1">
        <ReactQuill
          ref={previewQuillRef}
          theme="snow"
          value={previewHtml}
          onChange={setPreviewHtml}
          modules={previewModules}
        />
      </div>
      <div className="mb-1">
        <label className="btn-secondary inline-block cursor-pointer text-sm">
          Add image to preview
          <input
            type="file"
            accept="image/*"
            className="block w-full mt-2"
            onChange={e => handlePlainFileUpload(e, previewQuillRef, setPreviewImageStatus)}
          />
        </label>
      </div>
      <p className="text-xs font-mono text-slate mb-4">{previewImageStatus}</p>

      <p className="text-sm text-slate mb-1">Full notes (paywalled until the subject is purchased)</p>
      <div className="bg-white border border-paperDim rounded-card mb-1">
        <ReactQuill
          ref={contentQuillRef}
          theme="snow"
          value={contentHtml}
          onChange={setContentHtml}
          modules={modules}
        />
      </div>
      <div className="mb-1">
        <label className="btn-secondary inline-block cursor-pointer text-sm">
          Add image to full notes
          <input
            type="file"
            accept="image/*"
            className="block w-full mt-2"
            onChange={e => handlePlainFileUpload(e, contentQuillRef, setContentImageStatus)}
          />
        </label>
      </div>
      <p className="text-xs font-mono text-slate mb-4">{contentImageStatus}</p>

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
