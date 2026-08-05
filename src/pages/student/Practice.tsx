import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ChevronRight, RefreshCw, PlayCircle, BookOpen, GraduationCap, Settings, Brain, BarChart3, Loader2, ArrowLeft, ChevronLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { studentApi } from '../../lib/api'

type Step = 'class' | 'content' | 'config' | 'practice' | 'results'

interface LessonItem {
  id: number
  title: string
}

interface TopicItem {
  id: number
  title: string
  lessons: LessonItem[]
}

interface ClassItem {
  id: number
  name: string
  subject: string
  topics: TopicItem[]
}

interface Question {
  id: number
  lesson_id: number
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

export function StudentPractice() {
  const [step, setStep] = useState<Step>('class')
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Step 1: Selected class
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)

  // Step 2: Selected lesson IDs
  const [selectedLessonIds, setSelectedLessonIds] = useState<number[]>([])

  // Step 3: Config
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium')

  // Step 4: Practice state
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [answers, setAnswers] = useState<{ [key: number]: number }>({})

  // Step 5: Results
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const res = await studentApi.getPracticeClasses()
      setClasses(res.data || [])
    } catch (err) {
      console.error('Error loading classes:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const allLessons = selectedClass?.topics.flatMap(t => t.lessons) || []

  const toggleLesson = (lessonId: number) => {
    setSelectedLessonIds(prev =>
      prev.includes(lessonId)
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    )
  }

  const startPractice = async () => {
    if (selectedLessonIds.length === 0) return

    setGenerating(true)
    try {
      const res = await studentApi.generatePractice(selectedLessonIds, questionCount, difficulty)
      setQuestions(res.data.questions || [])
      setStep('practice')
      setCurrentIndex(0)
      setSelectedOption(null)
      setIsSubmitted(false)
      setAnswers({})
    } catch (err: any) {
      console.error('Error generating practice:', err)
      alert(err?.response?.data?.error || 'Failed to generate practice questions. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = () => {
    if (selectedOption !== null) {
      const q = questions[currentIndex]
      const isCorrect = selectedOption === q.correct_index
      setAnswers(prev => ({ ...prev, [currentIndex]: selectedOption }))
      if (isCorrect) setCorrectCount(prev => prev + 1)
      setIsSubmitted(true)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOption(null)
      setIsSubmitted(false)
    } else {
      const total = questions.length
      const correct =
        Object.entries(answers).filter(([idx, ans]) => {
          const q = questions[Number(idx)]
          return q && ans === q.correct_index
        }).length +
        (selectedOption !== null && selectedOption === questions[currentIndex].correct_index ? 1 : 0)
      setCorrectCount(correct)
      setScore(total > 0 ? Math.round((correct / total) * 100) : 0)
      setStep('results')
    }
  }

  const restart = () => {
    setSelectedLessonIds([])
    setQuestions([])
    setCurrentIndex(0)
    setSelectedOption(null)
    setIsSubmitted(false)
    setAnswers({})
    setScore(0)
    setCorrectCount(0)
    setStep('content')
  }

  const currentQuestion = questions[currentIndex]
  const progressPercent = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['class', 'content', 'config', 'practice', 'results'] as Step[]).map((s, i) => {
          const stepIndex = ['class', 'content', 'config', 'practice', 'results']
          const currentStepIndex = stepIndex.indexOf(step)
          const thisIndex = stepIndex.indexOf(s)
          const isComplete = thisIndex < currentStepIndex
          const isCurrent = s === step
          return (
            <React.Fragment key={s}>
              {i > 0 && <div className={`h-px flex-1 ${isComplete ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                isCurrent ? 'bg-emerald-500 text-white' :
                isComplete ? 'bg-emerald-100 text-emerald-700' :
                'bg-gray-100 text-gray-400'
              }`}>
                {s === 'class' && <GraduationCap size={14} />}
                {s === 'content' && <BookOpen size={14} />}
                {s === 'config' && <Settings size={14} />}
                {s === 'practice' && <Brain size={14} />}
                {s === 'results' && <BarChart3 size={14} />}
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </div>
            </React.Fragment>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Select Class ───────────────────────────── */}
        {step === 'class' && (
          <motion.div key="class" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Practice Arena</h1>
              <p className="text-gray-500">Select a class to practice from.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map(cls => (
                <button key={cls.id} onClick={() => { setSelectedClassId(cls.id); setStep('content') }}
                  className={`bg-white rounded-2xl p-6 border-2 text-left transition-all hover:shadow-md ${
                    selectedClassId === cls.id ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-100 hover:border-emerald-200'
                  }`}>
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                    <BookOpen className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{cls.name}</h3>
                  <p className="text-sm text-gray-500">{cls.subject}</p>
                  <p className="text-xs text-gray-400 mt-2">{cls.topics.length} topics · {cls.topics.reduce((s, t) => s + t.lessons.length, 0)} lessons</p>
                </button>
              ))}
            </div>
            {classes.length === 0 && (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
                <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Classes Enrolled</h3>
                <p className="text-gray-500">You need to be enrolled in classes to practice.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── STEP 2: Select Content ────────────────────────── */}
        {step === 'content' && selectedClass && (
          <motion.div key="content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <button onClick={() => setStep('class')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                  <ChevronLeft size={16} /> Back to classes
                </button>
                <h1 className="text-2xl font-bold text-gray-900">{selectedClass.name}</h1>
                <p className="text-gray-500">Select the lessons you want to practice.</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-600">{selectedLessonIds.length} selected</div>
                <div className="text-xs text-gray-400">lessons</div>
              </div>
            </div>

            <div className="space-y-4">
              {selectedClass.topics.map(topic => (
                <div key={topic.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-700">{topic.title}</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {topic.lessons.map(lesson => {
                      const isSelected = selectedLessonIds.includes(lesson.id)
                      return (
                        <label key={lesson.id}
                          className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50/50' : 'hover:bg-gray-50'
                          }`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleLesson(lesson.id)}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className={`text-sm font-medium ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>
                            {lesson.title}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setStep('config')} disabled={selectedLessonIds.length === 0}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl transition-colors disabled:opacity-40 flex items-center gap-2">
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Configure ─────────────────────────────── */}
        {step === 'config' && (
          <motion.div key="config" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="mb-6">
              <button onClick={() => setStep('content')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                <ChevronLeft size={16} /> Back to content selection
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Configure Practice</h1>
              <p className="text-gray-500">Set your preferences for this practice session.</p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-gray-200 space-y-8">
              {/* Question Count */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Number of Questions</label>
                <div className="flex items-center gap-4">
                  {[5, 10, 15, 20].map(n => (
                    <button key={n} onClick={() => setQuestionCount(n)}
                      className={`px-6 py-3 rounded-xl font-bold transition-all ${
                        questionCount === n
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Difficulty Level</label>
                <div className="flex gap-3">
                  {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                        difficulty === d
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-2xl p-5">
                <h3 className="font-bold text-gray-700 mb-3">Session Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{selectedLessonIds.length}</div>
                    <div className="text-xs text-gray-500">Lessons</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{questionCount}</div>
                    <div className="text-xs text-gray-500">Questions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{difficulty}</div>
                    <div className="text-xs text-gray-500">Difficulty</div>
                  </div>
                </div>
              </div>

              <button onClick={startPractice} disabled={generating}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
                {generating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generating Questions...</>
                ) : (
                  <><PlayCircle size={22} /> Start Practice</>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: Practice ──────────────────────────────── */}
        {step === 'practice' && currentQuestion && (
          <motion.div key="practice" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Progress bar */}
              <div className="h-2 w-full bg-gray-100">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
              </div>

              <div className="p-8 sm:p-10">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                    {difficulty}
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-gray-900 mb-8 leading-relaxed">
                  {currentQuestion.question}
                </h2>

                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedOption === index
                    const isCorrect = index === currentQuestion.correct_index
                    let cls = 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-gray-700'

                    if (isSubmitted) {
                      if (isCorrect) cls = 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      else if (isSelected) cls = 'border-red-400 bg-red-50 text-red-800'
                      else cls = 'border-gray-100 opacity-40'
                    } else if (isSelected) {
                      cls = 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                    }

                    return (
                      <button key={index}
                        onClick={() => !isSubmitted && setSelectedOption(index)}
                        disabled={isSubmitted}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${cls}`}>
                        <span className="font-semibold">{option}</span>
                        {isSubmitted && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
                      </button>
                    )
                  })}
                </div>

                {isSubmitted && (
                  <div className={`mt-6 p-5 rounded-2xl border ${
                    selectedOption === currentQuestion.correct_index
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`font-bold mb-1 ${
                      selectedOption === currentQuestion.correct_index ? 'text-emerald-800' : 'text-red-700'
                    }`}>
                      {selectedOption === currentQuestion.correct_index ? '✓ Correct!' : '✗ Not quite.'}
                    </p>
                    <p className="text-sm text-gray-600">{currentQuestion.explanation}</p>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-gray-400">{Object.keys(answers).length + (isSubmitted ? 1 : 0)}/{questions.length} answered</span>
                  {!isSubmitted ? (
                    <button onClick={handleSubmit} disabled={selectedOption === null}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-3 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20">
                      Check Answer
                    </button>
                  ) : (
                    <button onClick={handleNext}
                      className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-8 py-3 rounded-full transition-colors flex items-center gap-2">
                      {currentIndex < questions.length - 1 ? (
                        <>Next <ChevronRight className="w-4 h-4" /></>
                      ) : (
                        <>See Results <BarChart3 className="w-4 h-4" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 5: Results ───────────────────────────────── */}
        {step === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">{score >= 80 ? '🎉' : score >= 50 ? '💪' : '📚'}</span>
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900">Practice Complete!</h2>
              <p className="text-gray-500 text-lg">
                You got <span className="font-bold text-emerald-600">{correctCount}</span> out of{' '}
                <span className="font-bold">{questions.length}</span> correct.
              </p>
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                {/* Score circle */}
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(score / 100) * 264} 264`}
                      className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-extrabold text-gray-900">{score}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                    <div className="text-3xl font-extrabold text-emerald-600">{correctCount}</div>
                    <div className="text-xs text-emerald-600/70 font-medium mt-1">Correct</div>
                  </div>
                  <div className="bg-rose-50 rounded-2xl p-4 text-center">
                    <div className="text-3xl font-extrabold text-rose-500">{questions.length - correctCount}</div>
                    <div className="text-xs text-rose-600/70 font-medium mt-1">Incorrect</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={restart}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2">
                    <RefreshCw size={18} /> New Session
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}