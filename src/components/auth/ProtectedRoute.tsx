import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, Role } from './AuthContext'

interface ProtectedRouteProps {
  allowedRoles?: Role[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const roleRedirects: Record<string, string> = {
      student: '/student',
      teacher: '/teacher',
      admin: '/admin',
      parent: '/parent',
    }
    return <Navigate to={roleRedirects[user.role || 'student'] || '/'} replace />
  }

  return <Outlet />
}
