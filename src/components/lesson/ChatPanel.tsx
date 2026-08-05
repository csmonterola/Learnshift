import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User, Send, ShieldCheck, ShieldAlert, Eye, FileEdit, Loader2, X, Maximize2, Bookmark } from 'lucide-react'
import { studentApi } from '../../lib/api'

// ── Types ──────────────────────────────────────────────────────────
interface ChatImage {
  id: number
  url: string
  caption: string
  page_number: number | null
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  source?: string | null
  log_id?: number | null
  status?: string | null
  teacher_note?: string | null
  teacher_corrected_response?: string | null
  reviewer_name?: string | null
  images?: ChatImage[]
}

interface ChatLogEntry {
  id: number
  student_id: number
  lesson_id: number
  question: string
  response: string
  source: string
  status: string
  teacher_note: string | null
  teacher_corrected_response: string | null
  material_image_ids: number[] | null
  created_at: string
  reviewer?: { id: number; name: string } | null
}

export interface ChatPanelProps {
  lessonTitle: string
  lessonId: number
  selectedMaterialIds: Set<number>
}

// ── SourceBadge ────────────────────────────────────────────────────
function SourceBadge({ source }: { source?: string | null }) {
  if (source === 'lesson_materials') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 mt-1.5">
        Lesson Material
      </span>
    )
  }

  if (source === 'mixed') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 mt-1.5">
        Mixed Sources
      </span>
    )
  }

  if (source === 'general') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 mt-1.5">
        General Knowledge
      </span>
    )
  }

  if (source !== undefined) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 mt-1.5">
        Unknown Source
      </span>
    )
  }

  return null
}

