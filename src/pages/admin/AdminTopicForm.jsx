import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSubjects, createTopic } from '../../lib/content'
import { slugify } from '../../lib/slugify'

export default function AdminTopicForm() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSubjects().then(subs => {
      setSubjects(subs)
      if (subs.length > 0) setSubjectId(subs[0].id)
    }).catch(err => setError(err.message))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createTopic({
        subject_id: subjectId,
        name,
        slug: slugify(name),
        sort_order: 0
      })
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg">
      <span className="specimen-label mb-3 block w-fit">Admin · New topic</span>
      <h1 className="font-display text-2xl font-semibold mb-6">Add a topic</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Subject">
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="input">
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Topic name">
          <input required value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Upper Limb" />
        </Field>
        {error && <p className="text-vital text-sm">{error}</p>}
        <button type="submit" disabled={saving || !subjectId} className="btn-primary">
          {saving ? 'Saving…' : 'Create topic'}
        </button>
      </form>
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
