// User/Profile types
export interface Profile {
  id: string
  name: string
  role: 'student' | 'teacher' | 'parent' | 'admin'
  avatar?: string
  enrollment_code?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  profile?: Profile
}

// Subject types
export interface Subject {
  id: number
  name: string
  code?: string
  created_at: string
}

// Class types
export interface Class {
  id: number
  name: string
  grade_level: string
  section: string
  school_year: string
  subject: string
  teacher_id: string
  is_active: boolean
  created_at: string
  // Joined fields
  teacher?: Profile
  student_count?: number
}

export interface ClassStudent {
  id: number
  class_id: number
  student_id: string
  enrolled_at: string
  // Joined fields
  student?: Profile
  class?: Class
}

// Curriculum types
export interface Quarter {
  id: number
  subject_id: number
  grade_level: string
  quarter_number: number
  title?: string
  created_at: string
}

export interface Topic {
  id: number
  quarter_id?: number
  class_id: number
  title: string
  description?: string
  order_index: number
  lesson_count: number
  created_at: string
  // Joined fields
  lessons?: Lesson[]
}

export interface Lesson {
  id: number
  topic_id: number
  title: string
  content?: string
  order_index: number
  created_at: string
  // Joined fields
  materials?: LessonMaterial[]
  links?: LessonLink[]
}

export interface LessonMaterial {
  id: number
  lesson_id: number
  file_name: string
  file_url: string
  file_type: string
  file_size?: string
  created_at: string
}

export interface LessonLink {
  id: number
  lesson_id: number
  title: string
  url: string
  created_at: string
}

// Student progress types
export interface StudentProfile {
  id: number
  student_id: string
  grade_level?: string
  section?: string
  total_xp: number
  streak_days: number
  last_active_date?: string
  diagnostic_score?: number
  diagnostic_completed: boolean
  created_at: string
}

export interface StudentSubjectMastery {
  id: number
  student_id: string
  subject_id: number
  mastery_score: number
  target_score: number
  created_at: string
  // Joined fields
  subject?: Subject
}

export interface StudentTopicProgress {
  id: number
  student_id: string
  topic_id: number
  status: 'locked' | 'active' | 'completed'
  mastery_score: number
  xp_earned: number
  created_at: string
  // Joined fields
  topic?: Topic
}

export interface StudentLessonProgress {
  id: number
  student_id: string
  lesson_id: number
  status: 'not_started' | 'in_progress' | 'completed'
  completed_at?: string
  created_at: string
}

// Message types
export interface Message {
  id: number
  sender_id: string
  receiver_id: string
  subject_id?: number
  content: string
  is_read: boolean
  created_at: string
  // Joined fields
  sender?: Profile
  receiver?: Profile
  subject?: Subject
}

// Chatbot types
export interface ChatbotLog {
  id: number
  student_id: string
  subject_id?: number
  question: string
  response: string
  confidence_score?: number
  status: 'ok' | 'flagged' | 'reviewed' | 'verified'
  reviewed_by?: string
  teacher_note?: string
  reviewed_at?: string
  created_at: string
  // Joined fields
  student?: Profile
  subject?: Subject
}

// Practice types
export interface PracticeSubmission {
  id: number
  student_id: string
  topic_id?: number
  score?: number
  total_questions?: number
  correct_answers?: number
  submitted_at: string
}

// Quiz types
export interface QuizResult {
  id: number
  student_id: string
  lesson_id: number
  score?: number
  total_questions?: number
  correct_answers?: number
  submitted_at: string
}

// Parent-child types
export interface ParentChild {
  id: number
  parent_id: string
  child_id: string
  enrollment_code?: string
  created_at: string
  // Joined fields
  child?: Profile
}

// Auth types
export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: string
  user: {
    id: string
    email: string
    user_metadata: object
  }
}

export interface AuthUser {
  id: string
  email: string
  user_metadata: object
  app_metadata: object
  created_at: string
  updated_at: string
}