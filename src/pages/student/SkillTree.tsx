import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { studentApi } from '../../lib/api'
import {
  GitBranch,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Lock,
  PlayCircle,
  BookOpen,
  Zap,
  Star,
  Target,
  BarChart3,
  Users,
  Divide,
  FlaskConical,
  BookOpen as BookOpenIcon,
  MessagesSquare,
  Globe,
  ChevronUp,
  FileText,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────
interface ClassInfo {
  id: number
  name: string
  subject: string
  grade_level: string
  section?: string
  teacher?: { id: number; name: string }
}

interface LessonItem {
  id: number
  title: string
  order: number
  mastery_percentage: number
  status: string
  best_quiz_score: number | null
  quiz_attempts: number
}

interface TopicNode {
  id: number
  title: string
  description?: string
  order_index: number
  lesson_count: number
  completed_lessons: number
  mastery_percentage: number | null
  best_quiz_score: number | null
  quiz_attempts: number
  status: string
  lessons: LessonItem[]
}

interface SkillTreeResponse {
  class_info: {
    id: number
    name: string
    subject: string
    grade_level: string
    section: string
    overall_mastery: number
  }
  topics: TopicNode[]
}

// ── Subject icon map ───────────────────────────────────────────────
const subjectTheme: Record<string, {
  icon: React.ElementType;
  border: string; text: string; bg: string; fill: string;
  gradient: string; iconBg: string; nodeActive: string; nodeComplete: string;
}> = {
  Math: {
    icon: Divide, border: 'border-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50',
    fill: 'bg-emerald-400', gradient: 'from-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-100 text-emerald-600', nodeActive: 'ring-emerald-400',
    nodeComplete: 'bg-emerald-500',
  },
  default: {
    icon: BookOpenIcon, border: 'border-indigo-400', text: 'text-indigo-600', bg: 'bg-indigo-50',
    fill: 'bg-indigo-400', gradient: 'from-indigo-500 to-indigo-600',
    iconBg: 'bg-indigo-100 text-indigo-600', nodeActive: 'ring-indigo-400',
    nodeComplete: 'bg-indigo-500',
  },
}

function getTheme(subject: string) {
  const key = Object.keys(subjectTheme).find(k =>
    subject.toLowerCase().includes(k.toLowerCase())
  ) || 'default'
  return subjectTheme[key]
}

export function StudentSkillTree() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [classMasteryMap, setClassMasteryMap] = useState<Record<number, number>>({})
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [topics, setTopics] = useState<TopicNode[]>([])
  const [selectedClassInfo, setSelectedClassInfo] = useState<SkillTreeResponse['class_info'] | null>(null)
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set())
  const [selectedTopic, setSelectedTopic] = useState<TopicNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTree, setLoadingTree] = useState(false)

  // Load classes on mount + fetch overall mastery for each
  useEffect(() => {
    Promise.all([
      studentApi.classes(),
      studentApi.getProgress(),
    ])
      .then(([clsRes, progressRes]) => {
        const classesData = clsRes.data || []
        setClasses(classesData)

        // Build mastery map from progress data
        const progressData = progressRes.data
        const masteryMap: Record<number, number> = {}
        if (progressData?.class_progress) {
          progressData.class_progress.forEach((cp: any) => {
            masteryMap[cp.id] = cp.mastery_percentage ?? 0
          })
        }
        setClassMasteryMap(masteryMap)
      })
      .catch(err => console.error('Error loading data:', err?.response?.data ?? err))
      .finally(() => setLoading(false))
  }, [])

  // Load skill tree when a class is selected
  useEffect(() => {
    if (!selectedClass) return
    setLoadingTree(true)
    setExpandedTopics(new Set())
    setSelectedTopic(null)
    studentApi.getSkillTree(selectedClass.id)
      .then(res => {
        const data: SkillTreeResponse = res.data
        const classInfo = data.class_info
        const enriched = (data.topics || []).map((topic, idx) => {
          // First topic is always active if locked
          if (idx === 0 && topic.status === 'locked') {
            return { ...topic, status: 'active' }
          }
          return topic
        })
        setSelectedClassInfo(classInfo)
        setTopics(enriched)
        const active = enriched.find(t => t.status === 'active' || t.status === 'completed')
        if (active) setSelectedTopic(active)
      })
      .catch(err => console.error('Error loading skill tree:', err?.response?.data ?? err))
      .finally(() => setLoadingTree(false))
  }, [selectedClass])

  const toggleTopic = (topicId: number) => {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      if (next.has(topicId)) next.delete(topicId)
      else next.add(topicId)
      return next
    })
  }

  const handleNavigateToLesson = (topic: TopicNode, lesson: LessonItem) => {
    if (!selectedClass) return
    navigate(`/student/class/${selectedClass.id}/topic/${topic.id}/lesson/${lesson.id}`)
  }

  const handleOpenTopic = (topic: TopicNode) => {
    if (!selectedClass || topic.status === 'locked') return
    navigate(`/student/class/${selectedClass.id}/topic/${topic.id}`)
  }

  const getLessonIcon = (lesson: LessonItem) => {
    if (lesson.mastery_percentage === 100) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    if (lesson.status !== 'not_started') return <PlayCircle className="w-4 h-4 text-amber-500" />
    return <FileText className="w-4 h-4 text-gray-300" />
  }

  const getLessonBg = (lesson: LessonItem) => {
    if (lesson.mastery_percentage === 100) return 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
    if (lesson.status !== 'not_started') return 'bg-amber-50 border-amber-200 hover:bg-amber-100'
    return 'bg-white border-gray-200 hover:bg-gray-50'
  }

  // ── Class Selector View ──────────────────────────────────────────
  if (!selectedClass) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Skill Tree</h1>
          <p className="text-gray-500">Select a class to view your mastery progression.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Classes Yet</h3>
            <p className="text-gray-500">You are not enrolled in any classes yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls, index) => {
              const theme = getTheme(cls.subject)
              const Icon = theme.icon
              const mastery = classMasteryMap[cls.id] ?? 0
              return (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedClass(cls)}
                  className="bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                >
                  <div className={`bg-gradient-to-br ${theme.gradient} p-5 text-white`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold">{cls.name}</h3>
                        <p className="text-sm text-white/80">{cls.subject}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-gray-500">
                      Grade {cls.grade_level} · Section {cls.section || '—'}
                    </p>
                    {/* Overall mastery bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-400">Overall Mastery</span>
                        <span className={`text-xs font-bold ${mastery >= 70 ? 'text-emerald-600' : mastery > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {mastery}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${mastery >= 70 ? 'bg-emerald-400' : mastery > 0 ? 'bg-amber-400' : 'bg-gray-200'}`}
                          style={{ width: `${mastery}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 text-emerald-600 text-sm font-semibold">
                      View Skill Tree <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Skill Tree View ──────────────────────────────────────────────
  const theme = getTheme(selectedClass.subject)
  const Icon = theme.icon
  const completedCount = topics.filter(t => t.status === 'completed').length
  const overallMastery = selectedClassInfo?.overall_mastery ?? 0
  const overallProgress = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 font-medium flex items-center gap-1">
        <button onClick={() => setSelectedClass(null)} className="hover:text-gray-700 cursor-pointer">Skill Tree</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-semibold">{selectedClass.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 bg-gradient-to-br ${theme.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">{selectedClass.name}</h1>
              <p className="text-gray-500 text-sm font-medium mt-0.5">
                {selectedClassInfo?.grade_level ? `Grade ${selectedClassInfo.grade_level} · Section ${selectedClassInfo.section || '—'}` : selectedClass.subject}
                {' · '}{topics.length} topics · {completedCount} completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">{overallMastery}% overall</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-amber-600">{completedCount} done</span>
            </div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div>
          <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
            <span>Overall Progress</span>
            <span className="text-emerald-600">{completedCount} / {topics.length} topics</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${overallProgress}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            {topics.map((t, i) => (
              <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${i < completedCount ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loadingTree ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          {/* Left: Topic Timeline */}
          <div className="flex-1 space-y-0 relative">
            {/* Legend */}
            <div className="flex gap-5 mb-6 text-xs font-semibold text-gray-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Completed
              </div>
              <div className="flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5 text-emerald-500" /> In Progress
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-300" /> Locked
              </div>
            </div>

            {/* Connector line */}
            <div className="absolute left-[22px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-emerald-400 via-emerald-300 to-gray-200 z-0" />

            <div className="space-y-4">
              {topics.map((topic, idx) => {
                const isExpanded = expandedTopics.has(topic.id)
                const isCompleted = topic.status === 'completed'
                const isActive = topic.status === 'active'
                const isLocked = topic.status === 'locked'
                const hasNoLessons = topic.lesson_count === 0
                const displayMastery = topic.mastery_percentage !== null
                  ? `${topic.mastery_percentage}%`
                  : '—'

                return (
                  <div key={topic.id} className="relative z-10">
                    {/* Topic header row */}
                    <div className="flex items-start gap-4">
                      {/* Node icon */}
                      <div className="shrink-0 mt-4">
                        {isCompleted && (
                          <div className={`w-11 h-11 rounded-full ${theme.nodeComplete} flex items-center justify-center shadow-md`}>
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {isActive && (
                          <div className={`w-11 h-11 rounded-full bg-white border-2 ${theme.nodeActive} flex items-center justify-center shadow-lg ring-4 ring-emerald-500/10`}>
                            <PlayCircle className={`w-5 h-5 ${theme.text}`} />
                          </div>
                        )}
                        {isLocked && (
                          <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Topic Card */}
                      <div
                        className={`flex-1 rounded-2xl transition-all cursor-pointer ${
                          isLocked || hasNoLessons ? 'opacity-45 cursor-default' : 'hover:shadow-md'
                        } ${
                          isActive
                            ? 'bg-white border-2 border-emerald-400 shadow-lg shadow-emerald-500/10'
                            : isCompleted
                            ? 'bg-emerald-50/60 border border-emerald-200'
                            : 'bg-white border border-gray-100'
                        }`}
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 pr-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                  Topic {idx + 1}
                                </span>
                                {isCompleted && topic.best_quiz_score !== null && (
                                  <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    {topic.best_quiz_score}%
                                  </span>
                                )}
                              </div>
                              <h3 className={`font-extrabold ${isActive ? 'text-lg text-gray-900' : 'text-base text-gray-800'}`}>
                                {topic.title}
                              </h3>

                              {/* Meta row */}
                              <div className="flex items-center gap-4 text-xs font-medium text-gray-400 mt-1">
                                {hasNoLessons ? (
                                  <span className="text-xs text-gray-400 italic">No lessons yet</span>
                                ) : (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <BookOpen className="w-3.5 h-3.5" />
                                      {topic.lesson_count} lessons
                                    </span>
                                    {topic.quiz_attempts > 0 && (
                                      <span className="flex items-center gap-1">
                                        <Target className="w-3.5 h-3.5" />
                                        {topic.quiz_attempts} attempt{topic.quiz_attempts !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {topic.best_quiz_score !== null && (
                                      <span className="flex items-center gap-1 text-amber-500 font-bold">
                                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                                        Best: {topic.best_quiz_score}%
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Right side: badges + collapse button */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Badge */}
                              {isCompleted && (
                                <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Done
                                </div>
                              )}
                              {isActive && (
                                <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">
                                  In Progress
                                </div>
                              )}
                              {(isLocked || hasNoLessons) && (
                                <div className="bg-gray-100 text-gray-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Locked
                                </div>
                              )}

                              {/* Collapse/Expand button */}
                              {!isLocked && !hasNoLessons && topic.lessons.length > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleTopic(topic.id) }}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                                  title={isExpanded ? 'Collapse lessons' : 'Expand lessons'}
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Mastery Bar — only show if there are lessons */}
                          {!hasNoLessons && (
                            <div className="mt-4">
                              <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                                <span>Mastery</span>
                                <span className={topic.mastery_percentage !== null && topic.mastery_percentage >= 70 ? 'text-emerald-600' : 'text-amber-600'}>
                                  {displayMastery}
                                </span>
                              </div>
                              {topic.mastery_percentage !== null && (
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${topic.mastery_percentage >= 70 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                    style={{ width: `${topic.mastery_percentage}%` }} />
                                </div>
                              )}
                              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                                <span>{topic.completed_lessons} of {topic.lesson_count} lessons done</span>
                                {(isActive || isCompleted) && (
                                  <button onClick={(e) => { e.stopPropagation(); handleOpenTopic(topic) }}
                                    className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5">
                                    {isActive ? 'Continue' : 'Review'} <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Expanded Lessons */}
                        <AnimatePresence>
                          {isExpanded && topic.lessons.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-gray-100"
                            >
                              <div className="p-4 space-y-2">
                                {topic.lessons.map((lesson) => (
                                  <div
                                    key={lesson.id}
                                    onClick={(e) => { e.stopPropagation(); handleNavigateToLesson(topic, lesson) }}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all ${getLessonBg(lesson)}`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      {getLessonIcon(lesson)}
                                      <span className={`text-sm font-semibold truncate ${
                                        lesson.mastery_percentage === 100 ? 'text-emerald-800' :
                                        lesson.status !== 'not_started' ? 'text-amber-800' : 'text-gray-600'
                                      }`}>
                                        {lesson.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 ml-3">
                                      <span className={`text-xs font-bold ${
                                        lesson.mastery_percentage >= 70 ? 'text-emerald-600' :
                                        lesson.mastery_percentage > 0 ? 'text-amber-600' : 'text-gray-400'
                                      }`}>
                                        {lesson.mastery_percentage}%
                                      </span>
                                      {lesson.best_quiz_score !== null && (
                                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                          {lesson.best_quiz_score}%
                                        </span>
                                      )}
                                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {topics.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <GitBranch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Topics Yet</h3>
                <p className="text-gray-500">Your teacher hasn't added any topics to this class yet.</p>
              </div>
            )}
          </div>

          {/* Right: Detail Card — only shows when a topic is selected */}
          {selectedTopic && !expandedTopics.has(selectedTopic.id) && (
            <div className="w-[320px] shrink-0 sticky top-6">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`bg-gradient-to-br ${theme.gradient} p-6 text-white`}>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                    {selectedClass.subject} · Skill Tree
                  </div>
                  <h2 className="text-xl font-extrabold mb-1">{selectedTopic.title}</h2>
                  {selectedTopic.description && (
                    <p className="text-white/80 text-sm leading-relaxed">{selectedTopic.description}</p>
                  )}
                </div>

                <div className="p-6">
                  {/* Circular progress */}
                  <div className="flex justify-center mb-6">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="9" />
                        <circle cx="50" cy="50" r="42" fill="none"
                          stroke={selectedTopic.status === 'locked' ? '#e5e7eb' : '#10b981'} strokeWidth="9"
                          strokeDasharray="264"
                          strokeDashoffset={selectedTopic.status === 'completed' ? 0 : selectedTopic.status === 'active' && selectedTopic.mastery_percentage !== null ? 264 - 264 * (selectedTopic.mastery_percentage / 100) : 264}
                          strokeLinecap="round" />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-extrabold text-gray-900">
                          {selectedTopic.status === 'completed' ? '100%' : selectedTopic.status === 'active' && selectedTopic.mastery_percentage !== null ? `${selectedTopic.mastery_percentage}%` : '—'}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">mastery</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-gray-50 rounded-2xl p-3 text-center">
                      <div className="text-lg font-extrabold text-gray-900">{selectedTopic.lesson_count}</div>
                      <div className="text-[10px] text-gray-400 font-medium mt-0.5">Lessons</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 text-center">
                      <div className="text-lg font-extrabold text-gray-900">{selectedTopic.quiz_attempts}</div>
                      <div className="text-[10px] text-gray-400 font-medium mt-0.5">Attempts</div>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-3 text-center">
                      <div className="text-lg font-extrabold text-amber-500">{selectedTopic.best_quiz_score ?? '—'}</div>
                      <div className="text-[10px] text-amber-400 font-medium mt-0.5">Best %</div>
                    </div>
                  </div>

                  {/* Best score detail */}
                  {selectedTopic.best_quiz_score !== null && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                        <Star className="w-5 h-5 text-white fill-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Best Quiz Score</p>
                        <p className="text-xl font-extrabold text-emerald-600">{selectedTopic.best_quiz_score}%</p>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  {selectedTopic.status !== 'locked' && selectedTopic.lesson_count > 0 && (
                    <button onClick={() => handleOpenTopic(selectedTopic)}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                      {selectedTopic.status === 'active' ? 'Keep going' : 'Review Topic'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  {(selectedTopic.status === 'locked' || selectedTopic.lesson_count === 0) && (
                    <button disabled
                      className="w-full bg-gray-100 text-gray-400 font-bold py-3.5 rounded-2xl cursor-not-allowed flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" /> {selectedTopic.lesson_count === 0 ? 'No lessons yet' : 'Complete previous topic'}
                    </button>
                  )}

                  {selectedTopic.status === 'active' && (
                    <p className="text-center text-xs text-gray-400 font-medium mt-3">
                      {selectedTopic.completed_lessons} of {selectedTopic.lesson_count} lessons finished
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}