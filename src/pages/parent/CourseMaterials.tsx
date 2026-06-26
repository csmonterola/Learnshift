import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../components/auth/AuthContext'
import { parentApi } from '../../lib/api'
import {
  ChevronRight,
  ChevronDown,
  Loader2,
  FileText,
  Video,
  Link as LinkIcon,
  Download,
  BookOpen,
  FolderOpen,
  FileIcon,
  ExternalLink,
} from 'lucide-react'

interface SchoolClass {
  id: number
  name: string
  grade_level: string
  section: string
  subject: string
  teacher: {
    id: number
    name: string
  }
}

interface Topic {
  id: number
  title: string
  description: string
  order: number
}

interface Lesson {
  id: number
  title: string
  content: string
  order: number
  mastery_percentage: number
  status: string
  materials: LearningMaterial[]
}

interface LearningMaterial {
  id: number
  title: string
  description: string
  material_type: string
  file_path: string
  url: string
  subject: {
    id: number
    name: string
  }
  teacher: {
    id: number
    name: string
  }
  created_at: string
}

type NavigationStep = 'classes' | 'topics' | 'lessons' | 'materials'

export function ParentCourseMaterials() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  
  // Navigation state
  const [currentStep, setCurrentStep] = useState<NavigationStep>('classes')
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  
  // Data
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])

  useEffect(() => {
    loadChildren()
  }, [])

  const loadChildren = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await parentApi.dashboard()
      const children = res.data.children
      if (children && children.length > 0) {
        setSelectedChildId(children[0].id)
        await loadClasses(children[0].id)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load children.')
    } finally {
      setLoading(false)
    }
  }

  const loadClasses = async (childId: number) => {
    setLoading(true)
    try {
      const res = await parentApi.childClasses(childId)
      setClasses(res.data)
      setCurrentStep('classes')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load classes.')
    } finally {
      setLoading(false)
    }
  }

  const loadTopics = async (classId: number) => {
    setLoading(true)
    try {
      const res = await parentApi.childClassTopics(selectedChildId!, classId)
      setTopics(res.data)
      setCurrentStep('topics')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load topics.')
    } finally {
      setLoading(false)
    }
  }

  const loadLessons = async (classId: number, topicId: number) => {
    setLoading(true)
    try {
      const res = await parentApi.childTopicLessons(selectedChildId!, classId, topicId)
      setLessons(res.data)
      setCurrentStep('lessons')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load lessons.')
    } finally {
      setLoading(false)
    }
  }

  const handleChildChange = async (childId: number) => {
    setSelectedChildId(childId)
    setSelectedClass(null)
    setSelectedTopic(null)
    setSelectedLesson(null)
    await loadClasses(childId)
  }

  const handleClassSelect = (cls: SchoolClass) => {
    setSelectedClass(cls)
    setSelectedTopic(null)
    setSelectedLesson(null)
    loadTopics(cls.id)
  }

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic)
    setSelectedLesson(null)
    if (selectedClass) {
      loadLessons(selectedClass.id, topic.id)
    }
  }

  const handleLessonSelect = (lesson: Lesson) => {
    if (selectedChildId && selectedClass) {
      // Navigate to the notebook-style lesson view
      navigate(`/parent/course-materials/${selectedChildId}/class/${selectedClass.id}/topic/${selectedTopic?.id}/lesson/${lesson.id}`)
    }
  }

  const handleBack = () => {
    if (currentStep === 'materials') {
      setSelectedLesson(null)
      setCurrentStep('lessons')
    } else if (currentStep === 'lessons') {
      setSelectedTopic(null)
      setCurrentStep('topics')
    } else if (currentStep === 'topics') {
      setSelectedClass(null)
      setCurrentStep('classes')
    }
  }

  const getMaterialIcon = (type?: string) => {
    const normalizedType = type?.toLowerCase() || 'document'
    switch (normalizedType) {
      case 'video':
        return <Video className="w-5 h-5" />
      case 'pdf':
      case 'document':
        return <FileText className="w-5 h-5" />
      case 'link':
        return <LinkIcon className="w-5 h-5" />
      default:
        return <FileIcon className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'in_progress':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  if (loading && !classes.length && !topics.length && !lessons.length) {
    return (
      <div className="max-w-7xl mx-auto p-8 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => selectedChildId && loadClasses(selectedChildId)}
          className="text-emerald-600 font-medium hover:text-emerald-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Course Materials</h1>
        <p className="text-gray-500">Browse learning materials for your child</p>
      </div>

      {/* Child Selector */}
      {selectedChildId && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
          <select
            value={selectedChildId}
            onChange={(e) => handleChildChange(Number(e.target.value))}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
          >
            <option value={selectedChildId}>Student #{selectedChildId}</option>
          </select>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      {(selectedClass || selectedTopic || selectedLesson) && (
        <div className="mb-6 flex items-center gap-2 text-sm">
          <button
            onClick={handleBack}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Back
          </button>
          <div className="flex items-center gap-2 text-gray-400">
            <ChevronRight className="w-4 h-4" />
            {currentStep === 'topics' && selectedClass && (
              <span className="text-gray-900 font-medium">{selectedClass.name}</span>
            )}
            {currentStep === 'lessons' && selectedClass && selectedTopic && (
              <>
                <span className="text-gray-900 font-medium">{selectedClass.name}</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-900 font-medium">{selectedTopic.title}</span>
              </>
            )}
            {currentStep === 'materials' && selectedClass && selectedTopic && selectedLesson && (
              <>
                <span className="text-gray-900 font-medium">{selectedClass.name}</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-900 font-medium">{selectedTopic.title}</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-900 font-medium">{selectedLesson.title}</span>
              </>
            )}
          </div>
        </div>
      )}

      {!selectedChildId ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Student Selected</h2>
          <p className="text-gray-500">Please link a student to view course materials.</p>
        </div>
      ) : currentStep === 'classes' ? (
        /* Classes Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Classes Found</h2>
              <p className="text-gray-500">This student is not enrolled in any classes yet.</p>
            </div>
          ) : (
            classes.map((cls) => (
              <div
                key={cls.id}
                onClick={() => handleClassSelect(cls)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{cls.name}</h3>
                <p className="text-sm text-gray-600 mb-1">{cls.subject}</p>
                <p className="text-xs text-gray-500">
                  {cls.grade_level} - {cls.section}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Teacher: {cls.teacher?.name || 'Unassigned'}
                </p>
              </div>
            ))
          )}
        </div>
      ) : currentStep === 'topics' ? (
        /* Topics List */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Topics</h2>
            <p className="text-sm text-gray-500 mt-1">
              {selectedClass?.name} - {selectedClass?.subject}
            </p>
          </div>
          {topics.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>No topics available for this class.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => handleTopicSelect(topic)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{topic.title}</h3>
                      {topic.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{topic.description}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : currentStep === 'lessons' ? (
        /* Lessons List */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Lessons</h2>
            <p className="text-sm text-gray-500 mt-1">{selectedTopic?.title}</p>
          </div>
          {lessons.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>No lessons available for this topic.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  onClick={() => handleLessonSelect(lesson)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(lesson.status)}`}>
                          {lesson.status.replace('_', ' ')}
                        </span>
                      </div>
                      {lesson.mastery_percentage > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[200px]">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${lesson.mastery_percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{lesson.mastery_percentage}% mastery</span>
                        </div>
                      )}
                      {lesson.materials && lesson.materials.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          {lesson.materials.length} material{lesson.materials.length !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : currentStep === 'materials' && selectedLesson ? (
        /* Materials View */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedLesson.title}</h2>
            {selectedLesson.content && (
              <p className="text-gray-600 mb-4">{selectedLesson.content}</p>
            )}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-md text-xs font-medium border ${getStatusColor(selectedLesson.status)}`}>
                {selectedLesson.status.replace('_', ' ')}
              </span>
              {selectedLesson.mastery_percentage > 0 && (
                <span className="text-sm text-gray-600">
                  Mastery: {selectedLesson.mastery_percentage}%
                </span>
              )}
            </div>
          </div>

          {selectedLesson.materials && selectedLesson.materials.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Materials</h3>
              {selectedLesson.materials.map((material) => (
                <div
                  key={material.id}
                  className="p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600">
                        {getMaterialIcon(material.material_type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{material.title}</h4>
                        {material.description && (
                          <p className="text-sm text-gray-600 mb-2">{material.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{material.material_type}</span>
                          <span>•</span>
                          <span>By {material.teacher?.name || 'Unknown'}</span>
                          <span>•</span>
                          <span>Added {new Date(material.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {material.file_path && (
                        <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                          <Download className="w-5 h-5" />
                        </button>
                      )}
                      {material.url && (
                        <a
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No materials available for this lesson.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}