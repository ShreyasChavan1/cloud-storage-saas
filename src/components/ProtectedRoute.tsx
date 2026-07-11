import { useAuth } from "@/context/AuthContext"
import { Navigate } from "react-router-dom"

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null // or a spinner
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}