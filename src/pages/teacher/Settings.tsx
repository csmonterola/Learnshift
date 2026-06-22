import React, { useState, useEffect } from 'react'
import { teacherApi } from '../../lib/api'
import {
  User, Mail, Lock, Bell, Palette, Globe, Shield,
  Save, Loader2, AlertTriangle, Check, Camera, Trash2,
} from 'lucide-react'

type Tab = 'general' | 'account' | 'appearance' | 'danger'

export function TeacherSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [timezone, setTimezone] = useState('Asia/Manila')
  const [language, setLanguage] = useState('en')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await teacherApi.getSettings()
      const { user } = res.data
      setName(user.name || '')
      setEmail(user.email || '')
      setAvatar(user.avatar || '')
      setTimezone(user.timezone || 'Asia/Manila')
      setLanguage(user.language || 'en')
      setEmailNotifications(user.email_notifications ?? true)
      setTheme(user.theme || 'light')
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await teacherApi.updateProfile({ name, email, avatar })
      showMessage('success', 'Profile updated successfully!')
    } catch (err: any) {
      showMessage('error', err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showMessage('error', 'New passwords do not match.')
      return
    }
    setSaving(true)
    try {
      await teacherApi.updatePassword({ current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showMessage('success', 'Password changed successfully!')
    } catch (err: any) {
      showMessage('error', err.response?.data?.current_password?.[0] || 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await teacherApi.updatePreferences({ timezone, language, email_notifications: emailNotifications, theme })
      showMessage('success', 'Preferences saved!')
    } catch (err) {
      showMessage('error', 'Failed to save preferences.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to deactivate your account? This action cannot be undone.')) return
    setSaving(true)
    try {
      await teacherApi.deleteAccount()
      window.location.href = '/'
    } catch (err) {
      showMessage('error', 'Failed to deactivate account.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <User size={18} /> },
    { id: 'account', label: 'Account', icon: <Lock size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'danger', label: 'Danger Zone', icon: <Trash2 size={18} /> },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account settings and preferences.</p>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-48 shrink-0 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">General Information</h2>
                <p className="text-sm text-gray-500">Update your personal details and profile picture.</p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Camera size={24} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Avatar URL</label>
                  <input
                    type="url"
                    value={avatar}
                    onChange={e => setAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-64 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Change Password */}
              <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Change Password</h2>
                  <p className="text-sm text-gray-500">Update your password to keep your account secure.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                    Update Password
                  </button>
                </div>
              </form>

              {/* Notifications */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                      <Bell size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Email Notifications</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Receive email updates about your classes and students.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEmailNotifications(!emailNotifications)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      emailNotifications ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      emailNotifications ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <form onSubmit={handleSavePreferences} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Appearance</h2>
                <p className="text-sm text-gray-500">Customize how LearnShift looks for you.</p>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Theme</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'light', label: 'Light', desc: 'Clean and bright' },
                    { value: 'dark', label: 'Dark', desc: 'Easy on the eyes' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-colors ${
                        theme === opt.value
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-bold text-gray-900">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Language</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none"
                  >
                    <option value="en">English</option>
                    <option value="fil">Filipino</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Timezone</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none"
                  >
                    <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                    <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                    <option value="America/New_York">America/New_York (GMT-5)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
                    <option value="Europe/London">Europe/London (GMT+0)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                  Save Preferences
                </button>
              </div>
            </form>
          )}

          {activeTab === 'danger' && (
            <div className="bg-white rounded-2xl border border-red-200 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Danger Zone</h2>
                  <p className="text-sm text-gray-500 mt-1">Once you deactivate your account, there is no going back. Please be certain.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-red-100">
                <button
                  onClick={handleDeleteAccount}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={16} />}
                  Deactivate Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}