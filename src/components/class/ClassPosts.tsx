import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'
import { studentApi, teacherApi } from '../../lib/api'
import {
  Plus, Trash2, Send, MessageSquare, CalendarClock, Edit3,
  Megaphone, CheckCircle2, Clock, AlertCircle, X,
} from 'lucide-react'

interface Comment {
  id: number
  body: string
  created_at: string
  user?: { id: number; name: string; avatar?: string }
}

interface ClassPostItem {
  id: number
  class_id: number
  author_id: number
  title: string
  body: string
  status: 'draft' | 'scheduled' | 'published'
  scheduled_at?: string | null
  published_at?: string | null
  created_at: string
  updated_at: string
  comments_count?: number
  comments?: Comment[]
  author?: { id: number; name: string; avatar?: string }
}

interface ClassPostsProps {
  classId: number
  role: 'student' | 'teacher'
}

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  published: <CheckCircle2 className="w-3 h-3" />,
  scheduled: <Clock className="w-3 h-3" />,
  draft: <AlertCircle className="w-3 h-3" />,
}

export default function ClassPosts({ classId, role }: ClassPostsProps) {
  const { user } = useAuth()
  const [posts, setPosts] = useState<ClassPostItem[]>([])
  const [loading, setLoading] = useState(true)

  // Composer (teacher)
  const [showComposer, setShowComposer] = useState(false)
  const [editing, setEditing] = useState<ClassPostItem | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<'draft' | 'scheduled' | 'published'>('published')
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)

  // Comment state per post
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [submittingComment, setSubmittingComment] = useState<number | null>(null)
  const [editingComment, setEditingComment] = useState<number | null>(null)
  const [editingCommentDraft, setEditingCommentDraft] = useState('')
  const [savingComment, setSavingComment] = useState<number | null>(null)
  const [deletingComment, setDeletingComment] = useState<number | null>(null)

  const loadPosts = () => {
    setLoading(true)
    const api = role === 'teacher' ? teacherApi : studentApi
    api.getClassPosts(classId)
      .then(res => setPosts(res.data || []))
      .catch(err => console.error('Error loading posts:', err?.response?.data ?? err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPosts()
  }, [classId, role])

  const openComposer = (post?: ClassPostItem) => {
    setEditing(post ?? null)
    setTitle(post?.title ?? '')
    setBody(post?.body ?? '')
    setStatus(post?.status ?? 'published')
    setScheduledAt(post?.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : '')
    setShowComposer(true)
  }

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        status,
        scheduled_at: status === 'scheduled' && scheduledAt ? scheduledAt : null,
      }
      if (editing) {
        await teacherApi.updateClassPost(classId, editing.id, payload)
      } else {
        await teacherApi.createClassPost(classId, payload)
      }
      setShowComposer(false)
      loadPosts()
    } catch (err: any) {
      console.error('Error saving post:', err?.response?.data ?? err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (post: ClassPostItem) => {
    if (!confirm(`Delete "${post.title}"?`)) return
    try {
      await teacherApi.deleteClassPost(classId, post.id)
      setPosts(prev => prev.filter(p => p.id !== post.id))
    } catch (err: any) {
      console.error('Error deleting post:', err?.response?.data ?? err)
    }
  }

  const handleComment = async (post: ClassPostItem) => {
    const text = (commentDrafts[post.id] ?? '').trim()
    if (!text) return
    setSubmittingComment(post.id)
    try {
      const api = role === 'teacher' ? teacherApi : studentApi
      const res = await api.addClassPostComment(classId, post.id, text)
      setCommentDrafts(prev => ({ ...prev, [post.id]: '' }))
      setPosts(prev => prev.map(p => p.id === post.id
        ? { ...p, comments: [...(p.comments ?? []), res.data], comments_count: (p.comments_count ?? 0) + 1 }
        : p))
    } catch (err: any) {
      console.error('Error adding comment:', err?.response?.data ?? err)
    } finally {
      setSubmittingComment(null)
    }
  }

  const handleUpdateComment = async (post: ClassPostItem, comment: Comment) => {
    const text = editingCommentDraft.trim()
    if (!text) return
    setSavingComment(comment.id)
    try {
      const api = role === 'teacher' ? teacherApi : studentApi
      const res = await api.updateClassPostComment(classId, post.id, comment.id, text)
      setPosts(prev => prev.map(p => p.id === post.id
        ? { ...p, comments: (p.comments ?? []).map(c => c.id === comment.id ? { ...c, body: res.data.body } : c) }
        : p))
      setEditingComment(null)
      setEditingCommentDraft('')
    } catch (err: any) {
      console.error('Error updating comment:', err?.response?.data ?? err)
    } finally {
      setSavingComment(null)
    }
  }

  const handleDeleteComment = async (post: ClassPostItem, comment: Comment) => {
    if (!confirm('Delete this comment?')) return
    setDeletingComment(comment.id)
    try {
      const api = role === 'teacher' ? teacherApi : studentApi
      await api.deleteClassPostComment(classId, post.id, comment.id)
      setPosts(prev => prev.map(p => p.id === post.id
        ? {
            ...p,
            comments: (p.comments ?? []).filter(c => c.id !== comment.id),
            comments_count: Math.max(0, (p.comments_count ?? 0) - 1),
          }
        : p))
    } catch (err: any) {
      console.error('Error deleting comment:', err?.response?.data ?? err)
    } finally {
      setDeletingComment(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Teacher composer header */}
      {role === 'teacher' && (
        <div className="flex justify-end">
          <button
            onClick={() => openComposer()}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-3 rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" /> New Post
          </button>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Posts Yet</h3>
          <p className="text-gray-500">
            {role === 'teacher'
              ? 'Create an announcement to share with your class.'
              : 'Your teacher hasn\'t posted any announcements yet.'}
          </p>
        </div>
      ) : (
        posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* Post header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm">
                  {post.author?.name?.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{post.author?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-gray-400">
                    {post.created_at ? new Date(post.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {role === 'teacher' && post.status !== 'published' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[post.status]}`}>
                    {STATUS_ICONS[post.status]}
                    {post.status === 'scheduled' && post.scheduled_at
                      ? `Scheduled ${new Date(post.scheduled_at).toLocaleDateString()}`
                      : post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                  </span>
                )}
                {role === 'teacher' && (
                  <>
                    <button onClick={() => openComposer(post)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(post)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Post body */}
            <div className="px-6 pb-3">
              <h3 className="text-lg font-bold text-gray-900 mb-1">{post.title}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{post.body}</p>
            </div>

            {/* Comments */}
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mb-3">
                <MessageSquare className="w-3.5 h-3.5" />
                {post.comments_count ?? post.comments?.length ?? 0} comment{(post.comments_count ?? post.comments?.length ?? 0) !== 1 ? 's' : ''}
              </div>

              <div className="space-y-3">
                {(post.comments ?? []).map(comment => {
                  const isOwn = comment.user?.id === user?.id
                  const isEditing = editingComment === comment.id
                  return (
                    <div key={comment.id} className="flex items-start gap-3 group">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs shrink-0">
                        {comment.user?.name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">{comment.user?.name ?? 'Unknown'}</span>
                          {isOwn && (
                            <span className="text-[10px] text-emerald-600 font-semibold">You</span>
                          )}
                          {isOwn && !isEditing && (
                            <span className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingComment(comment.id); setEditingCommentDraft(comment.body) }}
                                className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                title="Edit comment"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(post, comment)}
                                disabled={deletingComment === comment.id}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingCommentDraft}
                              onChange={e => setEditingCommentDraft(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleUpdateComment(post, comment)
                                if (e.key === 'Escape') { setEditingComment(null); setEditingCommentDraft('') }
                              }}
                              autoFocus
                              className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                            <button
                              onClick={() => handleUpdateComment(post, comment)}
                              disabled={savingComment === comment.id || !editingCommentDraft.trim()}
                              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingComment(null); setEditingCommentDraft('') }}
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 break-words mt-0.5">{comment.body}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Comment box */}
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="text"
                  value={commentDrafts[post.id] ?? ''}
                  onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleComment(post)}
                  placeholder="Write a comment..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  onClick={() => handleComment(post)}
                  disabled={submittingComment === post.id || !(commentDrafts[post.id] ?? '').trim()}
                  className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  {submittingComment === post.id
                    ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        ))
      )}

      {/* ── Composer / Editor Modal (teacher) ───────────────────── */}
      <AnimatePresence>
        {role === 'teacher' && showComposer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{editing ? 'Edit Post' : 'New Post'}</h2>
                <button onClick={() => setShowComposer(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                  <input
                    type="text" value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g., Reminder: Quiz on Friday" autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Message</label>
                  <textarea
                    value={body} onChange={e => setBody(e.target.value)} rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Share an announcement with your class..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                  <div className="flex gap-2">
                    {(['published', 'scheduled', 'draft'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold border transition-colors ${
                          status === s
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {status === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <CalendarClock className="w-4 h-4" /> Schedule For
                    </label>
                    <input
                      type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowComposer(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!title.trim() || !body.trim() || saving}
                  className="flex-1 px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : editing ? 'Save Changes' : 'Publish'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
