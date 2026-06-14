-- ============================================
-- MINIMAL FIX: Create profiles table + RLS
-- Run this in Supabase SQL Editor
-- ============================================

-- Create profiles table (linked to Supabase auth.users)
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

-- Auto-create profile when user signs up
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

-- Create trigger (drops first if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- THIS IS THE KEY POLICY: Allow teachers to search student profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can view student profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Teachers can view student profiles" ON profiles
      FOR SELECT USING (
        role = 'student' AND
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
      );
  END IF;
END $$;

-- Drop and recreate class_student table with correct UUID types
DROP TABLE IF EXISTS class_student;

CREATE TABLE class_student (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Enable RLS on class_student
ALTER TABLE class_student ENABLE ROW LEVEL SECURITY;

-- RLS for class_student
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

-- Now create the policy on profiles that references class_student
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

-- Allow admins full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Admins can view all profiles" ON profiles
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;