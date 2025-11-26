-- Add created_at column to it_infrastructure table if it doesn't exist
-- This allows proper ordering by creation date

ALTER TABLE public.it_infrastructure 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing rows to have created_at set to now() if they don't have it
UPDATE public.it_infrastructure 
SET created_at = now() 
WHERE created_at IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_it_infrastructure_created_at 
ON public.it_infrastructure(created_at DESC);




