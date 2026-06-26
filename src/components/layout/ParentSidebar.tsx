import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { parentApi } from '../../lib/api'
import {
  LayoutDashboardIcon,
  BookOpenIcon,
  BarChart3Icon,
  SettingsIcon,
  LogOutIcon,
  MoreVerticalIcon,
} from 'lucide-react'

const navItems = [
  { path: '/parent',                  label: 'Dashboard',       icon: LayoutDashboardIcon },
  { path: '/parent/course-materials', label: 'Course Materials', icon: BookOpenIcon },
  { path: '/parent/activity',         label: 'Student Activity',  icon: BarChart3Icon },
  { path: '/parent/settings',         label: 'Settings',         icon: SettingsIcon },
]

interface ChildSummary {
  id: number
  name: string
  studentProfile?: { grade_level?: string }
}

export function ParentSidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [children, setChildren] = useState<ChildSummary[]>([])

  useEffect(() => {
    parentApi.dashboard()
      .then(res => setChildren(res.data?.children ?? []))
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const firstChild = children[0]

  return (
    <div className="w-60 bg-white h-screen flex flex-col border-r border-gray-200 fixed left-0 top-0 z-20">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <span className="font-bold text-xl">LearnShift</span>
      </div>

      {/* Account cards */}
      <div className="px-4 mb-6">
        {/* Parent account */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{user?.name}</div>
            <div className="text-xs text-gray-500">Parent account</div>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreVerticalIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Child card - only show if children exist */}
        {firstChild && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3 relative">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-700 font-semibold">
                {firstChild.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{firstChild.name}</div>
              <div className="text-xs text-gray-500">
                {firstChild.studentProfile?.grade_level ?? 'Student'} · Linked
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 absolute top-3 right-3" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-4 flex-1">
        <div className="text-xs font-semibold text-gray-400 mb-3 px-3">MENU</div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute right-3" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Sign out */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm w-full transition-colors"
        >
          <LogOutIcon className="w-5 h-5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  )
}