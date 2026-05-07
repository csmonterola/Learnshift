import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, MessageSquare, TrendingUp, Clock, FileText } from 'lucide-react'
import { MOCK_STUDENTS } from '../../lib/mockData'

export function TeacherStudentProfile() {
  const { id } = useParams<{ id: string }>()
  const student = MOCK_STUDENTS.find((s) => s.id === id) || MOCK_STUDENTS[0]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/teacher/classroom" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Student Profile</h1>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <img src={student.avatar} alt={student.name} className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-slate-100" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{student.name}</h2>
            <p className="text-slate-500">{student.grade} Grade • Section {student.section}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                student.status === 'Excelling' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : student.status === 'On Track' ? 'bg-accent-50 text-accent-700 border-accent-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {student.status}
              </span>
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Last active: {student.lastActive}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm">
            <Mail className="w-4 h-4" /> Message Parent
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-xl hover:bg-accent-600 transition-colors font-medium text-sm shadow-sm shadow-accent-500/20">
            <FileText className="w-4 h-4" /> View Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Subject Mastery</h3>
              <div className="text-right">
                <p className="text-sm text-slate-500">Overall</p>
                <p className="text-2xl font-bold text-accent-600">{student.mastery}%</p>
              </div>
            </div>
            <div className="space-y-6">
              {student.subjects.map((subject, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700">{subject.name}</span>
                    <span className="text-slate-500">{subject.mastery}% (Target: {subject.target}%)</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full absolute left-0 top-0 ${subject.mastery >= subject.target ? 'bg-emerald-500' : subject.mastery >= subject.target - 10 ? 'bg-accent-500' : 'bg-rose-500'}`}
                      style={{ width: `${subject.mastery}%` }}
                    />
                    <div className="h-full w-1 bg-slate-800 absolute top-0 z-10" style={{ left: `${subject.target}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {student.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className={`p-2 rounded-lg ${activity.type === 'practice' ? 'bg-accent-100 text-accent-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {activity.type === 'practice' ? <TrendingUp className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-slate-900">{activity.title}</p>
                      {activity.score && <span className="text-sm font-bold text-emerald-600">{activity.score}</span>}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> AI Tutor Usage
            </h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                <p className="text-sm text-slate-500">Questions Asked (This Week)</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">14</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                <p className="text-sm text-slate-500">Most Asked Topic</p>
                <p className="text-lg font-semibold text-indigo-700 mt-1">Linear Equations</p>
              </div>
              <Link to="/teacher/ai-logs" className="block w-full py-2 text-center text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors">
                View Chat Logs
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Teacher Notes</h3>
              <button className="text-sm text-accent-600 hover:text-accent-700 font-medium">Edit</button>
            </div>
            <textarea
              className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 resize-none"
              placeholder="Add notes about student progress, behavior, or interventions..."
              defaultValue={student.status === 'At Risk'
                ? 'Struggling with foundational algebra concepts. Recommended for after-school tutoring session on Thursdays.'
                : 'Doing well. Very engaged in class discussions.'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
