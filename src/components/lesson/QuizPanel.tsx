import React, { useState, useEffect } from 'react'
import { Trophy, CheckCircle, AlertCircle, RefreshCw, Loader2, Lock, Sparkles, Clock } from 'lucide-react'
import { studentApi } from '../../lib/api'

// ── Types ──────────────────────────────────────────────────────────
interface GeneratedQuestion {
  index: number
  question: string
  options: string[]
  correct_index: number
  explanation: string
  difficulty: string
}

interface QuizAttempt {
  id: number
  attempt_number: number
  score: number
  total_questions: number
  correct_answers: number
  submitted_at: string
}

interface QuizHistoryData {
  attempts: QuizAttempt[]
  attempt_count: number
  max_attempts: number
  attempts_left: number
  best_score: number | null
  mastery: number
}

interface QuizPanelProps {
  lessonId: number
  lessonTitle: string
}

// ── QuizPanel ──────────────────────────────────────────────────────
export default function QuizPanel({ lessonId, lessonTitle }: QuizPanelProps) {
  const MAX_ATTEMPTS = 3

  // History state
  const [history, setHistory]           = useState<QuizHistoryData | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)

  // Quiz state
  const [questions, setQuestions]       = useState<GeneratedQuestion[]>([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [started, setStarted]           = useState(false)
  const [current, setCurrent]           = useState(0)
  const [answers, setAnswers]           = useState<(number|null)[]>([])
  const [submitted, setSubmitted]       = useState(false)

  // Result state
  const [resultScore, setResultScore]           = useState(0)
  const [resultCorrect, setResultCorrect]       = useState(0)
  const [resultTotal, setResultTotal]           = useState(0)
  const [resultAttemptNumber, setResultAttemptNumber] = useState(0)
  const [resultBestScore, setResultBestScore]   = useState<number | null>(null)
  const [resultMastery, setResultMastery]       = useState(0)
  const [resultAttemptsLeft, setResultAttemptsLeft] = useState(0)

  // ── Load history on mount ──────────────────────────────────────
  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await studentApi.getQuizHistory(lessonId)
      setHistory(res.data)
    } catch {
      // Ignore — will show as no attempts
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [lessonId])

  const attemptsUsed = history?.attempt_count ?? 0
  const attemptsLeft = history?.attempts_left ?? MAX_ATTEMPTS
  const bestScore    = history?.best_score ?? null
  const locked       = attemptsUsed >= MAX_ATTEMPTS

  // ── Generate questions ─────────────────────────────────────────
  const startQuiz = async () => {
    setLoading(true)
    setError(null)
    setQuestions([])

    try {
      const res = await studentApi.generateQuizQuestions(lessonId)
      setQuestions(res.data.questions)
      setStarted(true)
      setCurrent(0)
      setAnswers(new Array(res.data.questions.length).fill(null))
      setSubmitted(false)
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to generate quiz. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Submit quiz ────────────────────────────────────────────────
  const submitQuiz = async () => {
    setLoading(true)
    try {
      const numericAnswers = answers.map(a => a ?? -1) // replace null with -1 (invalid answer)
      const res = await studentApi.submitQuizAnswers(lessonId, numericAnswers, questions)
      setResultScore(res.data.score)
      setResultCorrect(res.data.correct)
      setResultTotal(res.data.total)
      setResultAttemptNumber(res.data.attempt_number)
      setResultBestScore(res.data.best_score)
      setResultMastery(res.data.mastery)
      setResultAttemptsLeft(res.data.attempts_left)
      setSubmitted(true)

      // Refresh history
      loadHistory()
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to submit quiz. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const selectAnswer = (i: number) => {
    if (submitted || loading) return
    setAnswers(prev => { const a = [...prev]; a[current] = i; return a })
  }

  // ── Loading overlay ────────────────────────────────────────────
  if (loading && started) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
        <p className="text-sm text-gray-500">Processing...</p>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────
  if (error && !started) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h3>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <button onClick={() => { setError(null); startQuiz(); }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    )
  }

  // ── Locked (all attempts used) ─────────────────────────────────
  if (locked && !submitted) {
    const mastery = history?.mastery ?? 0
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Lock className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">No More Attempts</h3>
        <p className="text-gray-500 mb-4">You've used all {MAX_ATTEMPTS} attempts for this quiz.</p>
        <div className="bg-gray-50 rounded-2xl p-4 w-full max-w-xs">
          <p className="text-xs text-gray-500 mb-1">Best Score</p>
          <p className={`text-4xl font-black ${
            bestScore !== null && bestScore >= 70 ? 'text-emerald-500' :
            bestScore !== null && bestScore >= 50 ? 'text-yellow-500' : 'text-red-500'
          }`}>{bestScore}%</p>
          <p className={`text-sm font-semibold mt-1 ${
            mastery >= 100 ? 'text-emerald-600' : mastery >= 50 ? 'text-yellow-600' : 'text-red-500'
          }`}>
            {mastery >= 100 ? 'Mastered ✓' : mastery >= 50 ? 'Developing' : 'Not Mastered'}
          </p>
        </div>
        {history && history.attempts.length > 0 && (
          <div className="mt-4 space-y-1 w-full max-w-xs">
            {history.attempts.map((a) => (
              <div key={a.id} className="flex justify-between text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <span>Attempt {a.attempt_number}</span>
                <span className="font-semibold">{a.score}% ({a.correct_answers}/{a.total_questions})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Start screen ───────────────────────────────────────────────
  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <Trophy className="w-10 h-10 text-amber-500" />
        </div>
        <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Lesson Quiz</h3>
        <p className="text-gray-500 mb-2">AI-generated questions · 5 questions per attempt</p>
        <p className="text-sm text-gray-400 mb-6">
          Your score will be recorded. You have <span className="font-bold text-gray-700">{attemptsLeft} of {MAX_ATTEMPTS}</span> attempts remaining.
        </p>

        {/* Attempt grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-4">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
            const attempt = history?.attempts?.[i]
            return (
              <div key={i} className={`rounded-xl py-3 text-center text-xs font-bold ${
                attempt ? 'bg-gray-200 text-gray-400' : 'bg-amber-50 border border-amber-200 text-amber-700'
              }`}>
                {attempt ? `${attempt.score}%` : `Attempt ${i + 1}`}
              </div>
            )
          })}
        </div>

        {bestScore !== null && (
          <p className="text-xs text-gray-400 mb-6">Best score: <span className="font-bold text-gray-600">{bestScore}%</span></p>
        )}

        <button onClick={startQuiz} disabled={locked}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold px-8 py-4 rounded-xl transition-colors">
          <Trophy className="w-5 h-5" /> Start Quiz
        </button>
      </div>
    )
  }

  // ── Results screen ─────────────────────────────────────────────
  if (submitted) {
    const pct = resultTotal > 0 ? Math.round((resultCorrect / resultTotal) * 100) : 0
    const mastery = resultMastery
    const masteryLabel = mastery >= 100 ? 'Mastered' : mastery >= 50 ? 'Developing' : 'Beginning'
    const masteryColor = mastery >= 100 ? 'text-emerald-600' : mastery >= 50 ? 'text-yellow-600' : 'text-red-500'
    const masteryBg = mastery >= 100 ? 'bg-emerald-100 text-emerald-700' : mastery >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
    const scoreColor = pct >= 70 ? 'text-emerald-500' : pct >= 50 ? 'text-yellow-500' : 'text-red-500'
    const scoreBg = pct >= 70 ? 'bg-emerald-100' : pct >= 50 ? 'bg-yellow-100' : 'bg-red-100'

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${scoreBg}`}>
          <Trophy className={`w-10 h-10 ${scoreColor}`} />
        </div>
        <h3 className="text-2xl font-extrabold text-gray-900 mb-1">Quiz Complete!</h3>
        <p className={`text-5xl font-black my-3 ${scoreColor}`}>{pct}%</p>
        <span className={`text-sm font-bold px-3 py-1 rounded-full mb-4 ${masteryBg}`}>
          {masteryLabel}
        </span>
        <p className="text-gray-500 text-sm mb-2">{resultCorrect} / {resultTotal} correct</p>
        <p className="text-xs text-gray-400 mb-2">Attempt {resultAttemptNumber} of {MAX_ATTEMPTS}</p>
        {resultBestScore !== null && (
          <p className="text-xs text-gray-400 mb-6">Best score: <span className="font-bold text-gray-600">{resultBestScore}%</span></p>
        )}

        {/* Per-question review */}
        <div className="w-full space-y-2 mb-6 text-left">
          {questions.map((q, i) => (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-xl text-xs ${answers[i] === q.correct_index ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {answers[i] === q.correct_index
                ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              }
              <div>
                <p className="font-semibold text-gray-800">{q.question}</p>
                {answers[i] !== q.correct_index && (
                  <p className="text-emerald-700 mt-0.5">Correct: {q.options[q.correct_index]}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {resultAttemptsLeft > 0 ? (
          <button onClick={() => { setStarted(false); setSubmitted(false); }}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" /> Try Again ({resultAttemptsLeft} left)
          </button>
        ) : (
          <p className="text-sm text-gray-400">All attempts used. Your best score has been recorded.</p>
        )}
      </div>
    )
  }

  // ── Question screen ────────────────────────────────────────────
  const q = questions[current]
  return (
    <div className="flex flex-col h-full p-5">
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Question {current + 1} of {questions.length}</span>
          <span className="text-amber-600 font-semibold">Attempt {attemptsUsed + 1}/{MAX_ATTEMPTS}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-amber-400 h-1.5 rounded-full transition-all"
            style={{ width: `${((current) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-4">
        <p className="font-bold text-gray-900 text-base leading-snug">{q.question}</p>
      </div>

      <div className="space-y-2.5 flex-1">
        {q.options.map((opt, i) => {
          const sel = answers[current] === i
          return (
            <button key={i} onClick={() => selectAnswer(i)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                sel ? 'bg-amber-50 border-2 border-amber-400 text-amber-900' : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
              }`}>
              <span className="inline-flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                  {['A','B','C','D'][i]}
                </span>
                {opt}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex gap-2">
        {current > 0 && (
          <button onClick={() => setCurrent(c => c - 1)}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">
            ← Back
          </button>
        )}
        {current < questions.length - 1 ? (
          <button onClick={() => setCurrent(c => c + 1)} disabled={answers[current] === null}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold rounded-xl transition-colors">
            Next →
          </button>
        ) : (
          <button onClick={submitQuiz} disabled={answers.some(a => a === null)}
            className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold rounded-xl transition-colors">
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  )
}