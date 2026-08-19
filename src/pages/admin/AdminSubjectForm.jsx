import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSubject } from '../../lib/content'
import { slugify } from '../../lib/slugify'

export default function AdminSubjectForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createSubject({
        name,
        slug: slugify(name),
        description,
        price_ngn: price ? Number(price) : 0,
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
      <span className="specimen-label mb-3 block w-fit">Admin · New subject</span>
      <h1 className="font-display text-2xl font-semibold mb-6">Add a subject</h1>
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
          {saving ? 'Saving…' : 'Create subject'}
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
