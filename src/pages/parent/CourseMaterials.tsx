import React, { useState } from 'react'
import {
  SearchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  BookmarkIcon,
} from 'lucide-react'

const quarters = [
  {
    id: 1, name: 'Quarter 1 – Numbers', completed: '2/4 completed',
    lessons: [
      { name: 'Place Value',       duration: '12 min', completed: true },
      { name: 'Comparing Numbers', duration: '10 min', completed: true },
      { name: 'Rounding Numbers',  duration: '14 min', completed: false },
      { name: 'Number Patterns',   duration: '',       completed: false, disabled: true },
    ],
  },
  {
    id: 2, name: 'Quarter 2 – Operations', completed: '2/5 completed',
    lessons: [
      { name: 'Addition & Subtraction',   duration: '15 min', completed: true },
      { name: 'Multiplication',           duration: '18 min', completed: true },
      { name: 'Division',                 duration: '20 min', completed: false, active: true },
      { name: 'Division with Remainders', duration: '',       completed: false, disabled: true },
      { name: 'Order of Operations',      duration: '',       completed: false, disabled: true },
    ],
  },
  { id: 3, name: 'Quarter 3 – Fractions', completed: '0/3 completed', lessons: [] },
  { id: 4, name: 'Quarter 4 – Geometry',  completed: '0/2 completed', lessons: [] },
]

const quarterColors: Record<number, string> = {
  1: 'bg-blue-100 text-blue-600',
  2: 'bg-amber-100 text-amber-600',
  3: 'bg-purple-100 text-purple-600',
  4: 'bg-pink-100 text-pink-600',
}

export function ParentCourseMaterials() {
  const [expandedQuarters, setExpandedQuarters] = useState<number[]>([1, 2])

  const toggleQuarter = (id: number) => {
    setExpandedQuarters((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id],
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Course Materials</h1>
        <p className="text-gray-500">Grade 4 · Mathematics · Marcel's curriculum</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Curriculum tree */}
        <div className="col-span-5 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-1">GRADE 4 · MATH</div>
              <h2 className="text-xl font-bold">Curriculum</h2>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              11 lessons
            </span>
          </div>

          <div className="relative mb-6">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search topics..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-2 mb-6 max-h-[600px] overflow-y-auto">
            {quarters.map((quarter) => (
              <div key={quarter.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleQuarter(quarter.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${quarterColors[quarter.id]}`}>
                    <span className="text-xs font-bold">Q{quarter.id}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-sm">{quarter.name}</div>
                    <div className="text-xs text-gray-500">{quarter.completed}</div>
                  </div>
                  {expandedQuarters.includes(quarter.id)
                    ? <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                    : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
                </button>

                {expandedQuarters.includes(quarter.id) && quarter.lessons.length > 0 && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {quarter.lessons.map((lesson, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 ${
                          (lesson as any).disabled ? 'opacity-50' : 'hover:bg-white cursor-pointer'
                        } ${(lesson as any).active ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''}`}
                      >
                        {lesson.completed
                          ? <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          : <CircleIcon className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${(lesson as any).active ? 'text-amber-900' : ''}`}>
                            {lesson.name}
                          </div>
                        </div>
                        {lesson.duration && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {lesson.duration}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Overall progress</span>
              <span className="text-sm font-bold">4 / 14</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '28%' }} />
            </div>
          </div>
        </div>

        {/* Right: Lesson detail */}
        <div className="col-span-7 bg-white rounded-xl border border-gray-200 p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <span>Grade 4</span><span>›</span>
              <span>Quarter 2 – Operations</span><span>›</span>
              <span className="font-medium text-gray-900">Division</span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                PARENT GUIDE
              </span>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full flex items-center gap-1">
                ● In Progress – Marcel
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />20 min read
              </span>
              <button className="ml-auto text-gray-400 hover:text-gray-600">
                <BookmarkIcon className="w-5 h-5" />
              </button>
            </div>

            <h1 className="text-4xl font-bold mb-2">Division</h1>
            <p className="text-gray-500">Module 3 of 5 · Mathematics · Grade 4</p>
          </div>

          {/* Info banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">i</span>
            </div>
            <div>
              <div className="font-semibold text-emerald-900 mb-1">WHAT YOUR CHILD IS LEARNING</div>
              <p className="text-sm text-emerald-800">
                Marcel is currently working on <strong>Division — Module 3</strong> in class. This guide is
                designed to help you reinforce those concepts at home with simple, hands-on activities.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">What is Division?</h2>
            <p className="text-gray-700 mb-4">
              <strong>Division is the opposite of multiplication.</strong> It splits numbers into equal
              parts or groups. When we divide, we're answering the question:{' '}
              <em>"If I share this equally, how much does each person get?"</em>
            </p>
            <p className="text-gray-700">
              For example, <strong>12 ÷ 4 = 3</strong> means:{' '}
              <em>"12 objects split equally into 4 groups gives 3 in each group."</em>{' '}
              At Grade 4, the focus is on understanding this concept through physical grouping before
              moving to written notation.
            </p>
          </div>

          {/* Vocabulary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
            <div className="font-semibold text-blue-900 mb-3">KEY VOCABULARY</div>
            <div className="space-y-2">
              {[
                { term: 'Dividend', def: 'The number being divided (e.g., 12)' },
                { term: 'Divisor',  def: 'The number you divide by (e.g., 4)' },
                { term: 'Quotient', def: 'The result / answer (e.g., 3)' },
              ].map((v) => (
                <div key={v.term} className="flex gap-2">
                  <span className="font-semibold text-blue-700">{v.term}</span>
                  <span className="text-gray-600">— {v.def}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step guide */}
          <div className="bg-gray-900 rounded-xl p-6 flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <div className="w-6 h-6 border-2 border-white rounded-full" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white mb-1">Step-by-step guide</div>
              <div className="text-sm text-gray-300">Learn the methodology</div>
            </div>
            <span className="text-xs font-semibold text-emerald-400">3 STEPS</span>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">1</span>
            </div>
            <div>
              <h3 className="font-bold mb-2">Start with a sharing story</h3>
              <p className="text-sm text-gray-600">
                Begin with a relatable scenario:{' '}
                <em>"You have 12 candies to share equally among 4 friends."</em>{' '}
                Avoid abstract notation initially — make it tangible and visual.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
