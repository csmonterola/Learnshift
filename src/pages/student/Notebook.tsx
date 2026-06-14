import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../components/auth/AuthContext'
import { lessons } from '../../lib/supabaseApi'
import type { Lesson } from '../../lib/supabaseTypes'
import { ChevronRight, BookOpen, PlayCircle, MessageCircle, ClipboardCheck, FileText, ExternalLink } from 'lucide-react'

type Tab = 'learn' | 'practice' | 'chat' | 'quiz'

export function StudentNotebook() {
  const { user } = useAuth()
  const { classId, topicId, lessonId } = useParams<{
    classId: string
    topicId: string
    lessonId: string
  }>()
  const [lessonData, setLessonData] = useState<Lesson | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('learn')
  const [loading, setLoading] = useState(true)
  const [chatMessage, setChatMessage] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'assistant', content: "Hi! I'm your AI tutor for this lesson. Ask me anything about the content!" }
  ])

  useEffect(() => {
    if (lessonId) {
      loadLesson()
    }
  }, [lessonId])

  const loadLesson = async () => {
    try {
      const data = await lessons.getById(Number(lessonId))
      setLessonData(data || null)
    } catch (error) {
      console.error('Error loading lesson:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'learn' as Tab, label: 'Learn', icon: BookOpen },
    { id: 'practice' as Tab, label: 'Practice', icon: PlayCircle },
    { id: 'chat' as Tab, label: 'Chat', icon: MessageCircle },
    { id: 'quiz' as Tab, label: 'Quiz', icon: ClipboardCheck },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link
              to={`/student/class/${classId}/topic/${topicId}/lesson/${lessonId}`}
              className="text-gray-500 hover:text-emerald-600 transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{lessonData?.title || 'Lesson'}</h1>
              <p className="text-sm text-gray-500">Notebook Learning Environment</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Learn Tab */}
        {activeTab === 'learn' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Lesson Content</h2>
            
            {lessonData?.content ? (
              <div className="prose max-w-none text-gray-700">
                {lessonData.content.split('\n').map((paragraph, i) => (
                  <p key={i} className="mb-4">{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No content available for this lesson yet.</p>
            )}

            {/* Materials */}
            {lessonData?.materials && lessonData.materials.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Materials</h3>
                <div className="space-y-3">
                  {lessonData.materials.map((material) => (
                    <a
                      key={material.id}
                      href={material.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-red-500" />
                      <span className="font-medium text-gray-900">{material.file_name}</span>
                      <span className="text-xs text-gray-500">{material.file_size}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* External Links */}
            {lessonData?.links && lessonData.links.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">External Resources</h3>
                <div className="space-y-3">
                  {lessonData.links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <ExternalLink className="w-5 h-5 text-blue-500" />
                      <span className="font-medium text-gray-900">{link.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Practice Tab */}
        {activeTab === 'practice' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Practice Activities</h2>
            <div className="text-center py-12">
              <PlayCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Practice Coming Soon</h3>
              <p className="text-gray-500">Practice activities for this lesson will be available soon.</p>
            </div>
          </motion.div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">AI Tutor Chat</h2>
              <p className="text-sm text-gray-500">Ask questions about this lesson content</p>
            </div>
            
            <div className="h-96 overflow-y-auto p-6 space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-emerald-500 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Ask a question about this lesson..."
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && chatMessage.trim()) {
                      setChatMessages([...chatMessages, { role: 'user', content: chatMessage }])
                      setChatMessage('')
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (chatMessage.trim()) {
                      setChatMessages([...chatMessages, { role: 'user', content: chatMessage }])
                      setChatMessage('')
                    }
                  }}
                  disabled={!chatMessage.trim()}
                  className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quiz Assessment</h2>
            <div className="text-center py-12">
              <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Quiz Coming Soon</h3>
              <p className="text-gray-500">A quiz for this lesson will be available soon.</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}