import { supabase, db, authApi, setSupabaseToken, clearSupabaseToken } from './supabase'
import type {
  Profile,
  Class,
  ClassStudent,
  Topic,
  Lesson,
  LessonMaterial,
  LessonLink,
  StudentProfile,
  StudentSubjectMastery,
  StudentTopicProgress,
  StudentLessonProgress,
  Message,
  ChatbotLog,
  PracticeSubmission,
  QuizResult,
  Subject,
} from './supabaseTypes'

// ============================================
// AUTH API
// ============================================
export const auth = {
  login: async (email: string, password: string) => {
    const res = await authApi.signIn(email, password)
    const session = res.data
    localStorage.setItem('supabase_token', session.access_token)
    localStorage.setItem('supabase_refresh_token', session.refresh_token)
    setSupabaseToken(session.access_token)
    
    // Fetch user profile to get role
    const userRes = await authApi.getUser(session.access_token)
    const profileRes = await db.selectWhere('profiles', { id: userRes.data.id })
    const profile = profileRes.data?.[0]
    
    return { ...session, profile }
  },

  signUp: async (email: string, password: string, name: string, role: string) => {
    const res = await authApi.signUp(email, password, { name, role })
    const session = res.data
    if (session.access_token) {
      localStorage.setItem('supabase_token', session.access_token)
      localStorage.setItem('supabase_refresh_token', session.refresh_token)
      setSupabaseToken(session.access_token)
    }
    return session
  },

  logout: async () => {
    const token = localStorage.getItem('supabase_token')
    if (token) {
      try {
        await authApi.signOut(token)
      } catch (e) {
        // Ignore
      }
    }
    localStorage.removeItem('supabase_token')
    localStorage.removeItem('supabase_refresh_token')
    clearSupabaseToken()
  },

  getUser: async (token: string) => {
    const res = await authApi.getUser(token)
    return res.data
  },

  getProfile: async (userId: string) => {
    const res = await db.selectWhere('profiles', { id: userId })
    return res.data?.[0] as Profile | undefined
  },
}

// ============================================
// PROFILES API
// ============================================
export const profiles = {
  get: async (userId: string) => {
    const res = await db.selectWhere('profiles', { id: userId })
    return res.data?.[0] as Profile | undefined
  },

  update: async (userId: string, data: Partial<Profile>) => {
    const res = await db.update('profiles', userId, data)
    return res.data?.[0] as Profile | undefined
  },

  getAll: async () => {
    const res = await db.select('profiles', '*')
    return res.data as Profile[]
  },

  getByRole: async (role: string) => {
    const res = await db.selectWhere('profiles', { role })
    return res.data as Profile[]
  },

  searchStudents: async (search: string) => {
    const res = await supabase.get(
      `/profiles?role=eq.student&name=ilike.*${encodeURIComponent(search)}*&select=*`
    )
    return res.data as Profile[]
  },
}

// ============================================
// SUBJECTS API
// ============================================
export const subjects = {
  getAll: async () => {
    const res = await db.select('subjects', '*')
    return res.data as Subject[]
  },

  getById: async (id: number) => {
    const res = await db.selectWhere('subjects', { id })
    return res.data?.[0] as Subject | undefined
  },
}

