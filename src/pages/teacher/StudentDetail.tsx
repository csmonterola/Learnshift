import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { teacherApi } from '../../lib/api'
import {
  ChevronRight,
  Award,
  TrendingUp,
  MessageSquare,
  BookOpen,
  GraduationCap,
  Activity,
  Sparkles,
  Lightbulb,
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

interface StudentDetail {
  id: number
  name: string
  email: string
  enrollment_code?: string
  avatar?: string
  overall_mastery: number
  status: string
  studentProfile?: {
    grade_level?: string
    section?: string
    diagnostic_score?: number
    diagnostic_completed?: boolean
  }
  subject_mastery?: Array<{
    subject_id: number
    subject_name: string
    mastery_score: number
  }>
  topic_progress?: Array<{
    id: number
    topic_id: number
    status: string
    mastery_score: number
    topic?: { id: number; title: string }
  }>
  lesson_progress?: Array<{
    id: number
    lesson_id: number
    lesson_title: string
    mastery_percentage: number
    status: string
  }>
  enrolledClasses?: Array<{
    id: number
    name: string
    subject: string
    grade_level: string
  }>
  recent_activity?: ActivityItem[]
}

interface TeacherLearningProfile {
  has_data: boolean
  profile: {
    traits: Record<string, { value: number | null; source: string | null; confidence: number }>
    recommended_difficulty: string | null
  }
  trait_meta: Record<string, { label: string; positive: string; negative: string }>
}

const TRAIT_ORDER = ['pacing', 'mastery_habit', 'difficulty_appetite', 'help_seeking', 'study_regularity']

const TRAIT_TIPS: Record<string, string> = {
  pacing: 'Fast-paced students may benefit from shorter, high-intensity review sprints; deliberate students from written walkthroughs before practice.',
  mastery_habit: 'Habitual retakers thrive with mastery goals; one-and-done students benefit from prompts to revisit a quiz before moving on.',
  difficulty_appetite: 'Challenge-seekers can skip ahead to harder sets; students who prefer easy build confidence with review-level questions first.',
  help_seeking: 'High help-seekers use the AI tutor as support; self-reliant students often respond well to being invited to explain their reasoning first.',
  study_regularity: 'Consistent students can sustain spaced practice; sporadic students benefit from short, scheduled check-ins in low-pressure settings.',
}

const ACTIVITY_ICONS: Record<ActivityItem['type'], { icon: React.ReactNode; classes: string }> = {
  quiz: { icon: <Award className="w-4 h-4" />, classes: 'bg-blue-50 text-blue-500' },
  practice: { icon: <TrendingUp className="w-4 h-4" />, classes: 'bg-violet-50 text-violet-500' },
  chat: { icon: <MessageSquare className="w-4 h-4" />, classes: 'bg-purple-50 text-purple-500' },
  lesson: { icon: <BookOpen className="w-4 h-4" />, classes: 'bg-emerald-50 text-emerald-500' },
}

export function TeacherStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [learningProfile, setLearningProfile] = useState<TeacherLearningProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return
    teacherApi.studentProfile(Number(studentId))
      .then(res => setStudent(res.data))
      .catch((err: any) => {
        console.error('Error loading profile:', err?.response?.data ?? err)
        setError(err?.response?.data?.message ?? 'Failed to load student profile.')
      })
      .finally(() => setLoading(false))
  }, [studentId])

  useEffect(() => {
    if (!studentId) return
    teacherApi.studentLearningProfile(Number(studentId))
      .then(res => setLearningProfile(res.data))
      .catch(err => console.error('Error loading learning profile:', err?.response?.data ?? err))
      .finally(() => setProfileLoading(false))
  }, [studentId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-red-500 mb-4">{error || 'Student not found.'}</p>
        <Link to="/teacher/students" className="text-emerald-600 font-medium hover:text-emerald-700">
          Back to Student Profiles
        </Link>
      </div>
    )
  }

  const profile = student.studentProfile
  const mastery = student.overall_mastery ?? 0
  const masteryLevel = student.status || (mastery >= 80 ? 'Excelling' : mastery >= 70 ? 'On Track' : 'At Risk')
  const masteryColor =
    masteryLevel === 'Excelling' ? 'text-emerald-400' :
    masteryLevel === 'On Track' ? 'text-amber-400' : 'text-red-400'
  const subjectMastery = student.subject_mastery ?? []
  const topicProgress = student.topic_progress ?? []
  const lessonProgress = student.lesson_progress ?? []
  const activities = student.recent_activity ?? []

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/teacher/students" className="hover:text-emerald-600 transition-colors">Student Profiles</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{student.name}</span>
      </div>

      {/* Header card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 text-white mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-3xl font-bold shrink-0 overflow-hidden">
            {student.avatar ? (
              <img src={student.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              student.name.charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold">{student.name}</h1>
            <p className="text-slate-300 text-sm mt-1">
              {profile?.grade_level ? `Grade ${profile.grade_level}` : 'Student'} · {profile?.section || 'No section'}
            </p>
            <p className="text-slate-400 text-xs mt-0.5">{student.email}</p>
            {student.enrolledClasses && student.enrolledClasses.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {student.enrolledClasses.map(c => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-medium">
                    <BookOpen className="w-3 h-3" />
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 shrink-0">
            <div className="bg-white/10 rounded-2xl p-4 text-center min-w-[110px]">
              <div className="text-2xl font-bold">{mastery}%</div>
              <div className="text-xs text-slate-300 mt-0.5">Mastery</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center min-w-[110px]">
              <div className={`text-2xl font-bold ${masteryColor}`}>{masteryLevel}</div>
              <div className="text-xs text-slate-300 mt-0.5">Status</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: mastery & progress */}
        <div className="lg:col-span-2 space-y-6">
          {subjectMastery.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Subject Mastery</h3>
              <div className="space-y-3">
                {subjectMastery.map(sm => (
                  <div key={sm.subject_id} className="flex items-center gap-4">
                    <div className="w-32 shrink-0">
                      <span className="text-sm font-medium text-slate-700">{sm.subject_name}</span>
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all"
                        style={{ width: `${sm.mastery_score}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-600 w-10 text-right">{sm.mastery_score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topicProgress.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Recent Topic Progress</h3>
              <div className="space-y-2">
                {topicProgress.slice(0, 8).map(tp => (
                  <div key={tp.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${tp.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-sm font-medium text-slate-700">{tp.topic?.title || `Topic #${tp.topic_id}`}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-500">{tp.mastery_score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lessonProgress.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Lesson Progress</h3>
              <div className="space-y-2">
                {lessonProgress.slice(0, 8).map(lp => (
                  <div key={lp.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${lp.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-sm font-medium text-slate-700">{lp.lesson_title}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-500">{lp.mastery_percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subjectMastery.length === 0 && topicProgress.length === 0 && lessonProgress.length === 0 && activities.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No progress data available yet.</p>
              <p className="text-xs text-slate-400 mt-1">The student hasn't started any activities.</p>
            </div>
          )}
        </div>

        {/* Right: recent activity */}
        <div className="space-y-6">
          {/* Learning Profile (Learner Adaptation v1) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Learning Profile</h3>
            </div>

            {profileLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
              </div>
            ) : !learningProfile?.has_data ? (
              <div className="text-center py-6">
                <Lightbulb className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No learning profile data yet.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Traits appear once the student answers the onboarding quiz or builds up enough activity.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {learningProfile.profile.recommended_difficulty && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-indigo-50 border-indigo-200 text-indigo-700">
                    <TrendingUp className="w-3 h-3" />
                    Recommends {learningProfile.profile.recommended_difficulty}
                  </div>
                )}

                {TRAIT_ORDER.map(trait => {
                  const cell = learningProfile.profile.traits[trait]
                  const meta = learningProfile.trait_meta?.[trait]
                  if (!cell || cell.value === null) return null
                  const emphasize = Math.abs(cell.value) >= 0.3
                  const direction = cell.value > 0 ? meta?.positive : meta?.negative
                  const barWidth = `${Math.round(Math.abs(cell.value) * 50)}%`
                  const fromBehavior = cell.source === 'behavior'
                  return (
                    <div key={trait} className="bg-slate-50 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-slate-700">{meta?.label ?? trait}</span>
                        <span className={`text-xs font-bold ${emphasize ? 'text-indigo-600' : 'text-slate-500'}`}>
                          {direction ?? 'Balanced'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${fromBehavior ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                          style={{ width: barWidth }}
                          title={fromBehavior ? 'Derived from activity' : 'From onboarding answers'}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2 leading-snug">
                        {TRAIT_TIPS[trait] ?? ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Recent Activity</h3>
              <Link
                to={`/teacher/students/${student.id}/activities`}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {activities.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No recent activity.</p>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 8).map((activity, idx) => {
                  const meta = ACTIVITY_ICONS[activity.type] ?? ACTIVITY_ICONS.lesson
                  return (
                    <button
                      key={idx}
                      onClick={() => navigate(`/teacher/students/${student.id}/activities?type=${activity.type}`)}
                      className="w-full flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 hover:bg-slate-100 transition-colors text-left"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.classes}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{activity.title}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {activity.detail}{activity.subject && activity.subject !== 'Unknown Subject' ? ` · ${activity.subject}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-slate-600">{activity.score}%</span>
                        <p className="text-[10px] text-slate-400">
                          {activity.timestamp ? new Date(activity.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {activities.length > 8 && (
            <Link
              to={`/teacher/students/${student.id}/activities`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl font-semibold text-sm hover:bg-emerald-100 transition-colors"
            >
              <Activity className="w-4 h-4" /> See All Activities
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
