import React, { useState, useEffect } from 'react'
import { useAuth } from '../../components/auth/AuthContext'
import api from '../../lib/api'
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Bell,
  Palette,
  Globe,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react'

type SettingsTab = 'profile' | 'password' | 'preferences'

export function AdminSettings() {
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile form
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    avatar: '',
  })

  // Password form
  const [password, setPassword] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  // Preferences form
  const [preferences, setPreferences] = useState({
    timezone: '',
    language: '',
    email_notifications: true,
    theme: 'light' as 'light' | 'dark',
  })

  useEffect(() => {
    loadSettings()
  }, [user])

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings')
      const data = res.data
      const userData = data.user || {}

      setProfile({
        name: userData.name || user?.name || '',
        email: userData.email || user?.email || '',
        avatar: userData.avatar || '',
      })

      setPreferences({
        timezone: userData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila',
        language: userData.language || 'en',
        email_notifications: userData.email_notifications !== undefined ? userData.email_notifications : true,
        theme: userData.theme || 'light',
      })
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await api.put('/settings/profile', {
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar || undefined,
      })
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      if (password.password !== password.password_confirmation) {
        setMessage({ type: 'error', text: 'Passwords do not match.' })
        setSaving(false)
        return
      }
      await api.put('/settings/password', {
        current_password: password.current_password,
        password: password.password,
        password_confirmation: password.password_confirmation,
      })
      setMessage({ type: 'success', text: 'Password changed successfully.' })
      setPassword({ current_password: '', password: '', password_confirmation: '' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to change password.' })
    } finally {
      setSaving(false)
    }
  }

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await api.put('/settings/preferences', {
        timezone: preferences.timezone,
        language: preferences.language,
        email_notifications: preferences.email_notifications,
        theme: preferences.theme,
      })
      setMessage({ type: 'success', text: 'Preferences updated successfully.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to update preferences.' })
    } finally {
      setSaving(false)
    }
  }

  const tabs: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'password', label: 'Password', icon: Lock },
    { key: 'preferences', label: 'Preferences', icon: Palette },
  ]

  const timezones = [
    'Asia/Manila',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Seoul',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Australia/Sydney',
    'Pacific/Auckland',
    'UTC',
  ]

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'fil', label: 'Filipino' },
    { value: 'es', label: 'Spanish' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/20">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your account settings and preferences.</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-600'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setMessage(null) }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                  placeholder="Juan dela Cruz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL (optional)</label>
                <input
                  type="url"
                  value={profile.avatar}
                  onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password.current_password}
                    onChange={(e) => setPassword({ ...password, current_password: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password.password}
                  onChange={(e) => setPassword({ ...password, password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                  placeholder="Min. 8 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password.password_confirmation}
                  onChange={(e) => setPassword({ ...password, password_confirmation: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                  placeholder="Re-enter new password"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <form onSubmit={handlePreferencesSubmit} className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={preferences.timezone}
                  onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    preferences.theme === 'light'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={preferences.theme === 'light'}
                      onChange={() => setPreferences({ ...preferences, theme: 'light' })}
                      className="sr-only"
                    />
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-amber-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Light</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    preferences.theme === 'dark'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={preferences.theme === 'dark'}
                      onChange={() => setPreferences({ ...preferences, theme: 'dark' })}
                      className="sr-only"
                    />
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-slate-300" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Dark</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email Notifications</p>
                    <p className="text-xs text-gray-500">Receive updates about system activity</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.email_notifications}
                    onChange={(e) => setPreferences({ ...preferences, email_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}