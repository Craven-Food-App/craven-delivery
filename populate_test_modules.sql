-- Quick SQL script to populate test modules
-- Run this directly in Supabase SQL Editor if migrations haven't run

-- First, check if modules exist
SELECT COUNT(*) as current_count FROM public.intern_test_modules WHERE is_archived = false;

-- Ensure unique constraint exists on name (if not already there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'intern_test_modules_name_key' 
    AND conrelid = 'public.intern_test_modules'::regclass
  ) THEN
    ALTER TABLE public.intern_test_modules ADD CONSTRAINT intern_test_modules_name_key UNIQUE (name);
    RAISE NOTICE 'Added unique constraint on name column';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END $$;

-- Delete any existing modules with these names first (optional - comment out if you want to keep existing)
-- DELETE FROM public.intern_test_modules WHERE name IN (
--   'Crave''n Culture & Ownership Assessment',
--   'Role Understanding & Accountability Test',
--   'Platform Systems Audit',
--   'Internal Tool / Automation Build',
--   'Executive Decision Memo (Technology)',
--   'KPI Framework Design',
--   'Process Bottleneck & Risk Analysis',
--   'Executive Readiness Brief',
--   'Driver Onboarding Workflow Mapping',
--   'Surge Operations Scenario',
--   'Safety & Compliance Knowledge Test',
--   'Internship Learning Objectives & Initial Reflection',
--   'Final Internship Summary & Self-Assessment'
-- );

