import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { studentApi } from '../../lib/api'
import { BookOpen, ChevronRight, FileText } from 'lucide-react'

interface ClassData {
  id: number
  name: string
  grade_level: string
  section: string
  school_year: string
  subject: string
  teacher?: { id: number; name: string }
}

interface TopicItem {
  id: number
  title: string
  description?: string
  order_index: number
  lesson_count: number
  lessons_count?: number
}

export function StudentClassPage() {
  const { classId } = useParams<{ classId: string }>()
  const [classData, setClassData] = useState<ClassData | null>(null)
  const [classTopics, setClassTopics] = useState<TopicItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!classId) return
    const id = Number(classId)
    Promise.all([
      studentApi.classDetail(id),
      studentApi.classTopics(id),
    ])
      .then(([cls, tops]) => {
        setClassData(cls.data)
        setClassTopics(tops.data || [])
      })
      .catch(err => console.error('Error loading class data:', err?.response?.data ?? err))
      .finally(() => setLoading(false))
  }, [classId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/student/classes" className="hover:text-emerald-600 transition-colors">My Classes</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{classData?.name || 'Class'}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{classData?.name || 'Class'}</h1>
        <p className="text-gray-500">
          Grade {classData?.grade_level} · Section {classData?.section} · {classData?.subject}
        </p>
        {classData?.teacher && (
          <p className="text-sm text-gray-400 mt-1">Teacher: {classData.teacher.name}</p>
        )}
      </div>

      {/* Topics */}
      {classTopics.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Topics Yet</h3>
          <p className="text-gray-500">Your teacher hasn't added any topics yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classTopics.map((topic, index) => (
            <motion.div
              key={topic.id}
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
                    <h3 className="text-xl font-bold text-gray-900">{topic.title}</h3>
                  </div>
                  {topic.description && (
                    <p className="text-sm text-gray-500 ml-11 mb-2">{topic.description}</p>
                  )}
                  <div className="flex items-center gap-1 ml-11">
                    <FileText className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {topic.lessons_count ?? topic.lesson_count ?? 0} lesson{(topic.lessons_count ?? topic.lesson_count ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/student/class/${classId}/topic/${topic.id}`}
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
