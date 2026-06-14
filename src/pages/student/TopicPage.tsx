import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { studentApi } from '../../lib/api'
import { ChevronRight, FileText, BookOpen } from 'lucide-react'

interface LessonItem {
  id: number
  title: string
  content?: string
  order: number
}

interface TopicData {
  id: number
  title: string
  description?: string
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/student/classes" className="hover:text-emerald-600 transition-colors">My Classes</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/student/class/${classId}`} className="hover:text-emerald-600 transition-colors">Class</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{topicData?.title || 'Topic'}</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{topicData?.title || 'Topic'}</h1>
        {topicData?.description && <p className="text-gray-500">{topicData.description}</p>}
      </div>

      {!topicData?.lessons || topicData.lessons.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Lessons Yet</h3>
          <p className="text-gray-500">Your teacher hasn't added any lessons yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topicData.lessons.map((lesson, index) => (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-sm">
                      {index + 1}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">{lesson.title}</h3>
                  </div>
                  {lesson.content && (
                    <p className="text-sm text-gray-500 ml-11 line-clamp-2">{lesson.content}</p>
                  )}
                </div>
                <Link
                  to={`/student/class/${classId}/topic/${topicId}/lesson/${lesson.id}`}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Open <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
