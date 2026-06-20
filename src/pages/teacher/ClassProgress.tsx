import React, { useState, useEffect } from 'react'
import { teacherApi } from '../../lib/api'
import { motion } from 'framer-motion'
import { Trophy, Users, BookOpen, CheckCircle, AlertTriangle, Clock, Search, ChevronDown } from 'lucide-react'

interface StudentProgress {
  id: number; name: string; avatar?: string;
  mastery_percentage: number; total_lessons: number; completed_lessons: number;
  mastered_lessons: number; total_topics: number; completed_topics: number;
  quiz_attempts: number; best_quiz_score: number | null;
  avg_quiz_score: number; last_activity: string | null; status: string;
}

interface TopicSummary {
  id: number; title: string; lesson_count: number; avg_mastery: number;
  mastered_count: number; developing_count: number; not_started_count: number;
  total_students: number;
}

interface ProgressData {
  class: { id: number; name: string; subject: string; grade_level: string; section: string };
  summary: {
    total_students: number; avg_mastery: number; mastered_count: number;
    developing_count: number; not_started_count: number; total_lessons: number; total_topics: number;
  };
  students: StudentProgress[];
  topic_summary: TopicSummary[];
}

export default function ClassProgress({ classId }: { classId: number }) {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'students' | 'topics'>('students')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'mastery' | 'name'>('mastery')

  useEffect(() => {
    teacherApi.getClassProgress(classId)
      .then(res => setData(res.data))
      .catch(err => console.error('Error loading progress:', err?.response?.data ?? err))
      .finally(() => setLoading(false))
  }, [classId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>No progress data available.</p>
      </div>
    )
  }

  // Filter and sort students
  const filteredStudents = data.students
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'mastery') return b.mastery_percentage - a.mastery_percentage
      return a.name.localeCompare(b.name)
    })

  const masteryColor = (pct: number) => {
    if (pct >= 100) return { text: 'text-emerald-600', bg: 'bg-emerald-100', bar: 'bg-emerald-500', label: 'Mastered' }
    if (pct >= 70) return { text: 'text-emerald-600', bg: 'bg-emerald-100', bar: 'bg-emerald-400', label: 'Proficient' }
    if (pct > 0) return { text: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-400', label: 'Developing' }
    return { text: 'text-gray-400', bg: 'bg-gray-100', bar: 'bg-gray-300', label: 'Not Started' }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: data.summary.total_students, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Mastered', value: data.summary.mastered_count, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Developing', value: data.summary.developing_count, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
          { label: 'Not Started', value: data.summary.not_started_count, icon: Clock, color: 'bg-gray-50 text-gray-600' },
        ].map((stat, i) => (
          <div key={i} className={`p-4 rounded-xl border border-gray-200 ${stat.color === 'bg-gray-50 text-gray-600' ? 'bg-gray-50' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs font-medium text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Class avg mastery bar */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-emerald-700">Class Average Mastery</span>
          <span className="text-2xl font-extrabold text-emerald-600">{data.summary.avg_mastery}%</span>
        </div>
        <div className="w-full h-3 bg-emerald-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${data.summary.avg_mastery}%` }} />
        </div>
        <p className="text-xs text-emerald-600/70 mt-1">{data.summary.total_lessons} lessons · {data.summary.total_topics} topics</p>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <button onClick={() => setViewMode('students')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'students' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
          Per Student
        </button>
        <button onClick={() => setViewMode('topics')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'topics' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
          By Topic
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Search students..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
          <option value="mastery">Sort by Mastery</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* ── Per Student View ─────────────────────────────── */}
      {viewMode === 'students' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Student</th>
                  <th className="px-4 py-3 text-center font-semibold">Mastery</th>
                  <th className="px-4 py-3 text-center font-semibold">Lessons</th>
                  <th className="px-4 py-3 text-center font-semibold">Topics</th>
                  <th className="px-4 py-3 text-center font-semibold">Quiz Avg</th>
                  <th className="px-4 py-3 text-center font-semibold">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-500">No students found.</td></tr>
                ) : filteredStudents.map((student) => {
                  const mc = masteryColor(student.mastery_percentage)
                  return (
                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                            {student.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full max-w-[100px]">
                            <div className={`h-full rounded-full ${mc.bar}`}
                              style={{ width: `${student.mastery_percentage}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${mc.text}`}>{student.mastery_percentage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">
                        {student.completed_lessons}/{student.total_lessons}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">
                        {student.completed_topics}/{student.total_topics}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold ${student.avg_quiz_score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {student.avg_quiz_score}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-400">
                        {student.last_activity
                          ? new Date(student.last_activity).toLocaleDateString()
                          : 'Never'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── By Topic View ───────────────────────────────── */}
      {viewMode === 'topics' && (
        <div className="space-y-4">
          {data.topic_summary.map((topic, i) => {
            const mc = masteryColor(topic.avg_mastery)
            return (
              <motion.div key={topic.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-5 border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{topic.title}</h3>
                    <p className="text-xs text-gray-500">{topic.lesson_count} lessons</p>
                  </div>
                  <span className={`text-lg font-extrabold ${mc.text}`}>{topic.avg_mastery}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full mb-3">
                  <div className={`h-full rounded-full ${mc.bar}`} style={{ width: `${topic.avg_mastery}%` }} />
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">{topic.mastered_count} mastered</span>
                  <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">{topic.developing_count} developing</span>
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{topic.not_started_count} not started</span>
                </div>
              </motion.div>
            )
          })}
          {data.topic_summary.length === 0 && (
            <div className="text-center py-12 text-gray-500">No topics with data yet.</div>
          )}
        </div>
      )}
    </div>
  )
}