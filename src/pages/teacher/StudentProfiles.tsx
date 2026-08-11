import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { teacherApi } from '../../lib/api'
import {
  Search,
  Users,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ChevronRight,
} from 'lucide-react'

interface StudentData {
  id: number
  name: string
  email: string
  enrollment_code: string
  avatar?: string
  grade_level?: string
  section?: string
  class_name?: string
  overall_mastery: number
  status: string
}

interface LearningProfileRow {
  student_id: number
  has_data: boolean
  profile: {
    recommended_difficulty: string | null
  }
}

export function TeacherStudentProfiles() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<StudentData[]>([])
  const [learningProfiles, setLearningProfiles] = useState<Record<number, LearningProfileRow>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const totalStudents = students.length
  const atRisk = students.filter(s => s.status === 'At Risk' || s.overall_mastery < 60).length
  const proficient = students.filter(s => s.overall_mastery >= 80).length

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async (query?: string) => {
    setLoading(true)
    try {
      const res = await teacherApi.students(query)
      const list = res.data || []
      setStudents(list)
      // One batch call for all roster learning profiles (no N+1).
      if (list.length > 0) {
        const profiles = await teacherApi.studentLearningProfiles(list.map((s: StudentData) => s.id))
        const map: Record<number, LearningProfileRow> = {}
        ;(profiles.data || []).forEach((row: LearningProfileRow) => {
          map[row.student_id] = row
        })
        setLearningProfiles(map)
      } else {
        setLearningProfiles({})
      }
    } catch (err: any) {
      console.error('Error loading students:', err?.response?.data ?? err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    const timer = setTimeout(() => loadStudents(value || undefined), 300)
    return () => clearTimeout(timer)
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Excelling': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'On Track': return 'bg-amber-50 text-amber-700 border-amber-200'
      default: return 'bg-red-50 text-red-700 border-red-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Excelling': return <CheckCircle2 size={12} />
      case 'On Track': return <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      default: return <AlertTriangle size={12} />
    }
  }

  const getBarColor = (mastery: number) => {
    if (mastery >= 80) return 'bg-emerald-400'
    if (mastery >= 60) return 'bg-amber-400'
    return 'bg-red-400'
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Student Profiles</h1>
        <p className="text-slate-500 text-sm">
          {students.length > 0
            ? `Overview of ${students.length} enrolled students`
            : 'Loading student data...'}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{totalStudents}</div>
            <div className="text-xs font-bold text-slate-400 tracking-wider uppercase">Total Students</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{atRisk}</div>
            <div className="text-xs font-bold text-slate-400 tracking-wider uppercase">Needs Intervention</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{proficient}</div>
            <div className="text-xs font-bold text-slate-400 tracking-wider uppercase">Proficient</div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">All Students</h2>
            <p className="text-xs text-slate-500">Click a row to view the individual student profile & mastery report</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Students Found</h3>
            <p className="text-gray-500">{search ? 'No students match your search.' : 'No students are enrolled in your classes yet.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold w-16">Avatar</th>
                  <th className="px-6 py-4 font-semibold">Student Name</th>
                  <th className="px-6 py-4 font-semibold">Grade / Section</th>
                  <th className="px-6 py-4 font-semibold w-64">Overall Mastery</th>
                  <th className="px-6 py-4 font-semibold">Learning Profile</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student, i) => (
                  <tr
                    key={student.id}
                    onClick={() => navigate(`/teacher/students/${student.id}`)}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">
                        {student.avatar ? (
                          <img src={student.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          student.name.charAt(0)
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1 group-hover:text-emerald-600 transition-colors">
                        {student.name}
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {student.grade_level
                        ? `Grade ${student.grade_level}${student.section ? ` \u2013 ${student.section}` : ''}`
                        : '\u2014'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${student.overall_mastery}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full rounded-full ${getBarColor(student.overall_mastery)}`}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-8">{student.overall_mastery}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const row = learningProfiles[student.id]
                        if (!row || !row.has_data) {
                          return <span className="text-slate-300">\u2014</span>
                        }
                        const difficulty = row.profile?.recommended_difficulty
                        const label = difficulty
                          ? `Prefers ${difficulty}`
                          : 'Balanced'
                        const color = difficulty === 'Hard' ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : difficulty === 'Easy' ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        return (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
                            {label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(student.status)}`}>
                        {getStatusIcon(student.status)}
                        {student.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400" /> Excelling &ge; 80%</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400" /> On Track 70\u201379%</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /> At Risk {'<'} 70%</div>
          </div>
          <div className="text-slate-400">{students.length} student{students.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>
  )
}