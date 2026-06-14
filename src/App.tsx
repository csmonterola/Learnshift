import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './components/auth/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AIChat } from './components/AIChat'

// Layouts
import { StudentLayout } from './components/layout/StudentLayout'
import { TeacherLayout } from './components/layout/TeacherLayout'
import { AdminLayout } from './components/layout/AdminLayout'
import { ParentLayout } from './components/layout/ParentLayout'

// Login
import { Landing } from './pages/login/Landing'

// Student Pages
import { StudentDashboard } from './pages/student/Dashboard'
import { StudentClasses } from './pages/student/Classes'
import { StudentClassPage } from './pages/student/ClassPage'
import { StudentTopicPage } from './pages/student/TopicPage'
import { StudentLessonView } from './pages/student/LessonView'
import { StudentNotebook } from './pages/student/Notebook'
import { StudentMessages } from './pages/student/Messages'
import { StudentSubjects } from './pages/student/Subjects'
import { StudentSkillTree } from './pages/student/SkillTree'
import { StudentPractice } from './pages/student/Practice'
import { StudentProgress } from './pages/student/Progress'
import { StudentDiagnostic } from './pages/student/Diagnostic'

// Teacher Pages
import { TeacherDashboard } from './pages/teacher/Dashboard'
import { TeacherClasses } from './pages/teacher/Classes'
import { TeacherClassDetail } from './pages/teacher/ClassDetail'
import { TeacherClassStudents } from './pages/teacher/ClassStudents'
import { TeacherMessages } from './pages/teacher/Messages'
import { TeacherStudentProfiles } from './pages/teacher/StudentProfiles'
import { TeacherContentManager } from './pages/teacher/ContentManager'
import { TeacherAIMonitoring } from './pages/teacher/AIMonitoring'

// Admin Pages
import { AdminDashboard } from './pages/admin/Dashboard'
import { AdminAccountGeneration } from './pages/admin/AccountGeneration'
import { AdminUserDirectory } from './pages/admin/UserDirectory'
import { AdminClassManagement } from './pages/admin/ClassManagement'
import { AdminSettings } from './pages/admin/Settings'

// Parent Pages
import { ParentDashboard } from './pages/parent/Dashboard'
import { ParentCourseMaterials } from './pages/parent/CourseMaterials'
import { ParentGuidedSessions } from './pages/parent/GuidedSessions'
import { ParentSettings } from './pages/parent/Settings'

const Placeholder = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center h-64 text-gray-400 font-medium text-lg">
    {label} — coming soon
  </div>
)

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<StudentLayout />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/classes" element={<StudentClasses />} />
              <Route path="/student/class/:classId" element={<StudentClassPage />} />
              <Route path="/student/class/:classId/topic/:topicId" element={<StudentTopicPage />} />
              <Route path="/student/class/:classId/topic/:topicId/lesson/:lessonId" element={<StudentLessonView />} />
              <Route path="/student/class/:classId/topic/:topicId/lesson/:lessonId/notebook" element={<StudentNotebook />} />
              <Route path="/student/messages" element={<StudentMessages />} />
              <Route path="/student/subjects" element={<StudentSubjects />} />
              <Route path="/student/skill-tree" element={<StudentSkillTree />} />
              <Route path="/student/practice" element={<StudentPractice />} />
              <Route path="/student/progress" element={<StudentProgress />} />
              <Route path="/student/diagnostic" element={<StudentDiagnostic />} />
              <Route path="/student/settings" element={<Placeholder label="Settings" />} />
            </Route>
          </Route>

          {/* Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route element={<TeacherLayout />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/classes" element={<TeacherClasses />} />
              <Route path="/teacher/class/:classId" element={<TeacherClassDetail />} />
              <Route path="/teacher/class/:classId/students" element={<TeacherClassStudents />} />
              <Route path="/teacher/messages" element={<TeacherMessages />} />
              <Route path="/teacher/students" element={<TeacherStudentProfiles />} />
              <Route path="/teacher/content" element={<TeacherContentManager />} />
              <Route path="/teacher/ai-logs" element={<TeacherAIMonitoring />} />
              <Route path="/teacher/settings" element={<Placeholder label="Settings" />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/account-generation" element={<AdminAccountGeneration />} />
              <Route path="/admin/directory" element={<AdminUserDirectory />} />
              <Route path="/admin/classes" element={<AdminClassManagement />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>
          </Route>

          {/* Parent Routes */}
          <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
            <Route element={<ParentLayout />}>
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="/parent/course-materials" element={<ParentCourseMaterials />} />
              <Route path="/parent/guided-sessions" element={<ParentGuidedSessions />} />
              <Route path="/parent/settings" element={<ParentSettings />} />
            </Route>
          </Route>
        </Routes>

        {/* Floating AI Chat - Visible on all pages */}
        <AIChat />
      </BrowserRouter>
    </AuthProvider>
  )
}