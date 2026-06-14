-- Learnshift Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  avatar TEXT,
  enrollment_code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SUBJECTS TABLE
-- ============================================
CREATE TABLE subjects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default subjects
INSERT INTO subjects (name, code) VALUES
  ('Mathematics', 'MATH'),
  ('Science', 'SCI'),
  ('English', 'ENG'),
  ('Filipino', 'FIL'),
  ('Araling Panlipunan', 'AP'),
  ('MAPEH', 'MAPEH'),
  ('TLE', 'TLE'),
  ('Values Education', 'VE');

-- ============================================
-- CLASSES TABLE
-- ============================================
CREATE TABLE classes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  section TEXT NOT NULL,
  school_year TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CLASS-STUDENT ENROLLMENT
-- ============================================
CREATE TABLE class_student (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- ============================================
-- QUARTERS TABLE
-- ============================================
CREATE TABLE quarters (
  id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT REFERENCES subjects(id) ON DELETE CASCADE,
  grade_level TEXT NOT NULL,
  quarter_number SMALLINT NOT NULL CHECK (quarter_number BETWEEN 1 AND 4),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TOPICS TABLE (Learning Units)
-- ============================================
CREATE TABLE topics (
  id BIGSERIAL PRIMARY KEY,
  quarter_id BIGINT REFERENCES quarters(id) ON DELETE CASCADE,
  class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  lesson_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- LESSONS TABLE
-- ============================================
CREATE TABLE lessons (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- LESSON MATERIALS (PDFs, documents, videos)
-- ============================================
CREATE TABLE lesson_materials (
  id BIGSERIAL PRIMARY KEY,
  lesson_id BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- LESSON EXTERNAL LINKS
-- ============================================
CREATE TABLE lesson_links (
  id BIGSERIAL PRIMARY KEY,
  lesson_id BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STUDENT PROFILES
-- ============================================
CREATE TABLE student_profiles (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  grade_level TEXT,
  section TEXT,
  total_xp INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_active_date DATE,
  diagnostic_score INT,
  diagnostic_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STUDENT SUBJECT MASTERY
-- ============================================
CREATE TABLE student_subject_mastery (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id BIGINT REFERENCES subjects(id) ON DELETE CASCADE,
  mastery_score SMALLINT DEFAULT 0,
  target_score SMALLINT DEFAULT 85,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, subject_id)
);

-- ============================================
-- STUDENT TOPIC PROGRESS
-- ============================================
CREATE TABLE student_topic_progress (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  topic_id BIGINT REFERENCES topics(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'active', 'completed')),
  mastery_score SMALLINT DEFAULT 0,
  xp_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, topic_id)
);

-- ============================================
-- STUDENT LESSON PROGRESS
-- ============================================
CREATE TABLE student_lesson_progress (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

-- ============================================
-- MESSAGES (NON-ANONYMOUS Student-Teacher Chat)
-- ============================================
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id BIGINT REFERENCES subjects(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CHATBOT LOGS
-- ============================================
CREATE TABLE chatbot_logs (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id BIGINT REFERENCES subjects(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  confidence_score SMALLINT,
  status TEXT DEFAULT 'ok' CHECK (status IN ('ok', 'flagged', 'reviewed', 'verified')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  teacher_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PRACTICE SUBMISSIONS
-- ============================================
CREATE TABLE practice_submissions (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  topic_id BIGINT,
  score SMALLINT,
  total_questions INT,
  correct_answers INT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- QUIZ RESULTS
-- ============================================
CREATE TABLE quiz_results (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
  score SMALLINT,
  total_questions INT,
  correct_answers INT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PARENT-CHILD LINKING
-- ============================================
CREATE TABLE parent_child (
  id BIGSERIAL PRIMARY KEY,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  enrollment_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subject_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Teachers can view student profiles" ON profiles
  FOR SELECT USING (
    role = 'student' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Teachers can view class student profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_student cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.student_id = profiles.id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Classes policies
CREATE POLICY "Teachers can view own classes" ON classes
  FOR SELECT USING (
    teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Students can view enrolled classes" ON classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM class_student WHERE class_id = classes.id AND student_id = auth.uid())
  );

CREATE POLICY "Teachers can insert classes" ON classes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Teachers can update own classes" ON classes
  FOR UPDATE USING (
    teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can delete own classes" ON classes
  FOR DELETE USING (
    teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Class-student policies
CREATE POLICY "Teachers can view own class students" ON class_student
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Students can view own enrollments" ON class_student
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can enroll students" ON class_student
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can remove students" ON class_student
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Topics policies
CREATE POLICY "Teachers can view class topics" ON topics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM class_student WHERE class_id = topics.class_id AND student_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can manage topics" ON topics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lessons policies
CREATE POLICY "Users can view lessons" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM topics t
      JOIN classes c ON t.class_id = c.id
      WHERE t.id = lessons.topic_id AND (
        c.teacher_id = auth.uid() OR
        EXISTS (SELECT 1 FROM class_student WHERE class_id = c.id AND student_id = auth.uid())
      )
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can manage lessons" ON lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM topics t
      JOIN classes c ON t.class_id = c.id
      WHERE t.id = lessons.topic_id AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lesson materials policies
CREATE POLICY "Users can view lesson materials" ON lesson_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN topics t ON l.topic_id = t.id
      JOIN classes c ON t.class_id = c.id
      WHERE l.id = lesson_materials.lesson_id AND (
        c.teacher_id = auth.uid() OR
        EXISTS (SELECT 1 FROM class_student WHERE class_id = c.id AND student_id = auth.uid())
      )
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can manage lesson materials" ON lesson_materials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN topics t ON l.topic_id = t.id
      JOIN classes c ON t.class_id = c.id
      WHERE l.id = lesson_materials.lesson_id AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lesson links policies
CREATE POLICY "Users can view lesson links" ON lesson_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN topics t ON l.topic_id = t.id
      JOIN classes c ON t.class_id = c.id
      WHERE l.id = lesson_links.lesson_id AND (
        c.teacher_id = auth.uid() OR
        EXISTS (SELECT 1 FROM class_student WHERE class_id = c.id AND student_id = auth.uid())
      )
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can manage lesson links" ON lesson_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN topics t ON l.topic_id = t.id
      JOIN classes c ON t.class_id = c.id
      WHERE l.id = lesson_links.lesson_id AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Messages policies
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update own received messages" ON messages
  FOR UPDATE USING (receiver_id = auth.uid());

-- Chatbot logs policies
CREATE POLICY "Students can view own chatbot logs" ON chatbot_logs
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Students can insert chatbot logs" ON chatbot_logs
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can update chatbot logs" ON chatbot_logs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Practice submissions policies
CREATE POLICY "Students can view own submissions" ON practice_submissions
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Students can insert submissions" ON practice_submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Quiz results policies
CREATE POLICY "Students can view own quiz results" ON quiz_results
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Students can insert quiz results" ON quiz_results
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Parent-child policies
CREATE POLICY "Parents can view own children" ON parent_child
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Parents can link children" ON parent_child
  FOR INSERT WITH CHECK (parent_id = auth.uid());

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Create storage bucket for learning materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('learnshift', 'learnshift', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'learnshift' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view files" ON storage.objects
  FOR SELECT USING (bucket_id = 'learnshift');

CREATE POLICY "Owners can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'learnshift' AND
    auth.uid() = owner
  );