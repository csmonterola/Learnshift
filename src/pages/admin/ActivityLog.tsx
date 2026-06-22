import React, { useState, useEffect } from 'react'
import { useAuth } from '../../components/auth/AuthContext'
import { adminApi } from '../../lib/api'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Calendar,
  Tag,
  User,
} from 'lucide-react'

interface ActivityLogEntry {
  id: number
  user_name: string
  action: string
  description: string
  created_at: string
  human_time: string
}

const ACTION_FILTERS = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'signup', label: 'Signup' },
  { value: 'account_created', label: 'Account Created' },
  { value: 'class_created', label: 'Class Created' },
  { value: 'material_uploaded', label: 'Material Uploaded' },
  { value: 'quiz_completed', label: 'Quiz Completed' },
  { value: 'topic_mastered', label: 'Topic Mastered' },
  { value: 'student_enrolled', label: 'Student Enrolled' },
]

const actionIcons: Record<string, typeof RefreshCw> = {
  login: RefreshCw,
  signup: User,
  account_created: User,
  class_created: Filter,
  material_uploaded: Tag,
  quiz_completed: RefreshCw,
  topic_mastered: Tag,
  student_enrolled: User,
  default: Calendar,
}

const actionColors: Record<string, string> = {
  login: 'bg-emerald-50 text-emerald-600',
  signup: 'bg-accent-50 text-accent-600',
  account_created: 'bg-accent-50 text-accent-600',
  class_created: 'bg-blue-50 text-blue-600',
  material_uploaded: 'bg-amber-50 text-amber-600',
  quiz_completed: 'bg-purple-50 text-purple-600',
  topic_mastered: 'bg-emerald-50 text-emerald-600',
  student_enrolled: 'bg-blue-50 text-blue-600',
  default: 'bg-gray-50 text-gray-600',
}

export function ActivityLogPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadLogs()
  }, [page, actionFilter, fromDate, toDate])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params: any = { page }
      if (search) params.search = search
      if (actionFilter) params.action = actionFilter
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      params.per_page = 20

      const res = await adminApi.activityLogs(params)
      setLogs(res.data.data)
      setTotalPages(res.data.last_page)
      setTotal(res.data.total)
    } catch (err: any) {
      console.error('Failed to load activity logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadLogs()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => window.history.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Activity Logs</h1>
          <p className="text-sm text-gray-500">Monitor all system activities and user actions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by user or description..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
            />
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1) }}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {logs.length} of {total} activities
          </p>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No activity logs found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">ACTIVITY</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">ACTION</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">USER</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => {
                  const Icon = actionIcons[log.action] ?? actionIcons.default
                  const colorClass = actionColors[log.action] ?? actionColors.default
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{log.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <User className="w-3 h-3 text-emerald-600" />
                          </div>
                          <span className="text-sm text-gray-700">{log.user_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-500">{log.human_time}</div>
                        <div className="text-xs text-gray-400">{log.created_at}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}