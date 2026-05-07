import React from 'react'
import { Outlet } from 'react-router-dom'
import { ParentSidebar } from './ParentSidebar'

export function ParentLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <ParentSidebar />
      <div className="flex-1 ml-60 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
