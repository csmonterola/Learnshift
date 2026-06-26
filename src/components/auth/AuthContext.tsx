import React, { useState, createContext, useContext, ReactNode, useEffect } from 'react'
import { authApi } from '../../lib/api'

export type Role = 'student' | 'teacher' | 'parent' | 'admin' | null

interface User {
  id: string
  name: string
  role: Role
  email?: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session on page refresh via HttpOnly cookie (auto-sent with credentials)
  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        const userData = res.data
        setUser({
          id: userData.id,
          name: userData.name,
          role: userData.role,
          email: userData.email,
          avatar: userData.avatar,
        })
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    const { user: userData } = res.data
    setUser({
      id: userData.id,
      name: userData.name,
      role: userData.role,
      email: userData.email,
      avatar: userData.avatar,
    })
  }

  const forgotPassword = async (email: string) => {
    await authApi.forgotPassword(email)
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (e) {
      // Ignore errors
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, forgotPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}