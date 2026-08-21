import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <p className="text-slate font-mono text-sm p-4">Loading…</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children ? children : <Outlet />
}

export function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return <p className="text-slate font-mono text-sm p-4">Loading…</p>
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children ? children : <Outlet />
}
