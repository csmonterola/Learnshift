import React, { useState, useEffect } from 'react'
import { useAuth } from '../../components/auth/AuthContext'
import { parentApi } from '../../lib/api'
import {
  BookOpen,
  Loader2,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Award,
} from 'lucide-react'

interface LessonProgress {
  id: number
  lesson_id: number
  lesson_title: string
  topic_title: string
  subject_name: string
  class_name: string
  mastery_percentage: number
  status: string
  best_quiz_score: number
  completed_at: string
  updated_at: string
}

export function ParentLessonMastery() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [selectedChildName, setSelectedChildName] = useState('')
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'mastery' | 'date' | 'name'>('date')

  useEffect(() => {
    loadChildren()
  }, [])

  const loadChildren = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await parentApi.dashboard()
      const children = res.data.children
      if (children && children.length > 0) {
        const firstChild = children[0]
        setSelectedChildId(firstChild.id)
        setSelectedChildName(firstChild.name)
        await loadMasteryData(firstChild.id)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load children.')
    } finally {
      setLoading(false)
    }
  }

  const loadMasteryData = async (childId: number) => {
    setLoading(true)
    try {
      const res = await parentApi.studentActivity(childId)
      setLessonProgress(res.data.lesson_progress || [])
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load lesson mastery.')
    } finally {
      setLoading(false)
    }
  }

  const handleChildChange = async (childId: number) => {
    setSelectedChildId(childId)
    await loadMasteryData(childId)
  }

  const filteredProgress = lessonProgress
    .filter(lp => {
      const matchesSearch = lp.lesson_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           lp.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           lp.topic_title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || lp.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'mastery') {
        return b.mastery_percentage - a.mastery_percentage
      } else if (sortBy === 'name') {
        return a.lesson_title.localeCompare(b.lesson_title)
      } else {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
    })

  const getMasteryColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-emerald-500'
    if (percentage >= 80) return 'bg-blue-500'
    if (percentage >= 70) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-amber-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'in_progress':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const avgMastery = lessonProgress.length > 0
    ? Math.round(lessonProgress.reduce((sum, lp) => sum + lp.mastery_percentage, 0) / lessonProgress.length)
    : 0

  const completedCount = lessonProgress.filter(lp => lp.status === 'completed').length
  const inProgressCount = lessonProgress.filter(lp => lp.status === 'in_progress').length

  if (loading && !lessonProgress.length) {
    return (
      <div className="max-w-7xl mx-auto p-8 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => selectedChildId && loadMasteryData(selectedChildId)}
          className="text-emerald-600 font-medium hover:text-emerald-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Lesson Mastery</h1>
        <p className="text-gray-500">Track learning progress and mastery levels</p>
      </div>

      {/* Child Selector */}
      {selectedChildId && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
          <select
            value={selectedChildId}
            onChange={(e) => handleChildChange(Number(e.target.value))}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
          >
            <option value={selectedChildId}>{selectedChildName}</option>
          </select>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{avgMastery}%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Average Mastery</h3>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{lessonProgress.length}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Total Lessons</h3>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{completedCount}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Completed</h3>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{inProgressCount}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">In Progress</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by lesson, topic, or subject..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="not_started">Not Started</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="date">Sort by Date</option>
            <option value="mastery">Sort by Mastery</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Lesson Progress List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredProgress.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No lesson progress found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredProgress.map((lp) => (
              <div key={lp.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getStatusIcon(lp.status)}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{lp.lesson_title}</h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {lp.topic_title} • {lp.subject_name} • {lp.class_name}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusBadge(lp.status)}`}>
                          {lp.status.replace('_', ' ')}
                        </span>
                        {lp.best_quiz_score > 0 && (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            Best quiz: {lp.best_quiz_score}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{lp.mastery_percentage}%</div>
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getMasteryColor(lp.mastery_percentage)} rounded-full`}
                        style={{ width: `${lp.mastery_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
                {lp.completed_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    Completed: {new Date(lp.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}