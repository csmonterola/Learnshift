import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ParentSidebar } from './ParentSidebar'
import { Menu } from 'lucide-react'

export function ParentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-10 lg:hidden">
        <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-600">
          <Menu className="w-6 h-6" />
        </button>
        <span className="ml-3 font-bold text-gray-900">LearnShift</span>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <ParentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 ml-0 lg:ml-60 overflow-auto pt-14 lg:pt-0">
        <Outlet />
      </div>
    </div>
  )
}
