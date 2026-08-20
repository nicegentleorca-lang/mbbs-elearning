import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createSubject, getSubjectById, updateSubject } from '../../lib/content'
import { slugify } from '../../lib/slugify'

export default function AdminSubjectForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEditing) return
    getSubjectById(id)
      .then(subject => {
        setName(subject.name)
        setDescription(subject.description || '')
        setPrice(subject.price_ngn ? String(subject.price_ngn) : '')
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, isEditing])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (isEditing) {
        await updateSubject(id, {
          name,
          slug: slugify(name),
          description,
          price_ngn: price ? Number(price) : 0
        })
      } else {
        await createSubject({
          name,
          slug: slugify(name),
          description,
          price_ngn: price ? Number(price) : 0,
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
      <span className="specimen-label mb-3 block w-fit">Admin · {isEditing ? 'Edit subject' : 'New subject'}</span>
      <h1 className="font-display text-2xl font-semibold mb-6">{isEditing ? 'Edit subject' : 'Add a subject'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          <input required value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Anatomy" />
        </Field>
        <Field label="Description (shown to students)">
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="input" rows={3} />
        </Field>
        <Field label="Price to unlock (₦, one-time)">
          <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="input" placeholder="e.g. 2500" />
        </Field>
        {error && <p className="text-vital text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create subject'}
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
