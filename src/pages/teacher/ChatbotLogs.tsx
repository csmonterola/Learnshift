import React, { useState } from 'react'
import { Search, AlertTriangle, CheckCircle, Clock, X, MessageSquare } from 'lucide-react'
import { MOCK_CHAT_LOGS } from '../../lib/mockData'

export function TeacherChatbotLogs() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedLog, setSelectedLog] = useState<(typeof MOCK_CHAT_LOGS)[0] | null>(null)
  const [logs, setLogs] = useState(MOCK_CHAT_LOGS)

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.student.toLowerCase().includes(searchTerm.toLowerCase()) || log.question.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: logs.length,
    flagged: logs.filter((l) => l.status === 'Flagged').length,
    reviewed: logs.filter((l) => l.status === 'Reviewed').length,
  }

  const handleStatusChange = (id: string, newStatus: string) => {
    setLogs(logs.map((l) => l.id === id ? { ...l, status: newStatus } : l))
    if (selectedLog && selectedLog.id === id) setSelectedLog({ ...selectedLog, status: newStatus })
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">AI Chatbot Logs</h1>
        <p className="text-slate-600 mt-1">Audit student interactions with the AI Tutor.</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><MessageSquare className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Queries (Today)</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-rose-600">Flagged for Review</p>
            <p className="text-2xl font-bold text-rose-700">{stats.flagged}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-emerald-600">Reviewed</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.reviewed}</p>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 shrink-0">
          <div className="flex flex-wrap gap-2">
            {['All', 'Flagged', 'Reviewed', 'OK'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === status ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 w-full sm:w-64"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4 pl-6">Student</th>
                <th className="p-4">Subject</th>
                <th className="p-4 w-1/3">Question Snippet</th>
                <th className="p-4">Time</th>
                <th className="p-4 pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} onClick={() => setSelectedLog(log)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="p-4 pl-6 font-medium text-slate-900">{log.student}</td>
                  <td className="p-4 text-sm text-slate-600">{log.subject}</td>
                  <td className="p-4 text-sm text-slate-600 truncate max-w-xs">{log.question}</td>
                  <td className="p-4 text-sm text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {log.timestamp}</td>
                  <td className="p-4 pr-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${log.status === 'Flagged' ? 'bg-rose-50 text-rose-700 border-rose-200' : log.status === 'Reviewed' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No logs found matching your criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900">Conversation Details</h3>
                <p className="text-sm text-slate-500">{selectedLog.student} • {selectedLog.subject} • {selectedLog.timestamp}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center shrink-0 font-bold text-sm">
                  {selectedLog.student.charAt(0)}
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm text-slate-700 text-sm">
                  {selectedLog.question}
                </div>
              </div>
              <div className="flex gap-4 flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl rounded-tr-none border border-indigo-100 text-indigo-900 text-sm">
                  {selectedLog.response}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Current Status:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${selectedLog.status === 'Flagged' ? 'bg-rose-50 text-rose-700 border-rose-200' : selectedLog.status === 'Reviewed' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {selectedLog.status}
                </span>
              </div>
              <div className="flex gap-2">
                {selectedLog.status === 'Flagged' && (
                  <button onClick={() => handleStatusChange(selectedLog.id, 'Reviewed')} className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl text-sm font-medium transition-colors">
                    Mark as Reviewed
                  </button>
                )}
                {selectedLog.status !== 'Flagged' && (
                  <button onClick={() => handleStatusChange(selectedLog.id, 'Flagged')} className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-xl text-sm font-medium transition-colors">
                    Flag Issue
                  </button>
                )}
                <button onClick={() => handleStatusChange(selectedLog.id, 'OK')} className="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl text-sm font-medium transition-colors">
                  Mark OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
