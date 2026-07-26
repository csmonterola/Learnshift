import React, { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Grid,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronRight,
  BookOpen,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard',          path: '/admin',                    icon: LayoutDashboard },
  { name: 'Account Generation', path: '/admin/account-generation', icon: UserPlus },
  { name: 'User Directory',     path: '/admin/directory',          icon: Users },
  { name: 'Class Management',   path: '/admin/classes',            icon: Grid },
  { name: 'Settings',           path: '/admin/settings',           icon: Settings },
]

export function AdminLayout() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex h-screen w-full bg-[#f3f4f6] font-sans text-gray-900 overflow-hidden">
      {/* Backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-white border-r border-slate-200 flex flex-col h-screen
        fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:z-20
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile close */}
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 lg:hidden">
          <X className="w-5 h-5" />
        </button>
        {/* Logo */}
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

        {/* Profile Card */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="bg-slate-50 rounded-xl px-3 py-3 flex items-center gap-3 border border-slate-100">
            <div className="relative shrink-0">
              <img
                src={user?.avatar ?? `https://ui-avatars.com/api/?name=Admin&background=d1fae5&color=065f46`}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=Admin&background=d1fae5&color=065f46`
                }}
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-slate-900 truncate">{user?.name ?? 'School Admin'}</div>
              <div className="text-xs text-slate-500">System Administrator</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-6 px-4 flex flex-col gap-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 mb-2 px-2 uppercase tracking-wider">
            Main Menu
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/admin' && location.pathname.startsWith(item.path))
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.path === '/admin'}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={18}
                      className={isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Sign Out */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden ml-0 lg:ml-64">
        {/* Topbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-600 hover:text-gray-900 lg:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-full text-sm focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-slate-500">Tuesday, May 12, 2026</span>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <img
              src={user?.avatar ?? `https://ui-avatars.com/api/?name=Admin&background=d1fae5&color=065f46`}
              alt="User"
              className="w-9 h-9 rounded-full border border-slate-200 object-cover"
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