// ── TeacherReviewBadge ────────────────────────────────────────────
function TeacherReviewBadge({ status, teacherNote, reviewerName, hasCorrection }: {
  status?: string | null
  teacherNote?: string | null
  reviewerName?: string | null
  hasCorrection?: boolean
}) {
  if (!status || status === 'ok') return null

  let icon, bgColor, textColor, label

  switch (status) {
    case 'verified':
      icon = <ShieldCheck size={12} />
      bgColor = 'bg-emerald-50 border-emerald-200'
      textColor = 'text-emerald-700'
      label = 'Verified by Teacher'
      break
    case 'flagged':
      icon = <ShieldAlert size={12} />
      bgColor = 'bg-red-50 border-red-200'
      textColor = 'text-red-700'
      label = 'Flagged by Teacher'
      break
    case 'reviewed':
      icon = <Eye size={12} />
      bgColor = 'bg-blue-50 border-blue-200'
      textColor = 'text-blue-700'
      label = 'Reviewed by Teacher'
      break
    default:
      return null
  }

  return (
    <div className={`mt-3 ${bgColor} border rounded-lg p-3 space-y-1.5`}>
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${textColor}`}>
        {icon} {label}
        {hasCorrection && (
          <span className="ml-1 px-1 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold">EDITED</span>
        )}
        {reviewerName && <span className="font-normal text-gray-500">· {reviewerName}</span>}
      </div>
      {teacherNote && (
        <p className="text-xs text-gray-600 leading-relaxed">{teacherNote}</p>
      )}
    </div>
  )
}

// ── InlineImageRenderer ────────────────────────────────────────────
// Renders the AI response markdown, detecting [Image: ID] markers
// where ID is the unique database ID of the image. This guarantees
// the exact image is shown, even when multiple images share a page.
function InlineImageRenderer({ content, images }: { content: string; images: ChatImage[] }) {
  if (!images || images.length === 0) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  }

  // Build a lookup map by image ID for O(1) matching
  const imagesById: Record<number, ChatImage> = {}
  for (const img of images) {
    if (img.url) {
      imagesById[img.id] = img
    }
  }

  // Find images by matching [Image: ID] markers (unique image DB ID)
  const parts = content.split(/(\[Image: \d+\])/g)

  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/\[Image: (\d+)\]/)
        if (match) {
          const imageId = parseInt(match[1], 10)
          const img = imagesById[imageId]
          if (img) {
            return <InlineImage key={i} image={img} />
          }
        }
        return <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>
      })}
    </>
  )
}

function InlineImage({ image, compact }: { image: ChatImage; compact?: boolean }) {
  const [lightbox, setLightbox] = useState<ChatImage | null>(null)

  return (
    <>
      <button
        onClick={() => setLightbox(image)}
        className={`group relative rounded-lg overflow-hidden border border-gray-200 hover:border-emerald-300 transition-colors ${compact ? 'shrink-0' : 'block max-w-lg my-3'}`}
        style={compact ? { width: 120, height: 90 } : undefined}
      >
        <img
          src={image.url}
          alt={image.caption || 'Lesson image'}
          className={`w-full h-full object-cover ${compact ? '' : 'max-h-64'}`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
        {image.page_number && (
          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
            p.{image.page_number}
          </span>
        )}
      </button>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-4xl max-h-full bg-white rounded-xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightbox.url}
              alt={lightbox.caption || 'Lesson image'}
              className="max-w-full max-h-[80vh] object-contain"
            />
            {lightbox.caption && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-600">{lightbox.caption}</p>
                {lightbox.page_number && (
                  <p className="text-[11px] text-gray-400 mt-1">Page {lightbox.page_number}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── ImageGallery ───────────────────────────────────────────────────
function ImageGallery({ images }: { images: ChatImage[] }) {
  const [lightbox, setLightbox] = useState<ChatImage | null>(null)

  if (!images || images.length === 0) return null

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {images.map(img => (
          <button
            key={img.id}
            onClick={() => setLightbox(img)}
            className="group relative rounded-lg overflow-hidden border border-gray-200 hover:border-emerald-300 transition-colors shrink-0"
            style={{ width: 140, height: 100 }}
          >
            <img
              src={img.url}
              alt={img.caption || 'Lesson image'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>
            {img.page_number && (
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
                p.{img.page_number}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox overlay */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-4xl max-h-full bg-white rounded-xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightbox.url}
              alt={lightbox.caption || 'Lesson image'}
              className="max-w-full max-h-[80vh] object-contain"
            />
            {lightbox.caption && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-600">{lightbox.caption}</p>
                {lightbox.page_number && (
                  <p className="text-[11px] text-gray-400 mt-1">Page {lightbox.page_number}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── ChatPanel ──────────────────────────────────────────────────────
export default function ChatPanel({ lessonTitle, lessonId, selectedMaterialIds }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hi! I'm your AI study assistant for **${lessonTitle}**. Ask me anything about this lesson — I'll help you understand it deeply.`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set())
  const [showPinned, setShowPinned] = useState(false)
  const [highlightedId, setHighlightedId] = useState<number | null>(null)
  const msgRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // Load the student's pinned AI answers for this lesson
  useEffect(() => {
    studentApi.getPinnedLessonLogs(lessonId)
      .then(res => {
        const pinned: any[] = res.data || []
        setPinnedIds(new Set(pinned.map(p => p.lesson_chat_log_id ?? p.id)))
      })
      .catch(err => console.error('Error loading pinned logs:', err))
  }, [lessonId])

  const togglePin = async (msg: ChatMessage) => {
    if (!msg.log_id) return
    const logId = msg.log_id
    const isPinned = pinnedIds.has(logId)
    try {
      if (isPinned) {
        await studentApi.unpinLessonLog(lessonId, logId)
        setPinnedIds(prev => { const next = new Set(prev); next.delete(logId); return next })
      } else {
        await studentApi.pinLessonLog(lessonId, logId)
        setPinnedIds(prev => new Set(prev).add(logId))
      }
    } catch (error) {
      console.error('Error toggling message pin:', error)
    }
  }

  const jumpToPinned = (logId: number) => {
    setShowPinned(false)
    const el = msgRefs.current[logId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedId(logId)
      window.setTimeout(() => setHighlightedId(null), 2000)
    }
  }

  // Load past chat logs from the API
  useEffect(() => {
    if (historyLoaded) return
    setHistoryLoaded(true)

    studentApi.getLessonChatLogs(lessonId)
      .then(async res => {
        const logs: ChatLogEntry[] = res.data?.data || res.data || []
        if (logs.length === 0) return

        // Collect all unique image IDs referenced across history logs
        const allImageIds: number[] = []
        for (const log of logs) {
          if (log.material_image_ids && log.material_image_ids.length > 0) {
            for (const id of log.material_image_ids) {
              if (!allImageIds.includes(id)) {
                allImageIds.push(id)
              }
            }
          }
        }

        // Fetch image metadata for all referenced images
        let imagesById: Record<number, ChatImage> = {}
        if (allImageIds.length > 0) {
          try {
            // We need to fetch image data. Since there's no bulk endpoint,
            // we'll build image URLs from the known pattern.
            // The images are stored in the public disk, accessible via URL.
            // We'll fetch them individually from the MaterialImage model
            // by making a request to get image details.
            // For now, we'll construct the image data from what we know:
            // The image URL pattern is: Storage::disk('public')->url($s3Path)
            // where s3Path = "lessons/{lessonId}/materials/{materialId}/images/{uuid}.{ext}"
            // We can't reconstruct this without the full path, so we'll
            // fetch the image data from the API.
            try {
              const imageRes = await studentApi.chatImages(lessonId, { image_ids: allImageIds })
              for (const img of imageRes.data?.images || []) {
                imagesById[img.id] = img
              }
            } catch (err) {
              console.error('Error fetching history images:', err)
            }
          } catch (err) {
            console.error('Error fetching history images:', err)
          }
        }

        const historyMessages: ChatMessage[] = []
        // Reverse so oldest appears first
        const reversed = [...logs].reverse()

        for (const log of reversed) {
          // Student question
          historyMessages.push({
            id: `hist-q-${log.id}`,
            role: 'user',
            content: log.question,
          })
          // AI response with teacher review data
          const displayResponse = log.teacher_corrected_response || log.response
          const logImageIds = log.material_image_ids || []
          const logImages: ChatImage[] = logImageIds
            .map(id => imagesById[id])
            .filter(Boolean) as ChatImage[]

          historyMessages.push({
            id: `hist-a-${log.id}`,
            role: 'assistant',
            content: displayResponse,
            source: log.source,
            log_id: log.id,
            status: log.status,
            teacher_note: log.teacher_note,
            teacher_corrected_response: log.teacher_corrected_response,
            reviewer_name: log.reviewer?.name || null,
            images: logImages.length > 0 ? logImages : undefined,
          })
        }

        setMessages(prev => {
          // Keep the welcome message, add history after it
          const welcome = prev[0]
          return [welcome, ...historyMessages]
        })
      })
      .catch(err => console.error('Error loading chat history:', err))
  }, [lessonId, historyLoaded])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sourceIndicator =
    selectedMaterialIds.size > 0
      ? `Using ${selectedMaterialIds.size} source${selectedMaterialIds.size === 1 ? '' : 's'}`
      : 'Using all sources'

  const pinnedMessages = messages.filter(
    m => m.role === 'assistant' && m.log_id && pinnedIds.has(m.log_id)
  )

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
      const materialIds =
        selectedMaterialIds.size > 0 ? [...selectedMaterialIds] : undefined
      const res = await studentApi.askLessonChat(lessonId, question, materialIds)
      const { response, source, log_id, images } = res.data
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          source: source ?? null,
          log_id: log_id ?? null,
          images: images ?? [],
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

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="relative px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-gray-700">AI Study Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {sourceIndicator}
          </span>
          <button
            onClick={() => setShowPinned(prev => !prev)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              pinnedIds.size > 0
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title="Show pinned AI answers"
          >
            <Bookmark size={13} fill={pinnedIds.size > 0 ? 'currentColor' : 'none'} />
            Pinned {pinnedIds.size > 0 ? `(${pinnedIds.size})` : ''}
          </button>
        </div>

        {/* Pinned dropdown */}
        {showPinned && (
          <div className="absolute top-full right-0 mt-1 w-80 max-h-72 bg-white rounded-xl shadow-xl border border-gray-200 z-20 overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">Saved AI answers</p>
              <button onClick={() => setShowPinned(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {pinnedMessages.length === 0 ? (
                <p className="p-4 text-xs text-gray-400 text-center">
                  No saved answers yet. Tap the bookmark on any AI reply to save it here.
                </p>
              ) : (
                pinnedMessages.map(m => (
                  <button
                    key={m.log_id}
                    onClick={() => jumpToPinned(m.log_id!)}
                    className="w-full text-left px-3 py-2.5 border-b border-gray-50 hover:bg-amber-50 transition-colors"
                  >
                    <p className="text-xs text-gray-700 line-clamp-2">{m.content}</p>
                    {m.source !== undefined && (
                      <p className="text-[10px] text-gray-400 mt-1">{m.source}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div
            key={m.id}
            ref={(el) => { if (m.log_id) msgRefs.current[m.log_id] = el }}
          >
            <div
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>
              )}
              <div className="flex flex-col items-start max-w-[80%]">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-500 text-white rounded-br-sm prose prose-sm prose-invert-thread max-w-none'
                      : `bg-gray-100 text-gray-800 rounded-bl-sm prose prose-sm max-w-none ${highlightedId === m.log_id ? 'ring-2 ring-amber-400' : ''}`
                  }`}
                >
                  {m.role === 'assistant' && m.images && m.images.length > 0 ? (
                    <InlineImageRenderer content={m.content} images={m.images} />
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  )}
                </div>
                {/* Source badge + pin button for assistant messages */}
                {m.role === 'assistant' && (
                  <div className="mt-1.5 flex items-center gap-2">
                    {m.source !== undefined && <SourceBadge source={m.source} />}
                    {m.log_id && (
                      <button
                        onClick={() => togglePin(m)}
                        className={`p-1 rounded transition-colors ${
                          pinnedIds.has(m.log_id)
                            ? 'text-amber-500 hover:text-amber-600'
                            : 'text-gray-300 hover:text-amber-500'
                        }`}
                        title={pinnedIds.has(m.log_id) ? 'Unpin this AI answer' : 'Pin this AI answer'}
                      >
                        <Bookmark size={14} fill={pinnedIds.has(m.log_id) ? 'currentColor' : 'none'} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>

            {/* Teacher review badge for history messages */}
            {m.role === 'assistant' && m.status && m.status !== 'ok' && (
              <div className="ml-11 max-w-[80%]">
                <TeacherReviewBadge
                  status={m.status}
                  teacherNote={m.teacher_note}
                  reviewerName={m.reviewer_name}
                  hasCorrection={!!m.teacher_corrected_response}
                />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
              {[0, 150, 300].map(d => (
                <div
                  key={d}
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Ask about this lesson..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
            style={{ maxHeight: 120, overflowY: 'auto' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Powered by Mistral AI · Ask anything about this lesson
        </p>
      </div>
    </div>
  )
}