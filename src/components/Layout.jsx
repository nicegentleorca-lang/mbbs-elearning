import { Link, NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import DeltoidLogo from './DeltoidLogo'

// Routes that use a full-bleed dark hero (like Login) should carry that
// theme through into the footer too, instead of transitioning into the
// default plain/pale footer right after a vivid panel.
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

  // Active link style indicator
  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-ink font-semibold border-b-2 border-vital pb-0.5' : 'text-slate hover:text-ink'
    }`

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      {/* Top Header / Navigation */}
      <header className="border-b border-paperDim bg-paper/95 backdrop-blur-md sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">

          {/* Brand Emblem & Name */}
          <Link to="/" className="group flex items-center gap-2">
            <DeltoidLogo className="w-8 h-8 transition-transform group-hover:scale-105" showText={true} />
          </Link>

          {/* Navigation Items */}
          <nav className="flex items-center gap-5 sm:gap-6">
            {user && (
              <div className="flex items-center gap-4 sm:gap-6">
                <NavLink to="/" end className={navLinkClass}>
                  Crash Courses
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
                className="bg-venous/10 text-venous hover:bg-venous hover:text-white text-xs font-mono font-semibold uppercase px-2.5 py-1 rounded border border-venous/30 transition-all"
              >
                Admin
              </NavLink>
            )}

            {/* Auth Action */}
            {user ? (
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-slate hover:text-vital transition-colors border-l border-paperDim pl-4"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                className="btn-primary text-xs"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Page Body — a flex column itself, so a single full-height
          page (like Login) can stretch to fill it exactly. */}
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {children || <Outlet />}
      </main>

      {/* Footer — dark/themed on full-bleed hero pages so it flows
          naturally out of the panel above, plain/pale everywhere else. */}
      <footer
        className={
          useDarkFooter
            ? 'border-t border-white/10 bg-ink py-6 text-xs text-white/50'
            : 'border-t border-paperDim bg-white/60 py-6 text-xs text-slate'
        }
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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
