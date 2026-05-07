import React from 'react'
import { TeacherTopBar } from '../../components/layout/TeacherTopBar'
import {
  Bot,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Search,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  MessageSquarePlus,
} from 'lucide-react'

const logs = [
  {
    id: 1,
    student: 'Diego Reyes',
    initials: 'DR',
    color: 'bg-red-100 text-red-600',
    subject: 'Mathematics',
    topic: 'Fractions & Decimals',
    time: 'Today, 9:42 AM',
    confidence: 74,
    confidenceLabel: 'Medium',
    status: 'Needs Review',
    question: 'How do I convert a fraction like 3/8 into a decimal? I keep getting confused when I try to divide it.',
    response: 'Great question! To convert 3/8 into a decimal, you simply divide the numerator (3) by the denominator (8). So: 3 ÷ 8 = 0.375. You can verify this by multiplying 0.375 × 8, which gives you back 3. A helpful trick is to remember common fractions: 1/4 = 0.25, 1/2 = 0.5, 3/4 = 0.75. For others, long division is your reliable method.',
  },
  {
    id: 2,
    student: 'Ella Chen',
    initials: 'EC',
    color: 'bg-emerald-100 text-emerald-600',
    subject: 'Science',
    topic: 'Cell Structure',
    time: 'Today, 8:15 AM',
    confidence: 95,
    confidenceLabel: 'High',
    status: 'Verified',
    question: "What is the difference between a plant cell and an animal cell? My notes say plant cells have a cell wall but I'm not sure what that does.",
    response: 'Excellent question, Ella! The main differences are that plant cells have a rigid cell wall (which provides structural support so plants can stand tall), chloroplasts (for photosynthesis to make their own food), and a large central vacuole (for storing water). Animal cells lack these three structures. Think of the cell wall like a sturdy brick wall around a building, while an animal cell only has a flexible fence (the cell membrane).',
  },
]

export function TeacherAIMonitoring() {
  return (
    <div className="min-h-screen flex flex-col">
      <TeacherTopBar
        leftContent={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div>
              <div className="font-semibold text-slate-800 leading-tight">AI Monitoring</div>
              <div className="text-xs text-slate-500">Chatbot logs & verification</div>
            </div>
          </div>
        }
        rightContent={
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">AI Chatbot Logs & Verification</h1>
          <p className="text-slate-500 text-sm">Monitor and verify the AI Tutor's responses to your students.</p>
        </div>

        {/* KPIs */}
        <div className="flex gap-4 mb-8">
          {[
            { label: 'Total Interactions', value: '3', color: 'bg-blue-50 text-blue-500',    textColor: 'text-blue-600',    icon: ShieldCheck },
            { label: 'Verified',           value: '1', color: 'bg-emerald-50 text-emerald-500', textColor: 'text-emerald-600', icon: ShieldCheck },
            { label: 'Needs Review',       value: '1', color: 'bg-amber-50 text-amber-500',  textColor: 'text-amber-600',   icon: ShieldAlert },
            { label: 'Flagged',            value: '1', color: 'bg-red-50 text-red-500',      textColor: 'text-red-600',     icon: ShieldAlert },
          ].map((stat) => (
            <div key={stat.label} className="card px-5 py-3 flex items-center gap-4 min-w-[160px]">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                <div className={`text-xl font-bold leading-none mt-1 ${stat.textColor}`}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by student, topic, or question..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all shadow-sm"
            />
          </div>
          <button className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 flex items-center gap-2 shadow-sm hover:bg-slate-50">
            <ShieldCheck size={16} className="text-slate-400" /> All Statuses <ChevronDown size={16} />
          </button>
        </div>

        {/* Logs */}
        <div className="flex flex-col gap-6">
          {logs.map((log) => (
            <div key={log.id} className="card p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${log.color}`}>
                    {log.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.student}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase">{log.subject}</span>
                      <span className="text-slate-400 text-xs">· {log.topic}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{log.time}</div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">AI Confidence</div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${log.confidence > 80 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                          style={{ width: `${log.confidence}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${log.confidence > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {log.confidence}% {log.confidenceLabel}
                      </span>
                    </div>
                  </div>
                  <div className={`status-pill px-3 py-1.5 border ${
                    log.status === 'Verified'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {log.status === 'Verified' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                    {log.status}
                  </div>
                </div>
              </div>

              {/* Conversation */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2 ml-2">
                    <MessageSquarePlus size={12} /> Student Question
                  </div>
                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-slate-700 text-sm italic">
                    "{log.question}"
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2 ml-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                      <Bot size={12} /> AI Tutor Response
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-medium border border-emerald-100 flex items-center gap-1">
                      <Bot size={10} /> LearnShift AI
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 text-slate-700 text-sm leading-relaxed shadow-sm">
                    {log.response}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {log.status === 'Needs Review' && (
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">Rate this response:</span>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors">
                      <ThumbsUp size={14} /> Accurate
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                      <ThumbsDown size={14} /> Inaccurate
                    </button>
                  </div>
                  <button className="bg-emerald-400 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shadow-sm shadow-emerald-200">
                    <MessageSquarePlus size={16} /> Add Supplementary Note / Correct Answer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
