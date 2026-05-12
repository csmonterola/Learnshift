import React, { useState, createContext, useContext, ReactNode } from 'react'

export type Role = 'student' | 'teacher' | 'parent' | 'admin' | null

interface User {
  id: string
  name: string
  role: Role
  avatar?: string
}

interface AuthContextType {
  user: User | null
  login: (role: Role, name: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = (role: Role, name: string) => {
    setUser({
      id: Math.random().toString(36).substring(7),
      name,
      role,
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${name}`,
    })
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
      }}
    >
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
