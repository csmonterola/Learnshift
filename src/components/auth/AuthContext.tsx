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
  signUp: (name: string, email: string, password: string, role: Role) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session on page refresh
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
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
          localStorage.removeItem('auth_token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    const { user: userData, token } = res.data
    localStorage.setItem('auth_token', token)
    setUser({
      id: userData.id,
      name: userData.name,
      role: userData.role,
      email: userData.email,
      avatar: userData.avatar,
    })
  }

  const signUp = async (name: string, email: string, password: string, role: Role) => {
    const res = await authApi.signup(name, email, password, password, role as string)
    const { user: userData, token } = res.data
    localStorage.setItem('auth_token', token)
    setUser({
      id: userData.id,
      name: userData.name,
      role: userData.role,
      email: userData.email,
      avatar: userData.avatar,
    })
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (e) {
      // Ignore errors
    }
    localStorage.removeItem('auth_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, logout }}>
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