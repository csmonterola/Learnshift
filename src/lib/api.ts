import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Attach the Sanctum token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
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
  aiLogs: (status?: string) => api.get('/teacher/ai-logs', { params: { status } }),
  updateLogStatus: (id: number, status: string, note?: string) =>
    api.patch(`/teacher/ai-logs/${id}/status`, { status, teacher_note: note }),
  anonymousQuestions: () => api.get('/teacher/anonymous-questions'),
  answerQuestion: (id: number, answer: string) =>
    api.post(`/teacher/anonymous-questions/${id}/answer`, { answer }),
}

// ── Parent ────────────────────────────────────────────────────────
export const parentApi = {
  dashboard: () => api.get('/parent/dashboard'),
  linkChild: (code: string) => api.post('/parent/link-child', { enrollment_code: code }),
  childProgress: (childId: number) => api.get(`/parent/children/${childId}/progress`),
  guidedSessions: (childId: number) => api.get(`/parent/children/${childId}/guided-sessions`),
  updateSessionProgress: (sessionId: number, studentId: number, percent: number) =>
    api.post(`/parent/sessions/${sessionId}/progress`, { student_id: studentId, progress_percent: percent }),
  courseMaterials: (childId: number) => api.get(`/parent/children/${childId}/course-materials`),
}

// ── Admin ─────────────────────────────────────────────────────────
export const adminApi = {
  users: (params?: object) => api.get('/admin/users', { params }),
  createUser: (data: object) => api.post('/admin/users', data),
  updateUser: (id: number, data: object) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  bulkCreate: (users: object[]) => api.post('/admin/users/bulk', { users }),
  classes: (params?: object) => api.get('/admin/classes', { params }),
  createClass: (data: object) => api.post('/admin/classes', data),
  updateClass: (id: number, data: object) => api.put(`/admin/classes/${id}`, data),
  deleteClass: (id: number) => api.delete(`/admin/classes/${id}`),
  enrollStudents: (classId: number, studentIds: number[]) =>
    api.post(`/admin/classes/${classId}/enroll`, { student_ids: studentIds }),
}

// ── Curriculum ────────────────────────────────────────────────────
export const curriculumApi = {
  subjects: () => api.get('/subjects'),
  bySubject: (subjectId: number, gradeLevel: string) =>
    api.get(`/subjects/${subjectId}/curriculum`, { params: { grade_level: gradeLevel } }),
}