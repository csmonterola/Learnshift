import React, { useState, useEffect, useRef } from 'react'
import { Bot, User, Send } from 'lucide-react'
import { studentApi } from '../../lib/api'

// ── Types ──────────────────────────────────────────────────────────
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  source?: string | null
  log_id?: number | null
}

export interface ChatPanelProps {
  lessonTitle: string
  lessonId: number
  selectedMaterialIds: Set<number>
}

// ── SourceBadge ────────────────────────────────────────────────────
// Requirements 9.1–9.6: color-coded badges per source value
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

  // null, undefined, or any unrecognized value → "Unknown Source" gray badge (Req 9.6)
  if (source !== undefined) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 mt-1.5">
        Unknown Source
      </span>
    )
  }

  // No source field at all (e.g. user messages) — render nothing
  return null
}

// ── ChatPanel ──────────────────────────────────────────────────────
export default function ChatPanel({ lessonTitle, lessonId, selectedMaterialIds }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hi! I'm your AI study assistant for **${lessonTitle}**. Ask me anything about this lesson — I'll help you understand it deeply. 📚`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Requirement 9.4 & 9.5: header indicator derived synchronously from props
  const sourceIndicator =
    selectedMaterialIds.size > 0
      ? `Using ${selectedMaterialIds.size} source${selectedMaterialIds.size === 1 ? '' : 's'}`
      : 'Using all sources'

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
      // Requirement 9.4 / 4.1: include material_ids when non-empty, omit when empty
      const materialIds =
        selectedMaterialIds.size > 0 ? [...selectedMaterialIds] : undefined
      const res = await studentApi.askLessonChat(lessonId, question, materialIds)
      const { response, source, log_id } = res.data
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          source: source ?? null,
          log_id: log_id ?? null,
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
      {/* Chat header — source context indicator (Requirements 9.4, 9.5) */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-gray-700">AI Study Assistant</span>
        </div>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
          {sourceIndicator}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div
            key={m.id}
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
                    ? 'bg-emerald-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
              {/* Source badge only for assistant messages that have a source (Req 9.1–9.6) */}
              {m.role === 'assistant' && m.source !== undefined && (
                <SourceBadge source={m.source} />
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-gray-600" />
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
