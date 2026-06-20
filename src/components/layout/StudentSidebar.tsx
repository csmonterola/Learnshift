import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  LayoutGrid,
  GitBranch,
  PlayCircle,
  MessageCircle,
  LineChart,
  Activity,
  Settings,
  LogOut,
  Users,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard',   icon: LayoutGrid,    path: '/student' },
  { label: 'My Classes',  icon: Users,         path: '/student/classes' },
  { label: 'Skill Tree',  icon: GitBranch,      path: '/student/skill-tree' },
  { label: 'Practice',    icon: PlayCircle,     path: '/student/practice' },
  { label: 'Messages',    icon: MessageCircle,  path: '/student/messages' },
  { label: 'My Progress', icon: LineChart,      path: '/student/progress' },
  { label: 'Diagnostic',  icon: Activity,       path: '/student/diagnostic' },
  { label: 'Settings',    icon: Settings,       path: '/student/settings' },
]

export function StudentSidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className="w-[260px] bg-white h-screen sticky top-0 flex flex-col border-r border-gray-100 shrink-0">
      {/* Profile Section */}
      <div className="flex flex-col items-center pt-10 pb-6 px-6">
        <div className="w-20 h-20 rounded-full bg-emerald-50 mb-4 p-1 overflow-hidden border-2 border-emerald-100">
          <img
            src={user?.avatar || 'https://i.pravatar.cc/150?u=default'}
            alt={user?.name}
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
        <p className="text-sm text-gray-500 mt-0.5">Student · LearnShift</p>
      </div>

      <div className="px-6 mb-4">
        <div className="h-px bg-gray-100 w-full" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/student'}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className="text-[15px]">{item.label}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 mt-auto space-y-3 mb-2">
        <NavLink
          to="/student/messages"
          className="block bg-emerald-100/50 rounded-2xl p-4 hover:bg-emerald-100 transition-colors"
        >
          <p className="text-xs font-semibold text-emerald-700 mb-1">Got a question?</p>
          <p className="text-sm font-bold text-emerald-800 leading-tight">
            Message your teacher →
          </p>
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}