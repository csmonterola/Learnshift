import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './components/auth/AuthContext'
import { StudentLayout } from './components/layout/StudentLayout'
import { TeacherLayout } from './components/layout/TeacherLayout'
import { ParentLayout } from './components/layout/ParentLayout'
import { Landing } from './pages/login/Landing'

// ── Student ──────────────────────────────────────────────────────
import { StudentDashboard }  from './pages/student/Dashboard'
import { StudentSubjects }   from './pages/student/Subjects'
import { StudentSkillTree }  from './pages/student/SkillTree'
import { StudentPractice }   from './pages/student/Practice'
import { StudentProgress }   from './pages/student/Progress'
import { StudentDiagnostic } from './pages/student/Diagnostic'
import { StudentAskTeacher } from './pages/student/AskTeacher'

// ── Teacher ──────────────────────────────────────────────────────
import { TeacherDashboard }       from './pages/teacher/Dashboard'
import { TeacherStudentProfiles } from './pages/teacher/StudentProfiles'
import { TeacherContentManager }  from './pages/teacher/ContentManager'
import { TeacherAIMonitoring }    from './pages/teacher/AIMonitoring'

import { AdminLayout }            from './components/layout/AdminLayout'

// ── Admin ────────────────────────────────────────────────────────
import { AdminDashboard }          from './pages/admin/Dashboard'
import { AdminAccountGeneration }  from './pages/admin/AccountGeneration'
import { AdminUserDirectory }      from './pages/admin/UserDirectory'
import { AdminClassManagement }    from './pages/admin/ClassManagement'
import { AdminSettings }           from './pages/admin/Settings'
import { ParentDashboard }       from './pages/parent/Dashboard'
import { ParentCourseMaterials } from './pages/parent/CourseMaterials'
import { ParentGuidedSessions }  from './pages/parent/GuidedSessions'
import { ParentSettings }        from './pages/parent/Settings'

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
          <Route path="/" element={<Landing />} />

          {/* ── Student ── */}
          <Route element={<StudentLayout />}>
            <Route path="/student"            element={<StudentDashboard />} />
            <Route path="/student/subjects"   element={<StudentSubjects />} />
            <Route path="/student/skill-tree" element={<StudentSkillTree />} />
            <Route path="/student/practice"   element={<StudentPractice />} />
            <Route path="/student/ask"        element={<StudentAskTeacher />} />
            <Route path="/student/progress"   element={<StudentProgress />} />
            <Route path="/student/diagnostic" element={<StudentDiagnostic />} />
            <Route path="/student/settings"   element={<Placeholder label="Settings" />} />
          </Route>

          {/* ── Teacher ── */}
          <Route element={<TeacherLayout />}>
            <Route path="/teacher"          element={<TeacherDashboard />} />
            <Route path="/teacher/students" element={<TeacherStudentProfiles />} />
            <Route path="/teacher/content"  element={<TeacherContentManager />} />
            <Route path="/teacher/ai-logs"  element={<TeacherAIMonitoring />} />
            <Route path="/teacher/settings" element={<Placeholder label="Settings" />} />
          </Route>

          {/* ── Admin ── */}
          <Route element={<AdminLayout />}>
            <Route path="/admin"                        element={<AdminDashboard />} />
            <Route path="/admin/account-generation"     element={<AdminAccountGeneration />} />
            <Route path="/admin/directory"              element={<AdminUserDirectory />} />
            <Route path="/admin/classes"                element={<AdminClassManagement />} />
            <Route path="/admin/settings"               element={<AdminSettings />} />
          </Route>

          {/* ── Parent ── */}
          <Route element={<ParentLayout />}>
            <Route path="/parent"                    element={<ParentDashboard />} />
            <Route path="/parent/course-materials"   element={<ParentCourseMaterials />} />
            <Route path="/parent/guided-sessions"    element={<ParentGuidedSessions />} />
            <Route path="/parent/settings"           element={<ParentSettings />} />
          </Route>


        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
