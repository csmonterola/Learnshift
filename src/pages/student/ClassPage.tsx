import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { studentApi } from '../../lib/api'
import { BookOpen, ChevronRight, FileText, CheckCircle, Trophy } from 'lucide-react'

interface ClassData {
  id: number; name: string; grade_level: string; section: string;
  school_year: string; subject: string;
  teacher?: { id: number; name: string };
}

interface TopicItem {
  id: number; title: string; description?: string; order_index: number;
  lesson_count: number; mastery_percentage: number;
  completed_lessons: number; mastered_lessons: number; total_lessons: number;
}

export function StudentClassPage() {
  const { classId } = useParams<{ classId: string }>()
  const [classData, setClassData] = useState<ClassData | null>(null)
  const [classTopics, setClassTopics] = useState<TopicItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!classId) return
    const id = Number(classId)
    Promise.all([studentApi.classDetail(id), studentApi.classTopics(id)])
      .then(([cls, tops]) => { setClassData(cls.data); setClassTopics(tops.data || []) })
      .catch(err => console.error('Error loading class:', err?.response?.data ?? err))
      .finally(() => setLoading(false))
  }, [classId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  // Calculate overall class mastery
  const overallMastery = classTopics.length > 0
    ? Math.round(classTopics.reduce((sum, t) => sum + t.mastery_percentage, 0) / classTopics.length)
    : 0

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

      {/* Overall Mastery Card */}
      {classTopics.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-1">Class Mastery</h3>
              <p className="text-4xl font-extrabold text-emerald-600">{overallMastery}%</p>
              <p className="text-xs text-emerald-600/70 mt-1">
                {classTopics.filter(t => t.mastery_percentage === 100).length} of {classTopics.length} topics mastered
              </p>
            </div>
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-emerald-500" />
            </div>
          </div>
          <div className="w-full h-3 bg-emerald-200 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${overallMastery}%` }} />
          </div>
        </div>
      )}

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
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        topic.mastery_percentage === 100 ? 'bg-emerald-100 text-emerald-600' :
                        topic.mastery_percentage > 0 ? 'bg-amber-100 text-amber-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {topic.mastery_percentage === 100 ? <CheckCircle className="w-4 h-4" /> : index + 1}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900">{topic.title}</h3>
                    </div>
                    {topic.description && (
                      <p className="text-sm text-gray-500 ml-11 mb-2">{topic.description}</p>
                    )}
                    <div className="flex items-center gap-1 ml-11">
                      <FileText className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {topic.lesson_count} lesson{topic.lesson_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Mastery indicator */}
                    <div className="text-right">
                      <span className={`text-sm font-bold ${
                        topic.mastery_percentage >= 70 ? 'text-emerald-600' :
                        topic.mastery_percentage > 0 ? 'text-amber-600' : 'text-gray-400'
                      }`}>
                        {topic.mastery_percentage}%
                      </span>
                      <p className="text-xs text-gray-400">{topic.completed_lessons}/{topic.total_lessons} done</p>
                    </div>
                    <Link
                      to={`/student/class/${classId}/topic/${topic.id}`}
                      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
                    >
                      Open <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
                {/* Progress bar */}
                {topic.total_lessons > 0 && (
                  <div className="mt-4 ml-11">
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        topic.mastery_percentage >= 70 ? 'bg-emerald-400' :
                        topic.mastery_percentage > 0 ? 'bg-amber-400' : 'bg-gray-200'
                      }`} style={{ width: `${topic.mastery_percentage}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}