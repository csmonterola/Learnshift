import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../components/auth/AuthContext'
import { SubjectCard } from '../../components/ui/SubjectCard'
import {
  Plus,
  BookOpen,
  FlaskConical,
  Inbox,
  Clock,
  AlertCircle,
  Send,
  Flame,
  Star,
} from 'lucide-react'

const subjects = [
  { title: 'Math',     subtitle: 'Division & Fractions',        icon: Plus,        color: 'blue'    as const, progress: 62 },
  { title: 'English',  subtitle: 'Reading & Writing',           icon: BookOpen,    color: 'purple'  as const, progress: 45 },
  { title: 'Science',  subtitle: 'Plants & Animals',            icon: FlaskConical,color: 'emerald' as const, progress: 78 },
  { title: 'Filipino', subtitle: 'Talata at Wika',              icon: Inbox,       color: 'amber'   as const, progress: 55 },
  { title: 'AP',       subtitle: 'Kasaysayan ng Pilipinas',     icon: Clock,       color: 'red'     as const, progress: 33 },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export function StudentDashboard() {
  const { user } = useAuth()
  const [question, setQuestion] = useState('')

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Hero Section */}
      <motion.section
        variants={itemVariants}
        className="relative bg-gradient-to-r from-emerald-800 to-emerald-600 rounded-[32px] p-8 lg:p-10 overflow-hidden shadow-sm"
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 blur-xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-white tracking-wide">
              <span>📚</span> CURRENT LESSON
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Flame className="w-4 h-4 text-orange-300" />
                <span className="text-xs font-bold text-white">5 Days</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 text-yellow-300" />
                <span className="text-xs font-bold text-white">1,240 XP</span>
              </div>
              <button className="bg-white text-gray-900 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors shadow-sm">
                Continue &rarr;
              </button>
            </div>
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-2">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-emerald-100 font-medium mb-10">
            Math · Chapter 4 · 8 activities remaining
          </p>

          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-emerald-50">Your progress</span>
              <span className="text-sm font-bold text-white">62%</span>
            </div>
            <div className="w-full h-2.5 bg-emerald-900/40 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full w-[62%] shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
            </div>
          </div>
        </div>
      </motion.section>

      {/* My Subjects Grid */}
      <motion.section variants={itemVariants}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Subjects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {subjects.map((subject, idx) => (
            <SubjectCard key={idx} {...subject} />
          ))}
        </div>
      </motion.section>

      {/* Bottom Row */}
      <motion.section
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8"
      >
        {/* My Progress Card */}
        <div className="bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">My Progress</h2>
            <button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
              View all &rarr;
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-blue-600 mb-1">14</span>
              <span className="text-xs font-medium text-blue-600/70 leading-tight">Lessons<br />Completed</span>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-emerald-600 mb-1">6</span>
              <span className="text-xs font-medium text-emerald-600/70 leading-tight">Activities<br />This Week</span>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-amber-500 mb-1">22</span>
              <span className="text-xs font-medium text-amber-600/70 leading-tight">Total<br />Points</span>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Math',    progress: 62, color: 'bg-blue-500' },
              { label: 'Science', progress: 78, color: 'bg-emerald-500' },
              { label: 'English', progress: 45, color: 'bg-purple-500' },
            ].map((stat, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-500 w-16">{stat.label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${stat.color}`} style={{ width: `${stat.progress}%` }} />
                </div>
                <span className="text-sm font-bold text-blue-600 w-8 text-right">{stat.progress}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ask Anonymously Card */}
        <div className="bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">Ask Anonymously</h2>
                <p className="text-xs text-gray-400">Your teacher won't know it's you</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-700">Online</span>
            </div>
          </div>

          <div className="flex-1 bg-gray-50 rounded-2xl p-5 mb-4 min-h-[120px] flex flex-col justify-end">
            <div className="bg-white p-3.5 rounded-2xl rounded-tl-sm shadow-sm text-sm text-gray-700 inline-block self-start max-w-[90%] border border-gray-100">
              Hello! Feel free to ask me anything. Your identity is kept private. 🤫
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your question..."
              className="w-full bg-white border border-gray-200 rounded-xl py-3.5 pl-4 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            <button className="absolute right-1.5 top-1.5 bottom-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 rounded-lg transition-colors flex items-center gap-1">
              Send <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.section>
    </motion.div>
  )
}
