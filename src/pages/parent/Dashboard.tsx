import React from 'react'
import { useAuth } from '../../components/auth/AuthContext'
import {
  StarIcon,
  ClockIcon,
  CalendarIcon,
  CheckSquareIcon,
  ArrowRightIcon,
} from 'lucide-react'

const stats = [
  { icon: StarIcon,        value: '77%',    label: 'Overall Mastery',       color: 'text-amber-500' },
  { icon: ClockIcon,       value: '4.5 hrs', label: 'Study hrs this week',  color: 'text-emerald-500' },
  { icon: CalendarIcon,    value: '3 / 5',  label: 'Sessions this week',    color: 'text-blue-500' },
  { icon: CheckSquareIcon, value: '2',      label: 'Assignments due',       color: 'text-purple-500' },
]

const subjects = [
  {
    name: 'Mathematics', subtitle: 'Primary Subject',
    level: 'PROFICIENT', levelColor: 'text-emerald-600 bg-emerald-50',
    color: 'emerald', percentage: 82,
    modules: '14 / 17', quizAvg: '88%', sessions: '12', lastActive: '2 hrs ago', icon: '✱',
  },
  {
    name: 'Science', subtitle: 'Core Subject',
    level: 'DEVELOPING', levelColor: 'text-amber-600 bg-amber-50',
    color: 'blue', percentage: 58,
    modules: '8 / 15', quizAvg: '61%', sessions: '7', lastActive: 'Yesterday', icon: '⚗',
  },
  {
    name: 'English', subtitle: 'Core Subject',
    level: 'ADVANCED', levelColor: 'text-purple-600 bg-purple-50',
    color: 'purple', percentage: 91,
    modules: '21 / 23', quizAvg: '94%', sessions: '18', lastActive: '3 hrs ago', icon: '📖',
  },
]

const activities = [
  { type: 'Math',    title: 'Finished: Division – Module 3',          subtitle: 'Score: 8/10',       time: '2h ago',     icon: '✓', color: 'emerald' },
  { type: 'Science', title: 'Completed: Science Ecosystems Quiz',      subtitle: 'Score: 12/15',      time: 'Yesterday',  icon: 'B', color: 'blue' },
  { type: 'English', title: 'Attended: Guided English Session',        subtitle: 'Duration: 45 min',  time: 'Yesterday',  icon: '○', color: 'purple' },
  { type: 'English', title: 'Finished: English – Reading Module 6',    subtitle: 'Score: 18/20',      time: '2 days ago', icon: '✓', color: 'purple' },
  { type: 'Science', title: 'Started: Science – Forces & Motion',      subtitle: 'Module 9 unlocked', time: '2 days ago', icon: '⚡', color: 'amber' },
  { type: 'Math',    title: 'Completed: Math Module 5 Quiz',           subtitle: 'Score: 14/15',      time: '3 days ago', icon: 'B', color: 'emerald' },
  { type: 'App',     title: 'Session started',                         subtitle: 'Duration: 1 hr 12 min', time: '3 days ago', icon: '○', color: 'gray' },
]

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-600',
  blue:    'bg-blue-100 text-blue-600',
  purple:  'bg-purple-100 text-purple-600',
  amber:   'bg-amber-100 text-amber-600',
  gray:    'bg-gray-100 text-gray-600',
}

const textColorMap: Record<string, string> = {
  emerald: 'text-emerald-600',
  blue:    'text-blue-600',
  purple:  'text-purple-600',
  amber:   'text-amber-600',
  gray:    'text-gray-600',
}

const strokeColorMap: Record<string, string> = {
  emerald: '#10b981',
  blue:    '#3b82f6',
  purple:  '#a855f7',
}

export function ParentDashboard() {
  const { user } = useAuth()

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Good morning, {user?.name} 👋</h1>
          <p className="text-gray-500">Saturday, April 18, 2026 · Here's how Marcel is progressing</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">MS</span>
          </div>
          <div>
            <div className="text-xs text-emerald-600 font-medium">Viewing Progress for</div>
            <div className="text-sm font-semibold">Maria Santos</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={stat.color}><Icon className="w-5 h-5" /></div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mastery Overview */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Academic Mastery Overview</h2>
          <p className="text-sm text-gray-500">Based on completed modules, quizzes, and sessions</p>
        </div>
        <div className="text-sm text-gray-500">Q2 - 2026</div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {subjects.map((subject, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{subject.icon}</div>
                <div>
                  <div className="font-bold">{subject.name}</div>
                  <div className="text-xs text-gray-500">{subject.subtitle}</div>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${subject.levelColor}`}>
                {subject.level}
              </span>
            </div>

            {/* Circular progress */}
            <div className="relative w-40 h-40 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                <circle
                  cx="80" cy="80" r="70" fill="none"
                  stroke={strokeColorMap[subject.color] ?? '#10b981'}
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - subject.percentage / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold">{subject.percentage}%</div>
                <div className="text-xs text-gray-400 uppercase">Mastery</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div><div className="font-bold">{subject.modules}</div><div className="text-xs text-gray-500">Modules</div></div>
              <div><div className="font-bold">{subject.quizAvg}</div><div className="text-xs text-gray-500">Quiz Avg</div></div>
              <div><div className="font-bold">{subject.sessions}</div><div className="text-xs text-gray-500">Sessions</div></div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Last active: {subject.lastActive}
              </div>
              <button className="text-xs text-emerald-600 font-medium hover:text-emerald-700">Details →</button>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-4 rounded-xl mb-8 flex items-center justify-center gap-2 transition-colors">
        <CalendarIcon className="w-5 h-5" />
        View Detailed Mastery Report
        <ArrowRightIcon className="w-4 h-4" />
      </button>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Recent Activity</h2>
            <p className="text-sm text-gray-500">Latest learning events</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600">LIVE</span>
          </div>
        </div>

        <div className="space-y-3">
          {activities.map((activity, i) => (
            <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorMap[activity.color] ?? 'bg-gray-100 text-gray-600'}`}>
                <span className="font-semibold">{activity.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm mb-0.5">{activity.title}</div>
                <div className="text-xs text-gray-500">
                  <span className={`font-medium ${textColorMap[activity.color] ?? 'text-gray-600'}`}>
                    {activity.type}
                  </span>
                  {' · '}{activity.subtitle}
                </div>
              </div>
              <div className="text-xs text-gray-400">{activity.time}</div>
            </div>
          ))}
        </div>

        <button className="w-full mt-4 text-sm text-gray-600 hover:text-gray-800 font-medium py-2">
          View Full Activity Log →
        </button>
      </div>
    </div>
  )
}
