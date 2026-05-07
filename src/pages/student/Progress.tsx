import React, { useState } from 'react'
import {
  LineChart,
  Zap,
  Flame,
  CheckSquare,
  Trophy,
  Divide,
  FlaskConical,
  BookOpen,
  Medal,
  Star,
} from 'lucide-react'

export function StudentProgress() {
  const [period, setPeriod] = useState<'Week' | 'Month' | 'All time'>('Week')

  const bars = [
    { day: 'M', height: '40%', active: true },
    { day: 'T', height: '55%', active: true },
    { day: 'W', height: '30%', active: true },
    { day: 'T', height: '80%', active: true },
    { day: 'F', height: '50%', active: true },
    { day: 'S', height: '15%', active: false },
    { day: 'S', height: '5%',  active: false },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <LineChart className="w-8 h-8 text-indigo-400 fill-indigo-100" />
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">My Progress</h1>
            <p className="text-gray-500">Track your learning journey, week by week.</p>
          </div>
        </div>
        <div className="bg-white rounded-full p-1 flex shadow-sm border border-gray-100">
          {(['Week', 'Month', 'All time'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-6 py-1.5 rounded-full text-sm font-bold transition-colors ${
                period === p ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6 shadow-sm">
          <Zap className="w-6 h-6 text-orange-500 mb-4 fill-orange-500" />
          <p className="text-xs font-bold text-orange-600 tracking-wider uppercase mb-1">XP Earned</p>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">1,240</h2>
          <p className="text-xs text-gray-500">+180 this week</p>
        </div>
        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 shadow-sm">
          <Flame className="w-6 h-6 text-rose-500 mb-4 fill-rose-500" />
          <p className="text-xs font-bold text-rose-600 tracking-wider uppercase mb-1">Day Streak</p>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">7</h2>
          <p className="text-xs text-gray-500">Keep it going!</p>
        </div>
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 shadow-sm">
          <CheckSquare className="w-6 h-6 text-emerald-500 mb-4 fill-emerald-500" />
          <p className="text-xs font-bold text-emerald-600 tracking-wider uppercase mb-1">Topics Done</p>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">5</h2>
          <p className="text-xs text-gray-500">out of 12 total</p>
        </div>
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 shadow-sm">
          <Trophy className="w-6 h-6 text-indigo-500 mb-4 fill-indigo-500" />
          <p className="text-xs font-bold text-indigo-600 tracking-wider uppercase mb-1">Mastery Score</p>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">78%</h2>
          <p className="text-xs text-gray-500">Division unit</p>
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">This Week</p>
            <h2 className="text-xl font-extrabold text-gray-900">Daily Activity</h2>
          </div>
          <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
            395 XP this week
          </div>
        </div>
        <div className="flex items-end justify-between h-48 gap-4 px-4">
          {bars.map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3">
              <div
                className={`w-full rounded-t-xl ${bar.active ? 'bg-emerald-400' : 'bg-gray-200'}`}
                style={{ height: bar.height }}
              />
              <span className="text-xs font-bold text-gray-400">{bar.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subject Progress */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-extrabold text-gray-900 mb-6">Subject Progress</h2>
        <div className="space-y-6">
          {[
            { name: 'Mathematics', pct: 78, color: 'bg-emerald-400', textColor: 'text-emerald-600', icon: Divide, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', topics: '5 of 12' },
            { name: 'Science',     pct: 45, color: 'bg-indigo-500',  textColor: 'text-indigo-600',  icon: FlaskConical, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500', topics: '3 of 8' },
            { name: 'English',     pct: 60, color: 'bg-orange-500',  textColor: 'text-orange-600',  icon: BookOpen, iconBg: 'bg-orange-50', iconColor: 'text-orange-500', topics: '4 of 10' },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-6 p-4 border border-gray-100 rounded-2xl">
              <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-6 h-6 ${s.iconColor}`} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-2">
                  <h3 className="font-bold text-gray-900">{s.name}</h3>
                  <span className={`text-sm font-bold ${s.textColor}`}>{s.pct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                  <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
                </div>
                <p className="text-xs text-gray-400">{s.topics} topics completed</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-extrabold text-gray-900 mb-6">Recent Achievements</h2>
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4 bg-orange-50/50 border border-orange-200 rounded-2xl p-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Medal className="w-6 h-6 text-orange-500 fill-orange-100" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">First Mastery Check Passed!</h3>
              <p className="text-sm text-gray-500">Division Basics · 2 days ago</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-rose-50/50 border border-rose-200 rounded-2xl p-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Flame className="w-6 h-6 text-rose-500 fill-rose-100" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">7-Day Streak!</h3>
              <p className="text-sm text-gray-500">You studied every day this week · Today</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl p-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Perfect Score</h3>
              <p className="text-sm text-gray-500">Practice Arena · Division · Yesterday</p>
            </div>
          </div>
        </div>
        <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-emerald-500/20">
          Continue practicing &rarr;
        </button>
      </div>
    </div>
  )
}
