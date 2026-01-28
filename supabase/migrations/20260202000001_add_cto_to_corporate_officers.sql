-- Add executive titles as valid positions in corporate_officers table
-- CEO, CFO, and CTO are corporate officer positions per company bylaws (Section 5.1)
-- This allows using executive titles directly instead of only Delaware statutory positions

-- Drop the existing CHECK constraint
ALTER TABLE corporate_officers 
  DROP CONSTRAINT IF EXISTS corporate_officers_position_check;

-- Recreate the constraint with executive titles included
ALTER TABLE corporate_officers 
  ADD CONSTRAINT corporate_officers_position_check 
  CHECK (position IN ('president', 'secretary', 'treasurer', 'vice-president', 'assistant-secretary', 'assistant-treasurer', 'ceo', 'cfo', 'cto'));

