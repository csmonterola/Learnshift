import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { studentApi } from '../../lib/api'
import { Material } from '../../components/lesson/SourcePanel'
import ChatPanel from '../../components/lesson/ChatPanel'
import {
  ChevronRight, FileText, ExternalLink, Download, X, Eye,
  Link2, Film, Image, File, BookOpen,
  MessageCircle, Dumbbell, Trophy, Lock, CheckCircle,
  AlertCircle, AlertTriangle, Paperclip, RefreshCw, Star,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────
interface LessonData {
  id: number
  title: string
  content?: string
  materials: Material[]
  links: Material[]
}

type ActiveTab = 'chat' | 'practice' | 'quiz'

// ── Helpers ────────────────────────────────────────────────────────
function formatBytes(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function fileIcon(type: string) {
  const t = type.toUpperCase()
  if (['JPG','JPEG','PNG','GIF','WEBP','SVG'].includes(t)) return <Image className="w-4 h-4 text-purple-500" />
  if (['MP4','MOV','AVI','WEBM'].includes(t)) return <Film className="w-4 h-4 text-pink-500" />
  if (t === 'PDF') return <FileText className="w-4 h-4 text-red-500" />
  return <File className="w-4 h-4 text-emerald-500" />
}

function fileBg(type: string) {
  const t = type.toUpperCase()
  if (['JPG','JPEG','PNG','GIF','WEBP','SVG'].includes(t)) return 'bg-purple-50'
  if (['MP4','MOV','AVI','WEBM'].includes(t)) return 'bg-pink-50'
  if (t === 'PDF') return 'bg-red-50'
  return 'bg-emerald-50'
}

function canPreview(type: string) {
  return ['PDF','JPG','JPEG','PNG','GIF','WEBP','SVG','MP4','MOV','WEBM']
    .includes(type.toUpperCase())
}

// ── Material Viewer Modal ──────────────────────────────────────────
function MaterialViewer({ material, onClose }: { material: Material; onClose: () => void }) {
  const type    = material.file_type.toUpperCase()
  const url     = material.file_url ?? material.file_path
  const isImage = ['JPG','JPEG','PNG','GIF','WEBP','SVG'].includes(type)
  const isVideo = ['MP4','MOV','WEBM'].includes(type)
  const isPdf   = type === 'PDF'

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex flex-col"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="flex items-center justify-between px-6 py-4 bg-black/60 shrink-0">
        <div className="flex items-center gap-3">
          {fileIcon(type)}
          <div>
            <p className="text-white font-semibold text-sm">{material.title || material.file_name}</p>
            <p className="text-gray-400 text-xs uppercase">{type}{material.file_size ? ` · ${formatBytes(material.file_size)}` : ''}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <a href={url} download={material.file_name}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <Download className="w-4 h-4" /> Download
          </a>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
        {isPdf   && <iframe src={`${url}#toolbar=1`} className="w-full h-full rounded-lg bg-white" title={material.title} />}
        {isImage && <img src={url} alt={material.title} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />}
        {isVideo && <video src={url} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl" />}
        {!isPdf && !isImage && !isVideo && (
          <div className="text-center text-white">
            <File className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">{material.file_name}</p>
            <p className="text-gray-400 mb-6">This file type can't be previewed in the browser.</p>
            <a href={url} download={material.file_name}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
              <Download className="w-5 h-5" /> Download to view
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Ingestion Status Badge ─────────────────────────────────────────
function IngestionBadge({ status }: { status?: string }) {
  if (status === 'indexed') {
    return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Indexed — ready for AI" />
  }
  if (status === 'pending' || status === 'processing') {
    return <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse shrink-0" title="Processing…" />
  }
  return (
    <span className="flex items-center justify-center" title="Not indexed">
      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
    </span>
  )
}

// ── Practice Panel ─────────────────────────────────────────────────
function PracticePanel() {
  const questions = [
    {
      id: 1,
      question: "What is the main concept covered in this lesson?",
      options: ["Option A — First concept", "Option B — Second concept", "Option C — Third concept", "Option D — Fourth concept"],
      correct: 0,
    },
    {
      id: 2,
      question: "Which of the following best describes the topic?",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct: 2,
    },
  ]

  const [current, setCurrent]     = useState(0)
  const [selected, setSelected]   = useState<number | null>(null)
  const [checked, setChecked]     = useState(false)
  const [score, setScore]         = useState(0)
  const [finished, setFinished]   = useState(false)

  const q = questions[current]

  const handleCheck = () => {
    if (selected === null) return
    if (selected === q.correct) setScore(s => s + 1)
    setChecked(true)
  }

  const handleNext = () => {
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1)
      setSelected(null)
      setChecked(false)
    } else {
      setFinished(true)
    }
  }

  const restart = () => {
    setCurrent(0); setSelected(null); setChecked(false); setScore(0); setFinished(false)
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${pct >= 70 ? 'bg-emerald-100' : 'bg-orange-100'}`}>
          {pct >= 70 ? <Star className="w-10 h-10 text-emerald-500" /> : <RefreshCw className="w-10 h-10 text-orange-500" />}
        </div>
        <h3 className="text-2xl font-extrabold text-gray-900 mb-1">Practice Complete!</h3>
        <p className="text-gray-500 mb-2">{score} / {questions.length} correct</p>
        <p className={`text-3xl font-black mb-6 ${pct >= 70 ? 'text-emerald-500' : 'text-orange-500'}`}>{pct}%</p>
        <p className="text-sm text-gray-500 mb-8">
          {pct >= 70 ? "Great job! You're building confidence. Ready to try the Quiz?" : "Keep practicing — review the materials and try again!"}
        </p>
        <button onClick={restart}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
          <RefreshCw className="w-4 h-4" /> Practice Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-5">
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Question {current + 1} of {questions.length}</span>
          <span>{score} correct so far</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-emerald-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((current) / questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="bg-gray-50 rounded-2xl p-5 mb-4">
        <p className="font-bold text-gray-900 text-base leading-snug">{q.question}</p>
      </div>
      <div className="space-y-2.5 flex-1">
        {q.options.map((opt, i) => {
          let style = 'bg-white border border-gray-200 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
          if (checked) {
            if (i === q.correct) style = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-800'
            else if (i === selected) style = 'bg-red-50 border-2 border-red-400 text-red-700'
            else style = 'bg-white border border-gray-100 text-gray-400'
          } else if (selected === i) {
            style = 'bg-emerald-50 border-2 border-emerald-400 text-emerald-800'
          }
          return (
            <button key={i} onClick={() => !checked && setSelected(i)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${style}`}>
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
      <div className="mt-4">
        {!checked ? (
          <button onClick={handleCheck} disabled={selected === null}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold rounded-xl transition-colors">
            Check Answer
          </button>
        ) : (
          <div>
            <div className={`flex items-center gap-2 mb-3 text-sm font-semibold ${selected === q.correct ? 'text-emerald-600' : 'text-red-600'}`}>
              {selected === q.correct
                ? <><CheckCircle className="w-4 h-4" /> Correct! Well done.</>
                : <><AlertCircle className="w-4 h-4" /> Not quite — the correct answer is highlighted.</>
              }
            </div>
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

// ── Quiz Panel ─────────────────────────────────────────────────────
function QuizPanel() {
  const MAX_ATTEMPTS = 3
  const [attempts, setAttempts]   = useState(0)
  const [started, setStarted]     = useState(false)
  const [current, setCurrent]     = useState(0)
  const [answers, setAnswers]     = useState<(number|null)[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [pastScores, setPastScores] = useState<number[]>([])

  const questions = [
    { id: 1, question: "Quiz Question 1: What is the key principle of this lesson?", options: ["Choice A", "Choice B", "Choice C", "Choice D"], correct: 1 },
    { id: 2, question: "Quiz Question 2: Which best applies the lesson concept?", options: ["Choice A", "Choice B", "Choice C", "Choice D"], correct: 3 },
    { id: 3, question: "Quiz Question 3: How does the concept relate to real-world scenarios?", options: ["Choice A", "Choice B", "Choice C", "Choice D"], correct: 0 },
  ]

  const attemptsLeft = MAX_ATTEMPTS - attempts
  const locked       = attempts >= MAX_ATTEMPTS

  const startQuiz = () => {
    setStarted(true)
    setCurrent(0)
    setAnswers(new Array(questions.length).fill(null))
    setSubmitted(false)
  }

  const selectAnswer = (i: number) => {
    if (submitted) return
    setAnswers(prev => { const a = [...prev]; a[current] = i; return a })
  }

  const submitQuiz = () => {
    const correct = answers.filter((a, i) => a === questions[i].correct).length
    const pct = Math.round((correct / questions.length) * 100)
    setPastScores(prev => [...prev, pct])
    setAttempts(a => a + 1)
    setSubmitted(true)
  }

  const finalScore = submitted ? answers.filter((a, i) => a === questions[i].correct).length : 0
  const finalPct   = submitted ? Math.round((finalScore / questions.length) * 100) : 0
  const mastery    = finalPct >= 80 ? 'Mastered' : finalPct >= 60 ? 'Developing' : 'Beginning'
  const masteryColor = finalPct >= 80 ? 'text-emerald-600' : finalPct >= 60 ? 'text-yellow-600' : 'text-red-500'

  if (locked && !submitted) {
    const best = Math.max(...pastScores)
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Lock className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">No More Attempts</h3>
        <p className="text-gray-500 mb-4">You've used all {MAX_ATTEMPTS} attempts for this quiz.</p>
        <div className="bg-gray-50 rounded-2xl p-4 w-full max-w-xs">
          <p className="text-xs text-gray-500 mb-1">Best Score</p>
          <p className={`text-4xl font-black ${best >= 80 ? 'text-emerald-500' : best >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>{best}%</p>
          <p className={`text-sm font-semibold mt-1 ${best >= 80 ? 'text-emerald-600' : best >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
            {best >= 80 ? 'Mastered ✓' : best >= 60 ? 'Developing' : 'Beginning'}
          </p>
        </div>
        <div className="mt-4 space-y-1 w-full max-w-xs">
          {pastScores.map((s, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <span>Attempt {i + 1}</span>
              <span className="font-semibold">{s}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <Trophy className="w-10 h-10 text-amber-500" />
        </div>
        <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Lesson Quiz</h3>
        <p className="text-gray-500 mb-2">{questions.length} questions · Timed assessment</p>
        <p className="text-sm text-gray-400 mb-6">
          Your score will be recorded. You have <span className="font-bold text-gray-700">{attemptsLeft} of {MAX_ATTEMPTS}</span> attempts remaining.
        </p>
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-8">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <div key={i} className={`rounded-xl py-3 text-center text-xs font-bold ${
              i < attempts ? 'bg-gray-200 text-gray-400' : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}>
              {i < attempts ? `${pastScores[i]}%` : `Attempt ${i + 1}`}
            </div>
          ))}
        </div>
        <button onClick={startQuiz} disabled={locked}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold px-8 py-4 rounded-xl transition-colors">
          <Trophy className="w-5 h-5" /> Start Quiz
        </button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${finalPct >= 80 ? 'bg-emerald-100' : finalPct >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
          <Trophy className={`w-10 h-10 ${finalPct >= 80 ? 'text-emerald-500' : finalPct >= 60 ? 'text-yellow-500' : 'text-red-500'}`} />
        </div>
        <h3 className="text-2xl font-extrabold text-gray-900 mb-1">Quiz Complete!</h3>
        <p className={`text-5xl font-black my-3 ${masteryColor}`}>{finalPct}%</p>
        <span className={`text-sm font-bold px-3 py-1 rounded-full mb-4 ${finalPct >= 80 ? 'bg-emerald-100 text-emerald-700' : finalPct >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
          {mastery}
        </span>
        <p className="text-gray-500 text-sm mb-2">{finalScore} / {questions.length} correct</p>
        <p className="text-xs text-gray-400 mb-6">Attempt {attempts} of {MAX_ATTEMPTS}</p>
        <div className="w-full space-y-2 mb-6 text-left">
          {questions.map((q, i) => (
            <div key={q.id} className={`flex items-start gap-2 p-3 rounded-xl text-xs ${answers[i] === q.correct ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {answers[i] === q.correct
                ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              }
              <div>
                <p className="font-semibold text-gray-800">{q.question}</p>
                {answers[i] !== q.correct && (
                  <p className="text-emerald-700 mt-0.5">Correct: {q.options[q.correct]}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        {!locked && (
          <button onClick={startQuiz}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" /> Try Again ({attemptsLeft} left)
          </button>
        )}
      </div>
    )
  }

  const q = questions[current]
  return (
    <div className="flex flex-col h-full p-5">
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Question {current + 1} of {questions.length}</span>
          <span className="text-amber-600 font-semibold">Attempt {attempts + 1}/{MAX_ATTEMPTS}</span>
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

// ── Main Page ──────────────────────────────────────────────────────
export function StudentLessonView() {
  const { classId, topicId, lessonId } = useParams<{
    classId: string; topicId: string; lessonId: string
  }>()
  const [lessonData, setLessonData] = useState<LessonData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [viewing, setViewing]       = useState<Material | null>(null)
  const [activeTab, setActiveTab]   = useState<ActiveTab>('chat')
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<number>>(new Set())

  // Track materials with ingestion_status from SourcePanel
  const [materialsWithStatus, setMaterialsWithStatus] = useState<Material[]>([])

  useEffect(() => {
    if (!classId || !topicId || !lessonId) return
    studentApi.lesson(Number(classId), Number(topicId), Number(lessonId))
      .then(res => {
        setLessonData(res.data)
        // Initialize with materials from API (without ingestion_status)
        const mats = (res.data?.materials ?? []).filter((m: Material) => m.file_type !== 'LINK')
        setMaterialsWithStatus(mats)
      })
      .catch(err => console.error('Error loading lesson:', err?.response?.data ?? err))
      .finally(() => setLoading(false))
  }, [classId, topicId, lessonId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  const hasMaterials = (lessonData?.materials?.length ?? 0) > 0
  const hasLinks     = (lessonData?.links?.length ?? 0) > 0

  const tabs = [
    { id: 'chat'     as ActiveTab, label: 'Chat',     icon: <MessageCircle className="w-4 h-4" />, color: 'emerald' },
    { id: 'practice' as ActiveTab, label: 'Practice', icon: <Dumbbell className="w-4 h-4" />,     color: 'blue'    },
    { id: 'quiz'     as ActiveTab, label: 'Quiz',     icon: <Trophy className="w-4 h-4" />,        color: 'amber'   },
  ]

  const tabActive = {
    chat:     'bg-emerald-500 text-white shadow-md shadow-emerald-200',
    practice: 'bg-blue-500 text-white shadow-md shadow-blue-200',
    quiz:     'bg-amber-500 text-white shadow-md shadow-amber-200',
  }

  const tabInactive = 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'

  return (
    <>
      <AnimatePresence>
        {viewing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MaterialViewer material={viewing} onClose={() => setViewing(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-height 3-column layout */}
      <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6">

        {/* Top bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white shrink-0">
          <Link to="/student/classes" className="text-xs text-gray-400 hover:text-emerald-600 transition-colors">My Classes</Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <Link to={`/student/class/${classId}`} className="text-xs text-gray-400 hover:text-emerald-600 transition-colors">Class</Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <Link to={`/student/class/${classId}/topic/${topicId}`} className="text-xs text-gray-400 hover:text-emerald-600 transition-colors">Topic</Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-xs text-gray-700 font-semibold truncate max-w-xs">{lessonData?.title || 'Lesson'}</span>
        </div>

        {/* 3-column body */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Sources / Materials with preview + RAG selection ── */}
          <div className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">Sources</h2>
              <Paperclip className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {!hasMaterials && !hasLinks && (
                <div className="text-center py-8">
                  <Paperclip className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No materials uploaded yet.</p>
                </div>
              )}

              {/* Files — with preview buttons AND RAG selection checkbox */}
              {hasMaterials && lessonData!.materials.map(m => {
                // Get the ingestion status from the enriched materials list
                const enriched = materialsWithStatus.find(ms => ms.id === m.id)
                const status = enriched?.ingestion_status
                return (
                  <div key={m.id}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-emerald-300 hover:shadow-sm transition-all group">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${fileBg(m.file_type)}`}>
                        {fileIcon(m.file_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{m.title || m.file_name}</p>
                        <p className="text-xs text-gray-400 uppercase mt-0.5 flex items-center gap-1.5">
                          {m.file_type}{m.file_size ? ` · ${formatBytes(m.file_size)}` : ''}
                          <IngestionBadge status={status} />
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {canPreview(m.file_type) && m.file_url && (
                        <button onClick={e => { e.stopPropagation(); setViewing(m) }}
                          className="flex-1 flex items-center justify-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-1.5 rounded-lg transition-colors font-medium">
                          <Eye className="w-3 h-3" /> View
                        </button>
                      )}
                      {m.file_url && (
                        <a href={m.file_url} download={m.file_name} onClick={e => e.stopPropagation()}
                          className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 py-1.5 rounded-lg transition-colors font-medium">
                          <Download className="w-3 h-3" /> Save
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Links */}
              {hasLinks && (
                <div className="pt-1">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2 px-1">Links</p>
                  {lessonData!.links.map(l => (
                    <a key={l.id} href={l.file_path} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white rounded-xl p-3 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all mb-2 group">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <Link2 className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{l.title}</p>
                        <p className="text-xs text-gray-400 truncate">{l.file_path}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── CENTER: Chat / Practice / Quiz tabs ───────────── */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 shrink-0">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                    activeTab === tab.id ? tabActive[tab.id] : tabInactive
                  }`}>
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="h-full">
                  {activeTab === 'chat' && (
                    <ChatPanel
                      lessonTitle={lessonData?.title ?? 'this lesson'}
                      lessonId={Number(lessonId)}
                      selectedMaterialIds={selectedMaterialIds}
                    />
                  )}
                  {activeTab === 'practice' && <PracticePanel />}
                  {activeTab === 'quiz'     && <QuizPanel />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ── RIGHT: Lesson info / Notes ────────────────────── */}
          <div className="w-72 shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-700">Lesson Info</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{lessonData?.title}</h3>
                <p className="text-xs text-gray-400">{(lessonData?.materials?.length ?? 0)} file{(lessonData?.materials?.length ?? 0) !== 1 ? 's' : ''} · {(lessonData?.links?.length ?? 0)} link{(lessonData?.links?.length ?? 0) !== 1 ? 's' : ''}</p>
              </div>

              {lessonData?.content && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Teacher Notes</h4>
                  <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                    {lessonData.content.split('\n').filter(Boolean).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">Learning Path</h4>
                <div className="space-y-2.5">
                  {[
                    { icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Study with Chat', active: activeTab === 'chat', color: 'emerald' },
                    { icon: <Dumbbell className="w-3.5 h-3.5" />,      label: 'Build Confidence in Practice', active: activeTab === 'practice', color: 'blue' },
                    { icon: <Trophy className="w-3.5 h-3.5" />,         label: 'Prove it in the Quiz', active: activeTab === 'quiz', color: 'amber' },
                  ].map((step, i) => (
                    <div key={i} className={`flex items-center gap-2.5 text-xs ${step.active ? 'opacity-100' : 'opacity-50'}`}>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        step.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                        step.color === 'blue'    ? 'bg-blue-100 text-blue-600' :
                                                   'bg-amber-100 text-amber-600'
                      }`}>
                        {step.icon}
                      </div>
                      <span className="font-medium text-gray-700">{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}