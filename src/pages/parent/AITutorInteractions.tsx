import React, { useState, useEffect } from 'react'
import { useAuth } from '../../components/auth/AuthContext'
import { parentApi } from '../../lib/api'
import {
  MessageSquare,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

interface AIChatLog {
  id: number
  lesson_id: number
  lesson_title: string
  question: string
  ai_response: string
  teacher_review?: string
  teacher_note?: string
  reviewed_at?: string
  created_at: string
}

export function ParentAITutorInteractions() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [selectedChildName, setSelectedChildName] = useState('')
  const [aiChatLogs, setAIChatLogs] = useState<AIChatLog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterReviewed, setFilterReviewed] = useState<string>('all')
  const [expandedLog, setExpandedLog] = useState<number | null>(null)

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
        await loadAIData(firstChild.id)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load children.')
    } finally {
      setLoading(false)
    }
  }

  const loadAIData = async (childId: number) => {
    setLoading(true)
    try {
      const res = await parentApi.studentActivity(childId)
      setAIChatLogs(res.data.ai_chat_logs || [])
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load AI interactions.')
    } finally {
      setLoading(false)
    }
  }

  const handleChildChange = async (childId: number) => {
    setSelectedChildId(childId)
    await loadAIData(childId)
  }

  const filteredLogs = aiChatLogs
    .filter(log => {
      const matchesSearch = log.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           log.lesson_title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesReviewed = filterReviewed === 'all' ||
                             (filterReviewed === 'reviewed' && log.teacher_review) ||
                             (filterReviewed === 'unreviewed' && !log.teacher_review)
      return matchesSearch && matchesReviewed
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const toggleExpand = (id: number) => {
    setExpandedLog(expandedLog === id ? null : id)
  }

  const reviewedCount = aiChatLogs.filter(log => log.teacher_review).length
  const unreviewedCount = aiChatLogs.filter(log => !log.teacher_review).length

  if (loading && !aiChatLogs.length) {
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
          onClick={() => selectedChildId && loadAIData(selectedChildId)}
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
        <h1 className="text-3xl font-bold mb-1">AI Tutor Interactions</h1>
        <p className="text-gray-500">Monitor questions and responses with the AI tutor</p>
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
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{aiChatLogs.length}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Total Interactions</h3>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{reviewedCount}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Teacher Reviewed</h3>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{unreviewedCount}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Awaiting Review</h3>
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
              placeholder="Search by question or lesson..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select
            value={filterReviewed}
            onChange={(e) => setFilterReviewed(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="all">All Interactions</option>
            <option value="reviewed">Teacher Reviewed</option>
            <option value="unreviewed">Awaiting Review</option>
          </select>
        </div>
      </div>

      {/* AI Interactions List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No AI interactions found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{log.lesson_title}</h3>
                      {log.teacher_review ? (
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Reviewed
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Awaiting Review
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => toggleExpand(log.id)}
                    className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {expandedLog === log.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {expandedLog === log.id && (
                  <div className="mt-4 space-y-3">
                    {/* Student Question */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Student asked:
                      </p>
                      <p className="text-sm text-gray-900">{log.question}</p>
                    </div>

                    {/* AI Response */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-purple-900 mb-2 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        AI Tutor responded:
                      </p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{log.ai_response}</p>
                    </div>

                    {/* Teacher Review */}
                    {log.teacher_review && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-amber-900 mb-2 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Teacher Review:
                        </p>
                        <p className="text-sm text-gray-900 mb-2">{log.teacher_review}</p>
                        {log.teacher_note && (
                          <p className="text-xs text-gray-600 italic">
                            Note: {log.teacher_note}
                          </p>
                        )}
                        {log.reviewed_at && (
                          <p className="text-xs text-gray-500 mt-2">
                            Reviewed: {new Date(log.reviewed_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}