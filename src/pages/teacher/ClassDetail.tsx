import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../components/auth/AuthContext'
import { teacherApi } from '../../lib/api'
import ClassProgress from './ClassProgress'
import {
  ChevronRight, Plus, FileText, Trash2, BookOpen,
  Users, Upload, Link2, X, ChevronDown, ChevronUp, Paperclip,
  Eye, Download, Image, Film, File, BarChart3,
} from 'lucide-react'

interface ClassData {
  id: number
  name: string
  grade_level: string
  section: string
  school_year: string
  subject: string
  teacher_id: number
  is_active: boolean
}

interface LessonItem {
  id: number
  topic_id: number
  title: string
  content?: string
  order: number
}

interface TopicItem {
  id: number
  class_id: number
  title: string
  description?: string
  order_index: number
  lesson_count: number
  lessons: LessonItem[]
}

interface Material {
  id: number
  title: string
  file_name: string
  file_type: string
  file_url?: string
  file_path: string
}

export function TeacherClassDetail() {
  const { classId } = useParams<{ classId: string }>()
  const [classData, setClassData] = useState<ClassData | null>(null)
  const [classTopics, setClassTopics] = useState<TopicItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'content' | 'progress'>('content')

  // Expanded lessons per topic
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set())

  // Materials per lesson (loaded on expand)
  const [lessonMaterials, setLessonMaterials] = useState<Record<number, { materials: Material[]; links: Material[] }>>({})
  const [expandedLessons, setExpandedLessons] = useState<Set<number>>(new Set())

  // Modals
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState<{ topicId: number; lessonId: number } | null>(null)
  const [showLinkModal, setShowLinkModal] = useState<{ topicId: number; lessonId: number } | null>(null)

  // Form state
  const [newTopic, setNewTopic] = useState({ title: '', description: '' })
  const [newLesson, setNewLesson] = useState({ title: '', content: '' })
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [newLink, setNewLink] = useState({ title: '', url: '' })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')

  // Loading states
  const [savingTopic, setSavingTopic] = useState(false)
  const [savingLesson, setSavingLesson] = useState(false)
  const [savingMaterial, setSavingMaterial] = useState(false)
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null)

  const id = Number(classId)

  useEffect(() => {
    if (classId) loadData()
  }, [classId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cls, topicsRes] = await Promise.all([
        teacherApi.classDetail(id),
        teacherApi.getTopics(id),
      ])
      setClassData(cls.data)
      setClassTopics(topicsRes.data || [])
    } catch (err: any) {
      console.error('Error loading class:', err?.response?.data ?? err)
    } finally {
      setLoading(false)
    }
  }

  const loadLessonMaterials = async (topicId: number, lessonId: number) => {
    try {
      const res = await teacherApi.getLessonMaterials(id, topicId, lessonId)
      setLessonMaterials(prev => ({ ...prev, [lessonId]: res.data }))
    } catch (err: any) {
      console.error('Error loading materials:', err?.response?.data ?? err)
    }
  }

  // ── Topic handlers ────────────────────────────────────────────

  const handleCreateTopic = async () => {
    if (!newTopic.title.trim()) return
    setSavingTopic(true)
    try {
      await teacherApi.createTopic(id, newTopic)
      setShowTopicModal(false)
      setNewTopic({ title: '', description: '' })
      const res = await teacherApi.getTopics(id)
      setClassTopics(res.data || [])
    } catch (err: any) {
      console.error('Error creating topic:', err?.response?.data ?? err)
    } finally {
      setSavingTopic(false)
    }
  }

  const handleDeleteTopic = async (topicId: number) => {
    if (!confirm('Delete this topic and all its lessons?')) return
    try {
      await teacherApi.deleteTopic(id, topicId)
      setClassTopics(prev => prev.filter(t => t.id !== topicId))
    } catch (err: any) {
      console.error('Error deleting topic:', err?.response?.data ?? err)
    }
  }

  // ── Lesson handlers ───────────────────────────────────────────

  const handleCreateLesson = async () => {
    if (!newLesson.title.trim() || !selectedTopicId) return
    setSavingLesson(true)
    try {
      await teacherApi.createLesson(id, selectedTopicId, newLesson)
      setShowLessonModal(false)
      setNewLesson({ title: '', content: '' })
      const res = await teacherApi.getTopics(id)
      setClassTopics(res.data || [])
    } catch (err: any) {
      console.error('Error creating lesson:', err?.response?.data ?? err)
    } finally {
      setSavingLesson(false)
    }
  }

  const handleDeleteLesson = async (topicId: number, lessonId: number) => {
    if (!confirm('Delete this lesson?')) return
    try {
      await teacherApi.deleteLesson(id, topicId, lessonId)
      const res = await teacherApi.getTopics(id)
      setClassTopics(res.data || [])
    } catch (err: any) {
      console.error('Error deleting lesson:', err?.response?.data ?? err)
    }
  }

  // ── Material handlers ─────────────────────────────────────────

  const handleUploadMaterial = async () => {
    if (!uploadFile || !showMaterialModal) return
    setSavingMaterial(true)
    try {
      const form = new FormData()
      form.append('file', uploadFile)
      if (uploadTitle) form.append('title', uploadTitle)
      await teacherApi.uploadMaterial(id, showMaterialModal.topicId, showMaterialModal.lessonId, form)
      await loadLessonMaterials(showMaterialModal.topicId, showMaterialModal.lessonId)
      setShowMaterialModal(null)
      setUploadFile(null)
      setUploadTitle('')
    } catch (err: any) {
      console.error('Error uploading material:', err?.response?.data ?? err)
    } finally {
      setSavingMaterial(false)
    }
  }

  const handleAddLink = async () => {
    if (!newLink.title.trim() || !newLink.url.trim() || !showLinkModal) return
    setSavingMaterial(true)
    try {
      await teacherApi.addLink(id, showLinkModal.topicId, showLinkModal.lessonId, newLink)
      await loadLessonMaterials(showLinkModal.topicId, showLinkModal.lessonId)
      setShowLinkModal(null)
      setNewLink({ title: '', url: '' })
    } catch (err: any) {
      console.error('Error adding link:', err?.response?.data ?? err)
    } finally {
      setSavingMaterial(false)
    }
  }

  const handleDeleteMaterial = async (topicId: number, lessonId: number, materialId: number) => {
    if (!confirm('Delete this material?')) return
    try {
      await teacherApi.deleteMaterial(id, topicId, lessonId, materialId)
      await loadLessonMaterials(topicId, lessonId)
    } catch (err: any) {
      console.error('Error deleting material:', err?.response?.data ?? err)
    }
  }

  // ── Expand/collapse ───────────────────────────────────────────

  const toggleTopic = (topicId: number) => {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      next.has(topicId) ? next.delete(topicId) : next.add(topicId)
      return next
    })
  }

  const toggleLesson = (topic: TopicItem, lesson: LessonItem) => {
    const lessonId = lesson.id
    setExpandedLessons(prev => {
      const next = new Set(prev)
      if (next.has(lessonId)) {
        next.delete(lessonId)
      } else {
        next.add(lessonId)
        if (!lessonMaterials[lessonId]) {
          loadLessonMaterials(topic.id, lessonId)
        }
      }
      return next
    })
  }

  const viewTabs = [
    { id: 'content' as const, label: 'Content', icon: BookOpen },
    { id: 'progress' as const, label: 'Progress', icon: BarChart3 },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/teacher/classes" className="hover:text-emerald-600 transition-colors">My Classes</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{classData?.name || 'Class'}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{classData?.name || 'Class'}</h1>
          <p className="text-gray-500">
            Grade {classData?.grade_level} · Section {classData?.section} · {classData?.subject}
          </p>
        </div>
        <Link
          to={`/teacher/class/${classId}/students`}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-5 py-3 rounded-xl transition-colors"
        >
          <Users className="w-5 h-5" />
          Students
        </Link>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {viewTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveView(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 ${
              activeView === tab.id
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content View ──────────────────────────────────────── */}
      {activeView === 'content' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowTopicModal(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-3 rounded-xl transition-colors">
              <Plus className="w-5 h-5" /> Add Topic
            </button>
          </div>

          {classTopics.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Topics Yet</h3>
              <p className="text-gray-500 mb-6">Create your first topic to organize lessons.</p>
              <button onClick={() => setShowTopicModal(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
                Add Topic
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {classTopics.map((topic, index) => (
                <motion.div key={topic.id} initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Topic header */}
                  <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleTopic(topic.id)}>
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-sm">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{topic.title}</h3>
                        {topic.description && <p className="text-sm text-gray-500 mt-0.5">{topic.description}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{topic.lesson_count} lesson{topic.lesson_count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setSelectedTopicId(topic.id); setShowLessonModal(true) }}
                        className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-lg text-sm transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Lesson
                      </button>
                      <button onClick={() => handleDeleteTopic(topic.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedTopics.has(topic.id) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                  {/* Lessons */}
                  <AnimatePresence>
                    {expandedTopics.has(topic.id) && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                          {topic.lessons.length === 0 ? (
                            <div className="text-center py-6"><BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-gray-400 text-sm">No lessons yet.</p></div>
                          ) : topic.lessons.map((lesson, li) => (
                            <div key={lesson.id} className="bg-gray-50 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => toggleLesson(topic, lesson)}>
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 bg-white rounded border border-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">{li + 1}</span>
                                  <p className="font-medium text-gray-900 text-sm">{lesson.title}</p>
                                </div>
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => setShowMaterialModal({ topicId: topic.id, lessonId: lesson.id })}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Upload file">
                                    <Upload className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setShowLinkModal({ topicId: topic.id, lessonId: lesson.id })}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Add link">
                                    <Link2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteLesson(topic.id, lesson.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  {expandedLessons.has(lesson.id) ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                                </div>
                              </div>
                              {/* Materials panel */}
                              <AnimatePresence>
                                {expandedLessons.has(lesson.id) && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden border-t border-gray-200">
                                    <div className="px-4 py-3 space-y-1.5">
                                      {lesson.content && <p className="text-xs text-gray-500 mb-2">{lesson.content}</p>}
                                      {!lessonMaterials[lesson.id] ? <p className="text-xs text-gray-400">Loading...</p> : (
                                        <>{lessonMaterials[lesson.id].materials.map(m => (
                                          <div key={m.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                              <span className="font-medium text-gray-800 truncate">{m.title || m.file_name}</span>
                                              <span className="text-gray-400 uppercase shrink-0">{m.file_type}</span>
                                            </div>
                                            <div className="flex items-center gap-1 ml-2 shrink-0">
                                              {m.file_url && <button onClick={() => setViewingMaterial(m)} className="p-1 text-emerald-500 hover:text-emerald-700 transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>}
                                              {m.file_url && <a href={m.file_url} download={m.file_name} className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="Download"><Download className="w-3.5 h-3.5" /></a>}
                                              <button onClick={() => handleDeleteMaterial(topic.id, lesson.id, m.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                            </div>
                                          </div>
                                        ))}
                                        {lessonMaterials[lesson.id].links.map(l => (
                                          <div key={l.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <Link2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                              <a href={l.file_path} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium truncate">{l.title}</a>
                                            </div>
                                            <button onClick={() => handleDeleteMaterial(topic.id, lesson.id, l.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors ml-2 shrink-0"><X className="w-3.5 h-3.5" /></button>
                                          </div>
                                        ))}
                                        {lessonMaterials[lesson.id].materials.length === 0 && lessonMaterials[lesson.id].links.length === 0 && (
                                          <p className="text-xs text-gray-400 text-center py-2">No materials yet.</p>
                                        )}</>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Progress View ──────────────────────────────────────── */}
      {activeView === 'progress' && <ClassProgress classId={id} />}

      {/* ── Create Topic Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showTopicModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Topic</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Topic Title</label>
                  <input type="text" value={newTopic.title} onChange={e => setNewTopic({ ...newTopic, title: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleCreateTopic()}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g., Quarter 1 — Introduction" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description (Optional)</label>
                  <textarea value={newTopic.description} onChange={e => setNewTopic({ ...newTopic, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Brief description..." rows={3} />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => { setShowTopicModal(false); setNewTopic({ title: '', description: '' }) }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={handleCreateTopic} disabled={!newTopic.title.trim() || savingTopic}
                  className="flex-1 px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingTopic ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : 'Create Topic'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create Lesson Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showLessonModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Lesson</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Lesson Title</label>
                  <input type="text" value={newLesson.title} onChange={e => setNewLesson({ ...newLesson, title: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleCreateLesson()}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g., Linear Equations" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Notes / Content (Optional)</label>
                  <textarea value={newLesson.content} onChange={e => setNewLesson({ ...newLesson, content: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Lesson notes..." rows={4} />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => { setShowLessonModal(false); setNewLesson({ title: '', content: '' }) }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={handleCreateLesson} disabled={!newLesson.title.trim() || savingLesson}
                  className="flex-1 px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingLesson ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : 'Create Lesson'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Upload Material Modal ──────────────────────────────── */}
      <AnimatePresence>
        {showMaterialModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Material</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">File</label>
                  <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.mp4,.mov"
                    onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-semibold hover:file:bg-emerald-100" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Title (Optional)</label>
                  <input type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Defaults to filename" />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => { setShowMaterialModal(null); setUploadFile(null); setUploadTitle('') }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={handleUploadMaterial} disabled={!uploadFile || savingMaterial}
                  className="flex-1 px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingMaterial ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Upload className="w-4 h-4" /> Upload</>}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add Link Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showLinkModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Link</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Link Title</label>
                  <input type="text" value={newLink.title} onChange={e => setNewLink({ ...newLink, title: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g., Khan Academy — Algebra" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">URL</label>
                  <input type="url" value={newLink.url} onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="https://..." />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => { setShowLinkModal(null); setNewLink({ title: '', url: '' }) }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={handleAddLink} disabled={!newLink.title.trim() || !newLink.url.trim() || savingMaterial}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingMaterial ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Link2 className="w-4 h-4" /> Add Link</>}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Material Viewer ────────────────────────────────────── */}
      <AnimatePresence>
        {viewingMaterial && (() => {
          const type = viewingMaterial.file_type.toUpperCase()
          const url = viewingMaterial.file_url ?? viewingMaterial.file_path
          const isImage = ['JPG','JPEG','PNG','GIF','WEBP','SVG'].includes(type)
          const isVideo = ['MP4','MOV','WEBM'].includes(type)
          const isPdf = type === 'PDF'
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex flex-col"
              onClick={e => e.target === e.currentTarget && setViewingMaterial(null)}>
              <div className="flex items-center justify-between px-6 py-4 bg-black/60 shrink-0">
                <div>
                  <p className="text-white font-semibold text-sm">{viewingMaterial.title || viewingMaterial.file_name}</p>
                  <p className="text-gray-400 text-xs uppercase">{type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <a href={url} download={viewingMaterial.file_name}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    <Download className="w-4 h-4" /> Download</a>
                  <button onClick={() => setViewingMaterial(null)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                    <X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
                {isPdf && <iframe src={`${url}#toolbar=1&navpanes=0`} className="w-full h-full rounded-lg bg-white" title={viewingMaterial.title} />}
                {isImage && <img src={url} alt={viewingMaterial.title} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />}
                {isVideo && <video src={url} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl" />}
                {!isPdf && !isImage && !isVideo && (
                  <div className="text-center text-white">
                    <File className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-semibold mb-2">{viewingMaterial.file_name}</p>
                    <p className="text-gray-400 mb-6">This file type cannot be previewed.</p>
                    <a href={url} download={viewingMaterial.file_name}
                      className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
                      <Download className="w-5 h-5" /> Download to view</a>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}