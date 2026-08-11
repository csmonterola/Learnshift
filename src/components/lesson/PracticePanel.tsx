import React, { useState, useEffect, useRef } from 'react'
import { Dumbbell, CheckCircle, AlertCircle, RefreshCw, Loader2, Sparkles } from 'lucide-react'
import { studentApi } from '../../lib/api'

// ── Types ──────────────────────────────────────────────────────────
interface GeneratedQuestion {
  index: number
  question: string
  options: string[]
  correct_index: number
  explanation: string
  difficulty: string
  image_url?: string | null
  option_image_urls?: (string | null)[] | null
}

interface PracticeFeedback {
  question_index: number
  is_correct: boolean
  correct_index: number
  explanation: string | null
}

interface PracticePanelProps {
  lessonId: number
  lessonTitle: string
}

// ── Difficulty Badge ───────────────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    hard:   'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors[difficulty] ?? colors.medium}`}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  )
}

// ── PracticePanel ──────────────────────────────────────────────────
export default function PracticePanel({ lessonId, lessonTitle }: PracticePanelProps) {
  const [questions, setQuestions]     = useState<GeneratedQuestion[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [current, setCurrent]         = useState(0)
  const [selected, setSelected]       = useState<number | null>(null)
  const [checked, setChecked]         = useState(false)
  const [score, setScore]             = useState(0)
  const [finished, setFinished]       = useState(false)
  const [feedback, setFeedback]       = useState<PracticeFeedback[]>([])
  const [answers, setAnswers]         = useState<Record<number, number>>({})

  // Track when the practice session started so we can persist time_spent_seconds
  // for the learning profile's pacing trait.
  const startTimeRef = useRef<number | null>(null)

  const generateQuestions = async () => {
    setLoading(true)
    setError(null)
    setQuestions([])
    setCurrent(0)
    setSelected(null)
    setChecked(false)
    setScore(0)
    setFinished(false)
    setFeedback([])
    setAnswers({})

    try {
      const res = await studentApi.generatePracticeQuestions(lessonId)
      setQuestions(res.data.questions)
      startTimeRef.current = Date.now()
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to generate questions. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    generateQuestions()
  }, [lessonId])

  const q = questions[current]

  const handleCheck = async () => {
    if (selected === null || !q) return

    setAnswers(prev => ({ ...prev, [current]: selected }))
    if (selected === q.correct_index) setScore(s => s + 1)
    setChecked(true)
  }

  const handleNext = () => {
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1)
      setSelected(null)
      setChecked(false)
    } else {
      setFinished(true)

      // Persist the AI practice session (with difficulty snapshots) so the
      // learning profile can derive difficulty appetite from lesson practice.
      const timeSpentSeconds = startTimeRef.current
        ? Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
        : undefined
      studentApi
        .submitPracticeAnswers(
          lessonId,
          questions.map((_, i) => answers[i] ?? 0),
          questions.map((question, i) => ({
            index: i,
            question: question.question,
            options: question.options,
            correct_index: question.correct_index,
            explanation: question.explanation ?? '',
            difficulty: question.difficulty ?? 'medium',
          })),
          timeSpentSeconds
        )
        .catch(err => console.error('Error submitting lesson practice:', err))
    }
  }

  const restart = () => {
    generateQuestions()
  }

  // ── Loading State ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Generating Practice Questions</h3>
        <p className="text-sm text-gray-500">AI is creating questions based on this lesson's content...</p>
        <div className="flex items-center gap-1.5 mt-4 text-xs text-blue-600">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Powered by AI · Usually takes 3–8 seconds</span>
        </div>
      </div>
    )
  }

  // ── Error State ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h3>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <button onClick={restart}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    )
  }

  // ── Results Screen ─────────────────────────────────────────────
  if (finished) {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${pct >= 70 ? 'bg-emerald-100' : 'bg-orange-100'}`}>
          {pct >= 70
            ? <CheckCircle className="w-10 h-10 text-emerald-500" />
            : <RefreshCw className="w-10 h-10 text-orange-500" />}
        </div>
        <h3 className="text-2xl font-extrabold text-gray-900 mb-1">Practice Complete!</h3>
        <p className="text-gray-500 mb-2">{score} / {questions.length} correct</p>
        <p className={`text-3xl font-black mb-6 ${pct >= 70 ? 'text-emerald-500' : 'text-orange-500'}`}>{pct}%</p>
        <p className="text-sm text-gray-500 mb-8">
          {pct >= 70
            ? "Great job! You're building confidence. Ready to try the Quiz?"
            : "Keep practicing — review the materials and try again!"}
        </p>
        <button onClick={restart}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
          <RefreshCw className="w-4 h-4" /> Generate New Questions
        </button>
      </div>
    )
  }

  // ── Question Screen ────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full p-5">
      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Question {current + 1} of {questions.length}</span>
          <span>{score} correct so far</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-blue-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((current) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      {q.image_url && (
        <div className="mb-4 rounded-2xl overflow-hidden border border-gray-200">
          <img src={q.image_url} alt="Question illustration" className="w-full max-h-64 object-contain bg-gray-50" />
        </div>
      )}
      <div className="bg-gray-50 rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-gray-900 text-base leading-snug">{q.question}</p>
          <DifficultyBadge difficulty={q.difficulty} />
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2.5 flex-1">
        {q.options.map((opt, i) => {
          let style = 'bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
          if (checked) {
            if (i === q.correct_index) style = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-800'
            else if (i === selected) style = 'bg-red-50 border-2 border-red-400 text-red-700'
            else style = 'bg-white border border-gray-100 text-gray-400'
          } else if (selected === i) {
            style = 'bg-blue-50 border-2 border-blue-400 text-blue-800'
          }
          return (
            <button key={i} onClick={() => !checked && setSelected(i)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${style}`}>
              <span className="inline-flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                  {['A','B','C','D'][i]}
                </span>
                {q.option_image_urls?.[i] && (
                  <img src={q.option_image_urls[i]!} alt="" className="w-8 h-8 rounded object-cover border border-gray-200 shrink-0" />
                )}
                {opt}
              </span>
            </button>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="mt-4">
        {!checked ? (
          <button onClick={handleCheck} disabled={selected === null}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-bold rounded-xl transition-colors">
            Check Answer
          </button>
        ) : (
          <div>
            {/* Explanation */}
            {q.explanation && (
              <div className={`p-3 rounded-xl text-sm mb-3 ${selected === q.correct_index ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'}`}>
                <span className="font-semibold">
                  {selected === q.correct_index ? '✓ Correct! ' : 'Not quite. '}
                </span>
                {q.explanation}
              </div>
            )}
            {!q.explanation && (
              <div className={`flex items-center gap-2 mb-3 text-sm font-semibold ${selected === q.correct_index ? 'text-emerald-600' : 'text-red-600'}`}>
                {selected === q.correct_index
                  ? <><CheckCircle className="w-4 h-4" /> Correct! Well done.</>
                  : <><AlertCircle className="w-4 h-4" /> Not quite — the correct answer is highlighted.</>}
              </div>
            )}
            <button onClick={handleNext}
              className="w-full py-3 bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors">
              {current + 1 < questions.length ? 'Next Question →' : 'See Results'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}