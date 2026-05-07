import React from 'react'
import { TrendingUp, TrendingDown, Award, Target } from 'lucide-react'
import { MOCK_STUDENTS } from '../../lib/mockData'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export function ParentMastery() {
  const childData = MOCK_STUDENTS[0]

  const mockTrendData = [
    { name: 'W1', score: 65 },
    { name: 'W2', score: 70 },
    { name: 'W3', score: 85 },
    { name: 'W4', score: 82 },
    { name: 'W5', score: 95 },
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Academic Mastery</h1>
        <p className="text-slate-600 mt-1">Detailed breakdown of {childData.name}'s performance across subjects.</p>
      </header>

      {/* Strengths & Growth Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
          <div className="flex items-center gap-2 text-emerald-700 mb-4">
            <Award className="w-5 h-5" />
            <h2 className="font-bold">Strengths</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-sm text-emerald-800">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <p>Excelling in <strong>Algebra I</strong>, specifically in Linear Equations.</p>
            </li>
            <li className="flex items-start gap-2 text-sm text-emerald-800">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <p>Consistent daily practice streak maintained for 5 days.</p>
            </li>
          </ul>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
          <div className="flex items-center gap-2 text-amber-700 mb-4">
            <Target className="w-5 h-5" />
            <h2 className="font-bold">Areas for Growth</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-sm text-amber-800">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <p>Needs more practice in <strong>Biology</strong> (Cell Structure).</p>
            </li>
            <li className="flex items-start gap-2 text-sm text-amber-800">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <p>Consider reviewing the parent teaching guide for upcoming History topics.</p>
            </li>
          </ul>
        </div>
      </div>

      {/* Subject Cards */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Subject Breakdown</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {childData.subjects.map((subject, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{subject.name}</h3>
                  <p className="text-sm text-slate-500">Target: {subject.target}%</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-slate-900">{subject.mastery}%</p>
                  <div className={`flex items-center justify-end gap-1 text-sm font-medium ${subject.mastery >= subject.target ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {subject.mastery >= subject.target ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(subject.mastery - subject.target)}% {subject.mastery >= subject.target ? 'above' : 'below'} target
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full absolute left-0 top-0 ${subject.mastery >= subject.target ? 'bg-emerald-500' : subject.mastery >= subject.target - 10 ? 'bg-accent-500' : 'bg-rose-500'}`}
                    style={{ width: `${subject.mastery}%` }}
                  />
                  <div className="h-full w-1 bg-slate-800 absolute top-0 z-10" style={{ left: `${subject.target}%` }} />
                </div>
              </div>

              <div className="h-24 mt-4">
                <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">Recent Trend</p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockTrendData}>
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={subject.mastery >= subject.target ? '#10b981' : '#6366f1'}
                      strokeWidth={3}
                      dot={{ r: 4, fill: subject.mastery >= subject.target ? '#10b981' : '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
