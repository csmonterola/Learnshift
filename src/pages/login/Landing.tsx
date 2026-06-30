import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth, Role } from '../../components/auth/AuthContext'
import { BookOpen, GraduationCap, Users, User, Lock, Eye, EyeOff, ShieldCheck, Mail } from 'lucide-react'

const roles = [
  {
    id: 'student' as const,
    label: 'Student',
    icon: GraduationCap,
    desc: 'Access your courses and track progress',
  },
  {
    id: 'teacher' as const,
    label: 'Teacher',
    icon: BookOpen,
    desc: 'Manage classes and monitor student progress',
  },
  {
    id: 'parent' as const,
    label: 'Parent',
    icon: Users,
    desc: "View and support your child's learning",
  },
  {
    id: 'admin' as const,
    label: 'Admin',
    icon: ShieldCheck,
    desc: 'Manage the platform and oversee all users',
  },
]

export function Landing() {
  const { login, signUp, user } = useAuth()
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      const roleRedirects: Record<string, string> = {
        student: '/student',
        teacher: '/teacher',
        admin: '/admin',
        parent: '/parent',
      }
      navigate(roleRedirects[user.role || 'student'] || '/')
    }
  }, [user, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setError(null)
    setIsLoading(true)

    try {
      await login(email.trim(), password)
      // Navigation will happen via useEffect when user state updates
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed. Please check your credentials.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole || !email.trim() || !password.trim() || !name.trim()) return

    setError(null)
    setIsLoading(true)

    try {
      await signUp(name.trim(), email.trim(), password.trim(), selectedRole)
      // Navigation will happen via useEffect when user state updates
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Sign up failed. Please try again.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#eef7f5] via-[#f4f5f7] to-[#eef1f5]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[460px] bg-white rounded-[24px] shadow-[0_8px_40px_rgb(0,0,0,0.06)] p-8 sm:p-10"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="bg-accent-500 p-2 rounded-xl shadow-sm shadow-accent-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-gray-900">
            Learn<span className="text-accent-500">shift</span>
          </h1>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-[28px] font-bold text-gray-900 mb-2 leading-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-500 text-[15px]">
            {isSignUp ? 'Sign up to start your learning journey.' : 'Log in to continue your learning experience.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-5">
          {/* Name (Sign Up only) */}
          {isSignUp && (
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-bold text-gray-700">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-xl text-sm transition-all focus:bg-white focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10 outline-none placeholder:text-gray-400"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-bold text-gray-700">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-xl text-sm transition-all focus:bg-white focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10 outline-none placeholder:text-gray-400"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-bold text-gray-700">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-11 py-3.5 bg-gray-50 border border-gray-200/80 rounded-xl text-sm transition-all focus:bg-white focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10 outline-none placeholder:text-gray-400"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Role Selector (Sign Up only) */}
          {isSignUp && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Select Your Role</label>
              <div className="flex flex-col gap-2.5">
                {roles.map((role) => {
                  const Icon = role.icon
                  const isSelected = selectedRole === role.id
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        isSelected
                          ? 'border-accent-500 bg-accent-50 shadow-sm shadow-accent-500/10'
                          : 'border-gray-200/80 bg-gray-50 hover:border-accent-300 hover:bg-white'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-accent-500 text-white shadow-sm shadow-accent-500/30'
                            : 'bg-white text-gray-400 border border-gray-200'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-bold leading-tight ${
                            isSelected ? 'text-accent-700' : 'text-gray-800'
                          }`}
                        >
                          {role.label}
                        </p>
                        <p
                          className={`text-xs mt-0.5 leading-snug ${
                            isSelected ? 'text-accent-500' : 'text-gray-400'
                          }`}
                        >
                          {role.desc}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute right-4 w-2 h-2 bg-accent-500 rounded-full" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Forgot Password (Login only) */}
          {!isSignUp && (
            <div className="flex justify-end">
              <a
                href="#"
                className="text-sm font-bold text-accent-500 hover:text-accent-600 transition-colors"
              >
                Forgot Password?
              </a>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={
              isSignUp
                ? !selectedRole || !email.trim() || !password.trim() || !name.trim() || isLoading
                : !email.trim() || !password.trim() || isLoading
            }
            className="w-full flex items-center justify-center bg-accent-500 hover:bg-accent-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-accent-500/25 active:scale-[0.98] mt-2"
          >
            {isLoading ? (
              'Loading...'
            ) : isSignUp ? (
              'Create Account'
            ) : (
              'Log In'
            )}
          </button>
        </form>

  
    

      </motion.div>
    </div>
  )
}