import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminApi } from '../../lib/api'
import {
  ChevronRight, Users, BookOpen, TrendingUp, Award,
  MessageSquare, AlertCircle, CheckCircle, Clock,
  BarChart3, GraduationCap, Mail, Loader2,
} from 'lucide-react'

interface ClassDetailData {
  class: {
    id: number
    name: string
    grade_level: string
    section: string
    subject: string
    is_active: boolean
    teacher: {
      id: number
      name: string
      email: string
    } | null
  }
  summary: {
    total_students: number
    avg_mastery: number
    mastered_count: number
    developing_count: number
    not_started_count: number
    total_lessons: number
    total_topics: number
  }
  students: Array<{
    id: number
    name: string
    email: string
    avatar: string | null
    mastery_percentage: number
    completed_lessons: number
    total_lessons: number
    quiz_attempts: number
    avg_quiz_score: number
    ai_interactions: number
    last_activity: string | null
  }>
  topic_summary: Array<{
    id: number
    title: string
    lesson_count: number
    avg_mastery: number
    mastered_count: number
    total_students: number
  }>
}

export function AdminClassDetail() {
  const { classId } = useParams<{ classId: string }>()
  const [data, setData] = useState<ClassDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'students'>('overview')

  useEffect(() => {
    if (classId) loadData()
  }, [classId])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.classDetail(Number(classId))
      setData(res.data)
    } catch (err: any) {
      console.error('Failed to load class detail:', err)
      setError(err?.response?.data?.message ?? 'Failed to load class detail')
    } finally {
      setLoading(false)
    }
  }

  const getMasteryColor = (pct: number) => {
    if (pct >= 100) return 'text-emerald-600'
    if (pct >= 70) return 'text-blue-600'
    if (pct >= 1) return 'text-amber-600'
    return 'text-gray-400'
  }

  const getMasteryBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500'
    if (pct >= 70) return 'bg-blue-500'
    if (pct >= 1) return 'bg-amber-500'
    return 'bg-gray-300'
  }

  const getStatusBadge = (pct: number) => {
    if (pct >= 100) return { label: 'Mastered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (pct >= 70) return { label: 'Proficient', color: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (pct >= 1) return { label: 'Developing', color: 'bg-amber-50 text-amber-700 border-amber-200' }
    return { label: 'Not Started', color: 'bg-gray-50 text-gray-600 border-gray-200' }
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
      <div className="max-w-6xl mx-auto p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadData} className="text-emerald-600 font-medium hover:text-emerald-700 underline">
          Try Again
        </button>
      </div>
    )
  }

  if (!data) return null

  const { class: cls, summary, students, topic_summary } = data

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/admin/classes" className="hover:text-emerald-600 transition-colors">Class Management</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{cls.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{cls.name}</h1>
            <p className="text-gray-500">
              Grade {cls.grade_level} · Section {cls.section} · {cls.subject}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Assigned Teacher</p>
            <p className="font-semibold text-gray-900">{cls.teacher?.name || 'Unassigned'}</p>
            {cls.teacher && <p className="text-xs text-gray-400">{cls.teacher.email}</p>}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{summary.total_students}</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Total Students</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{summary.avg_mastery}%</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Average Mastery</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{summary.total_lessons}</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Total Lessons</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{summary.total_topics}</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Total Topics</p>
        </div>
      </div>

      {/* Mastery Distribution */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Mastery Distribution</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-3xl font-black text-emerald-600">{summary.mastered_count}</p>
            <p className="text-sm text-emerald-700 font-medium">Mastered</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-3xl font-black text-amber-600">{summary.developing_count}</p>
            <p className="text-sm text-amber-700 font-medium">Developing</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-3xl font-black text-gray-400">{summary.not_started_count}</p>
            <p className="text-sm text-gray-600 font-medium">Not Started</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-4 text-sm font-bold transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Topic Overview
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-6 py-4 text-sm font-bold transition-colors border-b-2 ${
              activeTab === 'students'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Students ({students.length})
          </button>
        </div>

        <div className="p-6">
          {/* Topic Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {topic_summary.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No topics available.</p>
              ) : (
                topic_summary.map((topic) => (
                  <div key={topic.id} className="p-4 border border-gray-200 rounded-xl hover:border-emerald-200 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{topic.title}</h4>
                      <span className="text-sm text-gray-500">{topic.lesson_count} lessons</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getMasteryBarColor(topic.avg_mastery)} rounded-full`}
                            style={{ width: `${topic.avg_mastery}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${getMasteryColor(topic.avg_mastery)}`}>
                        {topic.avg_mastery}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {topic.mastered_count}/{topic.total_students} mastered
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Students List */}
          {activeTab === 'students' && (
            <div className="overflow-x-auto">
              {students.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No students enrolled.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-gray-500 font-semibold">Student</th>
                      <th className="text-center py-3 px-2 text-gray-500 font-semibold">Mastery</th>
                      <th className="text-center py-3 px-2 text-gray-500 font-semibold">Lessons</th>
                      <th className="text-center py-3 px-2 text-gray-500 font-semibold">Avg Quiz</th>
                      <th className="text-center py-3 px-2 text-gray-500 font-semibold">AI Chats</th>
                      <th className="text-center py-3 px-2 text-gray-500 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => {
                      const badge = getStatusBadge(student.mastery_percentage)
                      return (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-xs font-bold">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{student.name}</p>
                                <p className="text-xs text-gray-400">{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className={`font-bold text-lg ${getMasteryColor(student.mastery_percentage)}`}>
                              {student.mastery_percentage}%
                            </span>
                          </td>
                          <td className="text-center py-3 px-2 text-gray-700">
                            {student.completed_lessons}/{student.total_lessons}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-700">
                            {student.avg_quiz_score}%
                          </td>
                          <td className="text-center py-3 px-2 text-gray-700">
                            {student.ai_interactions}
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}