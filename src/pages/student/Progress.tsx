import React, { useState, useEffect } from 'react'
import {
  LineChart,
  CheckSquare,
  Trophy,
  Divide,
  FlaskConical,
  BookOpen,
  Target,
  GraduationCap,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { studentApi } from '../../lib/api'

interface ClassProgress {
  id: number
  name: string
  subject: string
  grade_level: string
  teacher_name: string
  mastery_percentage: number
  total_topics: number
  total_lessons: number
  completed_lessons: number
  mastered_lessons: number
  topics: TopicProgress[]
}

interface TopicProgress {
  id: number
  title: string
  lesson_count: number
  completed_lessons: number
  mastered_lessons: number
  mastery_percentage: number
}

interface SubjectMastery {
  subject_id: number
  subject_name: string
  mastery_score: number
  target_score: number
}

interface QuizResult {
  id: number
  lesson: { id: number; title: string }
  score: number
  total_questions: number
  correct_answers: number
  submitted_at: string
}

interface ProgressData {
  overall_mastery: number
  total_lessons_completed: number
  total_mastered: number
  total_topics_completed: number
  total_topics: number
  class_progress: ClassProgress[]
  subject_mastery: SubjectMastery[]
  recent_quizzes: QuizResult[]
}

export function StudentProgress() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'Week' | 'Month' | 'All time'>('All time')

  useEffect(() => {
    loadProgress()
  }, [])

  const loadProgress = async () => {
    try {
      const res = await studentApi.getProgress()
      setData(res.data)
    } catch (err) {
      console.error('Error loading progress:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16 text-gray-500">
        Could not load progress data.
      </div>
    )
  }

  // Filter quizzes based on selected period
  const filteredQuizzes = data.recent_quizzes.filter(q => {
    if (period === 'All time') return true
    const date = new Date(q.submitted_at)
    const now = new Date()
    if (period === 'Week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return date >= weekAgo
    }
    if (period === 'Month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return date >= monthAgo
    }
    return true
  })

  const subjectIcons: Record<string, React.ElementType> = {
    Mathematics: Divide,
    Science: FlaskConical,
    English: BookOpen,
  }

  const subjectColors: Record<string, string> = {
    Mathematics: 'bg-emerald-400',
    Science: 'bg-indigo-500',
    English: 'bg-orange-500',
  }

  const subjectBg: Record<string, string> = {
    Mathematics: 'bg-emerald-50',
    Science: 'bg-indigo-50',
    English: 'bg-orange-50',
  }

  const subjectText: Record<string, string> = {
    Mathematics: 'text-emerald-600',
    Science: 'text-indigo-600',
    English: 'text-orange-600',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <LineChart className="w-8 h-8 text-indigo-400 fill-indigo-100" />
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">My Progress</h1>
            <p className="text-gray-500">Track your learning journey across all your classes.</p>
          </div>
        </div>
        <div className="bg-white rounded-full p-1 flex shadow-sm border border-gray-100">
          {(['Week', 'Month', 'All time'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-6 py-1.5 rounded-full text-sm font-bold transition-colors ${
                period === p ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats - No XP/Streak, just mastery and completion stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 shadow-sm">
          <Trophy className="w-6 h-6 text-indigo-500 mb-4 fill-indigo-500" />
          <p className="text-xs font-bold text-indigo-600 tracking-wider uppercase mb-1">Overall Mastery</p>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">{data.overall_mastery}%</h2>
          <p className="text-xs text-gray-500">across all subjects</p>
        </div>
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 shadow-sm">
          <CheckSquare className="w-6 h-6 text-emerald-500 mb-4 fill-emerald-500" />
          <p className="text-xs font-bold text-emerald-600 tracking-wider uppercase mb-1">Lessons Done</p>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">{data.total_lessons_completed}</h2>
          <p className="text-xs text-gray-500">
            {data.total_mastered} mastered
          </p>
        </div>
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 shadow-sm">
          <GraduationCap className="w-6 h-6 text-amber-500 mb-4 fill-amber-500" />
          <p className="text-xs font-bold text-amber-600 tracking-wider uppercase mb-1">Topics Done</p>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">{data.total_topics_completed}</h2>
          <p className="text-xs text-gray-500">out of {data.total_topics} total</p>
        </div>
        <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-6 shadow-sm">
          <Target className="w-6 h-6 text-sky-500 mb-4 fill-sky-500" />
          <p className="text-xs font-bold text-sky-600 tracking-wider uppercase mb-1">Classes</p>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">{data.class_progress.length}</h2>
          <p className="text-xs text-gray-500">currently enrolled</p>
        </div>
      </div>

      {/* Class Progress Sections */}
      {data.class_progress.map((classItem) => (
        <div key={classItem.id} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">{classItem.name}</h2>
              <p className="text-sm text-gray-500">
                {classItem.subject} · {classItem.teacher_name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-extrabold text-indigo-600">{classItem.mastery_percentage}%</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mastery</div>
            </div>
          </div>

          {/* Class-level progress bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-indigo-400 rounded-full transition-all"
              style={{ width: `${classItem.mastery_percentage}%` }}
            />
          </div>

          <div className="text-xs text-gray-400 mb-4">
            {classItem.completed_lessons} of {classItem.total_lessons} lessons completed ·{' '}
            {classItem.mastered_lessons} mastered
          </div>

          {/* Topic list */}
          <div className="space-y-3">
            {classItem.topics.map((topic) => (
              <div key={topic.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl">
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-1.5">
                    <h3 className="font-semibold text-gray-800 text-sm">{topic.title}</h3>
                    <span className="text-xs font-bold text-indigo-600">{topic.mastery_percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full"
                      style={{ width: `${topic.mastery_percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {topic.completed_lessons}/{topic.lesson_count} lessons
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Subject Mastery */}
      {data.subject_mastery.length > 0 && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6">Subject Mastery</h2>
          <div className="space-y-6">
            {data.subject_mastery.map((sm) => {
              const Icon = subjectIcons[sm.subject_name] || BookOpen
              const color = subjectColors[sm.subject_name] || 'bg-indigo-500'
              const bg = subjectBg[sm.subject_name] || 'bg-indigo-50'
              const textColor = subjectText[sm.subject_name] || 'text-indigo-600'
              return (
                <div key={sm.subject_id} className="flex items-center gap-6 p-4 border border-gray-100 rounded-2xl">
                  <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-6 h-6 ${textColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-2">
                      <h3 className="font-bold text-gray-900">{sm.subject_name}</h3>
                      <span className={`text-sm font-bold ${textColor}`}>{sm.mastery_score}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${sm.mastery_score}%` }} />
                    </div>
                    <p className="text-xs text-gray-400">Target: {sm.target_score}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Quiz Attempts */}
      {filteredQuizzes.length > 0 && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6">
            Recent Quiz Results
            {period !== 'All time' && (
              <span className="text-sm font-normal text-gray-400 ml-2">(past {period.toLowerCase()})</span>
            )}
          </h2>
          <div className="space-y-3">
            {filteredQuizzes.map((quiz) => (
              <div key={quiz.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{quiz.lesson?.title || 'Quiz'}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(quiz.submitted_at).toLocaleDateString()} ·{' '}
                    {quiz.correct_answers}/{quiz.total_questions} correct
                  </p>
                </div>
                <div className={`text-lg font-extrabold ${
                  quiz.score >= 80 ? 'text-emerald-600' : quiz.score >= 50 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {quiz.score}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No activity message */}
      {filteredQuizzes.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">No quiz activity yet</h3>
          <p className="text-gray-500 text-sm">
            Complete lessons and take quizzes to see your progress here.
          </p>
        </div>
      )}
    </div>
  )
}