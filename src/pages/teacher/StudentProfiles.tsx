import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { teacherApi } from '../../lib/api'
import {
  Search,
  Printer,
  Users,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  X,
  GraduationCap,
  BarChart3,
  Target,
  School,
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
    studentProfile?: {
      grade_level?: string
      section?: string
      diagnostic_score?: number
      diagnostic_completed?: boolean
    }
  subjectMastery?: Array<{
    subject_id: number
    subject_name: string
    mastery_score: number
  }>
  subject_mastery?: Array<{
    subject_id: number
    subject_name: string
    mastery_score: number
  }>
  topicProgress?: Array<{
    id: number
    topic_id: number
    status: string
    mastery_score: number
    topic?: { id: number; title: string }
  }>
  topic_progress?: Array<{
    id: number
    topic_id: number
    status: string
    mastery_score: number
    topic?: { id: number; title: string }
  }>
  lesson_progress?: Array<{
    id: number
    lesson_id: number
    lesson_title: string
    mastery_percentage: number
    status: string
  }>
  enrolledClasses?: Array<{
    id: number
    name: string
    subject: string
    grade_level: string
  }>
}

interface StudentDetailProps {
  student: StudentData
  onClose: () => void
}

// ── Student Detail Modal ───────────────────────────────────────────
function StudentDetailView({ student, onClose }: StudentDetailProps) {
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<StudentData | null>(null)

  useEffect(() => {
    teacherApi.studentProfile(student.id)
      .then(res => setDetail(res.data))
      .catch(err => console.error('Error loading profile:', err))
      .finally(() => setLoading(false))
  }, [student.id])

  // The detail endpoint returns the raw User model with snake_case relations
  // (subject_mastery, topic_progress). Normalize them to the camelCase shape
  // the modal expects, and fall back to the list-row data (overall_mastery,
  // status) when the detail relations are empty — so the header and the
  // progress section always read from the SAME source of truth.
  const detailMastery = detail?.subject_mastery ?? detail?.subjectMastery ?? []
  const detailTopicProgress = detail?.topic_progress ?? detail?.topicProgress ?? []
  const detailLessonProgress = detail?.lesson_progress ?? []
  const hasDetailProgress = (Array.isArray(detailMastery) && detailMastery.length > 0) ||
    (Array.isArray(detailTopicProgress) && detailTopicProgress.length > 0) ||
    (Array.isArray(detailLessonProgress) && detailLessonProgress.length > 0)

  const profile = detail?.studentProfile
  const mastery = hasDetailProgress ? (detail?.overall_mastery ?? student.overall_mastery) : student.overall_mastery
  const masteryLevel = mastery >= 80 ? 'Excelling' : mastery >= 70 ? 'On Track' : 'At Risk'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold">
                {student.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{student.name}</h2>
                <p className="text-slate-300 text-sm mt-0.5">
                  {profile?.grade_level ? `Grade ${profile.grade_level}` : 'Student'} · {profile?.section || 'No section'}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">{student.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold">{mastery}%</div>
              <div className="text-xs text-slate-300 mt-0.5">Mastery</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className={`text-2xl font-bold ${
                masteryLevel === 'Excelling' ? 'text-emerald-400' :
                masteryLevel === 'On Track' ? 'text-amber-400' : 'text-red-400'
              }`}>
                {masteryLevel}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">Status</div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : (
            <>
              {/* Subject Mastery */}
              {detailMastery.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Subject Mastery</h3>
                  <div className="space-y-3">
                    {detailMastery.map((sm: any) => (
                      <div key={sm.subject_id} className="flex items-center gap-4">
                        <div className="w-32 shrink-0">
                          <span className="text-sm font-medium text-slate-700">{sm.subject_name}</span>
                        </div>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400 transition-all"
                            style={{ width: `${sm.mastery_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-600 w-10 text-right">{sm.mastery_score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topic Progress */}
              {detailTopicProgress.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Recent Topic Progress</h3>
                  <div className="space-y-2">
                    {detailTopicProgress.slice(0, 8).map((tp) => (
                      <div key={tp.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            tp.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} />
                          <span className="text-sm font-medium text-slate-700">{tp.topic?.title || `Topic #${tp.topic_id}`}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-500">{tp.mastery_score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lesson Progress */}
              {detailLessonProgress.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Lesson Progress</h3>
                  <div className="space-y-2">
                    {detailLessonProgress.slice(0, 8).map((lp: any) => (
                      <div key={lp.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            lp.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} />
                          <span className="text-sm font-medium text-slate-700">{lp.lesson_title || `Lesson #${lp.lesson_id}`}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-500">{lp.mastery_percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailMastery.length === 0 && detailTopicProgress.length === 0 && detailLessonProgress.length === 0 && (
                <div className="text-center py-8">
                  <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No progress data available yet.</p>
                  <p className="text-xs text-slate-400 mt-1">The student hasn't started any activities.</p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export function TeacherStudentProfiles() {
  const [students, setStudents] = useState<StudentData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null)

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
      setStudents(res.data || [])
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
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student, i) => (
                  <tr
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
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

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <StudentDetailView
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}