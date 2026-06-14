import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../components/auth/AuthContext'
import { teacherApi } from '../../lib/api'
import type { Profile } from '../../lib/supabaseTypes'
import { ChevronRight, Search, User, X, UserPlus, UserMinus, Users } from 'lucide-react'

interface ClassData {
  id: number
  name: string
  grade_level: string
  section: string
  school_year: string
  subject: string
  teacher_id: string
  is_active: boolean
  created_at: string
}

export function TeacherClassStudents() {
  const { user } = useAuth()
  const { classId } = useParams<{ classId: string }>()
  const [classData, setClassData] = useState<ClassData | null>(null)
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchSeq = useRef(0)

  useEffect(() => {
    if (classId) {
      loadData()
    }
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [classId])

  const loadData = async () => {
    try {
      const id = Number(classId)
      const [cls, students] = await Promise.all([
        teacherApi.classDetail(id),
        teacherApi.classStudents(id),
      ])
      setClassData(cls.data || null)
      setEnrolledStudents(students.data || [])
    } catch (error: any) {
      console.error('Error loading class data:', error?.response?.data ?? error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = useCallback((query: string) => {
    setSearch(query)

    // Cancel any pending debounce
    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (query.trim().length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }

    setSearching(true)

    searchTimeout.current = setTimeout(async () => {
      // Increment sequence so stale responses can be ignored
      const seq = ++searchSeq.current
      try {
        const res = await teacherApi.searchStudents(query.trim())
        // Discard if a newer request has already been fired
        if (seq !== searchSeq.current) return
        const results: Profile[] = res.data || []
        const enrolledIds = new Set(enrolledStudents.map((s: any) => Number(s.id)))
        const filtered = results.filter(s => !enrolledIds.has(Number(s.id)))
        setSearchResults(filtered)
      } catch (error: any) {
        if (seq !== searchSeq.current) return
        console.error('Error searching students:', error?.response?.data ?? error)
      } finally {
        if (seq === searchSeq.current) setSearching(false)
      }
    }, 300)
  }, [enrolledStudents])

  const handleAddStudent = async (studentId: number) => {
    setAdding(studentId)
    try {
      await teacherApi.enrollStudent(Number(classId), studentId)
      // Reload enrolled students
      const res = await teacherApi.classStudents(Number(classId))
      setEnrolledStudents(res.data || [])
      setSearch('')
      setSearchResults([])
    } catch (error: any) {
      console.error('Error enrolling student:', error?.response?.data ?? error)
    } finally {
      setAdding(null)
    }
  }

  const handleRemoveStudent = async (studentId: number) => {
    if (!confirm('Remove this student from the class?')) return
    try {
      await teacherApi.removeStudent(Number(classId), studentId)
      setEnrolledStudents(prev => prev.filter((s: any) => s.id !== studentId))
    } catch (error: any) {
      console.error('Error removing student:', error?.response?.data ?? error)
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/teacher/classes" className="hover:text-emerald-600 transition-colors">
          My Classes
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/teacher/class/${classId}`} className="hover:text-emerald-600 transition-colors">
          {classData?.name || 'Class'}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Students</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Manage Students
          </h1>
          <p className="text-gray-500">
            {classData?.name} · Grade {classData?.grade_level} · Section {classData?.section}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl">
          <Users className="w-5 h-5 text-emerald-600" />
          <span className="font-bold text-emerald-700">{enrolledStudents.length} Students</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enrolled Students */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Enrolled Students</h2>
          </div>
          <div className="p-4">
            {enrolledStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No students enrolled yet.</p>
                <p className="text-sm text-gray-400 mt-1">Search and add students from the right panel.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {enrolledStudents.map((student: any) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">Student</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveStudent(Number(student.id))}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove student"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search & Add Students */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Add Students</h2>
            <p className="text-sm text-gray-500 mt-1">Search for students to enroll in this class.</p>
          </div>

          <div className="p-4">
            {/* Search Input */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search students by name..."
                className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setSearchResults([]) }}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Results */}
            <div className="space-y-2 min-h-[200px]">
              {searching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : search && searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No students found</p>
                  <p className="text-sm text-gray-400 mt-1">Try a different search term.</p>
                </div>
              ) : !search ? (
                <div className="text-center py-12">
                  <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Type a name to search</p>
                  <p className="text-sm text-gray-400 mt-1">Only students with role "Student" will appear.</p>
                </div>
              ) : (
                searchResults.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">Student</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddStudent(Number(student.id))}
                      disabled={adding === Number(student.id)}
                      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm"
                    >
                      {adding === Number(student.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}