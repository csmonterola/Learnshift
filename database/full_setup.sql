-- ============================================
-- FULL DATABASE SETUP FOR SUPABASE
-- Run this ENTIRE file in Supabase SQL Editor
-- This creates all tables and RLS policies
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
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

-- Drop trigger if exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SUBJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subjects (
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
  ('Values Education', 'VE')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- CLASSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS classes (
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
CREATE TABLE IF NOT EXISTS class_student (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- ============================================
-- TOPICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS topics (
  id BIGSERIAL PRIMARY KEY,
  quarter_id BIGINT,
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
CREATE TABLE IF NOT EXISTS lessons (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- LESSON MATERIALS
-- ============================================
CREATE TABLE IF NOT EXISTS lesson_materials (
  id BIGSERIAL PRIMARY KEY,
  lesson_id BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- LESSON LINKS
-- ============================================
CREATE TABLE IF NOT EXISTS lesson_links (
  id BIGSERIAL PRIMARY KEY,
  lesson_id BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CHATBOT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS chatbot_logs (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS practice_submissions (
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
CREATE TABLE IF NOT EXISTS quiz_results (
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
CREATE TABLE IF NOT EXISTS parent_child (
  id BIGSERIAL PRIMARY KEY,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  enrollment_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can view own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can view student profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Teachers can view student profiles" ON profiles
      FOR SELECT USING (
        role = 'student' AND
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can view class student profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Teachers can view class student profiles" ON profiles
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM class_student cs
          JOIN classes c ON cs.class_id = c.id
          WHERE cs.student_id = profiles.id AND c.teacher_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Admins can view all profiles" ON profiles
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Admins can insert profiles" ON profiles
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Admins can update all profiles" ON profiles
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Admins can delete profiles" ON profiles
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Classes policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can view own classes' AND tablename = 'classes') THEN
    CREATE POLICY "Teachers can view own classes" ON classes
      FOR SELECT USING (
        teacher_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can view enrolled classes' AND tablename = 'classes') THEN
    CREATE POLICY "Students can view enrolled classes" ON classes
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM class_student WHERE class_id = classes.id AND student_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can insert classes' AND tablename = 'classes') THEN
    CREATE POLICY "Teachers can insert classes" ON classes
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can update own classes' AND tablename = 'classes') THEN
    CREATE POLICY "Teachers can update own classes" ON classes
      FOR UPDATE USING (
        teacher_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can delete own classes' AND tablename = 'classes') THEN
    CREATE POLICY "Teachers can delete own classes" ON classes
      FOR DELETE USING (
        teacher_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Class-student policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can view own class students' AND tablename = 'class_student') THEN
    CREATE POLICY "Teachers can view own class students" ON class_student
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can view own enrollments' AND tablename = 'class_student') THEN
    CREATE POLICY "Students can view own enrollments" ON class_student
      FOR SELECT USING (student_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can enroll students' AND tablename = 'class_student') THEN
    CREATE POLICY "Teachers can enroll students" ON class_student
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can remove students' AND tablename = 'class_student') THEN
    CREATE POLICY "Teachers can remove students" ON class_student
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Topics policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can view class topics' AND tablename = 'topics') THEN
    CREATE POLICY "Teachers can view class topics" ON topics
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM class_student WHERE class_id = topics.class_id AND student_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can manage topics' AND tablename = 'topics') THEN
    CREATE POLICY "Teachers can manage topics" ON topics
      FOR ALL USING (
        EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Lessons policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view lessons' AND tablename = 'lessons') THEN
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
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can manage lessons' AND tablename = 'lessons') THEN
    CREATE POLICY "Teachers can manage lessons" ON lessons
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM topics t
          JOIN classes c ON t.class_id = c.id
          WHERE t.id = lessons.topic_id AND c.teacher_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Messages policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own messages' AND tablename = 'messages') THEN
    CREATE POLICY "Users can view own messages" ON messages
      FOR SELECT USING (
        sender_id = auth.uid() OR receiver_id = auth.uid()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can send messages' AND tablename = 'messages') THEN
    CREATE POLICY "Users can send messages" ON messages
      FOR INSERT WITH CHECK (sender_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own received messages' AND tablename = 'messages') THEN
    CREATE POLICY "Users can update own received messages" ON messages
      FOR UPDATE USING (receiver_id = auth.uid());
  END IF;
END $$;

-- Chatbot logs policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can view own chatbot logs' AND tablename = 'chatbot_logs') THEN
    CREATE POLICY "Students can view own chatbot logs" ON chatbot_logs
      FOR SELECT USING (
        student_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher') OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can insert chatbot logs' AND tablename = 'chatbot_logs') THEN
    CREATE POLICY "Students can insert chatbot logs" ON chatbot_logs
      FOR INSERT WITH CHECK (student_id = auth.uid());
  END IF;
END $$;

-- Practice submissions policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can view own submissions' AND tablename = 'practice_submissions') THEN
    CREATE POLICY "Students can view own submissions" ON practice_submissions
      FOR SELECT USING (
        student_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can insert submissions' AND tablename = 'practice_submissions') THEN
    CREATE POLICY "Students can insert submissions" ON practice_submissions
      FOR INSERT WITH CHECK (student_id = auth.uid());
  END IF;
END $$;

-- Quiz results policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can view own quiz results' AND tablename = 'quiz_results') THEN
    CREATE POLICY "Students can view own quiz results" ON quiz_results
      FOR SELECT USING (
        student_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can insert quiz results' AND tablename = 'quiz_results') THEN
    CREATE POLICY "Students can insert quiz results" ON quiz_results
      FOR INSERT WITH CHECK (student_id = auth.uid());
  END IF;
END $$;

-- Parent-child policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view own children' AND tablename = 'parent_child') THEN
    CREATE POLICY "Parents can view own children" ON parent_child
      FOR SELECT USING (parent_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can link children' AND tablename = 'parent_child') THEN
    CREATE POLICY "Parents can link children" ON parent_child
      FOR INSERT WITH CHECK (parent_id = auth.uid());
  END IF;
END $$;

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('learnshift', 'learnshift', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can upload" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'learnshift' AND
        auth.role() = 'authenticated'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view files' AND tablename = 'objects') THEN
    CREATE POLICY "Anyone can view files" ON storage.objects
      FOR SELECT USING (bucket_id = 'learnshift');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can delete own files' AND tablename = 'objects') THEN
    CREATE POLICY "Owners can delete own files" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'learnshift' AND
        auth.uid() = owner
      );
  END IF;
END $$;