import React, { useState, useEffect } from 'react'
import { studentParentLinkApi } from '../../lib/api'
import { User, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'

interface PendingParent {
  id: number
  name: string
  email: string
}

export function ParentLinkRequests() {
  const [requests, setRequests] = useState<PendingParent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const res = await studentParentLinkApi.pendingRequests()
      setRequests(res.data)
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (parentId: number) => {
    setActionLoading(parentId)
    setError('')
    try {
      await studentParentLinkApi.approveLink(parentId)
      setRequests((prev) => prev.filter((r) => r.id !== parentId))
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to approve.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (parentId: number) => {
    setActionLoading(parentId)
    setError('')
    try {
      await studentParentLinkApi.rejectLink(parentId)
      setRequests((prev) => prev.filter((r) => r.id !== parentId))
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to reject.')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return null
  if (requests.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-amber-900 text-sm">Parent Link Requests</h3>
        <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
          {requests.length}
        </span>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-2">{error}</div>
      )}

      <div className="space-y-2">
        {requests.map((parent) => (
          <div key={parent.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{parent.name}</div>
                <div className="text-xs text-gray-500">{parent.email}</div>
                <div className="text-xs text-amber-600 font-medium mt-0.5">Wants to link as your parent/guardian</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApprove(parent.id)}
                disabled={actionLoading === parent.id}
                className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 text-white rounded-lg transition-colors"
                title="Approve"
              >
                {actionLoading === parent.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleReject(parent.id)}
                disabled={actionLoading === parent.id}
                className="p-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 text-white rounded-lg transition-colors"
                title="Reject"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}