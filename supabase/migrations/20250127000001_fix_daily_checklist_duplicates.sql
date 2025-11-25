-- Fix duplicate tasks in cto_daily_checklist
-- Ensures unique constraint exists and removes duplicates

-- First, remove duplicates keeping the oldest one
DELETE FROM public.cto_daily_checklist a
USING public.cto_daily_checklist b
WHERE a.id > b.id
  AND a.checklist_date = b.checklist_date
  AND a.task_category = b.task_category
  AND a.task_name = b.task_name;

-- Ensure unique constraint exists
DO $$
BEGIN
  -- Drop constraint if it exists
  ALTER TABLE public.cto_daily_checklist 
    DROP CONSTRAINT IF EXISTS cto_daily_checklist_checklist_date_task_category_task_name_key;
  
  -- Add unique constraint
  ALTER TABLE public.cto_daily_checklist 
    ADD CONSTRAINT cto_daily_checklist_checklist_date_task_category_task_name_key 
    UNIQUE (checklist_date, task_category, task_name);
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, ignore
    NULL;
END $$;

-- Ensure is_completed column exists
DO $$
BEGIN
  -- Add is_completed if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'cto_daily_checklist' 
    AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE public.cto_daily_checklist 
      ADD COLUMN is_completed BOOLEAN DEFAULT false;
    
    -- Initialize is_completed from completed if that column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'cto_daily_checklist' 
      AND column_name = 'completed'
    ) THEN
      UPDATE public.cto_daily_checklist
      SET is_completed = COALESCE(completed, false);
    END IF;
  END IF;
  
  -- Add completed column if it doesn't exist (for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'cto_daily_checklist' 
    AND column_name = 'completed'
  ) THEN
    ALTER TABLE public.cto_daily_checklist 
      ADD COLUMN completed BOOLEAN DEFAULT false;
    
    -- Sync completed with is_completed
    UPDATE public.cto_daily_checklist
    SET completed = COALESCE(is_completed, false);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cto_daily_checklist_date_category 
ON public.cto_daily_checklist(checklist_date, task_category);

COMMENT ON CONSTRAINT cto_daily_checklist_checklist_date_task_category_task_name_key ON public.cto_daily_checklist 
IS 'Prevents duplicate tasks for the same date, category, and name';

