import { Link, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout({ children }) {
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-paperDim bg-paper/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-semibold text-ink">
            Preclinical Notes
          </Link>
          <nav className="flex items-center gap-4 text-sm font-sans">
            {user && (
              <>
                <Link to="/" className="text-slate hover:text-ink">Subjects</Link>
                <Link to="/quizzes" className="text-slate hover:text-ink">Quizzes</Link>
              </>
            )}
            {isAdmin && (
              <Link to="/admin" className="text-venous hover:text-venousDark font-medium">Admin</Link>
            )}
            {user ? (
              <button onClick={handleSignOut} className="text-slate hover:text-vital">Sign out</button>
            ) : (
              <Link to="/login" className="text-slate hover:text-ink">Sign in</Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {children || <Outlet />}
      </main>
      <footer className="border-t border-paperDim py-4 text-center text-xs text-slate-light font-mono">
        Preclinical Notes — Anatomy · Biochemistry · Physiology
      </footer>
    </div>
  )
}
