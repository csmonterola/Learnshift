import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../components/auth/AuthContext'
import { studentApi } from '../../lib/api'
import type { Profile } from '../../lib/supabaseTypes'
import { Send, MessageCircle, User, Plus, X, ChevronRight, Pin, Bookmark } from 'lucide-react'

export function StudentMessages() {
  const { user } = useAuth()
  const [selectedTeacher, setSelectedTeacher] = useState<Profile | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<number>>(new Set())
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  const loadConversations = async () => {
    try {
      const res = await studentApi.getConversations()
      const conversations = res.data || []
      
      // Extract pinned IDs from conversations
      const pinned = new Set<string>()
      const teacherProfiles: Profile[] = conversations.map((conv: any) => {
        if (conv.pinned) {
          pinned.add(String(conv.user.id))
        }
        return conv.user
      })
      setPinnedIds(pinned as Set<string>)
      
      // If no conversations, load all available teachers
      if (conversations.length === 0) {
        const teachersRes = await studentApi.getTeachers()
        setTeachers(teachersRes.data || [])
      } else {
        setTeachers(teacherProfiles)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      // Fallback to loading teachers
      try {
        const teachersRes = await studentApi.getTeachers()
        setTeachers(teachersRes.data || [])
      } catch (teacherError) {
        console.error('Error loading teachers:', teacherError)
      }
    } finally {
      setLoading(false)
    }
  }

  const togglePin = async (teacherId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const isPinned = pinnedIds.has(teacherId)
    try {
      if (isPinned) {
        await studentApi.unpinConversation(Number(teacherId))
        setPinnedIds(prev => {
          const next = new Set(prev)
          next.delete(teacherId)
          return next
        })
      } else {
        await studentApi.pinConversation(Number(teacherId))
        setPinnedIds(prev => new Set(prev).add(teacherId))
      }
      // Refresh conversations to re-sort
      await loadConversations()
    } catch (error) {
      console.error('Error tooggling pin:', error)
    }
  }

  const togglePinMessage = async (messageId: number) => {
    const isPinned = pinnedMessageIds.has(messageId)
    try {
      if (isPinned) {
        await studentApi.unpinMessage(messageId)
        setPinnedMessageIds(prev => {
          const next = new Set(prev)
          next.delete(messageId)
          return next
        })
      } else {
        await studentApi.pinMessage(messageId)
        setPinnedMessageIds(prev => new Set(prev).add(messageId))
      }
    } catch (error) {
      console.error('Error toggling message pin:', error)
    }
  }

  const loadChat = (teacher: Profile) => {
    setSelectedTeacher(teacher)
    setChatMessages([])
    setShowContactPicker(false)
  }

  // Fetch + poll messages for the selected teacher.
  // Keyed on the selected teacher, so React tears down the previous loop
  // whenever the teacher changes or the page unmounts (no orphaned polling).
  useEffect(() => {
    if (!selectedTeacher) return
    const teacherId = Number(selectedTeacher.id)
    let cancelled = false

    const fetchMessages = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await studentApi.getMessages(teacherId)
        if (cancelled) return
        setChatMessages(prev => {
          const next = res.data || []
          const prevTail = prev.length ? prev[prev.length - 1].id : null
          const nextTail = next.length ? next[next.length - 1].id : null
          return prevTail === nextTail ? prev : next
        })
      } catch (error) {
        console.error('Error polling messages:', error)
      }
    }

    const loadPinnedMessages = async () => {
      try {
        const res = await studentApi.getPinnedMessages()
        if (cancelled) return
        const pinned = res.data || []
        setPinnedMessageIds(new Set(pinned.map((m: any) => m.id)))
      } catch (error) {
        console.error('Error loading pinned messages:', error)
      }
    }

    fetchMessages()
    loadPinnedMessages()
    const interval = window.setInterval(fetchMessages, 4000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [selectedTeacher])

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedTeacher || sending) return
    setSending(true)
    try {
      const res = await studentApi.sendMessage(Number(selectedTeacher.id), newMessage.trim())
      setChatMessages(prev => [...prev, res.data])
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const openContactPicker = async () => {
    setShowContactPicker(true)
    // Teachers are already loaded from conversations
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-500">Chat with your teachers directly.</p>
        </div>
        <button
          onClick={() => setShowPinnedMessages(!showPinnedMessages)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Bookmark size={16} className={showPinnedMessages ? 'text-amber-500' : ''} />
          Pinned Messages
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Teacher List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Teachers</h2>
            <button
              onClick={openContactPicker}
              className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
              title="New message"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
              {teachers.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No teachers available</p>
                  <button
                    onClick={openContactPicker}
                    className="mt-3 text-sm text-emerald-600 font-semibold hover:text-emerald-700"
                  >
                    Browse teachers
                  </button>
                </div>
              ) : (
                teachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => loadChat(teacher)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                      selectedTeacher?.id === teacher.id ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{teacher.name}</p>
                      <p className="text-xs text-gray-500">Teacher</p>
                    </div>
                    <button
                      onClick={(e) => togglePin(String(teacher.id), e)}
                      className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                        pinnedIds.has(String(teacher.id))
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'text-gray-300 hover:text-gray-500'
                      }`}
                      title={pinnedIds.has(String(teacher.id)) ? 'Unpin conversation' : 'Pin conversation'}
                    >
                      <Pin className="w-4 h-4" fill={pinnedIds.has(String(teacher.id)) ? 'currentColor' : 'none'} />
                    </button>
                  </button>
                ))
              )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          {selectedTeacher ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedTeacher.name}</p>
                  <p className="text-xs text-gray-500">Teacher</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  chatMessages.map((msg: any, idx: number) => (
                    <div
                      key={idx}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 relative group ${
                          msg.sender_id === user?.id
                            ? 'bg-emerald-500 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs ${msg.sender_id === user?.id ? 'text-emerald-100' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {msg.sender_id !== user?.id && (
                            <button
                              onClick={() => togglePinMessage(msg.id)}
                              className={`p-1 rounded transition-colors ${
                                pinnedMessageIds.has(msg.id)
                                  ? 'text-amber-500 hover:text-amber-600'
                                  : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:text-amber-500'
                              }`}
                              title={pinnedMessageIds.has(msg.id) ? 'Unpin message' : 'Pin message'}
                            >
                              <Bookmark size={14} fill={pinnedMessageIds.has(msg.id) ? 'currentColor' : 'none'} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Teacher</h3>
                <p className="text-gray-500">Choose a teacher from the list to start chatting.</p>
                <button
                  onClick={openContactPicker}
                  className="mt-4 inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Browse Teachers
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pinned Messages Panel */}
      {showPinnedMessages && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          >
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Pinned Messages</h2>
              <button
                onClick={() => setShowPinnedMessages(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <p className="text-sm text-gray-500 mb-4">These are your saved AI responses for quick reference.</p>
              {pinnedMessageIds.size === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No pinned messages yet.</p>
                  <p className="text-sm text-gray-400 mt-1">Click the bookmark icon on any AI response to save it here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.filter((msg: any) => pinnedMessageIds.has(msg.id)).map((msg: any) => (
                    <div key={msg.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 mb-2">{msg.content}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(msg.created_at).toLocaleDateString()} at {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => togglePinMessage(msg.id)}
                          className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Unpin message"
                        >
                          <Bookmark size={16} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Contact Picker Modal */}
      {showContactPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
          >
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Select a Teacher</h2>
              <button
                onClick={() => setShowContactPicker(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              {teachers.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No teachers available</p>
                </div>
              ) : (
                <div className="space-y-1">
                    {teachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      onClick={() => loadChat(teacher)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium text-gray-900 text-sm">{teacher.name}</p>
                        <p className="text-xs text-gray-500">Teacher</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}