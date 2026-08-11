import React, { useState } from 'react'
import { MessageCircle, Trophy, Shield, Lightbulb, Send, Star } from 'lucide-react'

const topics = ['Mathematics', 'Science', 'English', 'Filipino', 'General']

export function StudentAskTeacher() {
  const [activeTopic, setActiveTopic] = useState('Mathematics')
  const [question, setQuestion] = useState('')

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <MessageCircle className="w-8 h-8 text-indigo-400 fill-indigo-100" />
          <h1 className="text-3xl font-extrabold text-gray-900">Ask Your Teacher</h1>
        </div>
        <p className="text-gray-500">Walang judgement dito. Ask away — you're anonymous.</p>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-inner">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-orange-800 tracking-wider uppercase mb-0.5">
              Mastery Check
            </p>
            <p className="font-bold text-gray-900">Ready to unlock the next topic?</p>
          </div>
        </div>
        <div className="flex gap-1 text-orange-500">
          {[0, 1, 2].map(i => <Star key={i} className="w-4 h-4 fill-orange-500" />)}
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
              Got a question?{' '}
              <span className="text-gray-400 font-medium">May tanong ka?</span>
            </h2>
            <p className="text-sm text-gray-500">
              Your teacher receives your question without knowing it's you.
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-indigo-500" />
          </div>
        </div>

        {/* Topic selector */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-sm text-gray-500 font-medium">Topic:</span>
          <div className="flex gap-2 flex-wrap">
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTopic(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                  activeTopic === t
                    ? 'border-2 border-emerald-400 text-emerald-600 bg-emerald-50'
                    : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 mb-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full bg-transparent border-none resize-none focus:ring-0 text-gray-700 placeholder-gray-400 min-h-[120px] text-sm"
            placeholder="Type your question here... e.g. 'Sir/Ma'am, ano po ang difference ng remainder at decimal?'"
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200/60">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <Shield className="w-4 h-4" /> Anonymous — your name is never shared
            </div>
            <div className="text-xs text-gray-400 font-medium">{question.length}/500</div>
          </div>
        </div>

        {/* Submit */}
        {question.trim() ? (
          <button
            onClick={() => setQuestion('')}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 mb-4"
          >
            <Send className="w-4 h-4" /> Send Question
          </button>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 flex items-center justify-center text-gray-400 font-bold gap-2 mb-4">
            <Send className="w-4 h-4" /> Write your question above
          </div>
        )}

        {/* Tip */}
        <div className="flex items-start gap-2 text-sm text-gray-500">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <span className="font-bold text-gray-700">Tip:</span> Be specific! Instead of "I don't
            get it", try "Why does 12 ÷ 0 have no answer?"
          </p>
        </div>
      </div>

      {/* My Questions */}
      <div>
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-gray-900">My Questions</h2>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">4</span>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <button className="bg-gray-900 text-white px-4 py-1 rounded-full">All</button>
            <button className="text-gray-500 hover:text-gray-900">Answered</button>
            <button className="text-gray-500 hover:text-gray-900">Pending</button>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</div>
            2 Answered
          </div>
          <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500" />
            2 Pending
          </div>
        </div>
      </div>
    </div>
  )
}
