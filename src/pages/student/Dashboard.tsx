import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../components/auth/AuthContext'
import { studentApi } from '../../lib/api'
import { ParentLinkRequests } from '../../components/student/ParentLinkRequests'
import {
  BookOpen, FlaskConical, Inbox, Clock, AlertCircle, Send,
  ChevronRight, Trophy, Dumbbell, MessageCircle,
} from 'lucide-react'

interface EnrolledClass {
  id: number; name: string; subject: string; grade_level: string; section: string;
  teacher_name?: string; mastery_percentage: number; total_topics: number;
  total_lessons: number; completed_lessons: number; mastered_lessons: number; quiz_attempts: number;
}

interface DashboardData {
  enrolled_classes: EnrolledClass[];
  total_lessons_completed: number; total_topics_completed: number; total_topics: number;
  total_quiz_attempts: number; activities_this_week: number;
  subject_mastery: { subject_id: number; subject_name: string; mastery_score: number }[];
  recent_quizzes: { lesson_title: string; score: number; submitted_at: string }[];
}

const subjectIcons: Record<string, typeof BookOpen> = {
  Mathematics: BookOpen, Science: FlaskConical, Filipino: Inbox,
  English: BookOpen, 'Araling Panlipunan': Clock, default: BookOpen,
}

const containerVariants = {
  hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export function StudentDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentApi.dashboard()
      .then(res => setData(res.data))
      .catch(err => console.error('Dashboard error:', err?.response?.data ?? err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  // Use first enrolled class as "current" for the hero
  const currentClass = data?.enrolled_classes?.[0]
  const overallMastery = data?.enrolled_classes?.length
    ? Math.round(data.enrolled_classes.reduce((sum, c) => sum + c.mastery_percentage, 0) / data.enrolled_classes.length)
    : 0

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      {/* Parent Link Requests */}
      <ParentLinkRequests />

      {/* Hero Section */}
      <motion.section variants={itemVariants}
        className="relative bg-gradient-to-r from-emerald-800 to-emerald-600 rounded-[32px] p-8 lg:p-10 overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 blur-xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-white tracking-wide">
              <span>📚</span> {currentClass ? currentClass.subject.toUpperCase() : 'NO CLASSES'}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <BookOpen className="w-4 h-4 text-emerald-300" />
                <span className="text-xs font-bold text-white">{data?.total_lessons_completed ?? 0} Lessons</span>
              </div>
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-2">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-emerald-100 font-medium mb-10">
            {currentClass
              ? `${currentClass.name} · ${currentClass.completed_lessons}/${currentClass.total_lessons} lessons completed`
              : 'Enroll in a class to start learning'}
          </p>
          {currentClass && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-emerald-50">Overall Progress</span>
                <span className="text-sm font-bold text-white">{overallMastery}%</span>
              </div>
              <div className="w-full h-2.5 bg-emerald-900/40 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                  style={{ width: `${overallMastery}%` }} />
              </div>
            </div>
          )}
        </div>
      </motion.section>

      {/* My Classes Grid */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">My Classes</h2>
          <Link to="/student/classes" className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors">
            View all →
          </Link>
        </div>
        {!data?.enrolled_classes?.length ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">No Classes Yet</h3>
            <p className="text-sm text-gray-500">You haven't been enrolled in any classes yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.enrolled_classes.map(cls => (
              <Link key={cls.id} to={`/student/class/${cls.id}`}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    cls.mastery_percentage >= 70 ? 'bg-emerald-100 text-emerald-700' :
                    cls.mastery_percentage > 0 ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {cls.mastery_percentage}%
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">{cls.name}</h3>
                <p className="text-xs text-gray-400 mb-3">{cls.teacher_name || 'No teacher assigned'}</p>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{ width: `${cls.mastery_percentage}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>{cls.completed_lessons}/{cls.total_lessons} lessons</span>
                  <span>{cls.mastered_lessons} mastered</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.section>

      {/* Stats Row */}
      <motion.section variants={itemVariants}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Lessons Completed', value: data?.total_lessons_completed ?? 0, color: 'bg-blue-50 text-blue-600 border-blue-100', icon: BookOpen },
          { label: 'Activities This Week', value: data?.activities_this_week ?? 0, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: Dumbbell },
          { label: 'Quiz Attempts', value: data?.total_quiz_attempts ?? 0, color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Trophy },
          { label: 'Topics Mastered', value: `${data?.total_topics_completed ?? 0}/${data?.total_topics ?? 0}`, color: 'bg-purple-50 text-purple-600 border-purple-100', icon: BookOpen },
        ].map((stat, i) => (
          <div key={i} className={`rounded-2xl p-5 border ${stat.color}`}>
            <stat.icon className="w-5 h-5 mb-3 opacity-60" />
            <p className="text-2xl font-extrabold">{stat.value}</p>
            <p className="text-xs font-medium opacity-70 mt-1">{stat.label}</p>
          </div>
        ))}
      </motion.section>

      {/* Subject Progress */}
      {data?.subject_mastery && data.subject_mastery.length > 0 && (
        <motion.section variants={itemVariants}>
          <div className="bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Subject Progress</h2>
            <div className="space-y-4">
              {data!.subject_mastery.map(s => {
                const Icon = subjectIcons[s.subject_name] || subjectIcons.default
                return (
                  <div key={s.subject_id} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium text-gray-700">{s.subject_name}</span>
                        <span className="text-sm font-bold text-emerald-600">{s.mastery_score}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full transition-all"
                          style={{ width: `${s.mastery_score}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.section>
      )}

      {/* Recent Quizzes */}
      {data?.recent_quizzes && data.recent_quizzes.length > 0 && (
        <motion.section variants={itemVariants}>
          <div className="bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Quiz Results</h2>
            <div className="space-y-3">
              {data!.recent_quizzes.map((q, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${q.score >= 70 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                      <Trophy className={`w-4 h-4 ${q.score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{q.lesson_title}</span>
                  </div>
                  <span className={`text-sm font-bold ${q.score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>{q.score}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}
    </motion.div>
  )
}