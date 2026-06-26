import React, { useState, useEffect } from 'react'
import { useAuth } from '../../components/auth/AuthContext'
import { parentApi } from '../../lib/api'
import {
  Award,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingUp,
} from 'lucide-react'

interface QuizResult {
  id: number
  lesson_title: string
  subject_name: string
  score: number
  correct: number
  total: number
  attempt: number
  submitted_at: string
}

export function ParentQuizResults() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [selectedChildName, setSelectedChildName] = useState('')
  const [quizzes, setQuizzes] = useState<QuizResult[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null)

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
        await loadQuizData(firstChild.id)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load children.')
    } finally {
      setLoading(false)
    }
  }

  const loadQuizData = async (childId: number) => {
    setLoading(true)
    try {
      const res = await parentApi.studentActivity(childId)
      setQuizzes(res.data.quizzes || [])
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load quiz results.')
    } finally {
      setLoading(false)
    }
  }

  const handleChildChange = async (childId: number) => {
    setSelectedChildId(childId)
    await loadQuizData(childId)
  }

  const filteredQuizzes = quizzes
    .filter(q => 
      q.lesson_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.submitted_at).getTime()
      const dateB = new Date(b.submitted_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50'
    if (score >= 80) return 'text-blue-600 bg-blue-50'
    if (score >= 70) return 'text-amber-600 bg-amber-50'
    return 'text-rose-600 bg-rose-50'
  }

  const avgScore = quizzes.length > 0 
    ? Math.round(quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length) 
    : 0

  if (loading && !quizzes.length) {
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
          onClick={() => selectedChildId && loadQuizData(selectedChildId)}
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
        <h1 className="text-3xl font-bold mb-1">Quiz Results</h1>
        <p className="text-gray-500">Complete history of quiz performance</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{avgScore}%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Average Score</h3>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{quizzes.length}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Total Quizzes</h3>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {quizzes.length > 0 ? new Date(quizzes[0].submitted_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Last Quiz Date</h3>
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
              placeholder="Search by lesson or subject..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>
      </div>

      {/* Quiz List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredQuizzes.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No quiz results found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredQuizzes.map((quiz) => (
              <div key={quiz.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{quiz.lesson_title}</h3>
                    <p className="text-sm text-gray-500">{quiz.subject_name}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${getScoreColor(quiz.score)}`}>
                    {quiz.score}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{quiz.correct}/{quiz.total} correct</span>
                  <span>•</span>
                  <span>Attempt #{quiz.attempt}</span>
                  <span>•</span>
                  <span>{new Date(quiz.submitted_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}