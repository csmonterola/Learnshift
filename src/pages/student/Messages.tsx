import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../components/auth/AuthContext'
import { messages, profiles } from '../../lib/supabaseApi'
import type { Message, Profile } from '../../lib/supabaseTypes'
import { Send, MessageCircle, User, Clock } from 'lucide-react'

export function StudentMessages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Message[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<Profile | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  const loadConversations = async () => {
    try {
      const data = await messages.getConversations(user!.id)
      setConversations(data)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadChat = async (teacherId: string) => {
    try {
      const teacherProfile = await profiles.get(teacherId)
      setSelectedTeacher(teacherProfile || null)
      const chatData = await messages.getConversation(user!.id, teacherId)
      setChatMessages(chatData)
    } catch (error) {
      console.error('Error loading chat:', error)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedTeacher || sending) return

    setSending(true)
    try {
      await messages.send({
        sender_id: user!.id,
        receiver_id: selectedTeacher.id,
        content: newMessage.trim(),
      })
      setNewMessage('')
      // Reload chat
      const chatData = await messages.getConversation(user!.id, selectedTeacher.id)
      setChatMessages(chatData)
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  // Get unique teachers from conversations
  const uniqueTeachers = Array.from(
    new Map(
      conversations.map((msg) => {
        const teacherId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id
        const teacher = msg.sender_id === user?.id ? msg.receiver : msg.sender
        return [teacherId, teacher]
      })
    ).values()
  ).filter(Boolean) as Profile[]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Messages</h1>
        <p className="text-gray-500">Chat with your teachers directly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Teacher List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Teachers</h2>
          </div>
          <div className="overflow-y-auto">
            {uniqueTeachers.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No conversations yet</p>
              </div>
            ) : (
              uniqueTeachers.map((teacher) => (
                <button
                  key={teacher.id}
                  onClick={() => loadChat(teacher.id)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                    selectedTeacher?.id === teacher.id ? 'bg-emerald-50' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 text-sm">{teacher.name}</p>
                    <p className="text-xs text-gray-500">Teacher</p>
                  </div>
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
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                          msg.sender_id === user?.id
                            ? 'bg-emerald-500 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-emerald-100' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}