// ============================================
// CLASSES API
// ============================================
export const classes = {
  // Get classes for a teacher
  getTeacherClasses: async (teacherId: string) => {
    const res = await supabase.get(
      `/classes?teacher_id=eq.${teacherId}&is_active=eq.true&select=*,student_count:class_student(count)`
    )
    return res.data as Class[]
  },

  // Get classes for a student
  getStudentClasses: async (studentId: string) => {
    const res = await supabase.get(
      `/class_student?student_id=eq.${studentId}&select=class:classes(*)`
    )
    return res.data.map((cs: any) => cs.class) as Class[]
  },

  // Get class by ID
  getById: async (classId: number) => {
    const res = await supabase.get(
      `/classes?id=eq.${classId}&select=*,teacher:profiles!classes_teacher_id_fkey(*)`
    )
    return res.data?.[0] as Class | undefined
  },

  // Create class
  create: async (data: Omit<Class, 'id' | 'created_at'>) => {
    const res = await db.insert('classes', data)
    return res.data?.[0] as Class | undefined
  },

  // Update class
  update: async (classId: number, data: Partial<Class>) => {
    const res = await db.update('classes', classId, data)
    return res.data?.[0] as Class | undefined
  },

  // Delete class
  delete: async (classId: number) => {
    await db.delete('classes', classId)
  },

  // Enroll student
  enrollStudent: async (classId: number, studentId: string) => {
    const res = await db.insert('class_student', { class_id: classId, student_id: studentId })
    return res.data?.[0] as ClassStudent | undefined
  },

  // Remove student
  removeStudent: async (classId: number, studentId: string) => {
    await supabase.delete(`/class_student?class_id=eq.${classId}&student_id=eq.${studentId}`)
  },

  // Get enrolled students
  getEnrolledStudents: async (classId: number) => {
    const res = await supabase.get(
      `/class_student?class_id=eq.${classId}&select=student:profiles(*)`
    )
    return res.data.map((cs: any) => cs.student) as Profile[]
  },
}

// ============================================
// TOPICS API
// ============================================
export const topics = {
  // Get topics for a class
  getClassTopics: async (classId: number) => {
    const res = await supabase.get(
      `/topics?class_id=eq.${classId}&order=order_index.asc&select=*,lessons:lessons(*)`
    )
    return res.data as Topic[]
  },

  // Get topic by ID
  getById: async (topicId: number) => {
    const res = await supabase.get(
      `/topics?id=eq.${topicId}&select=*,lessons:lessons(*)`
    )
    return res.data?.[0] as Topic | undefined
  },

  // Create topic
  create: async (data: Omit<Topic, 'id' | 'created_at'>) => {
    const res = await db.insert('topics', data)
    return res.data?.[0] as Topic | undefined
  },

  // Update topic
  update: async (topicId: number, data: Partial<Topic>) => {
    const res = await db.update('topics', topicId, data)
    return res.data?.[0] as Topic | undefined
  },

  // Delete topic
  delete: async (topicId: number) => {
    await db.delete('topics', topicId)
  },
}

// ============================================
// LESSONS API
// ============================================
export const lessons = {
  // Get lessons for a topic
  getTopicLessons: async (topicId: number) => {
    const res = await supabase.get(
      `/lessons?topic_id=eq.${topicId}&order=order_index.asc&select=*,materials:lesson_materials(*),links:lesson_links(*)`
    )
    return res.data as Lesson[]
  },

  // Get lesson by ID
  getById: async (lessonId: number) => {
    const res = await supabase.get(
      `/lessons?id=eq.${lessonId}&select=*,materials:lesson_materials(*),links:lesson_links(*)`
    )
    return res.data?.[0] as Lesson | undefined
  },

  // Create lesson
  create: async (data: Omit<Lesson, 'id' | 'created_at'>) => {
    const res = await db.insert('lessons', data)
    return res.data?.[0] as Lesson | undefined
  },

  // Update lesson
  update: async (lessonId: number, data: Partial<Lesson>) => {
    const res = await db.update('lessons', lessonId, data)
    return res.data?.[0] as Lesson | undefined
  },

  // Delete lesson
  delete: async (lessonId: number) => {
    await db.delete('lessons', lessonId)
  },

  // Add material
  addMaterial: async (data: Omit<LessonMaterial, 'id' | 'created_at'>) => {
    const res = await db.insert('lesson_materials', data)
    return res.data?.[0] as LessonMaterial | undefined
  },

  // Delete material
  deleteMaterial: async (materialId: number) => {
    await db.delete('lesson_materials', materialId)
  },

  // Add link
  addLink: async (data: Omit<LessonLink, 'id' | 'created_at'>) => {
    const res = await db.insert('lesson_links', data)
    return res.data?.[0] as LessonLink | undefined
  },

  // Delete link
  deleteLink: async (linkId: number) => {
    await db.delete('lesson_links', linkId)
  },
}

