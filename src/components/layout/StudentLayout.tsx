import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { StudentSidebar } from './StudentSidebar'
import { Menu } from 'lucide-react'

export function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex font-sans">
      {/* Mobile header */}
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

      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 pt-14 lg:pt-0 p-4 sm:p-6 lg:p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
