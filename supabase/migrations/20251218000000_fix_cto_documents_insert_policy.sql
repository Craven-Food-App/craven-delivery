-- Fix cto_documents table schema and RLS policies
-- This migration resolves conflicts between two different table definitions
-- and adds missing columns and policies for the ExecutiveWordProcessor

-- First, check if the table has the old schema (document_key as PK) or new schema (id as PK)
-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add id column if it doesn't exist (for word processor compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cto_documents' 
    AND column_name = 'id'
  ) THEN
    -- Add id column as UUID with default
    ALTER TABLE public.cto_documents ADD COLUMN id UUID DEFAULT gen_random_uuid();
    
    -- Create unique index on id
    CREATE UNIQUE INDEX IF NOT EXISTS cto_documents_id_key ON public.cto_documents(id);
  END IF;

  -- Add content column if it doesn't exist (for word processor)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cto_documents' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE public.cto_documents ADD COLUMN content JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cto_documents' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.cto_documents ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Drop existing SELECT-only policy and recreate with full permissions
DROP POLICY IF EXISTS "CTO can view all CTO documents" ON public.cto_documents;
DROP POLICY IF EXISTS "CTO can manage all cto_documents" ON public.cto_documents;

-- Create comprehensive policy for CTO to manage documents (covers all operations)
CREATE POLICY "CTO can manage all CTO documents"
  ON public.cto_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );

-- Add specific INSERT policy for clarity and debugging
CREATE POLICY "CTO can insert CTO documents"
  ON public.cto_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );

-- Add UPDATE policy
CREATE POLICY "CTO can update CTO documents"
  ON public.cto_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );

-- Add DELETE policy
CREATE POLICY "CTO can delete CTO documents"
  ON public.cto_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );

