import React, { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TeacherTopBar } from '../../components/layout/TeacherTopBar'
import { teacherApi } from '../../lib/api'
import { Search, Calendar, BookOpen, ChevronDown, TrendingUp, AlertTriangle, Users, ChevronRight } from 'lucide-react'
import { useAuth } from '../../components/auth/AuthContext'

interface LessonData {
  id: number; name: string; topic: string; total_students: number;
  attempted: number; mastered: number; struggling: number;
  mastery: number; status: string;
}

interface DashboardData {
  total_students: number; total_classes: number; total_lessons: number;
  avg_mastery: number; struggling_count: number; at_risk_count: number;
  at_risk: { id: number; name: string; avg_mastery: number; lessons_mastered: number; status: string }[];
  lessons: LessonData[];
  flagged_logs: any[];
  classes: { id: number; name: string; subject: string; students: any[] }[];
}

export function TeacherDashboard() {
  const { user } = useAuth()
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    teacherApi.dashboard()
      .then(res => setData(res.data))
      .catch(err => console.error('Dashboard error:', err?.response?.data ?? err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TeacherTopBar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
        </main>
      </div>
    )
  }

  const kpis = [
    { label: 'TOTAL STUDENTS', value: String(data?.total_students ?? 0), sub: 'Across all classes', color: 'bg-emerald-100' },
    { label: 'AVG. MASTERY', value: `${data?.avg_mastery ?? 0}%`, sub: 'Across all lessons', color: 'bg-blue-100' },
    { label: 'STRUGGLING', value: String(data?.struggling_count ?? 0), sub: 'Students below 70%', color: 'bg-red-100' },
    { label: 'LESSONS TRACKED', value: String(data?.total_lessons ?? 0), sub: 'In your classes', color: 'bg-amber-100' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <TeacherTopBar
        onMenuClick={() => setSidebarOpen(true)}
        centerContent={
          <div className="relative w-full max-w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search students or topics..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-full text-sm focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all" />
          </div>
        }
        rightContent={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
            <Calendar size={14} /> {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        }
      />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back, {user?.name}!</h1>
          <p className="text-slate-500 text-sm">Here's a snapshot of your class's learning progress.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {kpis.map((kpi, i) => (
            <div key={i} className="card p-5 relative overflow-hidden">
              <div className={`absolute top-4 right-4 w-4 h-4 rounded-full ${kpi.color}`} />
              <div className="text-xs font-bold text-slate-400 tracking-wider mb-2">{kpi.label}</div>
              <div className="text-3xl font-bold text-slate-800 mb-1">{kpi.value}</div>
              <div className="text-xs text-slate-500">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Mastery Breakdown */}
        <div className="card">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Lesson Mastery Breakdown</h2>
                <p className="text-xs text-slate-500">Real-time data from student quiz submissions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="status-pill proficient">
                <TrendingUp size={14} /> Class Avg: {data?.avg_mastery ?? 0}%
              </div>
              {(data?.struggling_count ?? 0) > 0 && (
                <div className="status-pill beginning">
                  <AlertTriangle size={14} /> {data?.struggling_count} Struggling
                </div>
              )}
            </div>
          </div>

          {!data?.lessons?.length ? (
            <div className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-1">No Lesson Data Yet</h3>
              <p className="text-sm text-gray-500">Students haven't attempted any quizzes yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 font-semibold">Lesson / Topic Name</th>
                    <th className="hidden sm:table-cell px-4 sm:px-6 py-4 font-semibold text-center">Total Students</th>
                    <th className="px-4 sm:px-6 py-4 font-semibold text-center">Struggling</th>
                    <th className="px-4 sm:px-6 py-4 font-semibold">Mastery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.lessons.map((lesson, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="font-semibold text-slate-900">{lesson.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{lesson.topic}</div>
                      </td>
                      <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium text-xs">
                          <Users size={12} /> {lesson.total_students}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-medium text-xs border border-red-100">
                          <AlertTriangle size={12} /> {lesson.struggling}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex flex-col gap-2 max-w-[200px]">
                          <span className={`text-[10px] font-bold uppercase tracking-wider w-fit px-2 py-0.5 rounded ${
                            lesson.status === 'Proficient' ? 'bg-emerald-50 text-emerald-600' :
                            lesson.status === 'Developing' ? 'bg-amber-50 text-amber-600' :
                            'bg-red-50 text-red-600'
                          }`}>{lesson.status}</span>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${lesson.mastery}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className={`h-full rounded-full ${
                                  lesson.status === 'Proficient' ? 'bg-emerald-400' :
                                  lesson.status === 'Developing' ? 'bg-amber-400' : 'bg-red-400'
                                }`} />
                            </div>
                            <span className="text-xs font-bold text-slate-700 w-8">{lesson.mastery}%</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {data?.lessons?.length ?? 0} lessons</span>
          </div>
        </div>

        {/* At-Risk Students */}
        {data?.at_risk && data.at_risk.length > 0 && (
          <div className="card mt-8">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Students Needing Attention</h2>
              <p className="text-xs text-slate-500">Students with mastery below 70%</p>
            </div>
            <div className="p-4 space-y-2">
              {data.at_risk.map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.lessons_mastered} lessons mastered</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${
                    student.avg_mastery >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>{student.avg_mastery}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Class links */}
        {data?.classes && data.classes.length > 0 && (
          <div className="mt-8">
            <h2 className="font-bold text-slate-900 mb-4">Your Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.classes.map(cls => (
                <Link key={cls.id} to={`/teacher/class/${cls.id}`}
                  className="card p-5 hover:shadow-md hover:border-emerald-200 transition-all group">
                  <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{cls.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{cls.subject} · {cls.students?.length ?? 0} students</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-emerald-600 font-semibold">
                    View details <ChevronRight size={14} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}