import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { teacherApi } from '../../lib/api'
import {
  FileText,
  UploadCloud,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  Database,
  RefreshCw,
  AlertCircle,
  Clock,
  File as FileIcon,
  X,
  Loader2,
  BookOpen,
  ChevronDown,
  Plus,
  Pencil,
} from 'lucide-react'

interface ContentItem {
  id: number
  title: string
  file_name: string
  file_type: string
  file_size: number
  file_path: string
  file_url: string
  ai_sync: boolean
  ingestion_status: string
  created_at: string
  updated_at: string
  subject: string
  class_name: string
  class_id: number
  topic: string
  topic_id: number
  lesson: string
  lesson_id: number
}

interface LessonOption {
  id: number
  title: string
  topic_title: string
  class_name: string
  class_id: number
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const ingestionBadge = (status: string) => {
  switch (status) {
    case 'indexed':
      return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Indexed' }
    case 'processing':
      return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Loader2, label: 'Processing' }
    case 'failed':
      return { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle, label: 'Failed' }
    default:
      return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, label: 'Pending' }
  }
}

export function TeacherContentManager() {
  const [materials, setMaterials] = useState<ContentItem[]>([])
  const [lessons, setLessons] = useState<LessonOption[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newLessonId, setNewLessonId] = useState<number | ''>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [topicForm, setTopicForm] = useState<{ classId: number; title: string; description: string } | null>(null)
  const [lessonForm, setLessonForm] = useState<{ classId: number; topicId: number; title: string; content: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
    loadLessons()
  }, [])

  const loadData = async () => {
    try {
      const res = await teacherApi.content()
      setMaterials(res.data || [])
    } catch (err) {
      console.error('Error loading content:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadLessons = async () => {
    try {
      const res = await teacherApi.getContentLessons()
      setLessons(res.data || [])
    } catch (err) {
      console.error('Error loading lessons:', err)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!newTitle) {
        setNewTitle(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !newLessonId) {
      setError('Please select a file and a lesson.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', newTitle)
      formData.append('lesson_id', String(newLessonId))

      await teacherApi.uploadContent(formData)
      await loadData()
      setShowUpload(false)
      setSelectedFile(null)
      setNewTitle('')
      setNewLessonId('')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this material?')) return
    try {
      await teacherApi.deleteContent(id)
      setMaterials(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      console.error('Error deleting material:', err)
    }
  }

  const handleReprocess = async (id: number) => {
    try {
      await teacherApi.reprocessContent(id)
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, ingestion_status: 'pending' } : m))
    } catch (err) {
      console.error('Error reprocessing:', err)
    }
  }

  const syncedCount = materials.filter(m => m.ingestion_status === 'indexed').length

  // Group materials by subject → topic directly from the material's own data
  // This ensures ALL materials show up even if the lessons dropdown doesn't have them
  // Group materials by class name → topic directly from the material's own data
  const groupedMaterials = materials.reduce((acc, material) => {
    const className = material.class_name && material.class_name !== 'N/A' ? material.class_name : (material.subject || 'Other')
    const topicName = material.topic && material.topic !== 'N/A' ? material.topic : 'General'

    if (!acc[className]) acc[className] = {}
    if (!acc[className][topicName]) acc[className][topicName] = []
    acc[className][topicName].push(material)
    return acc
  }, {} as Record<string, Record<string, ContentItem[]>>)

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Content Manager</h1>
          <p className="text-gray-500 text-sm">Upload and manage learning materials with AI indexing status.</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm">
          <UploadCloud size={18} /> Upload Material
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Materials', value: materials.length, color: 'bg-blue-50 text-blue-500', textColor: 'text-blue-600', icon: FileText },
          { label: 'Indexed to AI', value: syncedCount, color: 'bg-emerald-50 text-emerald-500', textColor: 'text-emerald-600', icon: Database },
          { label: 'Processing', value: materials.filter(m => m.ingestion_status === 'processing').length, color: 'bg-blue-50 text-blue-500', textColor: 'text-blue-600', icon: Loader2 },
          { label: 'Pending', value: materials.filter(m => m.ingestion_status === 'pending' || m.ingestion_status === 'failed').length, color: 'bg-amber-50 text-amber-500', textColor: 'text-amber-600', icon: Clock },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stat.color}`}>
              <stat.icon size={16} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</div>
              <div className={`text-lg font-bold leading-none ${stat.textColor}`}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowUpload(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Upload Material</h2>
              <button onClick={() => setShowUpload(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{error}</div>
            )}

            <div className="space-y-4">
              {/* File Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors cursor-pointer"
              >
                <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".pdf,.docx,.pptx,.doc,.ppt,.txt" className="hidden" />
                {selectedFile ? (
                  <div>
                    <FileText className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div>
                    <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="font-medium text-gray-900">Drop a file or click to browse</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOCX, PPTX up to 50MB</p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Material title" />
              </div>

              {/* Lesson Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Lesson</label>
                <select value={newLessonId} onChange={e => setNewLessonId(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  <option value="">Select a lesson...</option>
                  {lessons.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.class_name} → {l.topic_title} → {l.title}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={handleUpload} disabled={uploading || !selectedFile || !newLessonId}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud size={18} />}
                {uploading ? 'Uploading...' : 'Upload Material'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Topics & Lessons Management */}
      {lessons.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-500" /> Topics & Lessons
          </h2>
          {Object.entries(groupedMaterials).map(([className, topics]) => {
            const classLessons = lessons.filter(l => l.class_name === className)
            const classId = classLessons[0]?.class_id || materials.find(m => m.class_name === className)?.class_id
            if (!classId) return null
            return (
              <div key={className} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">{className}</h3>
                  <button onClick={() => setTopicForm({ classId, title: '', description: '' })} className="text-sm flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100">
                    <Plus size={14} /> Add Topic
                  </button>
                </div>
                {topicForm?.classId === classId && (
                  <div className="flex gap-2 p-3 bg-gray-50 rounded-xl">
                    <input value={topicForm.title} onChange={e => setTopicForm({ ...topicForm, title: e.target.value })} placeholder="Topic title" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <input value={topicForm.description} onChange={e => setTopicForm({ ...topicForm, description: e.target.value })} placeholder="Description (optional)" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <button onClick={async () => { if (!topicForm.title.trim()) return; await teacherApi.createTopic(classId, { title: topicForm.title, description: topicForm.description }); setTopicForm(null); loadLessons() }} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium">Save</button>
                    <button onClick={() => setTopicForm(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                  </div>
                )}
                <div className="space-y-3">
                  {Object.entries(topics).map(([topicName, topicMaterials]) => {
                    const topicLesson = classLessons.find(l => l.topic_title === topicName)
                    const topicId = topicLesson?.id || topicMaterials[0]?.topic_id
                    const topicLessons = lessons.filter(l => l.topic_title === topicName)
                    return (
                      <div key={topicName} className="border border-gray-100 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-800 text-sm">{topicName}</h4>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setLessonForm({ classId, topicId: topicId || 0, title: '', content: '' })} className="text-xs flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                              <Plus size={12} /> Add Lesson
                            </button>
                          </div>
                        </div>
                        {lessonForm?.classId === classId && lessonForm?.topicId === topicId && (
                          <div className="flex gap-2 p-3 bg-gray-50 rounded-xl">
                            <input value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="Lesson title" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                            <button onClick={async () => { if (!lessonForm.title.trim() || !topicId) return; await teacherApi.createLesson(classId, topicId, { title: lessonForm.title, content: lessonForm.content }); setLessonForm(null); loadLessons() }} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium">Save</button>
                            <button onClick={() => setLessonForm(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                          </div>
                        )}
                        {topicLessons.length > 0 && (
                          <div className="space-y-1">
                            {topicLessons.map(l => (
                              <div key={l.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                                <span className="text-gray-700">{l.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Materials List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
          <UploadCloud className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Materials Yet</h3>
          <p className="text-gray-500 mb-6">Upload your first learning material to get started.</p>
          <button onClick={() => setShowUpload(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-medium inline-flex items-center gap-2 transition-colors">
            <UploadCloud size={18} /> Upload Material
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMaterials).map(([className, topics]) => (
            <div key={className}>
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-500" /> {className}
              </h2>
              <div className="text-xs text-gray-400 mb-2">Subject: {materials.find(m => m.class_name === className)?.subject || className}</div>
              <div className="space-y-4">
                {Object.entries(topics).map(([topicName, topicMaterials]) => (
                  <div key={topicName} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-700 text-sm">{topicName}</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {topicMaterials.map((material) => {
                        const badge = ingestionBadge(material.ingestion_status)
                        return (
                          <div key={material.id} className="px-6 py-4 flex items-center justify-between group hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-10 h-12 bg-red-50 rounded flex flex-col items-center justify-center text-red-500 border border-red-100 relative shrink-0">
                                <FileText size={20} />
                                <span className="text-[8px] font-bold mt-0.5 bg-red-500 text-white px-1 rounded-sm absolute -bottom-1.5">{material.file_type}</span>
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900 truncate">{material.title}</div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                  <span>{material.lesson}</span>
                                  <span>·</span>
                                  <span>{formatFileSize(material.file_size)}</span>
                                  <span>·</span>
                                  <span>{new Date(material.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              {/* Ingestion Status */}
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                                <badge.icon size={12} className={badge.label === 'Processing' ? 'animate-spin' : ''} />
                                {badge.label}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {material.ingestion_status !== 'processing' && (
                                  <button onClick={() => handleReprocess(material.id)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Reprocess">
                                    <RefreshCw size={15} />
                                  </button>
                                )}
                                <button onClick={() => window.open(material.file_url, '_blank')}
                                  className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="View">
                                  <Eye size={15} />
                                </button>
                                <button onClick={() => { const a = document.createElement('a'); a.href = material.file_url; a.download = material.file_name; a.click() }}
                                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Download">
                                  <Download size={15} />
                                </button>
                                <button onClick={() => handleDelete(material.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}