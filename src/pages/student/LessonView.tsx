import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { studentApi } from '../../lib/api'
import { Material } from '../../components/lesson/SourcePanel'
import ChatPanel from '../../components/lesson/ChatPanel'
import PracticePanel from '../../components/lesson/PracticePanel'
import QuizPanel from '../../components/lesson/QuizPanel'
import {
  ChevronRight, FileText, ExternalLink, Download, X, Eye,
  Link2, Film, Image, File, BookOpen,
  MessageCircle, Dumbbell, Trophy, Lock, CheckCircle,
  AlertCircle, AlertTriangle, Paperclip, RefreshCw, Star, Bookmark,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────
interface LessonData {
  id: number
  title: string
  content?: string
  materials: Material[]
  links: Material[]
}

interface PinnedLog {
  lesson_chat_log_id: number
  question: string
  response: string
  source?: string | null
}

type ActiveTab = 'chat' | 'practice' | 'quiz'

// ── Helpers ────────────────────────────────────────────────────────
function formatBytes(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

// First meaningful line of a saved AI answer, used as its title
function answerTitle(response?: string | null): string {
  if (!response) return 'Saved answer'
  const line = response
    .split('\n')
    .map(l => l.replace(/^[#>*\-\s]+/, '').trim())
    .find(Boolean)
  if (!line) return 'Saved answer'
  return line.length > 90 ? `${line.slice(0, 90)}…` : line
}

function fileIcon(type: string) {
  const t = type.toUpperCase()
  if (['JPG','JPEG','PNG','GIF','WEBP','SVG'].includes(t)) return <Image className="w-4 h-4 text-purple-500" />
  if (['MP4','MOV','AVI','WEBM'].includes(t)) return <Film className="w-4 h-4 text-pink-500" />
  if (t === 'PDF') return <FileText className="w-4 h-4 text-red-500" />
  return <File className="w-4 h-4 text-emerald-500" />
}

function fileBg(type: string) {
  const t = type.toUpperCase()
  if (['JPG','JPEG','PNG','GIF','WEBP','SVG'].includes(t)) return 'bg-purple-50'
  if (['MP4','MOV','AVI','WEBM'].includes(t)) return 'bg-pink-50'
  if (t === 'PDF') return 'bg-red-50'
  return 'bg-emerald-50'
}

function canPreview(type: string) {
  return ['PDF','JPG','JPEG','PNG','GIF','WEBP','SVG','MP4','MOV','WEBM']
    .includes(type.toUpperCase())
}

// ── Material Viewer Modal ──────────────────────────────────────────
function MaterialViewer({ material, onClose }: { material: Material; onClose: () => void }) {
  const type    = material.file_type.toUpperCase()
  const url     = material.file_url ?? material.file_path
  const isImage = ['JPG','JPEG','PNG','GIF','WEBP','SVG'].includes(type)
  const isVideo = ['MP4','MOV','WEBM'].includes(type)
  const isPdf   = type === 'PDF'

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex flex-col"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="flex items-center justify-between px-6 py-4 bg-black/60 shrink-0">
        <div className="flex items-center gap-3">
          {fileIcon(type)}
          <div>
            <p className="text-white font-semibold text-sm">{material.title || material.file_name}</p>
            <p className="text-gray-400 text-xs uppercase">{type}{material.file_size ? ` · ${formatBytes(material.file_size)}` : ''}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <a href={url} download={material.file_name}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <Download className="w-4 h-4" /> Download
          </a>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
        {isPdf   && <iframe src={`${url}#toolbar=1`} className="w-full h-full rounded-lg bg-white" title={material.title} />}
        {isImage && <img src={url} alt={material.title} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />}
        {isVideo && <video src={url} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl" />}
        {!isPdf && !isImage && !isVideo && (
          <div className="text-center text-white">
            <File className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">{material.file_name}</p>
            <p className="text-gray-400 mb-6">This file type can't be previewed in the browser.</p>
            <a href={url} download={material.file_name}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
              <Download className="w-5 h-5" /> Download to view
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Ingestion Status Badge ─────────────────────────────────────────
function IngestionBadge({ status }: { status?: string }) {
  if (status === 'indexed') {
    return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Indexed — ready for AI" />
  }
  if (status === 'pending' || status === 'processing') {
    return <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse shrink-0" title="Processing…" />
  }
  return (
    <span className="flex items-center justify-center" title="Not indexed">
      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
    </span>
  )
}

// ── Main Page ──────────────────────────────────────────────────────
export function StudentLessonView() {
  const { classId, topicId, lessonId } = useParams<{
    classId: string; topicId: string; lessonId: string
  }>()
  const [lessonData, setLessonData] = useState<LessonData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [viewing, setViewing]       = useState<Material | null>(null)
  const [activeTab, setActiveTab]   = useState<ActiveTab>('chat')
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<number>>(new Set())
  const [showSources, setShowSources] = useState(false)
  const [showInfo, setShowInfo]       = useState(false)

  // Saved AI answers (bookmarks) shown in the right sidebar
  const [pinnedLogs, setPinnedLogs] = useState<PinnedLog[]>([])
  // log_id the chat should scroll to & highlight (set when sidebar item is clicked)
  const [focusLogId, setFocusLogId] = useState<number | null>(null)

  const loadPinnedLogs = useCallback((lessonId: number) => {
    studentApi.getPinnedLessonLogs(lessonId)
      .then(res => setPinnedLogs(res.data || []))
      .catch(err => console.error('Error loading pinned logs:', err))
  }, [])

  // Track materials with ingestion_status from SourcePanel
  const [materialsWithStatus, setMaterialsWithStatus] = useState<Material[]>([])

  useEffect(() => {
    if (!classId || !topicId || !lessonId) return
    studentApi.lesson(Number(classId), Number(topicId), Number(lessonId))
      .then(res => {
        setLessonData(res.data)
        // Initialize with materials from API (without ingestion_status)
        const mats = (res.data?.materials ?? []).filter((m: Material) => m.file_type !== 'LINK')
        setMaterialsWithStatus(mats)
      })
      .catch(err => console.error('Error loading lesson:', err?.response?.data ?? err))
      .finally(() => setLoading(false))
    loadPinnedLogs(Number(lessonId))
  }, [classId, topicId, lessonId, loadPinnedLogs])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  const hasMaterials = (lessonData?.materials?.length ?? 0) > 0
  const hasLinks     = (lessonData?.links?.length ?? 0) > 0

  const tabs = [
    { id: 'chat'     as ActiveTab, label: 'Chat',     icon: <MessageCircle className="w-4 h-4" />, color: 'emerald' },
    { id: 'practice' as ActiveTab, label: 'Practice', icon: <Dumbbell className="w-4 h-4" />,     color: 'blue'    },
    { id: 'quiz'     as ActiveTab, label: 'Quiz',     icon: <Trophy className="w-4 h-4" />,        color: 'amber'   },
  ]

  const tabActive = {
    chat:     'bg-emerald-500 text-white shadow-md shadow-emerald-200',
    practice: 'bg-blue-500 text-white shadow-md shadow-blue-200',
    quiz:     'bg-amber-500 text-white shadow-md shadow-amber-200',
  }

  const tabInactive = 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'

  return (
    <>
      <AnimatePresence>
        {viewing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MaterialViewer material={viewing} onClose={() => setViewing(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-height 3-column layout */}
      <div className="flex flex-col h-screen max-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-8"
        style={{ marginTop: '-1rem' }}>

        {/* Top bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white shrink-0">
          <Link to="/student/classes" className="text-xs text-gray-400 hover:text-emerald-600 transition-colors">My Classes</Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <Link to={`/student/class/${classId}`} className="text-xs text-gray-400 hover:text-emerald-600 transition-colors">Class</Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <Link to={`/student/class/${classId}/topic/${topicId}`} className="text-xs text-gray-400 hover:text-emerald-600 transition-colors">Topic</Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-xs text-gray-700 font-semibold truncate max-w-xs">{lessonData?.title || 'Lesson'}</span>
        </div>

        {/* 3-column body */}
        <div className="flex flex-1 overflow-hidden relative">

          {/* Mobile panel toggle buttons */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 lg:hidden">
            <button onClick={() => { setShowSources(!showSources); setShowInfo(false) }}
              className={`px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all ${
                showSources ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700 border border-gray-200'
              }`}>
              Sources
            </button>
            <button onClick={() => { setShowInfo(!showInfo); setShowSources(false) }}
              className={`px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all ${
                showInfo ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700 border border-gray-200'
              }`}>
              Info
            </button>
          </div>

          {/* Sources backdrop */}
          {(showSources || showInfo) && (
            <div className="fixed inset-0 bg-black/40 z-10 lg:hidden" onClick={() => { setShowSources(false); setShowInfo(false) }} />
          )}

          {/* ── LEFT: Sources / Materials with preview + RAG selection ── */}
          <div className={`
            lg:w-64 lg:shrink-0 lg:relative lg:border-r lg:bg-gray-50
            fixed inset-y-0 left-0 z-20 w-72 bg-gray-50 border-r border-gray-200
            transform transition-transform duration-300 ease-in-out
            lg:transform-none lg:flex lg:flex-col lg:overflow-hidden
            ${showSources ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">Sources</h2>
              <Paperclip className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {!hasMaterials && !hasLinks && (
                <div className="text-center py-8">
                  <Paperclip className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No materials uploaded yet.</p>
                </div>
              )}

              {/* Files — with preview buttons AND RAG selection checkbox */}
              {hasMaterials && lessonData!.materials.map(m => {
                // Get the ingestion status from the enriched materials list
                const enriched = materialsWithStatus.find(ms => ms.id === m.id)
                const status = enriched?.ingestion_status
                return (
                  <div key={m.id}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-emerald-300 hover:shadow-sm transition-all group">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${fileBg(m.file_type)}`}>
                        {fileIcon(m.file_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{m.title || m.file_name}</p>
                        <p className="text-xs text-gray-400 uppercase mt-0.5 flex items-center gap-1.5">
                          {m.file_type}{m.file_size ? ` · ${formatBytes(m.file_size)}` : ''}
                          <IngestionBadge status={status} />
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {canPreview(m.file_type) && m.file_url && (
                        <button onClick={e => { e.stopPropagation(); setViewing(m) }}
                          className="flex-1 flex items-center justify-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-1.5 rounded-lg transition-colors font-medium">
                          <Eye className="w-3 h-3" /> View
                        </button>
                      )}
                      {m.file_url && (
                        <a href={m.file_url} download={m.file_name} onClick={e => e.stopPropagation()}
                          className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 py-1.5 rounded-lg transition-colors font-medium">
                          <Download className="w-3 h-3" /> Save
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Links */}
              {hasLinks && (
                <div className="pt-1">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2 px-1">Links</p>
                  {lessonData!.links.map(l => (
                    <a key={l.id} href={l.file_path} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white rounded-xl p-3 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all mb-2 group">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <Link2 className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{l.title}</p>
                        <p className="text-xs text-gray-400 truncate">{l.file_path}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── CENTER: Chat / Practice / Quiz tabs ───────────── */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 shrink-0">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                    activeTab === tab.id ? tabActive[tab.id] : tabInactive
                  }`}>
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="h-full">
                  {activeTab === 'chat' && (
                    <ChatPanel
                      lessonTitle={lessonData?.title ?? 'this lesson'}
                      lessonId={Number(lessonId)}
                      selectedMaterialIds={selectedMaterialIds}
                      focusLogId={focusLogId}
                      onPinnedChanged={() => loadPinnedLogs(Number(lessonId))}
                    />
                  )}
                  {activeTab === 'practice' && (
                    <PracticePanel
                      lessonId={Number(lessonId)}
                      lessonTitle={lessonData?.title ?? 'this lesson'}
                    />
                  )}
                  {activeTab === 'quiz' && (
                    <QuizPanel
                      lessonId={Number(lessonId)}
                      lessonTitle={lessonData?.title ?? 'this lesson'}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ── RIGHT: Lesson info / Notes ────────────────────── */}
          <div className={`
            lg:w-72 lg:shrink-0 lg:relative lg:border-l lg:bg-gray-50
            fixed inset-y-0 right-0 z-20 w-72 bg-gray-50 border-l border-gray-200
            transform transition-transform duration-300 ease-in-out
            lg:transform-none lg:flex lg:flex-col lg:overflow-hidden
            ${showInfo ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          `}>
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-700">Lesson Info</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{lessonData?.title}</h3>
                <p className="text-xs text-gray-400">{(lessonData?.materials?.length ?? 0)} file{(lessonData?.materials?.length ?? 0) !== 1 ? 's' : ''} · {(lessonData?.links?.length ?? 0)} link{(lessonData?.links?.length ?? 0) !== 1 ? 's' : ''}</p>
              </div>

              {lessonData?.content && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Teacher Notes</h4>
                  <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                    {lessonData.content.split('\n').filter(Boolean).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved AI Answers (bookmarks) */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-1.5 mb-3">
                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Saved AI Answers</h4>
                  {pinnedLogs.length > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{pinnedLogs.length}</span>
                  )}
                </div>
                {pinnedLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Tap the bookmark on any AI reply in the chat to save it here for quick review.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pinnedLogs.map(pin => (
                      <button key={pin.lesson_chat_log_id}
                        onClick={() => {
                          setActiveTab('chat')
                          // Reset then set so clicking the same item re-triggers the focus effect
                          setFocusLogId(null)
                          window.setTimeout(() => setFocusLogId(pin.lesson_chat_log_id), 50)
                        }}
                        className="w-full text-left bg-amber-50/60 hover:bg-amber-50 border border-amber-100 hover:border-amber-200 rounded-lg p-2.5 transition-colors group">
                        <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">{answerTitle(pin.response)}</p>
                        {pin.source && (
                          <p className="text-[10px] text-gray-400 mt-1">{pin.source}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">Learning Path</h4>
                <div className="space-y-2.5">
                  {[
                    { icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Study with Chat', active: activeTab === 'chat', color: 'emerald' },
                    { icon: <Dumbbell className="w-3.5 h-3.5" />,      label: 'Build Confidence in Practice', active: activeTab === 'practice', color: 'blue' },
                    { icon: <Trophy className="w-3.5 h-3.5" />,         label: 'Prove it in the Quiz', active: activeTab === 'quiz', color: 'amber' },
                  ].map((step, i) => (
                    <div key={i} className={`flex items-center gap-2.5 text-xs ${step.active ? 'opacity-100' : 'opacity-50'}`}>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        step.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                        step.color === 'blue'    ? 'bg-blue-100 text-blue-600' :
                                                   'bg-amber-100 text-amber-600'
                      }`}>
                        {step.icon}
                      </div>
                      <span className="font-medium text-gray-700">{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}