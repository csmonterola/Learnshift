import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { studentApi } from '../../lib/api'
import ClassPosts from '../../components/class/ClassPosts'
import {
  ChevronRight, FileText, Trophy, BookOpen, GraduationCap, Megaphone, CheckCircle, ArrowRight,
} from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState<'announcements' | 'topics'>('announcements')

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
  const topicsMastered = classTopics.filter(t => t.mastery_percentage === 100).length
  const totalLessons = classTopics.reduce((s, t) => s + t.total_lessons, 0)
  const completedLessons = classTopics.reduce((s, t) => s + t.completed_lessons, 0)

  const tabBase = 'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all'

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/student/classes" className="hover:text-emerald-600 transition-colors">My Classes</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{classData?.name || 'Class'}</span>
      </div>

      {/* ── Header card ─────────────────────────────── */}
      <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 rounded-3xl p-8 mb-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-white tracking-wide mb-4">
              <GraduationCap className="w-4 h-4" />
              Grade {classData?.grade_level} · {classData?.subject}
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">{classData?.name || 'Class'}</h1>
            <p className="text-emerald-100 text-sm">
              Section {classData?.section} · SY {classData?.school_year}
              {classData?.teacher && <span className="hidden sm:inline"> · {classData.teacher.name}</span>}
            </p>
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-200" />
                <div>
                  <div className="text-white font-bold text-sm leading-none">{completedLessons}/{totalLessons}</div>
                  <div className="text-emerald-100 text-[10px] font-medium mt-1">Lessons done</div>
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-200" />
                <div>
                  <div className="text-white font-bold text-sm leading-none">{topicsMastered}/{classTopics.length}</div>
                  <div className="text-emerald-100 text-[10px] font-medium mt-1">Topics mastered</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mastery ring */}
          {classTopics.length > 0 && (
            <div className="flex flex-col items-center shrink-0">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="9" />
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke="#ffffff" strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={`${(overallMastery / 100) * 264} 264`}
                    className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-white leading-none">{overallMastery}%</span>
                  <span className="text-[10px] text-emerald-100 font-medium mt-1">Mastery</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setActiveTab('announcements')}
          className={`${tabBase} ${activeTab === 'announcements' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
          <Megaphone className="w-4 h-4" /> Announcements
        </button>
        <button onClick={() => setActiveTab('topics')}
          className={`${tabBase} ${activeTab === 'topics' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
          <BookOpen className="w-4 h-4" /> Topics & Lessons
        </button>
      </div>

      {/* ── Announcements tab ────────────────────────── */}
      {activeTab === 'announcements' && (
        <motion.div key="ann" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <ClassPosts classId={Number(classId)} role="student" />
        </motion.div>
      )}

      {/* ── Topics tab ───────────────────────────────── */}
      {activeTab === 'topics' && (
        <motion.div key="topics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {classTopics.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Topics Yet</h3>
              <p className="text-gray-500">Your teacher hasn't added any topics yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classTopics.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-emerald-200 transition-all group flex flex-col"
                >
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          topic.mastery_percentage === 100 ? 'bg-emerald-100 text-emerald-600' :
                          topic.mastery_percentage > 0 ? 'bg-amber-100 text-amber-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {topic.mastery_percentage === 100
                            ? <CheckCircle className="w-5 h-5" />
                            : <span className="text-sm font-bold">{index + 1}</span>}
                        </span>
                        <h3 className="font-bold text-gray-900 leading-snug truncate">{topic.title}</h3>
                      </div>
                      <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                        topic.mastery_percentage >= 70 ? 'bg-emerald-50 text-emerald-600' :
                        topic.mastery_percentage > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'
                      }`}>
                        {topic.mastery_percentage}%
                      </span>
                    </div>

                    {topic.description && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{topic.description}</p>
                    )}

                    {/* Progress */}
                    {topic.total_lessons > 0 && (
                      <div className="mb-2">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-gray-400">{topic.completed_lessons}/{topic.total_lessons} lessons done</span>
                          <span className="text-gray-400">{topic.lesson_count} lesson{topic.lesson_count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${
                            topic.mastery_percentage >= 70 ? 'bg-emerald-400' :
                            topic.mastery_percentage > 0 ? 'bg-amber-400' : 'bg-gray-200'
                          }`} style={{ width: `${topic.mastery_percentage}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-6 pb-6">
                    <Link
                      to={`/student/class/${classId}/topic/${topic.id}`}
                      className="flex items-center justify-center gap-2 w-full bg-gray-900 group-hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                    >
                      Open Topic <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}