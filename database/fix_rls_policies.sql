-- Run this in your Supabase Dashboard SQL Editor
-- This fixes the RLS policies so teachers can search and manage students

-- Allow teachers to view student profiles (for searching)
CREATE POLICY "Teachers can view student profiles" ON profiles
  FOR SELECT USING (
    role = 'student' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );

-- Allow teachers to view profiles of students enrolled in their classes
CREATE POLICY "Teachers can view class student profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_student cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.student_id = profiles.id AND c.teacher_id = auth.uid()
    )
  );