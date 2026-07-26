import React, { useState, useEffect } from 'react'
import { useAuth } from '../../components/auth/AuthContext'
import { adminApi } from '../../lib/api'
import {
  Users,
  UserCheck,
  BookOpen,
  Upload,
  UserPlus,
  FilePlus,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Loader2,
} from 'lucide-react'

interface Activity {
  id: number
  user_name: string
  action: string
  description: string
  created_at: string
}

interface DashboardData {
  total_students: number
  total_teachers: number
  total_classes: number
  recent_activities: Activity[]
}

const actionIcons: Record<string, typeof Upload> = {
  account_created: UserPlus,
  upload: Upload,
  login: RefreshCw,
  signup: UserPlus,
  default: FilePlus,
}

const actionColors: Record<string, string> = {
  account_created: 'bg-accent-50 text-accent-600',
  upload: 'bg-emerald-50 text-emerald-600',
  login: 'bg-emerald-50 text-emerald-600',
  signup: 'bg-accent-50 text-accent-600',
  default: 'bg-amber-50 text-amber-600',
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.dashboard()
      setData(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadDashboard} className="text-emerald-600 font-medium hover:text-emerald-700">
          Try Again
        </button>
      </div>
    )
  }

  if (!data) return null

  const stats = [
    {
      title: 'TOTAL ACTIVE STUDENTS',
      value: data.total_students.toString(),
      change: `${data.total_students} enrolled`,
      icon: Users,
      borderColor: 'border-t-emerald-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      changeColor: 'text-emerald-600',
    },
    {
      title: 'TOTAL TEACHERS',
      value: data.total_teachers.toString(),
      change: `${data.total_teachers} active teachers`,
      icon: UserCheck,
      borderColor: 'border-t-accent-500',
      iconBg: 'bg-accent-50',
      iconColor: 'text-accent-600',
      changeColor: 'text-emerald-600',
    },
    {
      title: 'TOTAL CLASSES',
      value: data.total_classes.toString(),
      change: `Across all grade levels`,
      icon: BookOpen,
      borderColor: 'border-t-amber-400',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      changeColor: 'text-slate-500',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
          Welcome back, {user?.name ?? 'School Admin'} 👋
        </h1>
        <p className="text-gray-500 text-sm">
          Here's a snapshot of your school's current activity and metrics.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 border-t-4 ${stat.borderColor}`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <TrendingUp className="w-5 h-5 text-gray-200" />
              </div>
              <p className="text-xs font-bold text-gray-400 tracking-wider mb-1">{stat.title}</p>
              <h2 className="text-4xl font-black text-gray-900 mb-4">{stat.value}</h2>
              <div className="pt-4 border-t border-gray-50">
                <p className={`text-sm font-medium ${stat.changeColor}`}>{stat.change}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent System Activity</h3>
              <p className="text-sm text-gray-500">Latest events across your school portal</p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/admin/activity-logs'}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider w-1/2">EVENT</th>
                <th className="hidden sm:table-cell py-4 px-6 text-xs font-bold text-gray-400 tracking-wider w-1/4">DETAIL</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider w-1/4">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.recent_activities.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 px-6 text-center text-sm text-gray-400">
                    No recent activity.
                  </td>
                </tr>
              )}
              {data.recent_activities.map((a) => {
                const Icon = actionIcons[a.action] ?? actionIcons.default
                const colorClass = actionColors[a.action] ?? actionColors.default
                return (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{a.user_name}</p>
                          <p className="text-sm text-gray-500">{a.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                        {a.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-500">{a.created_at}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}