// ============================================
// STUDENT PROGRESS API
// ============================================
export const studentProgress = {
  // Get student profile
  getProfile: async (studentId: string) => {
    const res = await db.selectWhere('student_profiles', { student_id: studentId })
    return res.data?.[0] as StudentProfile | undefined
  },

  // Get subject mastery
  getSubjectMastery: async (studentId: string) => {
    const res = await supabase.get(
      `/student_subject_mastery?student_id=eq.${studentId}&select=*,subject:subjects(*)`
    )
    return res.data as StudentSubjectMastery[]
  },

  // Get topic progress
  getTopicProgress: async (studentId: string) => {
    const res = await supabase.get(
      `/student_topic_progress?student_id=eq.${studentId}&select=*,topic:topics(*)`
    )
    return res.data as StudentTopicProgress[]
  },

  // Get lesson progress
  getLessonProgress: async (studentId: string) => {
    const res = await db.selectWhere('student_lesson_progress', { student_id: studentId })
    return res.data as StudentLessonProgress[]
  },

  // Update topic progress
  updateTopicProgress: async (studentId: string, topicId: number, data: Partial<StudentTopicProgress>) => {
    const res = await supabase.patch(
      `/student_topic_progress?student_id=eq.${studentId}&topic_id=eq.${topicId}`,
      data
    )
    return res.data?.[0] as StudentTopicProgress | undefined
  },

  // Update lesson progress
  updateLessonProgress: async (studentId: string, lessonId: number, data: Partial<StudentLessonProgress>) => {
    const res = await supabase.patch(
      `/student_lesson_progress?student_id=eq.${studentId}&lesson_id=eq.${lessonId}`,
      data
    )
    return res.data?.[0] as StudentLessonProgress | undefined
  },

  // Submit practice
  submitPractice: async (data: Omit<PracticeSubmission, 'id' | 'submitted_at'>) => {
    const res = await db.insert('practice_submissions', data)
    return res.data?.[0] as PracticeSubmission | undefined
  },

  // Submit quiz
  submitQuiz: async (data: Omit<QuizResult, 'id' | 'submitted_at'>) => {
    const res = await db.insert('quiz_results', data)
    return res.data?.[0] as QuizResult | undefined
  },
}

// ============================================
// MESSAGES API (NON-ANONYMOUS)
// ============================================
export const messages = {
  // Get conversations for a user
  getConversations: async (userId: string) => {
    const res = await supabase.get(
      `/messages?or=(sender_id.eq.${userId},receiver_id.eq.${userId})&order=created_at.desc&select=*,sender:profiles!messages_sender_id_fkey(*),receiver:profiles!messages_receiver_id_fkey(*)`
    )
    return res.data as Message[]
  },

  // Get messages between two users
  getConversation: async (userId: string, otherUserId: string) => {
    const res = await supabase.get(
      `/messages?or=(and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId}))&order=created_at.asc&select=*,sender:profiles!messages_sender_id_fkey(*),receiver:profiles!messages_receiver_id_fkey(*)`
    )
    return res.data as Message[]
  },

  // Send message
  send: async (data: Omit<Message, 'id' | 'created_at' | 'is_read'>) => {
    const res = await db.insert('messages', { ...data, is_read: false })
    return res.data?.[0] as Message | undefined
  },

  // Mark as read
  markAsRead: async (messageId: number) => {
    const res = await db.update('messages', messageId, { is_read: true })
    return res.data?.[0] as Message | undefined
  },

  // Get unread count
  getUnreadCount: async (userId: string) => {
    const res = await supabase.get(
      `/messages?receiver_id=eq.${userId}&is_read=eq.false&select=id`
    )
    return res.data?.length || 0
  },
}

// ============================================
// CHATBOT API
// ============================================
export const chatbot = {
  // Get chatbot logs for a student
  getStudentLogs: async (studentId: string) => {
    const res = await db.selectWhere('chatbot_logs', { student_id: studentId })
    return res.data as ChatbotLog[]
  },

  // Get all chatbot logs (teacher view)
  getAllLogs: async (status?: string) => {
    let query = '*'
    if (status) {
      const res = await supabase.get(
        `/chatbot_logs?status=eq.${status}&select=*,student:profiles(*)`
      )
      return res.data as ChatbotLog[]
    }
    const res = await supabase.get(
      `/chatbot_logs?select=*,student:profiles(*)`
    )
    return res.data as ChatbotLog[]
  },

  // Update log status
  updateStatus: async (logId: number, status: string, teacherNote?: string) => {
    const data: any = { status }
    if (teacherNote) data.teacher_note = teacherNote
    const res = await db.update('chatbot_logs', logId, data)
    return res.data?.[0] as ChatbotLog | undefined
  },
}

