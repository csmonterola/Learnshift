import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, ChevronRight, MoreVertical } from 'lucide-react'
import { MOCK_STUDENTS } from '../../lib/mockData'

export function TeacherRoster() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const filteredStudents = MOCK_STUDENTS.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || student.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Class Roster</h1>
          <p className="text-slate-600 mt-1">Manage and monitor your students' progress.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 w-full sm:w-64"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 font-medium text-slate-700"
            >
              <option value="All">All Status</option>
              <option value="Excelling">Excelling</option>
              <option value="On Track">On Track</option>
              <option value="At Risk">At Risk</option>
            </select>
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4 pl-6">Student</th>
                <th className="p-4">Grade & Section</th>
                <th className="p-4">Overall Mastery</th>
                <th className="p-4">Last Active</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full bg-slate-100" />
                      <div>
                        <p className="font-medium text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500">ID: {student.id.toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{student.grade} - Sec {student.section}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-900">{student.mastery}%</span>
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${student.mastery >= 85 ? 'bg-emerald-500' : student.mastery >= 70 ? 'bg-accent-500' : 'bg-rose-500'}`}
                          style={{ width: `${student.mastery}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500">{student.lastActive}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      student.status === 'Excelling' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : student.status === 'On Track' ? 'bg-accent-50 text-accent-700 border-accent-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/teacher/student/${student.id}`} className="p-2 text-slate-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No students found matching your criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
