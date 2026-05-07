import React from 'react'
import { Outlet } from 'react-router-dom'
import { StudentSidebar } from './StudentSidebar'

export function StudentLayout() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] flex font-sans">
      <StudentSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
