import React from 'react'
import { Outlet } from 'react-router-dom'
import { TeacherSidebar } from './TeacherSidebar'

export function TeacherLayout() {
  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <TeacherSidebar />
      <div className="flex-1 ml-64">
        <Outlet />
      </div>
    </div>
  )
}
