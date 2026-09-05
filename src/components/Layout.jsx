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

  // Modern Segmented Pill Indicator
  const navLinkClass = ({ isActive }) =>
    `text-xs sm:text-sm font-medium transition-all px-3.5 py-1.5 rounded-full whitespace-nowrap ${
      isActive
        ? 'bg-ink text-white font-semibold shadow-sm'
        : 'text-slate hover:text-ink hover:bg-white/60'
    }`

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-x-hidden">
      {/* Background Ambient Glow Orbs */}
      <div className="pointer-events-none fixed -top-32 -left-32 w-96 h-96 bg-venous/15 rounded-full blur-3xl z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-32 w-96 h-96 bg-ink/10 rounded-full blur-3xl z-0" />
      <div className="pointer-events-none fixed -bottom-32 left-1/3 w-96 h-96 bg-gold/10 rounded-full blur-3xl z-0" />

      {/* Floating Modern iOS Glass Navigation Bar */}
      <div className="sticky top-0 z-40 w-full px-3 sm:px-6 pt-3 sm:pt-4 pb-2">
        <header className="max-w-5xl mx-auto bg-white/70 backdrop-blur-xl border border-white/80 rounded-full shadow-glass px-4 py-2 flex items-center justify-between gap-2 transition-all">
          
          {/* Brand Emblem & Name */}
          <Link to="/" className="group flex items-center gap-2 shrink-0 pl-1">
            <DeltoidLogo className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-105" showText={true} />
          </Link>

          {/* Nav Items */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            {user && (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
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
                className="shrink-0 bg-venous/10 text-venous hover:bg-venous hover:text-white text-[10px] sm:text-xs font-mono font-semibold uppercase px-3 py-1 rounded-full border border-venous/30 transition-all ml-1"
              >
                Admin
              </NavLink>
            )}

            {/* Auth Action */}
            {user ? (
              <button
                onClick={handleSignOut}
                className="shrink-0 text-xs sm:text-sm font-medium text-slate hover:text-vital transition-colors border-l border-paperDim/80 pl-3 ml-1 whitespace-nowrap"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                className="btn-primary text-xs shrink-0 whitespace-nowrap py-1.5 px-4"
              >
                Sign in
              </Link>
            )}
          </nav>
        </header>
      </div>

      {/* Main Page Body */}
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 z-10">
        {children || <Outlet />}
      </main>

      {/* Floating Glass Footer */}
      <footer className="w-full px-3 sm:px-6 pb-4 pt-6 z-10">
        <div
          className={
            useDarkFooter
              ? 'max-w-5xl mx-auto rounded-3xl border border-white/10 bg-ink/95 backdrop-blur-xl p-6 text-xs text-white/50 shadow-glass'
              : 'max-w-5xl mx-auto rounded-3xl border border-white/80 bg-white/60 backdrop-blur-xl p-6 text-xs text-slate shadow-glass'
          }
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
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
        </div>
      </footer>
    </div>
  )
}
