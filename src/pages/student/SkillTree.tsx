import React, { useState } from 'react'
import {
  Divide,
  TrendingUp,
  CheckCircle2,
  Lock,
  PlayCircle,
  BookOpen,
  Zap,
  Star,
  ChevronRight,
  Trophy,
  Target,
} from 'lucide-react'

type TopicStatus = 'completed' | 'active' | 'locked'

interface Topic {
  id: string
  title: string
  description: string
  lessons: number
  quizzes: number
  xp: number
  status: TopicStatus
  progress?: number
  score?: number
}

const topics: Topic[] = [
  {
    id: 't1',
    title: 'Counting & Place Value',
    description: 'Understand how numbers are structured and how place value works up to millions.',
    lessons: 8,
    quizzes: 3,
    xp: 240,
    status: 'completed',
    score: 98,
  },
  {
    id: 't2',
    title: 'Addition & Subtraction',
    description: 'Master multi-digit operations and apply them to real-world word problems.',
    lessons: 10,
    quizzes: 4,
    xp: 300,
    status: 'completed',
    score: 91,
  },
  {
    id: 't3',
    title: 'Multiplication',
    description: 'Learn multiplication tables, area models, and multi-digit multiplication strategies.',
    lessons: 9,
    quizzes: 4,
    xp: 280,
    status: 'completed',
    score: 85,
  },
  {
    id: 't4',
    title: 'Division',
    description:
      'Explore division as the inverse of multiplication — equal groups, remainders, and multi-step word problems.',
    lessons: 10,
    quizzes: 4,
    xp: 320,
    status: 'active',
    progress: 62,
  },
  {
    id: 't5',
    title: 'Fractions',
    description: 'Identify, compare, and perform operations with fractions and mixed numbers.',
    lessons: 12,
    quizzes: 5,
    xp: 380,
    status: 'locked',
  },
  {
    id: 't6',
    title: 'Decimals & Percentages',
    description: 'Connect fractions to decimals and percentages through real-life contexts.',
    lessons: 10,
    quizzes: 4,
    xp: 320,
    status: 'locked',
  },
  {
    id: 't7',
    title: 'Geometry & Measurement',
    description: 'Calculate area, perimeter, and volume while exploring 2D and 3D shapes.',
    lessons: 11,
    quizzes: 4,
    xp: 350,
    status: 'locked',
  },
]

const completedCount = topics.filter((t) => t.status === 'completed').length
const totalXP = topics
  .filter((t) => t.status === 'completed')
  .reduce((sum, t) => sum + t.xp, 0)
const overallProgress = Math.round((completedCount / topics.length) * 100)

const tabs = ['Overview', 'Skill Tree', 'Practice', 'My Progress']

