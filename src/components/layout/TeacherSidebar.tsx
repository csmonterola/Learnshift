import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Bot,
  Settings,
  LogOut,
  Hexagon,
  MessageCircle,
  FolderOpen,
  X,
} from 'lucide-react'

interface TeacherSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const navItems = [
  { path: '/teacher',           icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/teacher/classes',   icon: BookOpen,        label: 'My Classes' },
  { path: '/teacher/students',  icon: Users,           label: 'Student Profiles' },
  { path: '/teacher/messages',  icon: MessageCircle,   label: 'Messages' },
  { path: '/teacher/content',   icon: FolderOpen,      label: 'Content Manager' },
  { path: '/teacher/ai-logs',   icon: Bot,             label: 'AI Monitoring' },
  { path: '/teacher/settings',  icon: Settings,        label: 'Settings' },
]

export function TeacherSidebar({ isOpen = true, onClose }: TeacherSidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className={`
      w-64 bg-white border-r border-slate-200 h-screen flex flex-col
      fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
      lg:translate-x-0 lg:z-20
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Mobile close button */}
      <button onClick={() => onClose?.()} className="absolute top-5 right-4 p-1 text-gray-400 hover:text-gray-600 lg:hidden">
        <X className="w-5 h-5" />
      </button>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center text-white">
          <Hexagon size={20} fill="currentColor" />
        </div>
        <span className="font-bold text-xl tracking-tight">LearnShift</span>
      </div>

      {/* Profile */}
      <div className="px-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-emerald-400 flex items-center justify-center overflow-hidden">
            <img
              src={user?.avatar || 'https://i.pravatar.cc/150?u=default'}
              alt={user?.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-900">{user?.name}</div>
            <div className="text-xs text-slate-500">Teacher · LearnShift</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-4 flex flex-col gap-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 mb-2 px-2 uppercase tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/teacher'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 w-full transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}