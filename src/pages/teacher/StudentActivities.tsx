import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { teacherApi } from '../../lib/api'
import {
  ChevronRight,
  ArrowLeft,
  Award,
  TrendingUp,
  MessageSquare,
  BookOpen,
  X,
  Calendar,
  Filter,
  Activity,
} from 'lucide-react'

interface ActivityItem {
  type: 'quiz' | 'practice' | 'lesson' | 'chat'
  title: string
  subject: string
  class_id?: number | null
  class_name?: string | null
  score: number
  detail: string
  timestamp: string
}

const TYPE_META: Record<ActivityItem['type'], { label: string; icon: React.ReactNode; classes: string }> = {
  quiz: { label: 'Quiz', icon: <Award className="w-4 h-4" />, classes: 'bg-blue-50 text-blue-500' },
  practice: { label: 'Practice', icon: <TrendingUp className="w-4 h-4" />, classes: 'bg-violet-50 text-violet-500' },
  chat: { label: 'AI Tutor', icon: <MessageSquare className="w-4 h-4" />, classes: 'bg-purple-50 text-purple-500' },
  lesson: { label: 'Lesson', icon: <BookOpen className="w-4 h-4" />, classes: 'bg-emerald-50 text-emerald-500' },
}

const inputCls =
  'px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'

export function TeacherStudentActivities() {
  const { studentId } = useParams<{ studentId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const [studentName, setStudentName] = useState('')
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [type, setType] = useState(searchParams.get('type') ?? '')
  const [classId, setClassId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const id = Number(studentId)

  const loadActivities = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    setError('')
    try {
      const params: { type?: string; class_id?: number; date_from?: string; date_to?: string } = {}
      if (type) params.type = type
      if (classId) params.class_id = Number(classId)
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const res = await teacherApi.studentActivities(id, params)
      setActivities(res.data || [])
    } catch (err: any) {
      console.error('Error loading activities:', err?.response?.data ?? err)
      setError(err?.response?.data?.message ?? 'Failed to load activities.')
    } finally {
      setLoading(false)
    }
  }, [studentId, id, type, classId, dateFrom, dateTo])

  useEffect(() => {
    if (!studentId) return
    teacherApi.studentProfile(id)
      .then(res => setStudentName(res.data?.name ?? ''))
      .catch(() => {})
  }, [studentId, id])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const applyTypeFilter = (value: string) => {
    setType(value)
    if (value) {
      const next = new URLSearchParams(searchParams)
      next.set('type', value)
      setSearchParams(next, { replace: true })
    } else {
      const next = new URLSearchParams(searchParams)
      next.delete('type')
      setSearchParams(next, { replace: true })
    }
  }

  const clearFilters = () => {
    setType('')
    setClassId('')
    setDateFrom('')
    setDateTo('')
    setSearchParams({}, { replace: true })
  }

  const hasFilters = !!type || !!classId || !!dateFrom || !!dateTo
  const classOptions = Array.from(new Map(
    activities.map(a => [String(a.class_id ?? ''), { id: a.class_id, name: a.class_name }])
  ).values()).filter(c => c.id != null) as { id: number; name: string }[]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/teacher/students" className="hover:text-emerald-600 transition-colors">Student Profiles</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/teacher/students/${studentId}`} className="hover:text-emerald-600 transition-colors">
          {studentName || 'Student'}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Activities</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">All Activities</h1>
          <p className="text-sm text-gray-500">
            {studentName ? `${studentName}'s learning activity across your classes` : 'Learning activity across your classes'}
          </p>
        </div>
        <Link
          to={`/teacher/students/${studentId}`}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={type} onChange={e => applyTypeFilter(e.target.value)} className={inputCls}>
            <option value="">All Activity Types</option>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>

          <select value={classId} onChange={e => setClassId(e.target.value)} className={inputCls}>
            <option value="">All Classes</option>
            {classOptions.map(c => (
              <option key={c.id} value={String(c.id)}>{c.name || `Class #${c.id}`}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
          </div>
          <span className="text-gray-400 text-sm">to</span>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Activities list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={loadActivities} className="text-emerald-600 font-medium hover:text-emerald-700">
            Try Again
          </button>
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Activities Found</h3>
          <p className="text-gray-500">
            {hasFilters ? 'No activities match the current filters.' : 'This student has no recorded activity yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {activities.map((activity, idx) => {
              const meta = TYPE_META[activity.type] ?? TYPE_META.lesson
              return (
                <div key={`${activity.type}-${idx}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.classes}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{activity.title}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {activity.detail}
                      {activity.subject && activity.subject !== 'Unknown Subject' ? ` · ${activity.subject}` : ''}
                      {activity.class_name ? ` · ${activity.class_name}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-gray-700">{activity.score}%</span>
                    <p className="text-[10px] text-gray-400">
                      {activity.timestamp
                        ? new Date(activity.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                        : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
