-- Simple SQL script to populate test modules
-- Run this directly in Supabase SQL Editor
-- This version checks for existing modules before inserting

-- Check current count
SELECT COUNT(*) as current_count FROM public.intern_test_modules WHERE is_archived = false;

-- Insert modules one by one, checking if they exist first
DO $$
BEGIN
  -- MODULE 1
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'Crave''n Culture & Ownership Assessment') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, time_limit_minutes, pass_threshold, retake_limit, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, is_archived, version, instructions)
    VALUES ('Crave''n Culture & Ownership Assessment', 'Evaluates alignment with Crave''n values, founder-level ownership, and ethical judgment.', 'Onboarding', ARRAY['culture-alignment', 'ownership', 'ethics'], 'L1', 'Quiz', 30, 80, 1, 'Manager', true, false, ARRAY['INTERN_ACTIVE'], false, 1, 'Complete the quiz questions and provide a short written response demonstrating your understanding of Crave''n culture and ownership principles.');
  END IF;

  -- MODULE 2
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'Role Understanding & Accountability Test') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, pass_threshold, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, is_archived, version, instructions)
    VALUES ('Role Understanding & Accountability Test', 'Assesses understanding of role responsibilities and accountability framework.', 'Onboarding', ARRAY['role-clarity', 'accountability'], 'L1', 'Memo', 70, 'Manager', false, false, ARRAY['INTERN_ACTIVE'], false, 1, 'Write a comprehensive document explaining your understanding of your role, responsibilities, and the accountability framework.');
  END IF;

  -- MODULE 3
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'Platform Systems Audit') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, time_limit_minutes, pass_threshold, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, is_archived, version, instructions)
    VALUES ('Platform Systems Audit', 'Comprehensive audit of platform systems architecture, identifying strengths, weaknesses, and improvement opportunities.', 'Tech', ARRAY['systems-thinking', 'architecture'], 'L3', 'Artifact', 120, 85, 'Executive', true, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'], false, 1, 'Conduct a comprehensive audit of the platform systems. Provide written analysis and architectural diagrams identifying strengths, weaknesses, and improvement opportunities.');
  END IF;

  -- MODULE 4
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'Internal Tool / Automation Build') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, time_limit_minutes, pass_threshold, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, is_archived, version, instructions)
    VALUES ('Internal Tool / Automation Build', 'Build a functional internal tool or automation that solves a real business problem.', 'Tech', ARRAY['execution', 'engineering'], 'L3', 'Build', 4320, 70, 'Executive', true, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'], false, 1, 'Build a functional internal tool or automation that solves a real business problem. Deliver working code, documentation, and deployment instructions.');
  END IF;

  -- MODULE 5
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'Executive Decision Memo (Technology)') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, pass_threshold, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, is_archived, version, instructions)
    VALUES ('Executive Decision Memo (Technology)', 'Write an executive-level decision memo addressing a critical technology decision with strategic implications.', 'Leadership', ARRAY['judgment', 'executive-communication'], 'L3', 'Memo', 80, 'Executive', false, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'], false, 1, 'Write an executive-level decision memo addressing a critical technology decision. Include problem statement, options analysis, recommendation, and strategic implications.');
  END IF;

  -- MODULE 6
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'KPI Framework Design') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, pass_threshold, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, is_archived, version, instructions)
    VALUES ('KPI Framework Design', 'Design a comprehensive KPI framework for a business unit or strategic initiative.', 'Ops', ARRAY['analytics', 'strategic-ops'], 'L3', 'Artifact', 85, 'Executive', true, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'], false, 1, 'Design a comprehensive KPI framework for a business unit or strategic initiative. Include metric definitions, targets, measurement methodology, and reporting structure.');
  END IF;

  -- MODULE 7
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'Process Bottleneck & Risk Analysis') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, pass_threshold, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, is_archived, version, instructions)
    VALUES ('Process Bottleneck & Risk Analysis', 'Analyze a business process to identify bottlenecks and risks, proposing actionable solutions.', 'Quality', ARRAY['process-design', 'risk'], 'L2', 'Scenario', 80, 'Manager', false, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'], false, 1, 'Analyze a provided business process scenario to identify bottlenecks and risks. Propose actionable solutions with implementation recommendations.');
  END IF;

  -- MODULE 8
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'Executive Readiness Brief') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, pass_threshold, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, is_archived, version, instructions)
    VALUES ('Executive Readiness Brief', 'Prepare an executive-level readiness brief demonstrating strategic thinking and executive judgment.', 'Leadership', ARRAY['executive-judgment'], 'L3', 'Memo', 80, 'Executive', false, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'], false, 1, 'Prepare an executive-level readiness brief on a strategic topic. Demonstrate strategic thinking, executive judgment, and clear communication.');
  END IF;

  -- MODULE 9
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'Driver Onboarding Workflow Mapping') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, pass_threshold, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, is_archived, version, instructions)
    VALUES ('Driver Onboarding Workflow Mapping', 'Map and optimize the driver onboarding workflow, identifying improvements and efficiency gains.', 'Ops', ARRAY['ops-design', 'logistics'], 'L2', 'Artifact', 80, 'Manager', true, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'], false, 1, 'Map the current driver onboarding workflow and propose optimizations. Include process diagrams, pain points, and efficiency improvement recommendations.');
  END IF;

  -- MODULE 10
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'Surge Operations Scenario') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, pass_threshold, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, is_archived, version, instructions)
    VALUES ('Surge Operations Scenario', 'Respond to a surge operations scenario, demonstrating prioritization and decision-making under pressure.', 'Ops', ARRAY['prioritization', 'decision-making'], 'L2', 'Scenario', 80, 'Manager', false, true, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'], false, 1, 'Respond to a provided surge operations scenario. Demonstrate prioritization, decision-making under pressure, and operational judgment.');
  END IF;

  -- MODULE 11
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'Safety & Compliance Knowledge Test') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, pass_threshold, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, is_archived, version, instructions)
    VALUES ('Safety & Compliance Knowledge Test', 'Comprehensive knowledge test covering safety protocols and regulatory compliance requirements.', 'Compliance', ARRAY['safety', 'regulatory'], 'L1', 'Quiz', 90, 'Auto', false, false, ARRAY['INTERN_ACTIVE'], false, 1, 'Complete the safety and compliance knowledge test. This is a baseline requirement covering safety protocols and regulatory compliance.');
  END IF;

  -- MODULE 12
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'Internship Learning Objectives & Initial Reflection') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, pass_threshold, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, retake_limit, is_archived, version, instructions)
    VALUES ('Internship Learning Objectives & Initial Reflection', 'Document learning objectives and provide initial reflection on internship experience for academic credit.', 'Onboarding', ARRAY['academic-alignment', 'reflection'], 'L1', 'Memo', 70, 'Manager', false, false, ARRAY['INTERN_ACTIVE'], 999, false, 1, 'Document your learning objectives for this internship and provide an initial reflection on your experience. This supports academic credit requirements.');
  END IF;

  -- MODULE 13
  IF NOT EXISTS (SELECT 1 FROM public.intern_test_modules WHERE name = 'Final Internship Summary & Self-Assessment') THEN
    INSERT INTO public.intern_test_modules (name, description, category, competency_tags, level, test_type, pass_threshold, reviewer_type, artifact_required, counts_toward_promotion, allowed_role_states, is_archived, version, instructions)
    VALUES ('Final Internship Summary & Self-Assessment', 'Comprehensive summary and self-assessment of internship experience, growth, and learning outcomes for academic credit.', 'Leadership', ARRAY['reflection', 'professional-growth'], 'L2', 'Memo', 70, 'Manager', false, false, ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'], false, 1, 'Provide a comprehensive summary and self-assessment of your internship experience. Include growth, learning outcomes, achievements, and future goals. This supports academic credit requirements.');
  END IF;

  RAISE NOTICE 'Test modules population complete';
END $$;

-- Verify the count
SELECT COUNT(*) as total_modules FROM public.intern_test_modules WHERE is_archived = false;

-- Show all modules
SELECT name, category, level, counts_toward_promotion 
FROM public.intern_test_modules 
WHERE is_archived = false 
ORDER BY category, level, name;


