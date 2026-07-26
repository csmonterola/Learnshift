import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { TeacherSidebar } from './TeacherSidebar'
import { Menu } from 'lucide-react'

export function TeacherLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      {/* Mobile header (shown when no page-level topbar) */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 flex items-center px-4 z-10 lg:hidden">
        <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-600">
          <Menu className="w-6 h-6" />
        </button>
        <span className="ml-3 font-bold text-gray-900">LearnShift</span>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <TeacherSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 ml-0 lg:ml-64 pt-14 lg:pt-0">
        <Outlet context={{ setSidebarOpen }} />
      </div>
    </div>
  )
}
