import React, { useState } from 'react'
import { FilterIcon, PlayIcon, ClockIcon, CheckIcon, UserIcon } from 'lucide-react'

const stats = [
  { icon: '📚', value: '6',      label: 'Total sessions' },
  { icon: '✓',  value: '1',      label: 'Completed' },
  { icon: '▶',  value: '2',      label: 'In progress' },
  { icon: '⏱',  value: '64 mins', label: 'Total time' },
]

const filters = ['All', 'Math', 'Science', 'MAPEH']

const sessions = [
  {
    subject: 'Math',    title: "Teacher's Module 3: Division Basics",
    teacher: 'Ms. Reyes',  module: 'Module 3 of 5', duration: '8 mins',  progress: 60,  status: 'continue',
    image: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=800&auto=format&fit=crop',
  },
  {
    subject: 'Science', title: 'Photosynthesis Video Guide',
    teacher: 'Mr. Santos', module: 'Module 2 of 4', duration: '12 mins', progress: 30,  status: 'continue',
    image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop',
  },
  {
    subject: 'Math',    title: 'Multiplication Mastery Review',
    teacher: 'Ms. Reyes',  module: 'Module 2 of 5', duration: '14 mins', progress: 100, status: 'watched',
    image: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=800&auto=format&fit=crop',
  },
]

const subjectBadgeColor: Record<string, string> = {
  Math:    'bg-emerald-500 text-white',
  Science: 'bg-green-600 text-white',
  MAPEH:   'bg-blue-500 text-white',
}

export function ParentGuidedSessions() {
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = sessions.filter(
    (s) => activeFilter === 'All' || s.subject === activeFilter,
  )

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Guided Sessions</h1>
          <p className="text-gray-500">Pre-recorded modules by Marcel's teachers</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
            <FilterIcon className="w-4 h-4" />Filter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{stat.icon}</div>
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Featured hero */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 rounded-2xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${sessions[0].image})` }} />
        <div className="relative">
          <div className="inline-block bg-emerald-600 text-emerald-100 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            CONTINUE WATCHING · 8 mins
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{sessions[0].title}</h2>
          <p className="text-emerald-100 mb-4">by {sessions[0].teacher}</p>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-emerald-100 mb-2">
              <span>60% watched</span>
              <button className="text-emerald-300 hover:text-white font-medium">Resume →</button>
            </div>
            <div className="w-full h-2 bg-emerald-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
        <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg transition-colors">
          <PlayIcon className="w-8 h-8 text-white fill-white ml-1" />
        </button>
      </div>

      {/* Filter + grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase">All Sessions</h2>
          <span className="text-sm text-gray-500">{sessions.length} sessions</span>
        </div>
        <div className="flex gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {filter !== 'All' && (
                <span className="inline-block w-2 h-2 rounded-full bg-current mr-2" />
              )}
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {filtered.map((session, i) => (
          <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="relative aspect-video bg-gray-900">
              <img src={session.image} alt={session.title} className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${subjectBadgeColor[session.subject] ?? 'bg-gray-500 text-white'}`}>
                  {session.subject}
                </span>
                {session.status === 'watched' && (
                  <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckIcon className="w-3 h-3" />WATCHED
                  </span>
                )}
              </div>
              <div className="absolute top-3 right-3 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />{session.duration}
              </div>
              <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg transition-colors">
                <PlayIcon className="w-6 h-6 text-gray-900 fill-gray-900 ml-1" />
              </button>
            </div>

            <div className="p-5">
              <div className="text-xs font-semibold text-emerald-600 mb-2">{session.module}</div>
              <h3 className="font-bold mb-2 line-clamp-2">{session.title}</h3>
              <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                <UserIcon className="w-3 h-3" />{session.teacher}
              </p>
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{session.progress}% watched</span>
                  <span className={`font-semibold ${
                    session.progress === 100 ? 'text-emerald-600' :
                    session.progress >= 50  ? 'text-amber-600' : 'text-gray-600'
                  }`}>{session.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      session.progress === 100 ? 'bg-emerald-500' :
                      session.progress >= 50  ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                    style={{ width: `${session.progress}%` }}
                  />
                </div>
              </div>
              <button className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
                session.status === 'watched'
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}>
                <span className="flex items-center justify-center gap-2">
                  <PlayIcon className="w-4 h-4" />
                  {session.status === 'watched' ? 'Rewatch →' : 'Continue →'}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
