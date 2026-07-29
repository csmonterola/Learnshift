import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

let csrfPromise: Promise<void> | null = null

const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

const ensureCsrfCookie = async () => {
  if (csrfPromise) {
    return csrfPromise
  }

  csrfPromise = axios
    .get('http://localhost:8000/sanctum/csrf-cookie', { withCredentials: true })
    .then(() => undefined)
    .finally(() => {
      csrfPromise = null
    })

  return csrfPromise
}

// Attach the Sanctum token from localStorage on every request
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (config.url?.includes('/sanctum/csrf-cookie')) {
    return config
  }

  const method = config.method?.toLowerCase()
  if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
    await ensureCsrfCookie()

    const csrfToken = getCsrfToken()
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = csrfToken
    }
  }

  return config
})

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  signup: (name: string, email: string, password: string, password_confirmation: string, role: string) =>
    api.post('/auth/signup', { name, email, password, password_confirmation, role }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get('/auth/me'),
}

// ── Student ───────────────────────────────────────────────────────
export const studentApi = {
  dashboard: () => api.get('/student/dashboard'),

  // Classes
  classes: () => api.get('/student/classes'),
  classDetail: (classId: number) => api.get(`/student/classes/${classId}`),
  classTopics: (classId: number) => api.get(`/student/classes/${classId}/topics`),
  topic: (classId: number, topicId: number) => api.get(`/student/classes/${classId}/topics/${topicId}`),
  lesson: (classId: number, topicId: number, lessonId: number) =>
    api.get(`/student/classes/${classId}/topics/${topicId}/lessons/${lessonId}`),

  skillTree: (subjectId: number, gradeLevel: string) =>
    api.get('/skill-tree', { params: { subject_id: subjectId, grade_level: gradeLevel } }),
  getPracticeClasses: () => api.get('/student/practice/classes'),
  generatePractice: (lessonIds: number[], count?: number) =>
    api.post('/student/practice/generate', { lesson_ids: lessonIds, count }),
  getQuestions: (topicId: number) => api.get(`/student/practice/${topicId}/questions`),
  submitPractice: (data: object) => api.post('/student/practice/submit', data),
  practiceHistory: () => api.get('/student/practice/history'),
  startDiagnostic: (subjectId: number) => api.post('/student/diagnostic/start', { subject_id: subjectId }),
  submitDiagnostic: (data: object) => api.post('/student/diagnostic/submit', data),
  askChatbot: (question: string, subjectId?: number) =>
    api.post('/student/chatbot/ask', { question, subject_id: subjectId }),
  getLessonMaterials: (classId: number, topicId: number, lessonId: number) =>
    api.get(`/student/classes/${classId}/topics/${topicId}/lessons/${lessonId}`),
  askLessonChat: (lessonId: number, question: string, materialIds?: number[]) => {
    const body: { question: string; material_ids?: number[] } = { question }
    if (materialIds && materialIds.length > 0) {
      body.material_ids = materialIds
    }
    return api.post(`/student/lessons/${lessonId}/chat`, body)
  },
  chatbotHistory: () => api.get('/student/chatbot/history'),
  askTeacher: (teacherId: number, question: string, subjectId?: number) =>
    api.post('/student/ask-teacher', { teacher_id: teacherId, question, subject_id: subjectId }),
  myAnswers: () => api.get('/student/ask-teacher/answers'),

  // Lesson Practice (AI-generated, NOT saved)
  generatePracticeQuestions: (lessonId: number) =>
    api.post(`/student/lessons/${lessonId}/practice/generate`),
  submitPracticeAnswers: (lessonId: number, answers: number[], questions: object[]) =>
    api.post(`/student/lessons/${lessonId}/practice/submit`, { answers, questions }),

  // Lesson Quiz (AI-generated, saved, max 3 attempts)
  generateQuizQuestions: (lessonId: number) =>
    api.post(`/student/lessons/${lessonId}/quiz/generate`),
  submitQuizAnswers: (lessonId: number, answers: number[], questions: object[]) =>
    api.post(`/student/lessons/${lessonId}/quiz/submit`, { answers, questions }),
  getQuizHistory: (lessonId: number) =>
    api.get(`/student/lessons/${lessonId}/quiz/history`),

  // Lesson Chat Logs (for history + teacher review display)
  getLessonChatLogs: (lessonId: number) =>
    api.get(`/student/lessons/${lessonId}/chat-logs`),
  chatImages: (lessonId: number, data: { image_ids: number[] }) =>
    api.post(`/student/lessons/${lessonId}/chat-images`, data),

  // Skill Tree
  getSkillTree: (classId: number) =>
    api.get(`/student/classes/${classId}/skill-tree`),

  // Progress
  getProgress: () => api.get('/student/progress'),

  // Contacts
  getTeachers: () => api.get('/student/contacts/teachers'),

  // Messages
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId: number) => api.get(`/messages/${userId}`),
  sendMessage: (receiverId: number, content: string) =>
    api.post('/messages', { receiver_id: receiverId, content }),
  getUnreadCount: () => api.get('/messages/unread-count'),

  // Settings
  getSettings: () => api.get('/settings'),
  updateProfile: (data: { name: string; email: string; avatar?: string; grade_level?: string; section?: string }) =>
    api.put('/settings/profile', data),
  updatePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    api.put('/settings/password', data),
  updatePreferences: (data: { timezone?: string; language?: string; email_notifications?: boolean; theme?: string }) =>
    api.put('/settings/preferences', data),
  deleteAccount: () => api.delete('/settings/account'),
}

