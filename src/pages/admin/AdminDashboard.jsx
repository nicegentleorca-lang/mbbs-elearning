import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  return (
    <div>
      <span className="specimen-label mb-3 block w-fit">Admin</span>
      <h1 className="font-display text-3xl font-semibold mb-6">Content management</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/admin/subjects/new" className="index-card p-5 block">
          <h2 className="font-display text-lg font-semibold">+ New subject</h2>
          <p className="text-slate text-sm mt-1">Add Anatomy, Biochemistry, Physiology, etc.</p>
        </Link>
        <Link to="/admin/topics/new" className="index-card p-5 block">
          <h2 className="font-display text-lg font-semibold">+ New topic</h2>
          <p className="text-slate text-sm mt-1">Add a topic under an existing subject.</p>
        </Link>
        <Link to="/admin/lessons/new" className="index-card p-5 block">
          <h2 className="font-display text-lg font-semibold">+ New lesson</h2>
          <p className="text-slate text-sm mt-1">Write notes with embedded images, save as draft or publish.</p>
        </Link>
      </div>
    </div>
  )
}
