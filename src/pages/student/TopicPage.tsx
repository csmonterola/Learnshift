import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { studentApi } from '../../lib/api'
import { ChevronRight, FileText, BookOpen, CheckCircle, Trophy } from 'lucide-react'

interface LessonItem {
  id: number; title: string; content?: string; order: number;
  status: string; mastery_percentage: number; best_quiz_score: number | null;
}

interface TopicData {
  id: number; title: string; description?: string;
  mastery_percentage: number;
  lessons: LessonItem[]
}

export function StudentTopicPage() {
  const { classId, topicId } = useParams<{ classId: string; topicId: string }>()
  const [topicData, setTopicData] = useState<TopicData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!classId || !topicId) return
    studentApi.topic(Number(classId), Number(topicId))
      .then(res => setTopicData(res.data))
      .catch(err => console.error('Error loading topic:', err?.response?.data ?? err))
      .finally(() => setLoading(false))
  }, [classId, topicId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  const masteredCount = topicData?.lessons?.filter(l => l.mastery_percentage === 100).length ?? 0
  const completedCount = topicData?.lessons?.filter(l => l.status === 'completed').length ?? 0

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/student/classes" className="hover:text-emerald-600 transition-colors">My Classes</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/student/class/${classId}`} className="hover:text-emerald-600 transition-colors">Class</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{topicData?.title || 'Topic'}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{topicData?.title || 'Topic'}</h1>
        {topicData?.description && <p className="text-gray-500">{topicData.description}</p>}
      </div>

      {/* Topic Mastery Card */}
      {topicData && topicData.lessons.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-1">Topic Mastery</h3>
              <p className="text-4xl font-extrabold text-blue-600">{topicData.mastery_percentage}%</p>
              <p className="text-xs text-blue-600/70 mt-1">
                {masteredCount} of {topicData.lessons.length} lessons mastered
              </p>
            </div>
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="w-full h-3 bg-blue-200 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${topicData.mastery_percentage}%` }} />
          </div>
        </div>
      )}

      {/* Lessons */}
      {!topicData?.lessons || topicData.lessons.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Lessons Yet</h3>
          <p className="text-gray-500">Your teacher hasn't added any lessons yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topicData.lessons.map((lesson, index) => {
            const isMastered = lesson.mastery_percentage === 100
            const isStarted = lesson.status !== 'not_started'
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          isMastered ? 'bg-emerald-100 text-emerald-600' :
                          isStarted ? 'bg-amber-100 text-amber-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {isMastered ? <CheckCircle className="w-4 h-4" /> : index + 1}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900">{lesson.title}</h3>
                      </div>
                      {lesson.content && (
                        <p className="text-sm text-gray-500 ml-11 line-clamp-2">{lesson.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={`text-sm font-bold ${
                          lesson.mastery_percentage >= 70 ? 'text-emerald-600' :
                          lesson.mastery_percentage > 0 ? 'text-amber-600' : 'text-gray-400'
                        }`}>
                          {lesson.mastery_percentage}%
                        </span>
                        {lesson.best_quiz_score !== null && (
                          <p className="text-xs text-gray-400">Best: {lesson.best_quiz_score}%</p>
                        )}
                      </div>
                      <Link
                        to={`/student/class/${classId}/topic/${topicId}/lesson/${lesson.id}`}
                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
                      >
                        Open <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-4 ml-11">
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        lesson.mastery_percentage >= 70 ? 'bg-emerald-400' :
                        lesson.mastery_percentage > 0 ? 'bg-amber-400' : 'bg-gray-200'
                      }`} style={{ width: `${lesson.mastery_percentage}%` }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}