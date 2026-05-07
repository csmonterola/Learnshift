import React from 'react'
import { motion } from 'framer-motion'
import { TeacherTopBar } from '../../components/layout/TeacherTopBar'
import {
  Search,
  Printer,
  Users,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ChevronRight,
} from 'lucide-react'

const students = [
  { id: 'STU-2025-0001', name: 'Student #1 (Placeholder)', grade: 'Grade 7 – Rizal',     mastery: 88, date: 'Apr 17, 2026', status: 'Proficient' },
  { id: 'STU-2025-0002', name: 'Student #2 (Placeholder)', grade: 'Grade 7 – Bonifacio', mastery: 34, date: 'Apr 16, 2026', status: 'Beginning' },
  { id: 'STU-2025-0003', name: 'Student #3 (Placeholder)', grade: 'Grade 8 – Mabini',    mastery: 71, date: 'Apr 16, 2026', status: 'Developing' },
  { id: 'STU-2025-0004', name: 'Student #4 (Placeholder)', grade: 'Grade 7 – Rizal',     mastery: 92, date: 'Apr 15, 2026', status: 'Proficient' },
  { id: 'STU-2025-0005', name: 'Student #5 (Placeholder)', grade: 'Grade 8 – Luna',      mastery: 48, date: 'Apr 15, 2026', status: 'Beginning' },
  { id: 'STU-2025-0006', name: 'Student #6 (Placeholder)', grade: 'Grade 7 – Bonifacio', mastery: 63, date: 'Apr 14, 2026', status: 'Developing' },
  { id: 'STU-2025-0007', name: 'Student #7 (Placeholder)', grade: 'Grade 8 – Mabini',    mastery: 82, date: 'Apr 14, 2026', status: 'Proficient' },
  { id: 'STU-2025-0008', name: 'Student #8 (Placeholder)', grade: 'Grade 7 – Rizal',     mastery: 27, date: 'Apr 13, 2026', status: 'Beginning' },
]

export function TeacherStudentProfiles() {
  return (
    <div className="min-h-screen flex flex-col">
      <TeacherTopBar
        leftContent={<div className="font-semibold text-slate-800">Student Profiles</div>}
        rightContent={
          <>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search students..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-full text-sm focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <Printer size={16} /> Print Report
            </button>
          </>
        }
      />

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Student Profiles</h1>
          <p className="text-slate-500 text-sm">Overview of all enrolled students · AY 2025–2026 · Q2</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Users size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">28</div>
              <div className="text-xs font-bold text-slate-400 tracking-wider uppercase">Total Students</div>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4 border-red-100">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">6</div>
              <div className="text-xs font-bold text-slate-400 tracking-wider uppercase">Needs Intervention</div>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4 border-emerald-100">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">22</div>
              <div className="text-xs font-bold text-slate-400 tracking-wider uppercase">Proficient</div>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="card">
          <div className="p-6 border-b border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">All Students</h2>
              <p className="text-xs text-slate-500">Click a row to view the individual student profile & mastery report</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold w-16">Avatar</th>
                  <th className="px-6 py-4 font-semibold">Student Name</th>
                  <th className="px-6 py-4 font-semibold">ID</th>
                  <th className="px-6 py-4 font-semibold">Grade</th>
                  <th className="px-6 py-4 font-semibold w-64">Overall Mastery</th>
                  <th className="px-6 py-4 font-semibold">Last Assessed</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                        <Users size={16} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1 group-hover:text-emerald-600 transition-colors">
                        {student.name}
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{student.id}</td>
                    <td className="px-6 py-4 text-slate-600">{student.grade}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${student.mastery}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                              student.status === 'Proficient' ? 'bg-emerald-400' :
                              student.status === 'Developing' ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-8">{student.mastery}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{student.date}</td>
                    <td className="px-6 py-4">
                      <div className={`status-pill ${student.status.toLowerCase()}`}>
                        {student.status === 'Proficient'  && <CheckCircle2 size={12} />}
                        {student.status === 'Developing'  && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        {student.status === 'Beginning'   && <AlertTriangle size={12} />}
                        {student.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400" /> Proficient ≥ 80%</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400" /> Developing 60–79%</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /> Beginning &lt; 60%</div>
            </div>
            <div className="text-slate-400">Showing 8 of 28 students · Source: LearnShift Assessment Engine</div>
          </div>
        </div>
      </main>
    </div>
  )
}
