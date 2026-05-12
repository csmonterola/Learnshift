import React from 'react'
import { Users, Download, Search, Filter, GraduationCap, User, Users as UsersIcon, MoreHorizontal, Key } from 'lucide-react'

const users = [
  { id: 1, initials: 'JD', name: 'Juan Miguel dela Cruz',  email: 'jm.delacruz_7a@learnshift.edu', idNumber: 'STU-2025-0001', class: 'Grade 7 – Section A', status: 'Active',    avatarColor: 'bg-accent-700' },
  { id: 2, initials: 'MS', name: 'Maria Luisa Santos',     email: 'ml.santos_7a@learnshift.edu',   idNumber: 'STU-2025-0002', class: 'Grade 7 – Section A', status: 'Active',    avatarColor: 'bg-emerald-600' },
  { id: 3, initials: 'CR', name: 'Carlos Andre Reyes',     email: 'ca.reyes_7a@learnshift.edu',    idNumber: 'STU-2025-0003', class: 'Grade 7 – Section A', status: 'Inactive',  avatarColor: 'bg-slate-500' },
  { id: 4, initials: 'AF', name: 'Ana Patricia Flores',    email: 'ap.flores_7a@learnshift.edu',   idNumber: 'STU-2025-0004', class: 'Grade 7 – Section A', status: 'Active',    avatarColor: 'bg-amber-500' },
  { id: 5, initials: 'RT', name: 'Rafael Dominic Torres',  email: 'rd.torres_7b@learnshift.edu',   idNumber: 'STU-2025-0005', class: 'Grade 7 – Section B', status: 'Active',    avatarColor: 'bg-accent-600' },
  { id: 6, initials: 'SL', name: 'Sophia Isabelle Lim',    email: 'si.lim_7b@learnshift.edu',      idNumber: 'STU-2025-0006', class: 'Grade 7 – Section B', status: 'Suspended', avatarColor: 'bg-rose-500' },
  { id: 7, initials: 'GM', name: 'Gabriel Luis Mendoza',   email: 'gl.mendoza_7b@learnshift.edu',  idNumber: 'STU-2025-0007', class: 'Grade 7 – Section B', status: 'Active',    avatarColor: 'bg-emerald-500' },
  { id: 8, initials: 'CG', name: 'Camille Joy Garcia',     email: 'cj.garcia_7b@learnshift.edu',   idNumber: 'STU-2025-0008', class: 'Grade 7 – Section B', status: 'Pending',   avatarColor: 'bg-amber-600' },
]

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    Active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inactive:  'bg-gray-100 text-gray-600 border-gray-200',
    Suspended: 'bg-rose-50 text-rose-700 border-rose-200',
    Pending:   'bg-amber-50 text-amber-700 border-amber-200',
  }
  const dots: Record<string, string> = {
    Active:    'bg-emerald-500',
    Inactive:  'bg-gray-400',
    Suspended: 'bg-rose-500',
    Pending:   'bg-amber-500',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] ?? ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] ?? 'bg-gray-400'}`} />
      {status}
    </span>
  )
}

export function AdminUserDirectory() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">User Directory</h1>
            <p className="text-gray-500 text-sm">Search, filter, and manage all accounts across your institution.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
          <Download className="w-4 h-4" />Export Directory
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search students..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
          <Filter className="w-4 h-4 text-gray-400" />Filter by Status
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-8 px-6 border-b border-gray-100">
          <button className="flex items-center gap-2 py-4 border-b-2 border-emerald-500 text-emerald-600 font-bold text-sm">
            <GraduationCap className="w-4 h-4" />Students
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">12</span>
          </button>
          <button className="flex items-center gap-2 py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors">
            <User className="w-4 h-4" />Teachers
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">7</span>
          </button>
          <button className="flex items-center gap-2 py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors">
            <UsersIcon className="w-4 h-4" />Parents
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">10</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-gray-100">
                <th className="py-4 px-6 w-12"><div className="w-4 h-4 rounded bg-gray-800" /></th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">NAME</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">ID NUMBER</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">ASSIGNED CLASS</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">ACCOUNT STATUS</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6"><div className="w-4 h-4 rounded bg-gray-800" /></td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${u.avatarColor} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                        {u.initials}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6"><span className="text-sm text-gray-500 font-mono">{u.idNumber}</span></td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                      <GraduationCap className="w-3.5 h-3.5" />{u.class}
                    </span>
                  </td>
                  <td className="py-4 px-6">{statusBadge(u.status)}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors border border-gray-200 bg-white">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                        <Key className="w-3.5 h-3.5" />Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
