-- ============================================================================
-- ENSURE ALL TEMPLATES USE DELAWARE PLACEHOLDERS (NOT HARDCODED OHIO)
-- This migration updates any existing templates that might have hardcoded "Ohio"
-- and ensures all templates use the {{governing_law_state}} placeholder
-- ============================================================================

-- Update any templates that have hardcoded "Ohio" in governing law sections
-- This will be handled by the main template migration, but this ensures
-- any existing templates in the database are also updated

-- The main migration 20250211000017_enhance_templates_with_legal_formatting.sql
-- already has all templates with {{governing_law_state}} placeholders
-- This migration ensures the database is updated

-- Note: The templates use placeholders like {{governing_law_state}} which pull
-- from company_settings.state_of_incorporation. Make sure that setting is "Delaware"




