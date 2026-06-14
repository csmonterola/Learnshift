import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { studentApi } from '../../lib/api'
import { BookOpen, Users, ChevronRight } from 'lucide-react'

interface ClassItem {
  id: number
  name: string
  grade_level: string
  section: string
  school_year: string
  subject: string
  is_active: boolean
  teacher?: { id: number; name: string; avatar?: string }
}

export function StudentClasses() {
  const [enrolledClasses, setEnrolledClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentApi.classes()
      .then(res => setEnrolledClasses(res.data || []))
      .catch(err => console.error('Error loading classes:', err?.response?.data ?? err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">My Classes</h1>
        <p className="text-gray-500">View and access your enrolled classes.</p>
      </div>

      {enrolledClasses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Classes Yet</h3>
          <p className="text-gray-500">You haven't been enrolled in any classes yet. Contact your teacher to get enrolled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledClasses.map((cls, i) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-emerald-500" />
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">
                    {cls.subject}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{cls.name}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Grade {cls.grade_level} · Section {cls.section} · {cls.school_year}
                </p>
                {cls.teacher && (
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <Users className="w-4 h-4" />
                    <span>{cls.teacher.name}</span>
                  </div>
                )}
                <Link
                  to={`/student/class/${cls.id}`}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  View Class <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
