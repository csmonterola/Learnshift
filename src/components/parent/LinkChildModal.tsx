import React, { useState } from 'react'
import { parentApi } from '../../lib/api'
import { Search, X, User, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface StudentResult {
  id: number
  name: string
  email: string
  enrollment_code: string
}

interface LinkChildModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (message: string) => void
}

export function LinkChildModal({ open, onClose, onSuccess }: LinkChildModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<StudentResult | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!open) return null

  const handleSearch = async () => {
    if (query.trim().length < 2) return
    setSearching(true)
    setError('')
    try {
      const res = await parentApi.searchStudents(query)
      setResults(res.data)
    } catch (err: any) {
      setError('Failed to search students.')
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async () => {
    if (!selected) return
    setSubmitting(true)
    setError('')
    try {
      await parentApi.linkChild(selected.id)
      setSubmitted(true)
      onSuccess(`Link request sent to ${selected.name}. They need to confirm it from their account.`)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to send link request.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setQuery('')
    setResults([])
    setSelected(null)
    setError('')
    setSubmitted(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Link a Student</h2>
            <p className="text-sm text-gray-500 mt-1">
              Search for your child/student to link accounts
            </p>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Link Request Sent!</h3>
            <p className="text-sm text-gray-500 mb-6">
              The student needs to verify this link from their account before it becomes active.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by student name or enrollment code..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={query.trim().length < 2 || searching}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 text-white disabled:text-gray-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="px-6 pb-4 max-h-60 overflow-y-auto space-y-2">
                {results.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelected(student)}
                    className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center gap-3 ${
                      selected?.id === student.id
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500">Code: {student.enrollment_code}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!searching && query.length >= 2 && results.length === 0 && (
              <div className="px-6 pb-4 text-center text-sm text-gray-400">No students found.</div>
            )}

            {/* Error */}
            {error && (
              <div className="px-6 pb-2">
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 text-white disabled:text-gray-400 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Link Request
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}