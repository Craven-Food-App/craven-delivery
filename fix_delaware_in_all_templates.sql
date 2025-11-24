-- ============================================================================
-- FIX DELAWARE IN ALL TEMPLATES AND SETTINGS
-- Run this script in Supabase Dashboard SQL Editor
-- This will:
-- 1. Update company_settings to Delaware
-- 2. Verify templates use placeholders (not hardcoded Ohio)
-- 3. Show current state
-- ============================================================================

-- Step 1: Update company_settings to Delaware
UPDATE public.company_settings
SET 
  setting_value = 'Delaware',
  updated_at = now()
WHERE setting_key = 'state_of_incorporation';

UPDATE public.company_settings
SET 
  setting_value = 'Delaware Secretary of State',
  updated_at = now()
WHERE setting_key = 'state_filing_office';

-- Step 2: Verify company_settings
SELECT 'Company Settings:' as check_type, setting_key, setting_value 
FROM public.company_settings 
WHERE setting_key IN ('state_of_incorporation', 'state_filing_office', 'company_name')
ORDER BY setting_key;

-- Step 3: Check templates for hardcoded "Ohio" (should return 0 rows if using placeholders)
SELECT 'Templates with hardcoded Ohio:' as check_type, template_key, name
FROM public.document_templates
WHERE html_content LIKE '%State of Ohio%'
   OR html_content LIKE '%courts located in Ohio%'
   OR html_content LIKE '%laws of Ohio%'
   OR html_content LIKE '%Ohio%' AND html_content NOT LIKE '%{{governing_law_state}}%'
   OR html_content LIKE '%Ohio%' AND html_content NOT LIKE '%{{state_of_incorporation}}%'
   OR html_content LIKE '%Ohio%' AND html_content NOT LIKE '%{{state}}%'
   OR html_content LIKE '%Ohio%' AND html_content NOT LIKE '%{{company_state}}%';

-- Step 4: Show which templates use placeholders (should show all 7 templates)
SELECT 'Templates using placeholders:' as check_type, template_key, name,
  CASE 
    WHEN html_content LIKE '%{{governing_law_state}}%' THEN '✓ Uses governing_law_state'
    WHEN html_content LIKE '%{{state_of_incorporation}}%' THEN '✓ Uses state_of_incorporation'
    WHEN html_content LIKE '%{{state}}%' THEN '✓ Uses state'
    WHEN html_content LIKE '%{{company_state}}%' THEN '✓ Uses company_state'
    ELSE '⚠ Check manually'
  END as placeholder_status
FROM public.document_templates
WHERE template_key IN ('offer_letter', 'board_resolution', 'employment_agreement', 'stock_certificate', 'deferred_comp_addendum', 'confidentiality_ip', 'stock_issuance')
ORDER BY template_key;




