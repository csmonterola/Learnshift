import React from 'react'
import { motion } from 'framer-motion'
import { TeacherTopBar } from '../../components/layout/TeacherTopBar'
import {
  Search,
  Calendar,
  BookOpen,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
  Users,
} from 'lucide-react'
import { useAuth } from '../../components/auth/AuthContext'

const kpis = [
  { label: 'TOTAL STUDENTS',       value: '32',  sub: 'Active this quarter',  color: 'bg-emerald-100' },
  { label: 'AVG. MASTERY',         value: '70%', sub: 'Across all lessons',   color: 'bg-blue-100' },
  { label: 'STRUGGLING STUDENTS',  value: '38',  sub: 'Across 4 lessons',     color: 'bg-red-100' },
  { label: 'LESSONS TRACKED',      value: '4',   sub: 'Q2 curriculum',        color: 'bg-amber-100' },
]

const lessons = [
  { name: 'Fractions and Decimals',       sub: 'Converting Fractions to Decimals',          total: 32, struggling: 8,  mastery: 75, status: 'Developing' },
  { name: 'Linear Equations',             sub: 'Solving One-Variable Equations',            total: 32, struggling: 14, mastery: 56, status: 'Needs Support' },
  { name: 'Geometry: Triangles',          sub: 'Properties and Classifications of Triangles', total: 32, struggling: 5,  mastery: 84, status: 'Proficient' },
  { name: 'Statistics: Central Tendency', sub: 'Mean, Median, and Mode',                    total: 32, struggling: 11, mastery: 66, status: 'Developing' },
]

export function TeacherDashboard() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <TeacherTopBar
        centerContent={
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search students or topics..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-full text-sm focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
            />
          </div>
        }
        rightContent={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
            <Calendar size={14} />
            Wednesday, May 6, 2026
          </div>
        }
      />

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-slate-500 text-sm">
            Here's a snapshot of your class's learning progress for this quarter.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {kpis.map((kpi, i) => (
            <div key={i} className="card p-5 relative overflow-hidden">
              <div className={`absolute top-4 right-4 w-4 h-4 rounded-full ${kpi.color}`} />
              <div className="text-xs font-bold text-slate-400 tracking-wider mb-2">{kpi.label}</div>
              <div className="text-3xl font-bold text-slate-800 mb-1">{kpi.value}</div>
              <div className="text-xs text-slate-500">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Mastery Breakdown */}
        <div className="card">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">DEPED-Aligned Mastery Breakdown</h2>
                <p className="text-xs text-slate-500">Curriculum Quarter 2 · AY 2025–2026</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="status-pill proficient">
                <TrendingUp size={14} /> Class Avg: 70%
              </div>
              <div className="status-pill beginning">
                <AlertTriangle size={14} /> 38 Struggling
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 flex gap-3">
            {['Filter by Subject', 'Filter by Lesson', 'Filter by Topic'].map((filter) => (
              <button
                key={filter}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"
              >
                {filter} <ChevronDown size={14} />
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Lesson / Topic Name</th>
                  <th className="px-6 py-4 font-semibold text-center">Total Students</th>
                  <th className="px-6 py-4 font-semibold text-center">Struggling Students</th>
                  <th className="px-6 py-4 font-semibold">Mastery Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lessons.map((lesson, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{lesson.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{lesson.sub}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium text-xs">
                        <Users size={12} /> {lesson.total}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-medium text-xs border border-red-100">
                        <AlertTriangle size={12} /> {lesson.struggling}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 max-w-[200px]">
                        <span className={`text-[10px] font-bold uppercase tracking-wider w-fit px-2 py-0.5 rounded ${
                          lesson.status === 'Proficient'    ? 'bg-emerald-50 text-emerald-600' :
                          lesson.status === 'Developing'    ? 'bg-amber-50 text-amber-600' :
                                                              'bg-red-50 text-red-600'
                        }`}>
                          {lesson.status}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${lesson.mastery}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className={`h-full rounded-full ${
                                lesson.status === 'Proficient' ? 'bg-emerald-400' :
                                lesson.status === 'Developing' ? 'bg-amber-400' : 'bg-red-400'
                              }`}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700 w-8">{lesson.mastery}%</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Showing 4 of 4 lessons</span>
            <span>Source: DepEd K–12 Curriculum Guide · Grade 8</span>
          </div>
        </div>
      </main>
    </div>
  )
}
