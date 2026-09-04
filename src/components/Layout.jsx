import { Link, NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import DeltoidLogo from './DeltoidLogo'

const DARK_FOOTER_ROUTES = ['/login', '/signup']

export default function Layout({ children }) {
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const useDarkFooter = DARK_FOOTER_ROUTES.includes(location.pathname)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // Active link style indicator with whitespace-nowrap to prevent text wrapping
  const navLinkClass = ({ isActive }) =>
    `text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
      isActive ? 'text-ink font-semibold border-b-2 border-vital pb-0.5' : 'text-slate hover:text-ink'
    }`

  return (
    <div className="min-h-screen w-full flex flex-col bg-paper overflow-x-hidden">
      {/* Top Header / Navigation */}
      <header className="border-b border-paperDim bg-paper/95 backdrop-blur-md sticky top-0 z-30 shadow-sm w-full">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">

          {/* Brand Emblem & Name */}
          <Link to="/" className="group flex items-center gap-1.5 shrink-0">
            <DeltoidLogo className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-105" showText={true} />
          </Link>

          {/* Navigation Items (Scrolls horizontally on extremely narrow mobile devices instead of overflowing screen) */}
          <nav className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar py-1">
            {user && (
              <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                <NavLink to="/" end className={navLinkClass}>
                  Courses
                </NavLink>
                <NavLink to="/quizzes" className={navLinkClass}>
                  Quizzes
                </NavLink>
                <NavLink to="/history" className={navLinkClass}>
                  History
                </NavLink>
              </div>
            )}

            {/* Admin Badge */}
            {isAdmin && (
              <NavLink
                to="/admin"
                className="shrink-0 bg-venous/10 text-venous hover:bg-venous hover:text-white text-[10px] sm:text-xs font-mono font-semibold uppercase px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border border-venous/30 transition-all"
              >
                Admin
              </NavLink>
            )}

            {/* Auth Action */}
            {user ? (
              <button
                onClick={handleSignOut}
                className="shrink-0 text-xs sm:text-sm font-medium text-slate hover:text-vital transition-colors border-l border-paperDim pl-2.5 sm:pl-4 whitespace-nowrap"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                className="btn-primary text-xs shrink-0 whitespace-nowrap"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
        {children || <Outlet />}
      </main>

      {/* Footer */}
      <footer
        className={
          useDarkFooter
            ? 'border-t border-white/10 bg-ink py-6 text-xs text-white/50 w-full'
            : 'border-t border-paperDim bg-white/60 py-6 text-xs text-slate w-full'
        }
      >
        <div className="max-w-5xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <DeltoidLogo className="w-4 h-4" />
            <span
              className={
                useDarkFooter
                  ? 'font-display font-bold text-white tracking-wider'
                  : 'font-display font-bold text-ink tracking-wider'
              }
            >
              DELTOID
            </span>
            <span className={useDarkFooter ? 'text-white/40' : 'text-slate-light'}>
              • Active Recall & Medical Practice
            </span>
          </div>
          <p className={`font-mono text-[11px] ${useDarkFooter ? 'text-white/30' : 'text-slate-light'}`}>
            © {new Date().getFullYear()} Deltoid. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
