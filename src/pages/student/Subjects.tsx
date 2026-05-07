import React, { useState } from 'react'
import { Sigma, BookOpen, FlaskConical, MessagesSquare, Globe } from 'lucide-react'

const subjectsData = [
  {
    id: 'math',
    name: 'Math',
    subtitle: 'Numbers, Operations & Algebra',
    progress: 65,
    icon: Sigma,
    theme: {
      border: 'border-emerald-400',
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      fill: 'bg-emerald-400',
      button: 'bg-emerald-400 hover:bg-emerald-500 text-white',
      iconBg: 'bg-emerald-100 text-emerald-600',
    },
  },
  {
    id: 'english',
    name: 'English',
    subtitle: 'Reading, Writing & Grammar',
    progress: 30,
    icon: BookOpen,
    theme: {
      border: 'border-indigo-400',
      text: 'text-indigo-600',
      bg: 'bg-indigo-50',
      fill: 'bg-indigo-400',
      button: 'bg-indigo-400 hover:bg-indigo-500 text-white',
      iconBg: 'bg-indigo-100 text-indigo-600',
    },
  },
  {
    id: 'science',
    name: 'Science',
    subtitle: 'Life, Earth & Physical Science',
    progress: 10,
    icon: FlaskConical,
    theme: {
      border: 'border-orange-400',
      text: 'text-orange-600',
      bg: 'bg-orange-50',
      fill: 'bg-orange-400',
      button: 'bg-orange-400 hover:bg-orange-500 text-white',
      iconBg: 'bg-orange-100 text-orange-600',
    },
  },
  {
    id: 'filipino',
    name: 'Filipino',
    subtitle: 'Wika, Panitikan at Kultura',
    progress: 0,
    icon: MessagesSquare,
    theme: {
      border: 'border-rose-400',
      text: 'text-rose-600',
      bg: 'bg-rose-50',
      fill: 'bg-rose-400',
      button: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
      iconBg: 'bg-rose-100 text-rose-600',
    },
  },
  {
    id: 'ap',
    name: 'AP',
    subtitle: 'Araling Panlipunan',
    progress: 8,
    icon: Globe,
    theme: {
      border: 'border-sky-400',
      text: 'text-sky-600',
      bg: 'bg-sky-50',
      fill: 'bg-sky-400',
      button: 'bg-sky-400 hover:bg-sky-500 text-white',
      iconBg: 'bg-sky-100 text-sky-600',
    },
  },
]

export function StudentSubjects() {
  const [activeFilter, setActiveFilter] = useState('All subjects')
  const filters = ['All subjects', 'In progress', 'Not started', 'Completed']

  const filtered = subjectsData.filter((s) => {
    if (activeFilter === 'In progress') return s.progress > 0 && s.progress < 100
    if (activeFilter === 'Not started') return s.progress === 0
    if (activeFilter === 'Completed') return s.progress === 100
    return true
  })

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Row */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-1">
            Grade 5 · Section A
          </p>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">My Subjects</h1>
          <p className="text-gray-500">Pick up where you left off, or start something new.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white rounded-2xl p-4 min-w-[100px] text-center shadow-sm border border-emerald-100">
            <div className="text-2xl font-extrabold text-emerald-500 mb-0.5">23%</div>
            <div className="text-xs font-medium text-emerald-600/70">Overall</div>
          </div>
          <div className="bg-white rounded-2xl p-4 min-w-[100px] text-center shadow-sm border border-amber-100">
            <div className="text-2xl font-extrabold text-amber-500 mb-0.5">4</div>
            <div className="text-xs font-medium text-amber-600/70">In progress</div>
          </div>
          <div className="bg-white rounded-2xl p-4 min-w-[100px] text-center shadow-sm border border-blue-100">
            <div className="text-2xl font-extrabold text-blue-500 mb-0.5">0</div>
            <div className="text-xs font-medium text-blue-600/70">Completed</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-8">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === filter
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((subject) => {
          const Icon = subject.icon
          return (
            <div
              key={subject.id}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border-t-8 ${subject.theme.border}`}
            >
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${subject.theme.iconBg}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${subject.theme.bg} ${subject.theme.text}`}>
                    {subject.progress}%
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{subject.name}</h3>
                <p className="text-sm text-gray-500 mb-6">{subject.subtitle}</p>
                <div className="mt-auto">
                  {subject.progress > 0 ? (
                    <div className="mb-6">
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full ${subject.theme.fill}`}
                          style={{ width: `${subject.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">{subject.progress}% completed</p>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <div className="w-full h-2 bg-rose-50 rounded-full overflow-hidden mb-2" />
                      <p className="text-xs text-gray-400">Not started yet</p>
                    </div>
                  )}
                  <button className={`w-full py-3 rounded-full font-bold text-sm transition-colors ${subject.theme.button}`}>
                    {subject.progress > 0 ? 'Continue →' : 'Start →'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
