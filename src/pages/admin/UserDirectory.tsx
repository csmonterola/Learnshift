import React, { useState, useEffect } from 'react'
import { useAuth } from '../../components/auth/AuthContext'
import { adminApi } from '../../lib/api'
import {
  Users,
  Download,
  Search,
  Filter,
  GraduationCap,
  User,
  Users as UsersIcon,
  MoreHorizontal,
  Key,
  Plus,
  X,
  Loader2,
} from 'lucide-react'

interface User {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  enrollment_code?: string
  studentProfile?: {
    grade_level?: string
    section?: string
  }
}

const ROLE_FILTERS = [
  { value: '', label: 'All Users' },
  { value: 'student', label: 'Students' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'parent', label: 'Parents' },
  { value: 'admin', label: 'Admins' },
]

export function AdminUserDirectory() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  })

  useEffect(() => {
    loadUsers()
  }, [page, roleFilter])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params: any = { page }
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      params.per_page = 20

      const res = await adminApi.users(params)
      setUsers(res.data.data)
      setTotalPages(res.data.last_page)
      setTotal(res.data.total)
    } catch (err: any) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadUsers()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const openCreateModal = () => {
    setFormData({ name: '', email: '', password: '', role: 'student' })
    setEditingUser(null)
    setShowCreateModal(true)
  }

  const openEditModal = (user: User) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    })
    setEditingUser(user)
    setShowCreateModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingUser) {
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        }
        await adminApi.updateUser(editingUser.id, updateData)
      } else {
        await adminApi.createUser(formData)
      }
      setShowCreateModal(false)
      loadUsers()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Operation failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await adminApi.deleteUser(userId)
      loadUsers()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Delete failed.')
    }
  }

  const handleResetPassword = async (userId: number) => {
    const newPassword = prompt('Enter new password (min 8 characters):')
    if (!newPassword || newPassword.length < 8) {
      alert('Password must be at least 8 characters.')
      return
    }
    try {
      await adminApi.updateUser(userId, { password: newPassword })
      alert('Password reset successfully.')
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Password reset failed.')
    }
  }

  const handleExport = () => {
    alert('Export functionality would generate a CSV file with all users.')
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'student':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'teacher':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'parent':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'admin':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (role: string) => {
    switch (role) {
      case 'student':
        return 'bg-emerald-500'
      case 'teacher':
        return 'bg-blue-500'
      case 'parent':
        return 'bg-purple-500'
      case 'admin':
        return 'bg-amber-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">User Directory</h1>
            <p className="text-gray-500 text-sm">Search, filter, and manage all accounts across your institution.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Directory
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value)
            setPage(1)
          }}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
        >
          {ROLE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-sm"
        >
          Search
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>Showing <strong>{users.length}</strong> of <strong>{total}</strong> users</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-8 px-6 border-b border-gray-100">
          {ROLE_FILTERS.filter(f => f.value !== '').map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setRoleFilter(filter.value)
                setPage(1)
              }}
              className={`flex items-center gap-2 py-4 border-b-2 text-sm font-medium transition-colors ${
                roleFilter === filter.value
                  ? 'border-emerald-500 text-emerald-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {filter.value === 'student' && <GraduationCap className="w-4 h-4" />}
              {filter.value === 'teacher' && <User className="w-4 h-4" />}
              {filter.value === 'parent' && <UsersIcon className="w-4 h-4" />}
              {filter.value === 'admin' && <User className="w-4 h-4" />}
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 w-12">
                    <div className="w-4 h-4 rounded border-2 border-gray-300" />
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">NAME</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">EMAIL</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">ROLE</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">STATUS</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="w-4 h-4 rounded border-2 border-gray-300" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${getAvatarColor(u.role)} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{u.name}</p>
                          {u.studentProfile && (
                            <p className="text-xs text-gray-500">
                              {u.studentProfile.grade_level ?? ''} {u.studentProfile.section ?? ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-500">{u.email}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getRoleBadgeColor(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors border border-gray-200 bg-white"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          <Key className="w-3.5 h-3.5" />
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                  placeholder="Juan dela Cruz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                  placeholder="juan@example.com"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                    placeholder="Min. 8 characters"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}