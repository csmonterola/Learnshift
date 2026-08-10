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
  X,
  Loader2,
  BookOpen,
  ChevronDown,
  Plus,
  Pencil,
  Search,
  Check,
} from 'lucide-react'

interface ContentItem {
  id: number
  title: string
  description: string | null
  tags: string[] | null
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
  class_id: number | null
  topic: string
  topic_id: number | null
  lesson: string
  lesson_id: number | null
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

const formatDate = (iso: string) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
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

const inputCls =
  'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const cleaned = draft.replace(/,/g, '').trim()
    if (cleaned && !value.some(t => t.toLowerCase() === cleaned.toLowerCase())) {
      onChange([...value, cleaned])
    }
    setDraft('')
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} className="hover:text-emerald-900 transition-colors">
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          }
          if (e.key === 'Backspace' && !draft && value.length > 0) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={add}
        placeholder={value.length === 0 ? (placeholder || 'Type a tag and press Enter') : undefined}
        className="flex-1 min-w-[120px] text-sm outline-none placeholder:text-gray-400"
      />
    </div>
  )
}

function MetaLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{children}</span>
    </div>
  )
}

function IngestionBadge({ status }: { status: string }) {
  const badge = ingestionBadge(status)
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
      <badge.icon size={12} className={badge.label === 'Processing' ? 'animate-spin' : ''} />
      {badge.label}
    </span>
  )
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

  // Search & filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [topicFilter, setTopicFilter] = useState('')

  // Detail / edit modal
  const [selectedMaterial, setSelectedMaterial] = useState<ContentItem | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editLessonId, setEditLessonId] = useState<number | ''>('')
  const [editFile, setEditFile] = useState<File | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Topics & Lessons management (collapsible secondary panel)
  const [showManagement, setShowManagement] = useState(false)
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
      const list = res.data || []
      setMaterials(list)
      return list
    } catch (err) {
      console.error('Error loading content:', err)
      return []
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
      if (selectedMaterial?.id === id) {
        setSelectedMaterial(null)
      }
      setMaterials(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      console.error('Error deleting material:', err)
    }
  }

  const handleReprocess = async (id: number) => {
    try {
      await teacherApi.reprocessContent(id)
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, ingestion_status: 'pending' } : m))
      if (selectedMaterial?.id === id) {
        setSelectedMaterial(prev => prev ? { ...prev, ingestion_status: 'pending' } : prev)
      }
    } catch (err) {
      console.error('Error reprocessing:', err)
    }
  }

  const downloadFile = (m: ContentItem) => {
    const a = document.createElement('a')
    a.href = m.file_url
    a.download = m.file_name
    a.click()
  }

  // ── Detail / edit modal ─────────────────────────────────────────
  const seedEditFrom = (material: ContentItem) => {
    setEditTitle(material.title)
    setEditDescription(material.description || '')
    setEditTags(material.tags || [])
    setEditLessonId(material.lesson_id ?? '')
    setEditFile(null)
    setEditError(null)
  }

  const openDetail = (material: ContentItem) => {
    setSelectedMaterial(material)
    setEditMode(false)
    seedEditFrom(material)
  }

  const closeDetail = () => {
    setSelectedMaterial(null)
    setEditMode(false)
  }

  const handleCancelEdit = () => {
    if (selectedMaterial) seedEditFrom(selectedMaterial)
    setEditMode(false)
  }

  const handleSaveEdit = async () => {
    if (!selectedMaterial) return
    if (!editTitle.trim()) {
      setEditError('Title is required.')
      return
    }
    setSavingEdit(true)
    setEditError(null)
    try {
      const payload: { title: string; lesson_id?: number | null; description?: string; tags?: string[]; file?: File } = {
        title: editTitle.trim(),
        lesson_id: editLessonId === '' ? null : Number(editLessonId),
      }
      if (editDescription) payload.description = editDescription
      payload.tags = editTags
      if (editFile) payload.file = editFile

      await teacherApi.updateContent(selectedMaterial.id, payload)

      // Refetch and re-seed from the fresh server data so the modal never
      // shows stale values (same bug class fixed in Task 4).
      const list = await loadData()
      const fresh = list.find((m: ContentItem) => m.id === selectedMaterial.id)
      if (fresh) {
        setSelectedMaterial(fresh)
        seedEditFrom(fresh)
      }
      setEditMode(false)
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Failed to update material')
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Derived data ────────────────────────────────────────────────
  const classOptions = Array.from(new Set(materials.map(m => m.class_name).filter(Boolean))).sort()
  // Topic options are scoped to the selected class (if any) so the dropdown
  // only shows relevant topics rather than every topic in the account.
  const topicOptions = Array.from(new Set(
    materials
      .filter(m => !classFilter || m.class_name === classFilter)
      .map(m => m.topic)
      .filter(Boolean)
  )).sort()
  const hasActiveFilters = !!search || !!statusFilter || !!classFilter || !!topicFilter

  const filteredMaterials = materials.filter(m => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || m.title.toLowerCase().includes(q) || m.lesson.toLowerCase().includes(q)
    const matchesStatus = !statusFilter || m.ingestion_status === statusFilter
    const matchesClass = !classFilter || m.class_name === classFilter
    const matchesTopic = !topicFilter || m.topic === topicFilter
    return matchesSearch && matchesStatus && matchesClass && matchesTopic
  })

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setClassFilter('')
    setTopicFilter('')
  }

  const syncedCount = materials.filter(m => m.ingestion_status === 'indexed').length

  // Group materials by class name → topic for the management panel.
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

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or lesson..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="indexed">Indexed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={classFilter}
          onChange={e => { setClassFilter(e.target.value); setTopicFilter('') }}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
        >
          <option value="">All Classes</option>
          {classOptions.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={topicFilter}
          onChange={e => setTopicFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
        >
          <option value="">All Topics</option>
          {topicOptions.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Materials List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-12 bg-gray-100 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="h-6 bg-gray-100 rounded-full w-24" />
              </div>
            </div>
          ))}
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
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Materials Match Your Filters</h3>
          <p className="text-gray-500 mb-6">Try adjusting your search or clearing the filters.</p>
          <button onClick={clearFilters}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium transition-colors">
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMaterials.map((material) => {
            const badge = ingestionBadge(material.ingestion_status)
            return (
              <div
                key={material.id}
                onClick={() => openDetail(material)}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
              >
                <div className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-12 bg-red-50 rounded flex flex-col items-center justify-center text-red-500 border border-red-100 relative shrink-0">
                    <FileText size={20} />
                    <span className="text-[8px] font-bold mt-0.5 bg-red-500 text-white px-1 rounded-sm absolute -bottom-1.5">{material.file_type}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 truncate">{material.title}</span>
                      {material.tags && material.tags.length > 0 && (
                        <span className="hidden lg:flex items-center gap-1 shrink-0">
                          {material.tags.slice(0, 2).map(t => (
                            <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">{t}</span>
                          ))}
                          {material.tags.length > 2 && (
                            <span className="text-[10px] text-gray-400">+{material.tags.length - 2}</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 truncate">
                      <span>{material.lesson}</span>
                      <span>·</span>
                      <span className="text-gray-400">{material.class_name}</span>
                      <span>·</span>
                      <span>{formatFileSize(material.file_size)}</span>
                      <span>·</span>
                      <span>{new Date(material.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${badge.color}`}>
                    <badge.icon size={12} className={badge.label === 'Processing' ? 'animate-spin' : ''} />
                    {badge.label}
                  </div>

                  {/* Hover actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {material.ingestion_status !== 'processing' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleReprocess(material.id) }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Reprocess"
                      >
                        <RefreshCw size={15} />
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); window.open(material.file_url, '_blank') }}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); downloadFile(material) }}
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download size={15} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(material.id) }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Topics & Lessons Management (collapsible secondary panel) */}
      {lessons.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <button
            onClick={() => setShowManagement(!showManagement)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" /> Topics & Lessons
            </h2>
            <span className="text-xs text-gray-400 font-medium">Manage topics and lessons</span>
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${showManagement ? 'rotate-180' : ''}`} />
          </button>

          {showManagement && (
            <div className="px-6 pb-6 border-t border-gray-100 space-y-6 pt-6">
              {Object.entries(groupedMaterials).map(([className, topics]) => {
                const classLessons = lessons.filter(l => l.class_name === className)
                const classId = classLessons[0]?.class_id || materials.find(m => m.class_name === className)?.class_id
                if (!classId) return null
                return (
                  <div key={className} className="border border-gray-200 rounded-2xl p-6 space-y-4">
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
        </div>
      )}

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
                  className={inputCls}
                  placeholder="Material title" />
              </div>

              {/* Lesson Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Lesson</label>
                <select value={newLessonId} onChange={e => setNewLessonId(Number(e.target.value))}
                  className={inputCls}>
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

      {/* Material Detail / Edit Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && closeDetail()}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-12 bg-red-50 rounded flex flex-col items-center justify-center text-red-500 border border-red-100 relative shrink-0">
                  <FileText size={20} />
                  <span className="text-[8px] font-bold mt-0.5 bg-red-500 text-white px-1 rounded-sm absolute -bottom-1.5">{selectedMaterial.file_type}</span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">{selectedMaterial.title}</h2>
                  <p className="text-xs text-gray-500 truncate">{selectedMaterial.file_name}</p>
                </div>
              </div>
              <button onClick={closeDetail} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editMode ? (
              /* ── Edit mode ─────────────────────────────────────── */
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className={inputCls}
                    placeholder="Material title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className={`${inputCls} min-h-[90px]`}
                    placeholder="Optional description..."
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <TagInput value={editTags} onChange={setEditTags} />
                  <p className="text-xs text-gray-400 mt-1">Press Enter to add a tag.</p>
                </div>

                {/* Lesson reassignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Lesson</label>
                  <select
                    value={editLessonId}
                    onChange={e => setEditLessonId(e.target.value === '' ? '' : Number(e.target.value))}
                    className={inputCls}
                  >
                    <option value="">Unassigned</option>
                    {lessons.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.class_name} → {l.topic_title} → {l.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Replace file */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Replace File (optional)</label>
                  <div
                    onClick={() => editFileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors cursor-pointer"
                  >
                    <input
                      ref={editFileInputRef}
                      type="file"
                      onChange={e => setEditFile(e.target.files?.[0] || null)}
                      accept=".pdf,.docx,.pptx,.doc,.ppt,.txt"
                      className="hidden"
                    />
                    {editFile ? (
                      <div className="text-sm font-medium text-gray-900 flex items-center justify-center gap-2">
                        <FileText size={16} className="text-emerald-500" />
                        {editFile.name}
                        <span className="text-xs text-gray-400 font-normal">{formatFileSize(editFile.size)}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        <UploadCloud size={18} className="mx-auto mb-1 text-gray-400" />
                        Current: {selectedMaterial.file_name} — click to replace
                      </div>
                    )}
                  </div>
                </div>

                {editError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{editError}</div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
                  <button
                    onClick={handleCancelEdit}
                    className="h-11 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit || !editTitle.trim()}
                    className="h-11 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors disabled:opacity-40 flex items-center gap-2"
                  >
                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} />}
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              /* ── Read-only view ────────────────────────────────── */
              <div className="space-y-5">
                {/* Description */}
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</div>
                  {selectedMaterial.description ? (
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedMaterial.description}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No description added.</p>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tags</div>
                  {selectedMaterial.tags && selectedMaterial.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedMaterial.tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium">{tag}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No tags.</p>
                  )}
                </div>

                {/* Metadata */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <MetaLine label="File Type">{selectedMaterial.file_type}</MetaLine>
                  <MetaLine label="File Size">{formatFileSize(selectedMaterial.file_size)}</MetaLine>
                  <MetaLine label="Uploaded">{formatDate(selectedMaterial.created_at)}</MetaLine>
                  <MetaLine label="Last Updated">{formatDate(selectedMaterial.updated_at)}</MetaLine>
                  <MetaLine label="Class">{selectedMaterial.class_name}</MetaLine>
                  <MetaLine label="Topic">{selectedMaterial.topic}</MetaLine>
                  <MetaLine label="Lesson">{selectedMaterial.lesson}</MetaLine>
                  <MetaLine label="AI Status">
                    <IngestionBadge status={selectedMaterial.ingestion_status} />
                  </MetaLine>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(selectedMaterial.file_url, '_blank')}
                      className="h-11 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Eye size={16} /> Preview
                    </button>
                    <button
                      onClick={() => downloadFile(selectedMaterial)}
                      className="h-11 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Download size={16} /> Download
                    </button>
                  </div>
                  <button
                    onClick={() => setEditMode(true)}
                    className="h-11 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Pencil size={16} /> Edit
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}
