import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../components/auth/AuthContext'
import { teacherApi } from '../../lib/api'
import type { Profile } from '../../lib/supabaseTypes'
import { Send, MessageCircle, User, Plus, X, ChevronRight, GraduationCap } from 'lucide-react'

interface Contact {
  id: number | string
  name: string
  email: string
  avatar?: string
  role: string
}

export function TeacherMessages() {
  const { user } = useAuth()
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactFilter, setContactFilter] = useState<'all' | 'students' | 'teachers'>('all')
  const [pollingInterval, setPollingInterval] = useState<number | null>(null)

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  const loadConversations = async () => {
    try {
      const res = await teacherApi.getConversations()
      const conversations = res.data || []
      
      // If no conversations, load all available contacts
      if (conversations.length === 0) {
        const contactsRes = await teacherApi.getContacts()
        const data = contactsRes.data
        const allContacts: Contact[] = [
          ...(data.students || []).map((s: any) => ({ ...s, role: 'student' })),
          ...(data.teachers || []).map((t: any) => ({ ...t, role: 'teacher' })),
        ]
        setContacts(allContacts)
      } else {
        const allContacts: Contact[] = conversations.map((conv: any) => ({
          ...conv.user,
          role: conv.user.role,
        }))
        setContacts(allContacts)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      // Fallback to loading contacts
      try {
        const contactsRes = await teacherApi.getContacts()
        const data = contactsRes.data
        const allContacts: Contact[] = [
          ...(data.students || []).map((s: any) => ({ ...s, role: 'student' })),
          ...(data.teachers || []).map((t: any) => ({ ...t, role: 'teacher' })),
        ]
        setContacts(allContacts)
      } catch (contactsError) {
        console.error('Error loading contacts:', contactsError)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadChat = async (contact: Contact) => {
    setSelectedContact(contact)
    setChatMessages([])
    setShowContactPicker(false)
    await loadMessages(Number(contact.id))
  }

  const loadMessages = async (contactId: number) => {
    try {
      const res = await teacherApi.getMessages(contactId)
      setChatMessages(res.data || [])
      
      // Start polling for new messages
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      const interval = window.setInterval(async () => {
        try {
          const refreshRes = await teacherApi.getMessages(contactId)
          setChatMessages(refreshRes.data || [])
        } catch (error) {
          console.error('Error polling messages:', error)
        }
      }, 3000) // Poll every 3 seconds
      setPollingInterval(interval)
    } catch (error) {
      console.error('Error loading messages:', error)
      setChatMessages([])
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedContact || sending) return
    setSending(true)
    try {
      const res = await teacherApi.sendMessage(Number(selectedContact.id), newMessage.trim())
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
    // Contacts are already loaded from conversations
  }

  const filteredContacts = contacts.filter(c => {
    if (contactFilter === 'all') return true
    return c.role === contactFilter
  })

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
        <p className="text-gray-500">Chat with your students and colleagues.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Contact List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Contacts</h2>
            <button
              onClick={openContactPicker}
              className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
              title="New message"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {contacts.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No contacts yet</p>
                <button
                  onClick={openContactPicker}
                  className="mt-3 text-sm text-emerald-600 font-semibold hover:text-emerald-700"
                >
                  Browse contacts
                </button>
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => loadChat(contact)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                    selectedContact?.id === contact.id ? 'bg-emerald-50' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    {contact.role === 'student' ? (
                      <GraduationCap className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <User className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-900 text-sm">{contact.name}</p>
                    <p className="text-xs text-gray-500">{contact.role === 'student' ? 'Student' : 'Teacher'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  {selectedContact.role === 'student' ? (
                    <GraduationCap className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <User className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedContact.name}</p>
                  <p className="text-xs text-gray-500">{selectedContact.role === 'student' ? 'Student' : 'Teacher'}</p>
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
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Contact</h3>
                <p className="text-gray-500">Choose a student or teacher to start chatting.</p>
                <button
                  onClick={openContactPicker}
                  className="mt-4 inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Browse Contacts
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Picker Modal */}
      {showContactPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
          >
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">New Message</h2>
              <button
                onClick={() => setShowContactPicker(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setContactFilter('all')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  contactFilter === 'all'
                    ? 'text-emerald-600 border-b-2 border-emerald-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setContactFilter('students')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  contactFilter === 'students'
                    ? 'text-emerald-600 border-b-2 border-emerald-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Students
              </button>
              <button
                onClick={() => setContactFilter('teachers')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  contactFilter === 'teachers'
                    ? 'text-emerald-600 border-b-2 border-emerald-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Teachers
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-3">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No contacts available</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => loadChat(contact)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        {contact.role === 'student' ? (
                          <GraduationCap className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <User className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium text-gray-900 text-sm">{contact.name}</p>
                        <p className="text-xs text-gray-500">{contact.role === 'student' ? 'Student' : 'Teacher'}</p>
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