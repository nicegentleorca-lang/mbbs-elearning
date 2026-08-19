import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <CenteredLoading />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export function RequireAdmin({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <CenteredLoading />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function CenteredLoading() {
  return (
    <div className="flex justify-center py-16 text-slate font-mono text-sm">
      Loading…
    </div>
  )
}
