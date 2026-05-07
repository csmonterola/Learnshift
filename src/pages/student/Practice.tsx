import React, { useState } from 'react'
import { CheckCircle, XCircle, ChevronRight, RefreshCw, PlayCircle } from 'lucide-react'

type Difficulty = 'Easy' | 'Medium' | 'Hard'

const questions = [
  {
    id: 1,
    text: 'What is 144 ÷ 12?',
    options: ['10', '11', '12', '13'],
    correctAnswer: 2,
    explanation: '144 ÷ 12 = 12. You can verify: 12 × 12 = 144.',
  },
  {
    id: 2,
    text: 'If you share 56 apples equally among 8 friends, how many does each get?',
    options: ['6', '7', '8', '9'],
    correctAnswer: 1,
    explanation: '56 ÷ 8 = 7. Each friend gets 7 apples.',
  },
  {
    id: 3,
    text: 'What is the remainder when 29 is divided by 4?',
    options: ['0', '1', '2', '3'],
    correctAnswer: 1,
    explanation: '29 ÷ 4 = 7 remainder 1. Because 4 × 7 = 28, and 29 − 28 = 1.',
  },
]

export function StudentPractice() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium')
  const [topic, setTopic] = useState('Math')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const question = questions[currentQuestion]

  const handleSubmit = () => {
    if (selectedOption !== null) {
      if (selectedOption === question.correctAnswer) setScore((s) => s + 1)
      setIsSubmitted(true)
    }
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
      setSelectedOption(null)
      setIsSubmitted(false)
    } else {
      setFinished(true)
    }
  }

  const handleRestart = () => {
    setCurrentQuestion(0)
    setSelectedOption(null)
    setIsSubmitted(false)
    setScore(0)
    setFinished(false)
  }

  if (finished) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-4xl">🎉</span>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900">Practice Complete!</h2>
        <p className="text-gray-500 text-lg">
          You got <span className="font-bold text-emerald-600">{score}</span> out of{' '}
          <span className="font-bold">{questions.length}</span> correct.
        </p>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-emerald-50 rounded-2xl p-4 text-center">
              <div className="text-3xl font-extrabold text-emerald-600">{score}</div>
              <div className="text-xs text-emerald-600/70 font-medium mt-1">Correct</div>
            </div>
            <div className="bg-rose-50 rounded-2xl p-4 text-center">
              <div className="text-3xl font-extrabold text-rose-500">{questions.length - score}</div>
              <div className="text-xs text-rose-600/70 font-medium mt-1">Incorrect</div>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 text-center">
              <div className="text-3xl font-extrabold text-amber-500">+{score * 10}</div>
              <div className="text-xs text-amber-600/70 font-medium mt-1">XP Earned</div>
            </div>
          </div>
          <button
            onClick={handleRestart}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-emerald-500/20"
          >
            Practice Again &rarr;
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <PlayCircle className="w-8 h-8 text-emerald-500" />
            Practice Arena
          </h1>
          <p className="text-gray-500 mt-1">Sharpen your skills with targeted exercises.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer px-2"
          >
            <option>Math</option>
            <option>Science</option>
            <option>English</option>
          </select>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex gap-1">
            {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-colors ${
                  difficulty === d ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Progress bar */}
        <div className="h-2 w-full bg-gray-100">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(currentQuestion / questions.length) * 100}%` }}
          />
        </div>

        <div className="p-8 sm:p-10">
          <div className="flex justify-between items-center mb-8">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
              {difficulty}
            </span>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 mb-8 leading-relaxed">
            {question.text}
          </h2>

          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selectedOption === index
              const isCorrect = index === question.correctAnswer
              let cls =
                'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-gray-700'

              if (isSubmitted) {
                if (isCorrect) cls = 'border-emerald-500 bg-emerald-50 text-emerald-800'
                else if (isSelected) cls = 'border-red-400 bg-red-50 text-red-800'
                else cls = 'border-gray-100 opacity-40'
              } else if (isSelected) {
                cls = 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
              }

              return (
                <button
                  key={index}
                  onClick={() => !isSubmitted && setSelectedOption(index)}
                  disabled={isSubmitted}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${cls}`}
                >
                  <span className="font-semibold">{option}</span>
                  {isSubmitted && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                  {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
                </button>
              )
            })}
          </div>

          {isSubmitted && (
            <div
              className={`mt-6 p-5 rounded-2xl border ${
                selectedOption === question.correctAnswer
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <p
                className={`font-bold mb-1 ${
                  selectedOption === question.correctAnswer ? 'text-emerald-800' : 'text-red-700'
                }`}
              >
                {selectedOption === question.correctAnswer ? '✓ Correct!' : '✗ Not quite.'}
              </p>
              <p className="text-sm text-gray-600">{question.explanation}</p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={selectedOption === null}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-3 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                Check Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-8 py-3 rounded-full transition-colors flex items-center gap-2"
              >
                {currentQuestion < questions.length - 1 ? (
                  <>Next <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <>Finish <RefreshCw className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