// ============================================
// TEACHER API
// ============================================
export const teacher = {
  // Get teacher dashboard data
  getDashboard: async (teacherId: string) => {
    const classesRes = await classes.getTeacherClasses(teacherId)
    return {
      classes: classesRes,
      totalStudents: classesRes.reduce((sum: number, c: any) => sum + (c.student_count || 0), 0),
    }
  },

  // Get student profiles for teacher
  getStudents: async (teacherId: string) => {
    const classesRes = await classes.getTeacherClasses(teacherId)
    const studentIds = new Set<string>()
    for (const cls of classesRes) {
      const students = await classes.getEnrolledStudents(cls.id)
      students.forEach((s) => studentIds.add(s.id))
    }
    const students = []
    for (const id of studentIds) {
      const profile = await profiles.get(id)
      if (profile) students.push(profile)
    }
    return students
  },

  // Get student profile with progress
  getStudentProfile: async (studentId: string) => {
    const profile = await profiles.get(studentId)
    const subjectMastery = await studentProgress.getSubjectMastery(studentId)
    const topicProgress = await studentProgress.getTopicProgress(studentId)
    return {
      profile,
      subjectMastery,
      topicProgress,
    }
  },
}

// ============================================
// ADMIN API
// ============================================
export const admin = {
  // Get all users
  getUsers: async (params?: { role?: string; search?: string }) => {
    let query = '*'
    if (params?.role) {
      const res = await db.selectWhere('profiles', { role: params.role })
      return res.data as Profile[]
    }
    const res = await db.select('profiles', query)
    return res.data as Profile[]
  },

  // Create user
  createUser: async (data: { email: string; password: string; name: string; role: string }) => {
    const res = await auth.signUp(data.email, data.password, data.name, data.role)
    return res
  },

  // Update user
  updateUser: async (userId: string, data: Partial<Profile>) => {
    const res = await profiles.update(userId, data)
    return res
  },

  // Delete user
  deleteUser: async (userId: string) => {
    await db.delete('profiles', userId)
  },

  // Get all classes
  getClasses: async () => {
    const res = await supabase.get(
      `/classes?select=*,teacher:profiles!classes_teacher_id_fkey(*)`
    )
    return res.data as Class[]
  },

  // Create class
  createClass: async (data: Omit<Class, 'id' | 'created_at'>) => {
    const res = await classes.create(data)
    return res
  },

  // Update class
  updateClass: async (classId: number, data: Partial<Class>) => {
    const res = await classes.update(classId, data)
    return res
  },

  // Delete class
  deleteClass: async (classId: number) => {
    await classes.delete(classId)
  },

  // Enroll students
  enrollStudents: async (classId: number, studentIds: string[]) => {
    const results = []
    for (const studentId of studentIds) {
      const res = await classes.enrollStudent(classId, studentId)
      results.push(res)
    }
    return results
  },
}

// ============================================
// PARENT API
// ============================================
export const parent = {
  // Get children
  getChildren: async (parentId: string) => {
    const res = await supabase.get(
      `/parent_child?parent_id=eq.${parentId}&select=child:profiles(*)`
    )
    return res.data.map((pc: any) => pc.child) as Profile[]
  },

  // Link child
  linkChild: async (parentId: string, enrollmentCode: string) => {
    // Find student by enrollment code
    const studentRes = await db.selectWhere('profiles', { enrollment_code: enrollmentCode })
    const student = studentRes.data?.[0]
    if (!student) throw new Error('Invalid enrollment code')
    const res = await db.insert('parent_child', {
      parent_id: parentId,
      child_id: student.id,
      enrollment_code: enrollmentCode,
    })
    return res.data?.[0]
  },

  // Get child progress
  getChildProgress: async (childId: string) => {
    const subjectMastery = await studentProgress.getSubjectMastery(childId)
    const topicProgress = await studentProgress.getTopicProgress(childId)
    return { subjectMastery, topicProgress }
  },
}