-- Run this in your Supabase Dashboard SQL Editor
-- Fix the classes table schema to match the new code

ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_year TEXT NOT NULL DEFAULT '2025-2026';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS subject TEXT;

-- Remove old columns that are no longer used
ALTER TABLE classes DROP COLUMN IF EXISTS room;
ALTER TABLE classes DROP COLUMN IF EXISTS schedule;
ALTER TABLE classes DROP COLUMN IF EXISTS subject_id;