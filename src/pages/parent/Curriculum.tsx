import React, { useState } from 'react'
import { BookOpen, CheckCircle2, Circle, PlayCircle, FileText, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import { MOCK_CURRICULUM } from '../../lib/mockData'

export function ParentCurriculum() {
  const [activeQuarter, setActiveQuarter] = useState('Q1')
  const [expandedTopic, setExpandedTopic] = useState<string | null>('t3')

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
  const currentTopics = MOCK_CURRICULUM[activeQuarter as keyof typeof MOCK_CURRICULUM] || []

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Curriculum Explorer</h1>
        <p className="text-slate-600 mt-1">See what your child is learning and how to support them at home.</p>
      </header>

      {/* Quarter Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        {quarters.map((q) => (
          <button
            key={q}
            onClick={() => setActiveQuarter(q)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeQuarter === q ? 'border-accent-600 text-accent-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            Quarter {q.replace('Q', '')}
          </button>
        ))}
      </div>

      {/* Topics List */}
      <div className="space-y-4">
        {currentTopics.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
            Curriculum details for {activeQuarter} are not yet available.
          </div>
        ) : (
          currentTopics.map((topic) => {
            const isExpanded = expandedTopic === topic.id
            const isCompleted = topic.status === 'Completed'
            const isInProgress = topic.status === 'In Progress'

            return (
              <div key={topic.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
                <button
                  onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-1 rounded-full ${isCompleted ? 'text-emerald-500' : isInProgress ? 'text-accent-500' : 'text-slate-300'}`}>
                      {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{topic.title}</h3>
                      <p className="text-sm text-slate-500">{topic.lessons} Lessons • {topic.status}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="p-6 pt-0 border-t border-slate-100 bg-slate-50/50">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                      <div className="lg:col-span-2 space-y-6">
                        <div>
                          <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-accent-600" /> Lesson Overview
                          </h4>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            In this module, students learn to solve multi-step linear equations. They will practice isolating variables using inverse operations and understand how to check their work by plugging the solution back into the original equation.
                          </p>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4 text-indigo-600" /> Key Vocabulary
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {['Variable', 'Coefficient', 'Constant', 'Inverse Operation', 'Isolate'].map((word) => (
                              <span key={word} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm">{word}</span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                            <PlayCircle className="w-4 h-4 text-rose-600" /> Teacher-Led Video
                          </h4>
                          <div className="relative w-full h-48 bg-slate-800 rounded-xl overflow-hidden group cursor-pointer">
                            <img
                              src="https://images.unsplash.com/photo-1632516643720-e7f5d7d6eca8?auto=format&fit=crop&q=80&w=800"
                              alt="Video thumbnail"
                              className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <PlayCircle className="w-8 h-8 text-white" />
                              </div>
                            </div>
                            <div className="absolute bottom-3 left-3 text-white text-sm font-medium">Solving Equations (12:45)</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 h-full">
                          <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-4">
                            <Lightbulb className="w-5 h-5 text-indigo-600" /> Parent Teaching Guide
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-semibold text-indigo-800 mb-1">How to help at home:</p>
                              <ul className="text-sm text-indigo-700 space-y-2 list-disc pl-4">
                                <li>Ask them to explain their steps out loud.</li>
                                <li>Remind them that whatever they do to one side of the equation, they must do to the other.</li>
                                <li>Use real-world examples like balancing a scale.</li>
                              </ul>
                            </div>
                            <div className="pt-4 border-t border-indigo-200">
                              <p className="text-sm font-semibold text-indigo-800 mb-2">Guided Session Steps:</p>
                              <div className="space-y-2">
                                <div className="flex gap-2 text-sm text-indigo-700"><span className="font-bold">1.</span> Review the vocabulary together.</div>
                                <div className="flex gap-2 text-sm text-indigo-700"><span className="font-bold">2.</span> Watch the 12-minute video.</div>
                                <div className="flex gap-2 text-sm text-indigo-700"><span className="font-bold">3.</span> Have them complete 3 practice problems in the AI Tutor.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
