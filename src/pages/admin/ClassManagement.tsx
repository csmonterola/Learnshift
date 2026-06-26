import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../components/auth/AuthContext'
import { adminApi } from '../../lib/api'
import {
  Grid,
  Plus,
  LayoutGrid,
  Users,
  UserCheck,
  Search,
  GraduationCap,
  BookOpen,
  ChevronDown,
  Edit2,
  X,
  Loader2,
  Trash2,
  UserPlus,
  BarChart3,
} from 'lucide-react'

interface Class {
  id: number
  name: string
  grade_level: string
  section: string
  subject: string
  teacher: {
    id: number
    name: string
  }
  students: Array<{
    id: number
    name: string
    email: string
  }>
  student_count: number
  max_students: number
  is_active: boolean
}

interface Teacher {
  id: number
  name: string
  email: string
}

export function AdminClassManagement() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [classes, setClasses] = useState<Class[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [enrollSearch, setEnrollSearch] = useState('')
  const [availableStudents, setAvailableStudents] = useState<any[]>([])
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])

  const [formData, setFormData] = useState({
    name: '',
    grade_level: '',
    section: '',
    teacher_id: '',
    subject_id: '',
  })

  useEffect(() => {
    loadClasses()
    loadTeachers()
  }, [page])

  const loadClasses = async () => {
    setLoading(true)
    setError('')
    try {
      const params: any = { page }
      if (search) params.search = search
      params.per_page = 20

      const res = await adminApi.classes(params)
      setClasses(res.data.data)
      setTotalPages(res.data.last_page)
      setTotal(res.data.total)
    } catch (err: any) {
      console.error('Failed to load classes:', err)
      setError(err?.response?.data?.message ?? 'Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  const loadTeachers = async () => {
    try {
      const res = await adminApi.users({ role: 'teacher', per_page: 100 })
      setTeachers(res.data.data)
    } catch (err: any) {
      console.error('Failed to load teachers:', err)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadClasses()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const openCreateModal = () => {
    setFormData({ name: '', grade_level: '', section: '', teacher_id: '', subject_id: '' })
    setEditingClass(null)
    setShowCreateModal(true)
  }

  const openEditModal = (cls: Class) => {
    setFormData({
      name: cls.name,
      grade_level: cls.grade_level,
      section: cls.section,
      teacher_id: cls.teacher?.id?.toString() || '',
      subject_id: cls.subject || '',
    })
    setEditingClass(cls)
    setShowCreateModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        name: formData.name,
        grade_level: formData.grade_level,
        section: formData.section,
        teacher_id: parseInt(formData.teacher_id),
        subject_id: parseInt(formData.subject_id),
      }

      if (editingClass) {
        await adminApi.updateClass(editingClass.id, data)
      } else {
        await adminApi.createClass(data)
      }
      setShowCreateModal(false)
      loadClasses()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Operation failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (classId: number) => {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) return
    try {
      await adminApi.deleteClass(classId)
      loadClasses()
      if (selectedClass?.id === classId) setSelectedClass(null)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Delete failed.')
    }
  }

  const openEnrollModal = async (cls: Class) => {
    setSelectedClass(cls)
    setSelectedStudents([])
    setEnrollSearch('')
    setShowEnrollModal(true)
  }

  const searchStudents = async () => {
    if (!enrollSearch.trim()) return
    try {
      const res = await adminApi.users({ search: enrollSearch, role: 'student', per_page: 20 })
      setAvailableStudents(res.data.data)
    } catch (err: any) {
      console.error('Failed to search students:', err)
    }
  }

  const handleEnroll = async () => {
    if (!selectedClass || selectedStudents.length === 0) return
    try {
      await adminApi.enrollStudents(selectedClass.id, selectedStudents)
      setShowEnrollModal(false)
      loadClasses()
      if (selectedClass) {
        const updated = classes.find(c => c.id === selectedClass.id)
        if (updated) setSelectedClass(updated)
      }
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Enrollment failed.')
    }
  }

  const getSubjectColor = (subjectName: string) => {
    const colors: Record<string, string> = {
      'Mathematics': 'from-blue-500 to-cyan-500',
      'Science': 'from-green-500 to-emerald-500',
      'English': 'from-purple-500 to-pink-500',
      'Filipino': 'from-amber-500 to-orange-500',
      'History': 'from-red-500 to-rose-500',
      'PE & Health': 'from-teal-500 to-cyan-500',
    }
    return colors[subjectName] || 'from-gray-500 to-slate-500'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-emerald-400'
    if (percentage >= 80) return 'bg-blue-400'
    if (percentage >= 60) return 'bg-amber-400'
    return 'bg-rose-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <Grid className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Class & Section Management</h1>
            <p className="text-gray-500 text-sm">Manage all class sections, assign teachers, and track enrollment.</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-xl font-bold shadow-sm transition-all hover:opacity-90 hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Create New Section
        </button>
      </div>

      {/* Stats Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
          <LayoutGrid className="w-4 h-4 text-emerald-500" />
          <span className="font-bold text-gray-900">{total}</span>
          <span className="text-sm text-gray-500">Total Sections</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
          <Users className="w-4 h-4 text-accent-500" />
          <span className="font-bold text-gray-900">
            {classes.reduce((sum, c) => sum + (c.student_count || 0), 0)}
          </span>
          <span className="text-sm text-gray-500">Total Students</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
          <UserCheck className="w-4 h-4 text-emerald-500" />
          <span className="font-bold text-gray-900">{teachers.length}</span>
          <span className="text-sm text-gray-500">Active Teachers</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search sections..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-emerald-500 text-white rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors shadow-sm"
        >
          Search
        </button>
      </div>

      {/* Class Grid */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={loadClasses}
            className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium underline"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {classes.map((cls) => {
          const actualStudentCount = cls.students?.length || 0
          const maxStudents = cls.max_students || 40
          const percentage = maxStudents > 0 
            ? Math.round((actualStudentCount / maxStudents) * 100) 
            : 0

          return (
            <div
              key={cls.id}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer ${
                selectedClass?.id === cls.id ? 'ring-2 ring-emerald-500' : ''
              }`}
              onClick={() => setSelectedClass(cls)}
            >
              <div className={`bg-gradient-to-br ${getSubjectColor(cls.subject || '')} p-5 text-white`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-sm">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {cls.grade_level}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/30 text-xs font-medium backdrop-blur-sm">
                    <BookOpen className="w-3.5 h-3.5" />
                    {cls.subject || 'No Subject'}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white mb-4">{cls.name}</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 opacity-80" />
                      <span>{actualStudentCount} / {maxStudents} students</span>
                    </div>
                    <span>{percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(percentage)} rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="mt-auto space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-2 uppercase">Assigned Teacher</p>
                    <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                        {cls.teacher?.name?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm font-bold text-gray-700 flex-1 truncate">
                        {cls.teacher?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/admin/classes/${cls.id}`)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors"
                    >
                      <BarChart3 className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(cls)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-indigo-100 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEnrollModal(cls)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-emerald-100 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Enroll
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Add New */}
        <button
          onClick={openCreateModal}
          className="bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors group min-h-[380px]"
        >
          <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 group-hover:border-emerald-300 group-hover:shadow-sm transition-all">
            <Plus className="w-6 h-6 text-gray-400 group-hover:text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-600 group-hover:text-emerald-600 transition-colors">Add New Section</h3>
          <p className="text-sm text-gray-400 mt-1">Click to create</p>
        </button>
      </div>

      {!loading && classes.length === 0 && !error && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <Grid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Classes Yet</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Get started by creating your first class section. You can assign teachers and enroll students.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create First Class
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingClass ? 'Edit Class' : 'Create New Class'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                  placeholder="e.g., Rizal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                  <input
                    type="text"
                    required
                    value={formData.grade_level}
                    onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                    placeholder="e.g., Grade 7"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input
                    type="text"
                    required
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                    placeholder="e.g., A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                  placeholder="Subject ID (e.g., 1)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Teacher</label>
                <select
                  required
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                >
                  <option value="">Select a teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingClass ? 'Update Class' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Students Modal */}
      {showEnrollModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Enroll Students</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedClass.name} - {selectedClass.grade_level} {selectedClass.section}
                </p>
              </div>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={enrollSearch}
                  onChange={(e) => setEnrollSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchStudents()}
                  placeholder="Search students by name or email..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                />
                <button
                  onClick={searchStudents}
                  className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>

            {availableStudents.length > 0 && (
              <div className="mb-4 max-h-64 overflow-y-auto border border-gray-200 rounded-xl">
                {availableStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudents([...selectedStudents, student.id])
                        } else {
                          setSelectedStudents(selectedStudents.filter((id) => id !== student.id))
                        }
                      }}
                      className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnroll}
                  disabled={selectedStudents.length === 0}
                  className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  Enroll Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}