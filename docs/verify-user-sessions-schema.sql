-- Verification Script: Check user_sessions table structure
-- Run this first to see what columns currently exist

-- 1. Show all columns in user_sessions table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'user_sessions'
ORDER BY ordinal_position;

-- 2. Show all indexes on user_sessions table
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_sessions'
ORDER BY indexname;

-- 3. Check if specific columns exist
SELECT 
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_sessions' 
    AND column_name = 'portal_type'
  ) AS has_portal_type,
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_sessions' 
    AND column_name = 'is_active'
  ) AS has_is_active;

-- 4. Sample data (to see what's actually stored)
SELECT * 
FROM user_sessions 
LIMIT 5;

