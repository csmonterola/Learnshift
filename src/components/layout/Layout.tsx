import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  BookOpen,
  LayoutDashboard,
  Map,
  PenTool,
  TrendingUp,
  LogOut,
  Users,
  Settings,
  FileText,
  MessageSquare,
  Activity,
} from 'lucide-react'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (!user) {
    return <Outlet />
  }

  const getNavItems = () => {
    switch (user.role) {
      case 'student':
        return [
          {
            icon: LayoutDashboard,
            label: 'Dashboard',
            path: '/student',
          },
          {
            icon: BookOpen,
            label: 'Subjects',
            path: '/student/subjects',
          },
          {
            icon: Map,
            label: 'Skill Tree',
            path: '/student/skill-tree',
          },
          {
            icon: PenTool,
            label: 'Practice',
            path: '/student/practice',
          },
          {
            icon: TrendingUp,
            label: 'Progress',
            path: '/student/progress',
          },
          {
            icon: Activity,
            label: 'Diagnostic',
            path: '/student/diagnostic',
          },
        ]
      case 'teacher':
        return [
          {
            icon: LayoutDashboard,
            label: 'Dashboard',
            path: '/teacher',
          },
          {
            icon: Users,
            label: 'Classroom',
            path: '/teacher/classroom',
          },
          {
            icon: FileText,
            label: 'Content',
            path: '/teacher/content',
          },
          {
            icon: MessageSquare,
            label: 'AI Logs',
            path: '/teacher/ai-logs',
          },
        ]
      case 'parent':
        return [
          {
            icon: LayoutDashboard,
            label: 'Dashboard',
            path: '/parent',
          },
          {
            icon: TrendingUp,
            label: 'Progress',
            path: '/parent/progress',
          },
          {
            icon: BookOpen,
            label: 'Curriculum',
            path: '/parent/curriculum',
          },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center gap-2 font-extrabold text-xl tracking-tight">
            <div className="bg-accent-500 p-1.5 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-900">
              Learn<span className="text-accent-500">shift</span>
            </span>
          </div>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === `/${user.role}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
              <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
