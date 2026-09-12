import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <span className="specimen-label mb-2 block w-fit">Admin Portal</span>
        <h1 className="font-display text-3xl font-semibold text-ink">Content Management</h1>
        <p className="text-slate text-sm mt-1">Manage subjects, topics, paywalled notes, and student quizzes.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/admin/manage" className="index-card p-5 block border-venous/50 bg-paper/50 hover:border-venous transition-all">
          <h2 className="font-display text-lg font-semibold text-venous">⚙ Manage & Delete Content</h2>
          <p className="text-slate text-sm mt-1">Browse, edit, lock/unlock, or purge existing subjects, topics, and lessons.</p>
        </Link>
        <Link to="/admin/subjects/new" className="index-card p-5 block hover:border-slate/40 transition-all">
          <h2 className="font-display text-lg font-semibold text-ink">+ New Subject</h2>
          <p className="text-slate text-sm mt-1">Add Anatomy, Biochemistry, Pathology, etc.</p>
        </Link>
        <Link to="/admin/topics/new" className="index-card p-5 block hover:border-slate/40 transition-all">
          <h2 className="font-display text-lg font-semibold text-ink">+ New Topic</h2>
          <p className="text-slate text-sm mt-1">Add a sub-category under an existing subject module.</p>
        </Link>
        <Link to="/admin/lessons/new" className="index-card p-5 block hover:border-slate/40 transition-all">
          <h2 className="font-display text-lg font-semibold text-ink">+ New Lesson</h2>
          <p className="text-slate text-sm mt-1">Create rich notes with embedded images, free previews, and paywalled content.</p>
        </Link>
        <Link to="/admin/quiz/new" className="index-card p-5 block border-venous/30 hover:border-venous transition-all">
          <h2 className="font-display text-lg font-semibold text-venous">+ New Quiz</h2>
          <p className="text-slate text-sm mt-1">Create timed MCQs, True/False, or Assertion & Reason practice tests.</p>
        </Link>
      </div>
    </div>
  )
}
