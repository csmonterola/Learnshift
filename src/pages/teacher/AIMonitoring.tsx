import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { teacherApi } from '../../lib/api'
import {
  Bot,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Search,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  MessageSquarePlus,
  X,
  Check,
  Flag,
  Eye,
  Loader2,
  FileEdit,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { InlineImageRenderer, ChatImage } from '../../components/lesson/InlineImageRenderer'

interface ChatLog {
  id: number
  student_id: number
  lesson_id: number
  question: string
  response: string
  source: string
  retrieved_chunk_count: number
  confidence_score: number
  status: string
  teacher_note: string | null
  teacher_corrected_response: string | null
  reviewed_by: number | null
  reviewed_at: string | null
  created_at: string
  material_image_ids: number[] | null
  student: {
    id: number
    name: string
    avatar?: string
  }
  lesson: {
    id: number
    title: string
    topic: {
      id: number
      title: string
      school_class: {
        id: number
        name: string
        subject: string
      }
    }
  }
  reviewer: {
    id: number
    name: string
  } | null
}

interface Stats {
  total_interactions: number
  verified: number
  flagged: number
  needs_review: number
}

const imageCache: Record<number, ChatImage[]> = {}

export function TeacherAIMonitoring() {
  const [logs, setLogs] = useState<ChatLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null)
  const [editResponse, setEditResponse] = useState(false)
  const [correctedResponse, setCorrectedResponse] = useState('')
  const [teacherNote, setTeacherNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchSubmitted, setSearchSubmitted] = useState('')
  const [logImages, setLogImages] = useState<Record<number, ChatImage[]>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (searchVal?: string, statusVal?: string) => {
    setLoading(true)
    try {
      const params: { search?: string; status?: string } = {}
      if (searchVal || searchSubmitted) params.search = searchVal || searchSubmitted
      if (statusVal || statusFilter) params.status = statusVal || statusFilter

      const [logsRes, statsRes] = await Promise.all([
        teacherApi.aiLogs(Object.keys(params).length > 0 ? params : undefined),
        teacherApi.aiLogStats(),
      ])
      const newLogs = logsRes.data?.data || logsRes.data || []
      
      // Collect all unique material_image_ids per lesson across all logs
      const lessonImageIds: Record<number, Set<number>> = {}
      for (const log of newLogs as ChatLog[]) {
        if (log.material_image_ids && log.material_image_ids.length > 0) {
          if (!lessonImageIds[log.lesson_id]) {
            lessonImageIds[log.lesson_id] = new Set()
          }
          for (const id of log.material_image_ids) {
            lessonImageIds[log.lesson_id].add(id)
          }
        }
      }

      // Fetch images per lesson with merged IDs (single API call per lesson)
      const imageLoadPromises: Promise<ChatImage[]>[] = []
      for (const [lessonId, ids] of Object.entries(lessonImageIds)) {
        const uniqueIds = Array.from(ids)
        imageLoadPromises.push(loadLogImages({ lesson_id: Number(lessonId), material_image_ids: uniqueIds } as ChatLog))
      }
      
      // Wait for images to load before rendering
      await Promise.all(imageLoadPromises)
      
      // Now set both logs and stats atomically
      setLogs(newLogs)
      setStats(statsRes.data)
    } catch (err) {
      console.error('Error loading AI logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchSubmitted(search)
    loadData(search, undefined)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setShowStatusDropdown(false)
    loadData(undefined, status)
  }

  const handleDirectApprove = async (log: ChatLog) => {
    setSaving(true)
    try {
      await teacherApi.updateLogStatus(log.id, { status: 'verified' })
      await loadData()
    } catch (err) {
      console.error('Error approving log:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveReview = async () => {
    if (!selectedLog) return
    setSaving(true)
    try {
      const payload: { status: string; teacher_note?: string; teacher_corrected_response?: string } = {
        status: 'reviewed',
      }
      if (teacherNote.trim()) payload.teacher_note = teacherNote.trim()
      if (editResponse && correctedResponse.trim() && correctedResponse !== selectedLog.response) {
        payload.teacher_corrected_response = correctedResponse.trim()
      }

      await teacherApi.updateLogStatus(selectedLog.id, payload)
      setSelectedLog(null)
      setEditResponse(false)
      setTeacherNote('')
      setCorrectedResponse('')
      await loadData()
    } catch (err) {
      console.error('Error saving review:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleFlag = async () => {
    if (!selectedLog) return
    setSaving(true)
    try {
      const payload: { status: string; teacher_note?: string; teacher_corrected_response?: string } = {
        status: 'flagged',
      }
      if (teacherNote.trim()) payload.teacher_note = teacherNote.trim()
      if (editResponse && correctedResponse.trim() && correctedResponse !== selectedLog.response) {
        payload.teacher_corrected_response = correctedResponse.trim()
      }

      await teacherApi.updateLogStatus(selectedLog.id, payload)
      setSelectedLog(null)
      setEditResponse(false)
      setTeacherNote('')
      setCorrectedResponse('')
      await loadData()
    } catch (err) {
      console.error('Error flagging log:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleVerify = async () => {
    if (!selectedLog) return
    setSaving(true)
    try {
      const payload: { status: string; teacher_note?: string; teacher_corrected_response?: string } = {
        status: 'verified',
      }
      if (teacherNote.trim()) payload.teacher_note = teacherNote.trim()
      if (editResponse && correctedResponse.trim() && correctedResponse !== selectedLog.response) {
        payload.teacher_corrected_response = correctedResponse.trim()
      }

      await teacherApi.updateLogStatus(selectedLog.id, payload)
      setSelectedLog(null)
      setEditResponse(false)
      setTeacherNote('')
      setCorrectedResponse('')
      await loadData()
    } catch (err) {
      console.error('Error verifying log:', err)
    } finally {
      setSaving(false)
    }
  }

  const loadLogImages = async (log: ChatLog): Promise<ChatImage[]> => {
    const ids = log.material_image_ids || []
    const cacheKey = log.lesson_id
    if (ids.length === 0) return []

    // Check module-level cache first (synchronous, always available)
    if (imageCache[cacheKey]) {
      return imageCache[cacheKey]
    }

    try {
      const res = await teacherApi.chatImages(cacheKey, { image_ids: ids })
      const imgs: ChatImage[] = res.data?.images || []
      // Cache results and update React state
      imageCache[cacheKey] = imgs
      setLogImages(prev => ({ ...prev, [cacheKey]: imgs }))
      return imgs
    } catch (err) {
      console.error('Error loading log images:', err)
      return []
    }
  }

  const openReviewModal = async (log: ChatLog) => {
    setSelectedLog(log)
    setEditResponse(false)
    setTeacherNote(log.teacher_note || '')
    setCorrectedResponse(log.teacher_corrected_response || '')
    await loadLogImages(log)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ShieldCheck, label: 'Verified' }
      case 'flagged':
        return { bg: 'bg-red-50 text-red-700 border-red-200', icon: ShieldAlert, label: 'Flagged' }
      case 'reviewed':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Eye, label: 'Reviewed' }
      default:
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: ShieldAlert, label: 'Needs Review' }
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'ok', label: 'Needs Review' },
    { value: 'verified', label: 'Verified' },
    { value: 'flagged', label: 'Flagged' },
    { value: 'reviewed', label: 'Reviewed' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">AI Monitoring</h1>
            <p className="text-gray-500 text-sm">Monitor and verify the AI Tutor's responses to your students.</p>
          </div>
        </div>
        <button onClick={() => loadData()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Interactions', value: stats.total_interactions, color: 'bg-blue-50 text-blue-500', textColor: 'text-blue-600', icon: ShieldCheck },
            { label: 'Verified', value: stats.verified, color: 'bg-emerald-50 text-emerald-500', textColor: 'text-emerald-600', icon: ShieldCheck },
            { label: 'Needs Review', value: stats.needs_review, color: 'bg-amber-50 text-amber-500', textColor: 'text-amber-600', icon: ShieldAlert },
            { label: 'Flagged', value: stats.flagged, color: 'bg-red-50 text-red-500', textColor: 'text-red-600', icon: ShieldAlert },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 shadow-sm">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</div>
                <div className={`text-xl font-bold leading-none mt-1 ${stat.textColor}`}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-4">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by student, topic, or question..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all shadow-sm"
          />
        </form>
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 flex items-center gap-2 shadow-sm hover:bg-gray-50 min-w-[150px]"
          >
            <ShieldCheck size={16} className="text-gray-400" />
            {statusOptions.find(o => o.value === statusFilter)?.label || 'All Statuses'}
            <ChevronDown size={16} className="ml-auto" />
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full right-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusFilter(opt.value)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                    statusFilter === opt.value ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
          <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No AI Conversations Yet</h3>
          <p className="text-gray-500 mb-2">When students chat with the AI tutor in their lessons, their conversations will appear here for you to review.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {logs.map((log) => {
            const badge = getStatusBadge(log.status)
            const BadgeIcon = badge.icon
            const subject = log.lesson?.topic?.school_class?.subject || 'General'
            const topicTitle = log.lesson?.topic?.title || ''
            const lessonTitle = log.lesson?.title || ''
            const studentName = log.student?.name || 'Unknown'
            const initials = getInitials(studentName)
            const displayResponse = log.teacher_corrected_response || log.response
            const hasCorrection = !!log.teacher_corrected_response

            return (
              <div key={log.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="px-6 py-4 flex items-start justify-between border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{studentName}</span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase">{subject}</span>
                        <span className="text-gray-400 text-xs">· {topicTitle}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(log.created_at).toLocaleString()} · {lessonTitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Confidence */}
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">AI Confidence</div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${log.confidence_score > 80 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                            style={{ width: `${log.confidence_score}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${log.confidence_score > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {log.confidence_score}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${badge.bg}`}>
                      <BadgeIcon size={12} />
                      {badge.label}
                    </div>
                  </div>
                </div>

                {/* Conversation */}
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">
                      <MessageSquarePlus size={12} /> Student Question
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-gray-700 text-sm italic">
                      "{log.question}"
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                        <Bot size={12} /> AI Tutor Response
                        {hasCorrection && (
                          <span className="ml-2 px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded text-[8px] font-bold">EDITED</span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-medium border border-emerald-100 flex items-center gap-1">
                        <Bot size={10} /> LearnShift AI
                      </span>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none">
                      <InlineImageRenderer
                        content={displayResponse}
                        images={(logImages[log.lesson_id]?.length ? logImages[log.lesson_id] : (imageCache[log.lesson_id] || [])) as ChatImage[]}
                      />
                    </div>
                  </div>

                  {/* Teacher Note */}
                  {log.teacher_note && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                        <FileEdit size={12} /> Teacher Note
                      </div>
                      <p className="text-sm text-amber-800">{log.teacher_note}</p>
                      {log.reviewer && (
                        <p className="text-xs text-amber-500 mt-1">— {log.reviewer.name}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.status !== 'verified' && (
                      <button
                        disabled={saving}
                        onClick={() => handleDirectApprove(log)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp size={14} />}
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => openReviewModal(log)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <ThumbsDown size={14} /> Flag / Edit
                    </button>
                  </div>
                  <button
                    onClick={() => openReviewModal(log)}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-white text-sm font-medium transition-colors shadow-sm"
                  >
                    <MessageSquarePlus size={15} />
                    {log.teacher_note ? 'Edit Review' : 'Review'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => {
            if (e.target === e.currentTarget) {
              setSelectedLog(null)
              setEditResponse(false)
            }
          }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Review AI Response</h2>
              <button onClick={() => { setSelectedLog(null); setEditResponse(false) }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Question */}
            <div className="mb-4">
              <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Student</div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-gray-700 text-sm">
                {selectedLog.question}
              </div>
            </div>

            {/* AI Response */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">AI Response</div>
                <button
                  onClick={() => {
                    setEditResponse(!editResponse)
                    if (!editResponse) setCorrectedResponse(selectedLog.response)
                  }}
                  className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                    editResponse ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <FileEdit size={12} /> {editResponse ? 'Cancel Edit' : 'Edit'}
                </button>
              </div>
              {editResponse ? (
                <textarea
                  value={correctedResponse}
                  onChange={e => setCorrectedResponse(e.target.value)}
                  className="w-full min-h-[120px] px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Edit the AI response if needed..."
                />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none">
                    {selectedLog && (
                      <InlineImageRenderer
                        content={selectedLog.response}
                        images={(logImages[selectedLog.lesson_id]?.length ? logImages[selectedLog.lesson_id] : (imageCache[selectedLog.lesson_id] || [])) as ChatImage[]}
                      />
                    )}
                  </div>
                )}
              {editResponse && (
                <p className="text-xs text-amber-600 mt-1">
                  The edited version will be shown to the student. The original AI response is preserved.
                </p>
              )}
            </div>

            {/* Teacher Note */}
            <div className="mb-6">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Your Note (visible to student)
              </label>
              <textarea
                value={teacherNote}
                onChange={e => setTeacherNote(e.target.value)}
                className="w-full min-h-[80px] px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="Add a note to the student about this response..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleVerify}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} />}
                Approve
              </button>
              <button
                onClick={handleFlag}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag size={16} />}
                Flag as Wrong
              </button>
              <button
                onClick={handleSaveReview}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye size={16} />}
                Save Review
              </button>
              <button
                onClick={() => { setSelectedLog(null); setEditResponse(false) }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}