import React from 'react'
import { Bell } from 'lucide-react'

interface TeacherTopBarProps {
  leftContent?: React.ReactNode
  centerContent?: React.ReactNode
  rightContent?: React.ReactNode
}

export function TeacherTopBar({ leftContent, centerContent, rightContent }: TeacherTopBarProps) {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between px-8">
      <div className="flex-1 flex items-center justify-start">{leftContent}</div>
      <div className="flex-1 flex items-center justify-center">{centerContent}</div>
      <div className="flex-1 flex items-center justify-end gap-4">
        {rightContent}
        <button className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>
      </div>
    </header>
  )
}
