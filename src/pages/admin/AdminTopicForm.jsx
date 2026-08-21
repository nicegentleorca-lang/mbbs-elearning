import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createTopic, getTopicById, updateTopic, getSubjects } from '../../lib/content'
import { slugify } from '../../lib/slugify'

export default function AdminTopicForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [name, setName] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const subs = await getSubjects()
        setSubjects(subs)
        if (isEditing) {
          const topic = await getTopicById(id)
          setName(topic.name)
          setSubjectId(topic.subject_id)
        } else if (subs.length > 0) {
          setSubjectId(subs[0].id)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, isEditing])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (isEditing) {
        await updateTopic(id, {
          name,
          slug: slugify(name),
          subject_id: subjectId
        })
      } else {
        await createTopic({
          subject_id: subjectId,
          name,
          slug: slugify(name),
          sort_order: 0
        })
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
    <div className="max-w-lg">
      <span className="specimen-label mb-3 block w-fit">Admin · {isEditing ? 'Edit topic' : 'New topic'}</span>
      <h1 className="font-display text-2xl font-semibold mb-6">{isEditing ? 'Edit topic' : 'Add a topic'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Subject">
          <select
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            className="input"
            required
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Topic Name">
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
            placeholder="e.g. Upper Limb"
          />
        </Field>
        {error && <p className="text-vital text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create topic'}
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