// ── Teacher ───────────────────────────────────────────────────────
export const teacherApi = {
  dashboard: () => api.get('/teacher/dashboard'),
  students: (search?: string) => api.get('/teacher/students', { params: { search } }),
  studentProfile: (id: number) => api.get(`/teacher/students/${id}`),
  classDetail: (classId: number) => api.get(`/teacher/classes/${classId}`),
  searchStudents: (search: string) => api.get('/teacher/students/search', { params: { search } }),
  classStudents: (classId: number) => api.get(`/teacher/classes/${classId}/students`),
  enrollStudent: (classId: number, studentId: number) => api.post(`/teacher/classes/${classId}/students`, { student_id: studentId }),
  removeStudent: (classId: number, studentId: number) => api.delete(`/teacher/classes/${classId}/students/${studentId}`),

  // Teacher Class Management
  getMyClasses: () => api.get('/teacher/classes'),
  createClass: (data: { name: string; grade_level: string; section: string; school_year: string; subject: string }) =>
    api.post('/teacher/classes', data),
  deleteMyClass: (classId: number) => api.delete(`/teacher/classes/${classId}`),

  // Topics
  getTopics: (classId: number) => api.get(`/teacher/classes/${classId}/topics`),
  createTopic: (classId: number, data: { title: string; description?: string }) =>
    api.post(`/teacher/classes/${classId}/topics`, data),
  updateTopic: (classId: number, topicId: number, data: { title?: string; description?: string }) =>
    api.patch(`/teacher/classes/${classId}/topics/${topicId}`, data),
  deleteTopic: (classId: number, topicId: number) =>
    api.delete(`/teacher/classes/${classId}/topics/${topicId}`),

  // Lessons
  createLesson: (classId: number, topicId: number, data: { title: string; content?: string }) =>
    api.post(`/teacher/classes/${classId}/topics/${topicId}/lessons`, data),
  deleteLesson: (classId: number, topicId: number, lessonId: number) =>
    api.delete(`/teacher/classes/${classId}/topics/${topicId}/lessons/${lessonId}`),

  // Materials & Links
  getLessonMaterials: (classId: number, topicId: number, lessonId: number) =>
    api.get(`/teacher/classes/${classId}/topics/${topicId}/lessons/${lessonId}/materials`),
  uploadMaterial: (classId: number, topicId: number, lessonId: number, formData: FormData) =>
    api.post(`/teacher/classes/${classId}/topics/${topicId}/lessons/${lessonId}/materials`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteMaterial: (classId: number, topicId: number, lessonId: number, materialId: number) =>
    api.delete(`/teacher/classes/${classId}/topics/${topicId}/lessons/${lessonId}/materials/${materialId}`),
  addLink: (classId: number, topicId: number, lessonId: number, data: { title: string; url: string }) =>
    api.post(`/teacher/classes/${classId}/topics/${topicId}/lessons/${lessonId}/links`, data),

  content: () => api.get('/teacher/content'),
  uploadContent: (formData: FormData) =>
    api.post('/teacher/content', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateContent: (id: number, data: object) => api.put(`/teacher/content/${id}`, data),
  deleteContent: (id: number) => api.delete(`/teacher/content/${id}`),
  reprocessContent: (id: number) => api.post(`/teacher/content/${id}/reprocess`),
  getContentLessons: (classId?: number) => api.get('/teacher/content/lessons', { params: { class_id: classId } }),
  aiLogs: (params?: { status?: string; search?: string }) =>
    api.get('/teacher/ai-logs', { params }),
  aiLogStats: () => api.get('/teacher/ai-logs/stats'),
  updateLogStatus: (id: number, data: { status: string; teacher_note?: string; teacher_corrected_response?: string }) =>
    api.patch(`/teacher/ai-logs/${id}/status`, data),
  chatImages: (lessonId: number, data: { image_ids: number[] }) =>
    api.post(`/teacher/lessons/${lessonId}/chat-images`, data),
  anonymousQuestions: () => api.get('/teacher/anonymous-questions'),
  answerQuestion: (id: number, answer: string) =>
    api.post(`/teacher/anonymous-questions/${id}/answer`, { answer }),

  // Class Progress Monitoring
  getClassProgress: (classId: number) =>
    api.get(`/teacher/classes/${classId}/progress`),
  getTopicProgress: (classId: number, topicId: number) =>
    api.get(`/teacher/classes/${classId}/progress/topics/${topicId}`),

  // Contacts
  getContacts: () => api.get('/teacher/contacts'),

  // Messages
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId: number) => api.get(`/messages/${userId}`),
  sendMessage: (receiverId: number, content: string) =>
    api.post('/messages', { receiver_id: receiverId, content }),
  getUnreadCount: () => api.get('/messages/unread-count'),

  // Settings
  getSettings: () => api.get('/settings'),
  updateProfile: (data: { name: string; email: string; avatar?: string }) =>
    api.put('/settings/profile', data),
  updatePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    api.put('/settings/password', data),
  updatePreferences: (data: { timezone?: string; language?: string; email_notifications?: boolean; theme?: string }) =>
    api.put('/settings/preferences', data),
  deleteAccount: () => api.delete('/settings/account'),
}

// ── Parent ────────────────────────────────────────────────────────
export const parentApi = {
  dashboard: () => api.get('/parent/dashboard'),
  searchStudents: (query: string) => api.get('/parent/students/search', { params: { query } }),
  linkChild: (studentId: number) => api.post('/parent/link-child', { student_id: studentId }),
  childProgress: (childId: number) => api.get(`/parent/children/${childId}/progress`),
  guidedSessions: (childId: number) => api.get(`/parent/children/${childId}/guided-sessions`),
  updateSessionProgress: (sessionId: number, studentId: number, percent: number) =>
    api.post(`/parent/sessions/${sessionId}/progress`, { student_id: studentId, progress_percent: percent }),
  courseMaterials: (childId: number) => api.get(`/parent/children/${childId}/course-materials`),
  studentActivity: (childId: number) => api.get(`/parent/children/${childId}/activity`),
  childClasses: (childId: number) => api.get(`/parent/children/${childId}/classes`),
  childClassTopics: (childId: number, classId: number) => api.get(`/parent/children/${childId}/classes/${classId}/topics`),
  childTopicLessons: (childId: number, classId: number, topicId: number) => 
    api.get(`/parent/children/${childId}/classes/${classId}/topics/${topicId}/lessons`),
  lessonDetail: (childId: number, classId: number, topicId: number, lessonId: number) =>
    api.get(`/parent/children/${childId}/classes/${classId}/topics/${topicId}/lessons/${lessonId}`),
  lessonChat: (childId: number, classId: number, topicId: number, lessonId: number, question: string) =>
    api.post(`/parent/children/${childId}/classes/${classId}/topics/${topicId}/lessons/${lessonId}/chat`, { question }),
}

// ── Student Parent Link ───────────────────────────────────────────
export const studentParentLinkApi = {
  pendingRequests: () => api.get('/student/parent-requests'),
  approveLink: (parentId: number) => api.post(`/student/parent-requests/${parentId}/approve`),
  rejectLink: (parentId: number) => api.post(`/student/parent-requests/${parentId}/reject`),
}

// ── Admin ─────────────────────────────────────────────────────────
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  activityLogs: (params?: object) => api.get('/admin/activity-logs', { params }),
  users: (params?: object) => api.get('/admin/users', { params }),
  createUser: (data: object) => api.post('/admin/users', data),
  updateUser: (id: number, data: object) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  bulkCreate: (users: object[]) => api.post('/admin/users/bulk', { users }),
  bulkUpload: (formData: FormData) => api.post('/admin/users/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  classes: (params?: object) => api.get('/admin/classes', { params }),
  createClass: (data: object) => api.post('/admin/classes', data),
  updateClass: (id: number, data: object) => api.put(`/admin/classes/${id}`, data),
  deleteClass: (id: number) => api.delete(`/admin/classes/${id}`),
  enrollStudents: (classId: number, studentIds: number[]) =>
    api.post(`/admin/classes/${classId}/enroll`, { student_ids: studentIds }),
  classDetail: (classId: number) => api.get(`/admin/classes/${classId}/detail`),
}

// ── Curriculum ────────────────────────────────────────────────────
export const curriculumApi = {
  subjects: () => api.get('/subjects'),
  bySubject: (subjectId: number, gradeLevel: string) =>
    api.get(`/subjects/${subjectId}/curriculum`, { params: { grade_level: gradeLevel } }),
}