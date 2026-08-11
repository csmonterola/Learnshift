import React, { useState, useEffect } from 'react'
import { studentApi } from '../../lib/api'
import { Sparkles, Loader2, RefreshCw, CheckCircle2, Zap, Target, TrendingUp, LifeBuoy, CalendarDays } from 'lucide-react'

interface TraitCell {
  value: number | null
  source: string | null
  confidence: number
}

interface ProfileData {
  traits: Record<string, TraitCell>
  recommended_difficulty: string | null
  schema_version: number
  updated_at: string
}

interface LearningProfileResponse {
  profile: ProfileData
  needs_quiz: boolean
  self_report_options: Record<string, number>
  trait_meta: Record<string, { label: string; positive: string; negative: string }>
}

// 4 options per trait, index 0-3 (matches backend SELF_REPORT_OPTIONS order).
const QUIZ_OPTIONS: Record<string, string[]> = {
  pacing: ['Fast-paced, I work quickly', 'Steady pace', 'Slow and careful', 'Not sure'],
  mastery_habit: ['I retry until I master it', 'I retake quizzes sometimes', 'I move on after one try', 'Not sure'],
  difficulty_appetite: ['I like hard problems', 'I like a mix of difficulties', 'I prefer easy problems', 'Not sure'],
  help_seeking: ['I ask for help right away', 'I ask sometimes', 'I try to solve it alone first', 'Not sure'],
  study_regularity: ['I study every day', 'A few times a week', 'Only before tests or exams', 'Not sure'],
}

const TRAIT_ORDER = ['pacing', 'mastery_habit', 'difficulty_appetite', 'help_seeking', 'study_regularity']

const TRAIT_ICON: Record<string, React.ReactNode> = {
  pacing: <Zap className="w-3.5 h-3.5" />,
  mastery_habit: <Target className="w-3.5 h-3.5" />,
  difficulty_appetite: <TrendingUp className="w-3.5 h-3.5" />,
  help_seeking: <LifeBuoy className="w-3.5 h-3.5" />,
  study_regularity: <CalendarDays className="w-3.5 h-3.5" />,
}

function valueLabel(trait: string, value: number, meta: { positive: string; negative: string }): string {
  if (value > 0.2) return meta.positive
  if (value < -0.2) return meta.negative
  return 'Balanced'
}

export function LearningProfileCard() {
  const [data, setData] = useState<LearningProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quizMode, setQuizMode] = useState(false)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await studentApi.getLearningProfile()
      setData(res.data)
      if (res.data.needs_quiz) {
        setQuizMode(true)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not load your learning profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitQuiz = async () => {
    if (Object.keys(answers).length < TRAIT_ORDER.length) {
      setError('Please answer all questions.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await studentApi.submitLearningProfileSelfReport(answers)
      await loadProfile()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not save your profile.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetake = () => {
    setAnswers({})
    setError('')
    setQuizMode(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">{error}</div>
    )
  }

  if (!data) return null

  // Onboarding quiz — shown when the student has no data yet.
  if (quizMode) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-indigo-900">Tell us how you learn</h3>
        </div>
        <p className="text-sm text-indigo-700/80 mb-4">
          Answer 5 quick questions so we can tailor your experience. Your answers are a starting point only — we update them as you learn.
        </p>

        <div className="space-y-4">
          {TRAIT_ORDER.map((trait) => (
            <div key={trait}>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-900 mb-1.5">
                <span className="text-emerald-600">{TRAIT_ICON[trait]}</span>
                {data.trait_meta[trait]?.label ?? trait}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(QUIZ_OPTIONS[trait] ?? []).map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [trait]: idx }))}
                    className={`text-left text-xs px-3 py-2 rounded-xl border transition-colors ${
                      answers[trait] === idx
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : 'border-indigo-200 bg-white text-indigo-900 hover:border-indigo-400'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSubmitQuiz}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save my learning profile
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>
    )
  }

  // Profile view — trait chips + recommended difficulty.
  const traits = TRAIT_ORDER.filter((t) => data.profile.traits[t]?.value !== null)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-gray-900">Your Learning Profile</h3>
        </div>
        <button
          onClick={handleRetake}
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Update answers
        </button>
      </div>

      {data.profile.recommended_difficulty && (
        <div className="mb-4 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
          Recommended difficulty: {data.profile.recommended_difficulty}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {traits.map((trait) => {
          const cell = data.profile.traits[trait]
          const meta = data.trait_meta[trait]
          const label = valueLabel(trait, cell.value as number, meta)
          const fromBehavior = cell.source === 'behavior'
          return (
            <div
              key={trait}
              title={fromBehavior ? 'Learned from your activity' : 'From your answers'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                fromBehavior
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}
            >
              <span className="text-emerald-600">{TRAIT_ICON[trait]}</span>
              {meta?.label ?? trait}: {label}
            </div>
          )
        })}
        {traits.length === 0 && (
          <p className="text-sm text-gray-500">No traits computed yet — check back after some activity.</p>
        )}
      </div>
    </div>
  )
}