export function StudentSkillTree() {
  const [activeTab, setActiveTab] = useState('Skill Tree')
  const [selectedTopic, setSelectedTopic] = useState<Topic>(
    topics.find((t) => t.status === 'active')!,
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 font-medium flex items-center gap-1">
        <span className="hover:text-gray-700 cursor-pointer">My Subjects</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-semibold">Mathematics</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Divide className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Mathematics</h1>
              <p className="text-gray-500 text-sm font-medium mt-0.5">
                Grade 5 · {topics.length} topics · {completedCount} completed
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">{overallProgress}% overall</span>
            </div>
            <div className="bg-orange-50 border border-orange-100 px-4 py-2 rounded-xl flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span className="text-sm font-bold text-orange-600">{totalXP} XP</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-amber-600">{completedCount} done</span>
            </div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div>
          <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
            <span>Overall Progress</span>
            <span className="text-emerald-600">{completedCount} / {topics.length} topics</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          {/* Milestone markers */}
          <div className="flex justify-between mt-1.5">
            {topics.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i < completedCount ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex gap-6 items-start">
        {/* Left: Topic Timeline */}
        <div className="flex-1 space-y-0 relative">
          {/* Legend */}
          <div className="flex gap-5 mb-6 text-xs font-semibold text-gray-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Completed
            </div>
            <div className="flex items-center gap-1.5">
              <PlayCircle className="w-3.5 h-3.5 text-emerald-500" /> In Progress
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-gray-300" /> Locked
            </div>
          </div>

          {/* Connector line */}
          <div className="absolute left-[22px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-emerald-400 via-emerald-300 to-gray-200 z-0" />

          <div className="space-y-4">
            {topics.map((topic, idx) => {
              const isSelected = selectedTopic.id === topic.id
              const isCompleted = topic.status === 'completed'
              const isActive = topic.status === 'active'
              const isLocked = topic.status === 'locked'

              return (
                <div
                  key={topic.id}
                  className="relative z-10 flex items-start gap-4"
                  onClick={() => !isLocked && setSelectedTopic(topic)}
                >
                  {/* Node icon */}
                  <div className="shrink-0 mt-4">
                    {isCompleted && (
                      <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {isActive && (
                      <div className="w-11 h-11 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/10">
                        <PlayCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                    )}
                    {isLocked && (
                      <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Card */}
                  <div
                    className={`flex-1 rounded-2xl transition-all cursor-pointer ${
                      isLocked
                        ? 'opacity-45 cursor-default'
                        : isSelected
                        ? 'ring-2 ring-emerald-400 ring-offset-2'
                        : 'hover:shadow-md'
                    } ${
                      isActive
                        ? 'bg-white border-2 border-emerald-400 shadow-lg shadow-emerald-500/10 p-6'
                        : isCompleted
                        ? 'bg-emerald-50/60 border border-emerald-200 p-5'
                        : 'bg-white border border-gray-100 p-5'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Topic {idx + 1}
                          </span>
                          {isCompleted && topic.score && (
                            <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {topic.score}%
                            </span>
                          )}
                        </div>
                        <h3
                          className={`font-extrabold mb-1 ${
                            isActive ? 'text-lg text-gray-900' : 'text-base text-gray-800'
                          }`}
                        >
                          {topic.title}
                        </h3>
                        {(isActive || isSelected) && (
                          <p className="text-sm text-gray-500 leading-relaxed mb-4">
                            {topic.description}
                          </p>
                        )}

                        {/* Meta row */}
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {topic.lessons} lessons
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3.5 h-3.5" />
                            {topic.quizzes} quizzes
                          </span>
                          <span className="flex items-center gap-1 text-orange-500 font-bold">
                            <Zap className="w-3.5 h-3.5 fill-orange-400" />
                            +{topic.xp} XP
                          </span>
                        </div>
                      </div>

                      {/* Right badge / action */}
                      <div className="shrink-0">
                        {isCompleted && (
                          <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </div>
                        )}
                        {isActive && (
                          <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">
                            In Progress
                          </div>
                        )}
                        {isLocked && (
                          <div className="bg-gray-100 text-gray-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active progress bar */}
                    {isActive && topic.progress !== undefined && (
                      <div className="mt-5">
                        <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                          <span>Progress</span>
                          <span className="text-emerald-600">{topic.progress}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-sm"
                            style={{ width: `${topic.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                          <span>6 of 10 lessons done</span>
                          <span>4 remaining</span>
                        </div>
                        <button className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-full text-sm transition-colors shadow-lg shadow-emerald-500/25 flex items-center gap-2">
                          Continue <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Completed score bar */}
                    {isCompleted && (
                      <div className="mt-3 w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${topic.score ?? 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Detail Card */}
        <div className="w-[320px] shrink-0 sticky top-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Card header gradient */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-100 mb-2">
                Mathematics · Skill Tree
              </div>
              <h2 className="text-xl font-extrabold mb-1">{selectedTopic.title}</h2>
              <p className="text-emerald-100 text-sm leading-relaxed">{selectedTopic.description}</p>
            </div>

            <div className="p-6">
              {/* Circular progress */}
              <div className="flex justify-center mb-6">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="9" />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={selectedTopic.status === 'locked' ? '#e5e7eb' : '#10b981'}
                      strokeWidth="9"
                      strokeDasharray="264"
                      strokeDashoffset={
                        selectedTopic.status === 'completed'
                          ? 0
                          : selectedTopic.status === 'active'
                          ? 264 - 264 * ((selectedTopic.progress ?? 0) / 100)
                          : 264
                      }
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-extrabold text-gray-900">
                      {selectedTopic.status === 'completed'
                        ? '100%'
                        : selectedTopic.status === 'active'
                        ? `${selectedTopic.progress}%`
                        : '0%'}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                      complete
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <div className="text-lg font-extrabold text-gray-900">{selectedTopic.lessons}</div>
                  <div className="text-[10px] text-gray-400 font-medium mt-0.5">Lessons</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <div className="text-lg font-extrabold text-gray-900">{selectedTopic.quizzes}</div>
                  <div className="text-[10px] text-gray-400 font-medium mt-0.5">Quizzes</div>
                </div>
                <div className="bg-orange-50 rounded-2xl p-3 text-center">
                  <div className="text-lg font-extrabold text-orange-500">+{selectedTopic.xp}</div>
                  <div className="text-[10px] text-orange-400 font-medium mt-0.5">XP</div>
                </div>
              </div>

              {/* Score if completed */}
              {selectedTopic.status === 'completed' && selectedTopic.score && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Best Score</p>
                    <p className="text-xl font-extrabold text-emerald-600">{selectedTopic.score}%</p>
                  </div>
                </div>
              )}

              {/* CTA */}
              {selectedTopic.status === 'active' && (
                <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                  Keep going <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {selectedTopic.status === 'completed' && (
                <button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2">
                  Review Topic <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {selectedTopic.status === 'locked' && (
                <button
                  disabled
                  className="w-full bg-gray-100 text-gray-400 font-bold py-3.5 rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" /> Complete previous topic
                </button>
              )}

              {selectedTopic.status === 'active' && (
                <p className="text-center text-xs text-gray-400 font-medium mt-3">
                  6 of {selectedTopic.lessons} lessons finished
                </p>
              )}
            </div>
          </div>

          {/* XP summary card */}
          <div className="mt-4 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">XP Earned</p>
                <p className="text-xl font-extrabold text-gray-900">{totalXP} XP</p>
              </div>
            </div>
            <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                style={{ width: `${(totalXP / topics.reduce((s, t) => s + t.xp, 0)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-orange-600 font-medium mt-2">
              {topics.reduce((s, t) => s + t.xp, 0) - totalXP} XP left to earn in this subject
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
