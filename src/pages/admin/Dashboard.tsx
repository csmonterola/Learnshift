import React from 'react'
import { useAuth } from '../../components/auth/AuthContext'
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
} from 'lucide-react'

const stats = [
  {
    title: 'TOTAL ACTIVE STUDENTS',
    value: '450',
    change: '+12 this month',
    icon: Users,
    borderColor: 'border-t-emerald-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    changeColor: 'text-emerald-600',
  },
  {
    title: 'TOTAL TEACHERS',
    value: '15',
    change: '+2 this semester',
    icon: UserCheck,
    borderColor: 'border-t-accent-500',
    iconBg: 'bg-accent-50',
    iconColor: 'text-accent-600',
    changeColor: 'text-emerald-600',
  },
  {
    title: 'TOTAL CLASSES',
    value: '12',
    change: 'Across 4 grade levels',
    icon: BookOpen,
    borderColor: 'border-t-amber-400',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    changeColor: 'text-slate-500',
  },
]

const activities = [
  { id: 1, title: 'Teacher Maria Santos',  subtitle: 'uploaded a new learning module',    detail: 'Grade 8 – Science: Cell Biology',          timestamp: 'Today, 9:14 AM',      icon: Upload,    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { id: 2, title: 'System',               subtitle: 'generated 50 new student accounts',  detail: 'Batch: Grade 7 Enrollment 2025–2026',      timestamp: 'Today, 8:45 AM',      icon: UserPlus,  iconBg: 'bg-accent-50',  iconColor: 'text-accent-600' },
  { id: 3, title: 'Admin',                subtitle: 'created a new class section',         detail: 'Grade 10 – Section B (Mathematics)',       timestamp: 'Yesterday, 4:02 PM',  icon: FilePlus,  iconBg: 'bg-amber-50',   iconColor: 'text-amber-600' },
  { id: 4, title: 'System',               subtitle: 'completed scheduled data sync',       detail: 'All student records successfully synced',  timestamp: 'Yesterday, 2:30 PM',  icon: RefreshCw, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { id: 5, title: 'Teacher James Rivera', subtitle: 'uploaded a new learning module',      detail: 'Grade 9 – English: Narrative Writing',     timestamp: 'Yesterday, 11:20 AM', icon: Upload,    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
]

export function AdminDashboard() {
  const { user } = useAuth()

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
          <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider w-1/2">EVENT</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider w-1/4">DETAIL</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider w-1/4">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activities.map((a) => {
                const Icon = a.icon
                return (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-lg ${a.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className={`w-4 h-4 ${a.iconColor}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{a.title}</p>
                          <p className="text-sm text-gray-500">{a.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                        {a.detail}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-500">{a.timestamp}</span>
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
