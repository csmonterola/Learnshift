import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../components/auth/AuthContext'
import { classes, subjects } from '../../lib/supabaseApi'
import type { Class, Subject } from '../../lib/supabaseTypes'
import { Plus, BookOpen, Users, Calendar, MapPin, ChevronRight, Trash2, Edit } from 'lucide-react'

export function TeacherClasses() {
  const { user } = useAuth()
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([])
  const [allSubjects, setAllSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClass, setNewClass] = useState({
    name: '',
    grade_level: '',
    section: '',
    school_year: '',
    subject: '',
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      const [classesData, subjectsData] = await Promise.all([
        classes.getTeacherClasses(user!.id),
        subjects.getAll(),
      ])
      setTeacherClasses(classesData)
      setAllSubjects(subjectsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClass = async () => {
    if (!newClass.name || !newClass.grade_level || !newClass.section || !newClass.subject || !newClass.school_year) return

    try {
      await classes.create({
        ...newClass,
        teacher_id: user!.id,
        is_active: true,
      } as any)
      setShowCreateModal(false)
      setNewClass({
        name: '',
        grade_level: '',
        section: '',
        school_year: '',
        subject: '',
      })
      loadData()
    } catch (error) {
      console.error('Error creating class:', error)
    }
  }

  const handleDeleteClass = async (classId: number) => {
    if (!confirm('Are you sure you want to delete this class?')) return
    try {
      await classes.delete(classId)
      loadData()
    } catch (error) {
      console.error('Error deleting class:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">My Classes</h1>
          <p className="text-gray-500">Manage your classes and enroll students.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-3 rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Class
        </button>
      </div>

      {/* Classes Grid */}
      {teacherClasses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Classes Yet</h3>
          <p className="text-gray-500 mb-6">Create your first class to get started.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Create Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teacherClasses.map((cls) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteClass(cls.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{cls.name}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Grade {cls.grade_level} · Section {cls.section}
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{cls.subject}</span>
                  </div>
                </div>

                <Link
                  to={`/teacher/class/${cls.id}`}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Manage Class <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 w-full max-w-md"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Class</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Class Name</label>
                <input
                  type="text"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g., Mathematics 8-A"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Grade Level</label>
                  <input
                    type="text"
                    value={newClass.grade_level}
                    onChange={(e) => setNewClass({ ...newClass, grade_level: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g., 8"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Section</label>
                  <input
                    type="text"
                    value={newClass.section}
                    onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g., A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newClass.subject}
                  onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g., Mathematics"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">School Year</label>
                <input
                  type="text"
                  value={newClass.school_year}
                  onChange={(e) => setNewClass({ ...newClass, school_year: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g., 2025-2026"
                />
              </div>

            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClass}
                disabled={!newClass.name || !newClass.grade_level || !newClass.section || !newClass.subject || !newClass.school_year}
                className="flex-1 px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                Create Class
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}