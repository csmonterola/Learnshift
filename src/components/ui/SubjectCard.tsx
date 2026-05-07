import React from 'react'
import { LucideIcon } from 'lucide-react'

export type ColorTheme = 'blue' | 'purple' | 'emerald' | 'amber' | 'red' | 'cyan' | 'rose'

interface SubjectCardProps {
  title: string
  subtitle: string
  icon: LucideIcon
  color: ColorTheme
  progress: number
}

const themeStyles: Record<ColorTheme, { bg: string; text: string; fill: string; iconBg: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    fill: 'bg-blue-500',    iconBg: 'bg-blue-100 text-blue-600' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600',  fill: 'bg-purple-500',  iconBg: 'bg-purple-100 text-purple-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', fill: 'bg-emerald-500', iconBg: 'bg-emerald-100 text-emerald-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   fill: 'bg-amber-500',   iconBg: 'bg-amber-100 text-amber-600' },
  red:     { bg: 'bg-red-50',     text: 'text-red-600',     fill: 'bg-red-500',     iconBg: 'bg-red-100 text-red-600' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-600',    fill: 'bg-cyan-500',    iconBg: 'bg-cyan-100 text-cyan-600' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    fill: 'bg-rose-500',    iconBg: 'bg-rose-100 text-rose-600' },
}

export function SubjectCard({ title, subtitle, icon: Icon, color, progress }: SubjectCardProps) {
  const theme = themeStyles[color]
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${theme.iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{title}</h3>
      <p className="text-xs text-gray-400 mb-6">{subtitle}</p>
      <div className="mt-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-500">Progress</span>
          <span className={`text-xs font-bold ${theme.text}`}>{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div className={`h-full rounded-full ${theme.fill}`} style={{ width: `${progress}%` }} />
        </div>
        <button className={`text-sm font-bold flex items-center gap-1 ${theme.text} hover:opacity-80 transition-opacity`}>
          Open &rarr;
        </button>
      </div>
    </div>
  )
}