-- Insert all 13 modules (will skip if they already exist)
INSERT INTO public.intern_test_modules (
  name, description, category, competency_tags, level, test_type,
  time_limit_minutes, pass_threshold, retake_limit, reviewer_type,
  artifact_required, counts_toward_promotion, allowed_role_states,
  is_archived, version, instructions
) VALUES
  (
    'Crave''n Culture & Ownership Assessment',
    'Evaluates alignment with Crave''n values, founder-level ownership, and ethical judgment.',
    'Onboarding',
    ARRAY['culture-alignment', 'ownership', 'ethics'],
    'L1', 'Quiz', 30, 80, 1, 'Manager',
    true, false, ARRAY['INTERN_ACTIVE'],
    false, 1,
    'Complete the quiz questions and provide a short written response demonstrating your understanding of Crave''n culture and ownership principles.'
  ),
  (
    'Role Understanding & Accountability Test',
    'Assesses understanding of role responsibilities and accountability framework.',
    'Onboarding',
    ARRAY['role-clarity', 'accountability'],
    'L1', 'Memo', NULL, 70, 3, 'Manager',
    false, false, ARRAY['INTERN_ACTIVE'],
    false, 1,
    'Write a comprehensive document explaining your understanding of your role, responsibilities, and the accountability framework.'
  ),
  (
    'Platform Systems Audit',
    'Comprehensive audit of platform systems architecture, identifying strengths, weaknesses, and improvement opportunities.',
    'Tech',
    ARRAY['systems-thinking', 'architecture'],
    'L3', 'Artifact', 120, 85, 3, 'Executive',
    true, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
    false, 1,
    'Conduct a comprehensive audit of the platform systems. Provide written analysis and architectural diagrams identifying strengths, weaknesses, and improvement opportunities.'
  ),
  (
    'Internal Tool / Automation Build',
    'Build a functional internal tool or automation that solves a real business problem.',
    'Tech',
    ARRAY['execution', 'engineering'],
    'L3', 'Build', 4320, 70, 3, 'Executive',
    true, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
    false, 1,
    'Build a functional internal tool or automation that solves a real business problem. Deliver working code, documentation, and deployment instructions.'
  ),
  (
    'Executive Decision Memo (Technology)',
    'Write an executive-level decision memo addressing a critical technology decision with strategic implications.',
    'Leadership',
    ARRAY['judgment', 'executive-communication'],
    'L3', 'Memo', NULL, 80, 3, 'Executive',
    false, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
    false, 1,
    'Write an executive-level decision memo addressing a critical technology decision. Include problem statement, options analysis, recommendation, and strategic implications.'
  ),
  (
    'KPI Framework Design',
    'Design a comprehensive KPI framework for a business unit or strategic initiative.',
    'Ops',
    ARRAY['analytics', 'strategic-ops'],
    'L3', 'Artifact', NULL, 85, 3, 'Executive',
    true, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
    false, 1,
    'Design a comprehensive KPI framework for a business unit or strategic initiative. Include metric definitions, targets, measurement methodology, and reporting structure.'
  ),
  (
    'Process Bottleneck & Risk Analysis',
    'Analyze a business process to identify bottlenecks and risks, proposing actionable solutions.',
    'Quality',
    ARRAY['process-design', 'risk'],
    'L2', 'Scenario', NULL, 80, 3, 'Manager',
    false, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
    false, 1,
    'Analyze a provided business process scenario to identify bottlenecks and risks. Propose actionable solutions with implementation recommendations.'
  ),
  (
    'Executive Readiness Brief',
    'Prepare an executive-level readiness brief demonstrating strategic thinking and executive judgment.',
    'Leadership',
    ARRAY['executive-judgment'],
    'L3', 'Memo', NULL, 80, 3, 'Executive',
    false, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
    false, 1,
    'Prepare an executive-level readiness brief on a strategic topic. Demonstrate strategic thinking, executive judgment, and clear communication.'
  ),
  (
    'Driver Onboarding Workflow Mapping',
    'Map and optimize the driver onboarding workflow, identifying improvements and efficiency gains.',
    'Ops',
    ARRAY['ops-design', 'logistics'],
    'L2', 'Artifact', NULL, 80, 3, 'Manager',
    true, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
    false, 1,
    'Map the current driver onboarding workflow and propose optimizations. Include process diagrams, pain points, and efficiency improvement recommendations.'
  ),
  (
    'Surge Operations Scenario',
    'Respond to a surge operations scenario, demonstrating prioritization and decision-making under pressure.',
    'Ops',
    ARRAY['prioritization', 'decision-making'],
    'L2', 'Scenario', NULL, 80, 3, 'Manager',
    false, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
    false, 1,
    'Respond to a provided surge operations scenario. Demonstrate prioritization, decision-making under pressure, and operational judgment.'
  ),
  (
    'Safety & Compliance Knowledge Test',
    'Comprehensive knowledge test covering safety protocols and regulatory compliance requirements.',
    'Compliance',
    ARRAY['safety', 'regulatory'],
    'L1', 'Quiz', NULL, 90, 3, 'Auto',
    false, false, ARRAY['INTERN_ACTIVE'],
    false, 1,
    'Complete the safety and compliance knowledge test. This is a baseline requirement covering safety protocols and regulatory compliance.'
  ),
  (
    'Internship Learning Objectives & Initial Reflection',
    'Document learning objectives and provide initial reflection on internship experience for academic credit.',
    'Onboarding',
    ARRAY['academic-alignment', 'reflection'],
    'L1', 'Memo', NULL, 70, 999, 'Manager',
    false, false, ARRAY['INTERN_ACTIVE'],
    false, 1,
    'Document your learning objectives for this internship and provide an initial reflection on your experience. This supports academic credit requirements.'
  ),
  (
    'Final Internship Summary & Self-Assessment',
    'Comprehensive summary and self-assessment of internship experience, growth, and learning outcomes for academic credit.',
    'Leadership',
    ARRAY['reflection', 'professional-growth'],
    'L2', 'Memo', NULL, 70, 3, 'Manager',
    false, false, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
    false, 1,
    'Provide a comprehensive summary and self-assessment of your internship experience. Include growth, learning outcomes, achievements, and future goals. This supports academic credit requirements.'
  )
ON CONFLICT (name) DO NOTHING;

-- Verify the count
SELECT COUNT(*) as total_modules FROM public.intern_test_modules WHERE is_archived = false;

-- Show all modules
SELECT name, category, level, counts_toward_promotion 
FROM public.intern_test_modules 
WHERE is_archived = false 
ORDER BY category, level, name;

