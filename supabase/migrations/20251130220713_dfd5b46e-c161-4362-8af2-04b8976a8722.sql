-- Add paid_at column to expense_requests table
ALTER TABLE expense_requests 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;