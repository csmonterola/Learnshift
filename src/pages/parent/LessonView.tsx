import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import { parentApi } from '../../lib/api'
import {
  ChevronRight, FileText, ExternalLink, Download, X, Eye,
  Link2, Film, Image, File, BookOpen,
  MessageCircle, Paperclip, AlertTriangle, Bot, User, Send, Loader2,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────
interface Material {
  id: number
  title: string
  file_name: string
  file_type: string
  file_url?: string
  file_path: string
  url?: string
  material_type: string
  description?: string
}

interface LessonData {
  id: number
  title: string
  content?: string
  mastery_percentage: number
  status: string
  materials: Material[]
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// ── Helpers ────────────────────────────────────────────────────────
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
  const type    = material.file_type?.toUpperCase() || material.material_type?.toUpperCase() || ''
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
            <p className="text-gray-400 text-xs uppercase">{type}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {url && (
            <a href={url} download={material.file_name}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              <Download className="w-4 h-4" /> Download
            </a>
          )}
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
        {isPdf   && url && <iframe src={`${url}#toolbar=1`} className="w-full h-full rounded-lg bg-white" title={material.title} />}
        {isImage && url && <img src={url} alt={material.title} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />}
        {isVideo && url && <video src={url} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl" />}
        {!isPdf && !isImage && !isVideo && (
          <div className="text-center text-white">
            <File className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">{material.title || material.file_name}</p>
            <p className="text-gray-400 mb-6">This file type can't be previewed in the browser.</p>
            {url && (
              <a href={url} download={material.file_name}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
                <Download className="w-5 h-5" /> Download to view
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Chat Panel ─────────────────────────────────────────────────────
function ParentChatPanel({ childId, classId, topicId, lessonId, lessonTitle }: {
  childId: number; classId: number; topicId: number; lessonId: number; lessonTitle: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hi! I'm your AI study assistant. Ask me anything about **${lessonTitle}** — I'll help you understand what your child is learning.`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const send = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: question },
    ])
    setInput('')
    setLoading(true)
    try {
      const res = await parentApi.lessonChat(childId, classId, topicId, lessonId, question)
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.data.response,
        },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Sorry, I couldn't reach the AI right now. Please try again.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-emerald-600" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-emerald-500 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}>
              {m.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2 items-end">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask about this lesson..." rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
            style={{ maxHeight: 120, overflowY: 'auto' }} />
          <button onClick={send} disabled={!input.trim() || loading}
            className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Powered by Mistral AI</p>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────
export function ParentLessonView() {
  const { childId, classId, topicId, lessonId } = useParams<{
    childId: string; classId: string; topicId: string; lessonId: string
  }>()
  const [lessonData, setLessonData] = useState<LessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<Material | null>(null)
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    if (!childId || !classId || !topicId || !lessonId) return
    parentApi.lessonDetail(Number(childId), Number(classId), Number(topicId), Number(lessonId))
      .then(res => {
        setLessonData(res.data.lesson)
      })
      .catch(err => console.error('Error loading lesson:', err?.response?.data ?? err))
      .finally(() => setLoading(false))
  }, [childId, classId, topicId, lessonId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!lessonData) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Lesson not found.
      </div>
    )
  }

  const materials = lessonData.materials || []
  const hasMaterials = materials.length > 0

  return (
    <>
      <AnimatePresence>
        {viewing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MaterialViewer material={viewing} onClose={() => setViewing(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-height layout */}
      <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6">

        {/* Top bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white shrink-0">
          <Link to="/parent/course-materials" className="text-xs text-gray-400 hover:text-emerald-600 transition-colors">Course Materials</Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-xs text-gray-700 font-semibold truncate max-w-xs">{lessonData.title}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowChat(!showChat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                showChat ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              <MessageCircle className="w-4 h-4" />
              {showChat ? 'Hide AI Chat' : 'Ask AI'}
            </button>
            <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
              lessonData.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              lessonData.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-gray-50 text-gray-600 border-gray-200'
            }`}>
              {lessonData.status.replace('_', ' ')}
            </span>
            {lessonData.mastery_percentage > 0 && (
              <span className="text-xs text-gray-500">Mastery: {lessonData.mastery_percentage}%</span>
            )}
          </div>
        </div>

        {/* 3-column body */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Materials ── */}
          <div className={`${showChat ? 'w-56' : 'w-72'} shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden transition-all duration-200`}>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">Materials</h2>
              <Paperclip className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {!hasMaterials ? (
                <div className="text-center py-8">
                  <Paperclip className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No materials available.</p>
                </div>
              ) : (
                <>
                  {materials.filter(m => m.material_type !== 'link' && m.file_type !== 'LINK').map(m => (
                    <div key={m.id}
                      className="bg-white rounded-xl p-3 border border-gray-200 hover:border-emerald-300 hover:shadow-sm transition-all group">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${fileBg(m.file_type || m.material_type)}`}>
                          {fileIcon(m.file_type || m.material_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{m.title || m.file_name}</p>
                          <p className="text-xs text-gray-400 uppercase mt-0.5">{m.file_type || m.material_type}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {canPreview(m.file_type || m.material_type) && (m.file_url || m.file_path) && (
                          <button onClick={e => { e.stopPropagation(); setViewing(m) }}
                            className="flex-1 flex items-center justify-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-1.5 rounded-lg transition-colors font-medium">
                            <Eye className="w-3 h-3" /> View
                          </button>
                        )}
                        {(m.file_url || m.file_path) && (
                          <a href={m.file_url || m.file_path} download={m.file_name} onClick={e => e.stopPropagation()}
                            className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 py-1.5 rounded-lg transition-colors font-medium">
                            <Download className="w-3 h-3" /> Save
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  {materials.filter(m => m.material_type === 'link' || m.file_type === 'LINK').length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2 px-1">Links</p>
                      {materials.filter(m => m.material_type === 'link' || m.file_type === 'LINK').map(l => (
                        <a key={l.id} href={l.url || l.file_path} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white rounded-xl p-3 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all mb-2 group">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                            <Link2 className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 truncate">{l.title}</p>
                            <p className="text-xs text-gray-400 truncate">{l.url || l.file_path}</p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── CENTER: Content or AI Chat ───────────── */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {showChat ? (
              childId && classId && topicId && lessonId ? (
                <ParentChatPanel
                  childId={Number(childId)}
                  classId={Number(classId)}
                  topicId={Number(topicId)}
                  lessonId={Number(lessonId)}
                  lessonTitle={lessonData.title}
                />
              ) : null
            ) : (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-extrabold text-gray-900">{lessonData.title}</h1>
                      <p className="text-sm text-gray-500">{materials.length} material{materials.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {lessonData.content ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Teacher Notes</h2>
                      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{lessonData.content}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Click <strong>"Ask AI"</strong> in the top bar to chat about this lesson.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Lesson Info ────────────────────── */}
          <div className={`${showChat ? 'w-56' : 'w-72'} shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden transition-all duration-200`}>
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-700">Lesson Info</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{lessonData.title}</h3>
                <p className="text-xs text-gray-500">{materials.length} material{materials.length !== 1 ? 's' : ''}</p>
              </div>

              {lessonData.mastery_percentage > 0 && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Mastery Progress</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          lessonData.mastery_percentage >= 100 ? 'bg-emerald-500' :
                          lessonData.mastery_percentage >= 70 ? 'bg-blue-500' :
                          lessonData.mastery_percentage >= 1 ? 'bg-amber-500' : 'bg-gray-300'
                        }`}
                        style={{ width: `${lessonData.mastery_percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700">{lessonData.mastery_percentage}%</span>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">AI Study Assistant</h4>
                <p className="text-xs text-emerald-600 leading-relaxed">
                  Click <strong>"Ask AI"</strong> in the top bar to ask questions about this lesson's materials.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}