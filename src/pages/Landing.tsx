import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth, Role } from '../components/auth/AuthContext'
import { BookOpen, GraduationCap, Users, User, Lock, Eye, EyeOff } from 'lucide-react'

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
]

export function Landing() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<Role>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedRole && email.trim()) {
      // Use email as the display name for the session
      login(selectedRole, email.trim())
      navigate(`/${selectedRole}`)
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
            Welcome Back
          </h2>
          <p className="text-gray-500 text-[15px]">
            Log in to continue your learning experience.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email / Student ID */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-bold text-gray-700">
              Email or Student ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-xl text-sm transition-all focus:bg-white focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10 outline-none placeholder:text-gray-400"
                placeholder="Enter your email or ID"
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

          {/* Forgot Password */}
          <div className="flex justify-end">
            <a
              href="#"
              className="text-sm font-bold text-accent-500 hover:text-accent-600 transition-colors"
            >
              Forgot Password?
            </a>
          </div>

          {/* Role Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Select Your Role
            </label>
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

          {/* Submit */}
          <button
            type="submit"
            disabled={!selectedRole || !email.trim()}
            className="w-full flex items-center justify-center bg-accent-500 hover:bg-accent-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-accent-500/25 active:scale-[0.98] mt-2"
          >
            Log In
          </button>
        </form>

        {/* Divider */}
        <div className="mt-8 mb-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-4 bg-white text-gray-400 font-semibold tracking-wider">OR</span>
          </div>
        </div>

        {/* Sign Up */}
        <p className="text-center text-[15px] text-gray-500">
          Don't have an account?{' '}
          <a
            href="#"
            className="font-bold text-accent-500 hover:text-accent-600 transition-colors"
          >
            Sign Up
          </a>
        </p>
      </motion.div>
    </div>
  )
}
