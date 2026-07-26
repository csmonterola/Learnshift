import React, { useState, useEffect } from 'react'
import { useAuth } from '../../components/auth/AuthContext'
import { parentApi } from '../../lib/api'
import { LinkChildModal } from '../../components/parent/LinkChildModal'
import {
  StarIcon,
  ClockIcon,
  CalendarIcon,
  CheckSquareIcon,
  ArrowRightIcon,
  Loader2,
  UserPlus,
  Users,
  BookOpen,
  Trophy,
  MessageSquare,
  PlayCircle,
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
  best_quiz_score: number | null
  completed_at: string | null
  updated_at: string
}

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

interface Activity {
  type: 'lesson' | 'quiz'
  action: string
  title: string
  subject: string
  score: number
  timestamp: string
}

interface ChildData {
  id: number
  name: string
  email: string
  studentProfile?: {
    grade_level?: string
    section?: string
    total_xp?: number
  }
  subjectMastery?: {
    subject_id: number
    subject: { name: string }
    mastery_score: number
  }[]
  lesson_progress: LessonProgress[]
  recent_quizzes: QuizResult[]
  recent_activity: Activity[]
  stats: {
    total_lessons: number
    lessons_completed: number
    lessons_attempted: number
    total_quizzes: number
    avg_quiz_score: number
    overall_mastery: number
  }
}

interface DashboardData {
  children: ChildData[]
}

const strokeColorMap: Record<string, string> = {
  emerald: '#10b981',
  blue: '#3b82f6',
  purple: '#a855f7',
  amber: '#f59e0b',
}

const subjectColors = ['emerald', 'blue', 'purple', 'amber']

export function ParentDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await parentApi.dashboard()
      setData(res.data)
      if (res.data.children?.length > 0) {
        setSelectedChildId(res.data.children[0].id)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  const selectedChild = data?.children?.find((c) => c.id === selectedChildId) ?? null

  if (loading) {
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
        <button onClick={loadDashboard} className="text-emerald-600 font-medium hover:text-emerald-700">
          Try Again
        </button>
      </div>
    )
  }

  const hasChildren = data?.children && data.children.length > 0

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Good morning, {user?.name} 👋</h1>
          <p className="text-gray-500">
            {hasChildren
              ? `Here's how ${selectedChild?.name ?? 'your child'} is progressing`
              : 'Link a student to start tracking their progress'}
          </p>
        </div>
        {hasChildren && selectedChild && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {selectedChild.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-xs text-emerald-600 font-medium">Viewing Progress for</div>
              <div className="text-sm font-semibold">{selectedChild.name}</div>
            </div>
          </div>
        )}
      </div>

      {/* No children state */}
      {!hasChildren ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Linked Students Yet</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Link a student account to view their academic progress, mastery levels, and learning activities.
          </p>
          <button
            onClick={() => setShowLinkModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Link a Student
          </button>
        </div>
      ) : (
        <>
          {/* Child selector (if multiple) */}
          {data!.children.length > 1 && (
            <div className="flex gap-2 mb-6">
              {data!.children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedChildId === child.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'
                  }`}
                >
                  {child.name}
                </button>
              ))}
              <button
                onClick={() => setShowLinkModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-dashed border-gray-300 text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
              >
                + Link Another
              </button>
            </div>
          )}

          {selectedChild && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: StarIcon, value: `${selectedChild.stats.overall_mastery}%`, label: 'Overall Mastery', color: 'text-amber-500' },
                  { icon: BookOpen, value: `${selectedChild.stats.lessons_completed}/${selectedChild.stats.total_lessons}`, label: 'Lessons Completed', color: 'text-emerald-500' },
                  { icon: PlayCircle, value: `${selectedChild.stats.lessons_attempted}`, label: 'Lessons Attempted', color: 'text-blue-500' },
                  { icon: Trophy, value: `${selectedChild.stats.avg_quiz_score}%`, label: 'Avg Quiz Score', color: 'text-purple-500' },
                ].map((stat, i) => {
                  const Icon = stat.icon
                  return (
                    <div key={i} className="bg-white rounded-xl p-5 border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className={stat.color}><Icon className="w-5 h-5" /></div>
                        <div>
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <div className="text-xs text-gray-500">{stat.label}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Recent Activity */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                {selectedChild.recent_activity.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                    No activity yet. The student needs to start taking lessons and quizzes.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {selectedChild.recent_activity.map((activity, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          activity.type === 'quiz' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {activity.type === 'quiz' ? (
                            <Trophy className="w-5 h-5" />
                          ) : activity.action === 'completed' ? (
                            <CheckSquareIcon className="w-5 h-5" />
                          ) : (
                            <PlayCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900">{activity.title}</div>
                          <div className="text-xs text-gray-500">
                            <span className="font-medium text-emerald-600">{activity.subject}</span>
                            {' · '}
                            {activity.type === 'quiz' ? (
                              <span className={activity.score >= 70 ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                                Score: {activity.score}%
                              </span>
                            ) : (
                              <span>Mastery: {activity.score}%</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lesson Progress */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Lesson Progress</h2>
                {selectedChild.lesson_progress.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                    No lessons attempted yet.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-gray-100">
                          <th className="py-3 px-4 text-xs font-bold text-gray-400 tracking-wider">LESSON</th>
                          <th className="hidden sm:table-cell py-3 px-4 text-xs font-bold text-gray-400 tracking-wider">SUBJECT</th>
                          <th className="hidden sm:table-cell py-3 px-4 text-xs font-bold text-gray-400 tracking-wider">CLASS</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-400 tracking-wider">MASTERY</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-400 tracking-wider">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedChild.lesson_progress.slice(0, 10).map((lp) => (
                          <tr key={lp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-sm text-gray-900">{lp.lesson_title}</div>
                              <div className="text-xs text-gray-500">{lp.topic_title}</div>
                            </td>
                            <td className="hidden sm:table-cell py-3 px-4 text-sm text-gray-600">{lp.subject_name}</td>
                            <td className="hidden sm:table-cell py-3 px-4 text-sm text-gray-600">{lp.class_name}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                                  <div
                                    className={`h-full rounded-full ${
                                      lp.mastery_percentage >= 70 ? 'bg-emerald-500' : lp.mastery_percentage > 0 ? 'bg-amber-500' : 'bg-gray-300'
                                    }`}
                                    style={{ width: `${lp.mastery_percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-gray-600">{lp.mastery_percentage}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                lp.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : lp.status === 'in_progress'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-gray-50 text-gray-600'
                              }`}>
                                {lp.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Link another CTA */}
              <button
                onClick={() => setShowLinkModal(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-4 rounded-xl mb-8 flex items-center justify-center gap-2 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                Link Another Student
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </>
      )}

      {/* Link Child Modal */}
      <LinkChildModal
        open={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSuccess={(msg) => {
          setToast(msg)
          setTimeout(() => setToast(''), 4000)
        }}
      />
    </div>
  )
}