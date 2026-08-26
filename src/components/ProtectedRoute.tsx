import { useAuth } from "@/context/AuthContext"
import { Navigate } from "react-router-dom"

export function ProtectedRoute({
  children,
  adminOnly,
}: {
  children: JSX.Element
  adminOnly?: boolean
}) {
  const { isAuthenticated, loading, user } = useAuth()
  if (loading) return null // or a spinner
  if (!isAuthenticated) return <Navigate to="/login" replace />
  // Authenticated but not authorized is a different case than not logged
  // in at all — send them back to their own dashboard rather than
  // bouncing them to /login, which would be confusing (they ARE logged in).
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return children
}
