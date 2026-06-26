import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../../components/auth/AuthContext'
import { parentApi } from '../../lib/api'
import {
  Award,
  BookOpen,
  MessageSquare,
  ChevronRight,
  Loader2,
  Eye,
  Calendar,
  TrendingUp,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
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

type TabType = 'overview' | 'quizzes' | 'mastery' | 'ai_interactions'

export function ParentStudentActivity() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [selectedChildName, setSelectedChildName] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  
  // Data
  const [quizzes, setQuizzes] = useState<QuizResult[]>([])
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([])
  const [aiChatLogs, setAIChatLogs] = useState<AIChatLog[]>([])

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
        await loadActivityData(firstChild.id)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load children.')
    } finally {
      setLoading(false)
    }
  }

  const loadActivityData = async (childId: number) => {
    setLoading(true)
    try {
      const res = await parentApi.studentActivity(childId)
      setQuizzes(res.data.quizzes || [])
      setLessonProgress(res.data.lesson_progress || [])
      setAIChatLogs(res.data.ai_chat_logs || [])
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load activity data.')
    } finally {
      setLoading(false)
    }
  }

  const handleChildChange = async (childId: number) => {
    setSelectedChildId(childId)
    await loadActivityData(childId)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50'
    if (score >= 80) return 'text-blue-600 bg-blue-50'
    if (score >= 70) return 'text-amber-600 bg-amber-50'
    return 'text-rose-600 bg-rose-50'
  }

  const getMasteryColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-emerald-500'
    if (percentage >= 80) return 'bg-blue-500'
    if (percentage >= 70) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'in_progress':
        return <Clock className="w-4 h-4 text-amber-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const avgScore = quizzes.length > 0 
    ? Math.round(quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length) 
    : 0
  const avgMastery = lessonProgress.length > 0
    ? Math.round(lessonProgress.reduce((sum, lp) => sum + lp.mastery_percentage, 0) / lessonProgress.length)
    : 0

  if (loading && !quizzes.length && !lessonProgress.length) {
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
          onClick={() => selectedChildId && loadActivityData(selectedChildId)}
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
        <h1 className="text-3xl font-bold mb-1">Student Activity</h1>
        <p className="text-gray-500">Monitor your child's learning progress and interactions</p>
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{avgScore}%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Average Quiz Score</h3>
          <p className="text-xs text-gray-500">{quizzes.length} quizzes completed</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{avgMastery}%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Average Mastery</h3>
          <p className="text-xs text-gray-500">{lessonProgress.length} lessons tracked</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{aiChatLogs.length}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">AI Interactions</h3>
          <p className="text-xs text-gray-500">Questions asked to AI tutor</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-1 p-2 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-emerald-50 text-emerald-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Eye className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'quizzes'
                ? 'bg-emerald-50 text-emerald-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Award className="w-4 h-4" />
            Quiz Results
          </button>
          <button
            onClick={() => setActiveTab('mastery')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'mastery'
                ? 'bg-emerald-50 text-emerald-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Lesson Mastery
          </button>
          <button
            onClick={() => setActiveTab('ai_interactions')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'ai_interactions'
                ? 'bg-emerald-50 text-emerald-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            AI Tutor
          </button>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {quizzes.length === 0 && lessonProgress.length === 0 ? (
                  <p className="text-gray-500 text-sm">No activity yet.</p>
                ) : (
                  <div className="space-y-3">
                    {[...quizzes.slice(0, 5), ...lessonProgress.slice(0, 5)]
                      .sort((a, b) => {
                        const dateA = 'submitted_at' in a ? a.submitted_at : a.updated_at
                        const dateB = 'submitted_at' in b ? b.submitted_at : b.updated_at
                        return new Date(dateB).getTime() - new Date(dateA).getTime()
                      })
                      .slice(0, 10)
                      .map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                            {'score' in item ? (
                              <Award className="w-5 h-5 text-blue-600" />
                            ) : (
                              <BookOpen className="w-5 h-5 text-emerald-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {'lesson_title' in item ? item.lesson_title : 'Lesson Updated'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {'subject_name' in item ? item.subject_name : ''}
                            </p>
                          </div>
                          {'score' in item && (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getScoreColor(item.score)}`}>
                              {item.score}%
                            </span>
                          )}
                          {'mastery_percentage' in item && (
                            <span className="text-sm font-bold text-gray-700">
                              {item.mastery_percentage}%
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quiz Results Tab */}
          {activeTab === 'quizzes' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Quiz Results</h3>
                <span className="text-sm text-gray-500">{quizzes.length} results</span>
              </div>
              {quizzes.length === 0 ? (
                <p className="text-gray-500 text-sm">No quiz results yet.</p>
              ) : (
                <div className="space-y-3">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="p-4 border border-gray-200 rounded-xl hover:border-emerald-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{quiz.lesson_title}</h4>
                          <p className="text-xs text-gray-500">{quiz.subject_name}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(quiz.score)}`}>
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
          )}

          {/* Lesson Mastery Tab */}
          {activeTab === 'mastery' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Lesson Mastery</h3>
                <span className="text-sm text-gray-500">{lessonProgress.length} lessons</span>
              </div>
              {lessonProgress.length === 0 ? (
                <p className="text-gray-500 text-sm">No lesson progress yet.</p>
              ) : (
                <div className="space-y-3">
                  {lessonProgress.map((lp) => (
                    <div key={lp.id} className="p-4 border border-gray-200 rounded-xl hover:border-emerald-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(lp.status)}
                            <h4 className="font-semibold text-gray-900">{lp.lesson_title}</h4>
                          </div>
                          <p className="text-xs text-gray-500">
                            {lp.topic_title} • {lp.subject_name} • {lp.class_name}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{lp.mastery_percentage}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getMasteryColor(lp.mastery_percentage)} rounded-full`}
                            style={{ width: `${lp.mastery_percentage}%` }}
                          />
                        </div>
                        {lp.best_quiz_score > 0 && (
                          <span className="text-xs text-gray-600">Best quiz: {lp.best_quiz_score}%</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Tutor Interactions Tab */}
          {activeTab === 'ai_interactions' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">AI Tutor Interactions</h3>
                <span className="text-sm text-gray-500">{aiChatLogs.length} interactions</span>
              </div>
              {aiChatLogs.length === 0 ? (
                <p className="text-gray-500 text-sm">No AI interactions yet.</p>
              ) : (
                <div className="space-y-4">
                  {aiChatLogs.map((log) => (
                    <div key={log.id} className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 transition-colors">
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-2">
                          {log.lesson_title} • {new Date(log.created_at).toLocaleString()}
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-xs font-semibold text-blue-900 mb-1">Student asked:</p>
                          <p className="text-sm text-gray-900">{log.question}</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                          <p className="text-xs font-semibold text-purple-900 mb-1">AI Tutor responded:</p>
                          <div className="prose prose-sm max-w-none text-gray-900">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{log.ai_response}</ReactMarkdown>
                          </div>
                        </div>
                        {log.teacher_review && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-amber-900 mb-1">Teacher Review:</p>
                            <p className="text-sm text-gray-900">{log.teacher_review}</p>
                            {log.teacher_note && (
                              <p className="text-xs text-gray-600 mt-1 italic">Note: {log.teacher_note}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}