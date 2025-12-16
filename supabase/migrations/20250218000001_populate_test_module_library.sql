-- Populate Test Module Library with 13 Core Modules
-- Follows the step-by-step specification exactly

-- MODULE 1 — Crave'n Culture & Ownership Assessment
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  time_limit_minutes,
  pass_threshold,
  retake_limit,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  is_archived,
  version,
  instructions
) VALUES (
  'Crave''n Culture & Ownership Assessment',
  'Evaluates alignment with Crave''n values, founder-level ownership, and ethical judgment.',
  'Onboarding',
  ARRAY['culture-alignment', 'ownership', 'ethics'],
  'L1',
  'Quiz',
  30,
  80,
  1,
  'Manager',
  true,
  false,
  ARRAY['INTERN_ACTIVE'],
  false,
  1,
  'Complete the quiz questions and provide a short written response demonstrating your understanding of Crave''n culture and ownership principles.'
) ON CONFLICT (name) DO NOTHING;

-- MODULE 2 — Role Understanding & Accountability Test
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  pass_threshold,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  is_archived,
  version,
  instructions
) VALUES (
  'Role Understanding & Accountability Test',
  'Assesses understanding of role responsibilities and accountability framework.',
  'Onboarding',
  ARRAY['role-clarity', 'accountability'],
  'L1',
  'Memo',
  70, -- Pass threshold (70% for pass/fail)
  'Manager',
  false,
  false,
  ARRAY['INTERN_ACTIVE'],
  false,
  1,
  'Write a comprehensive document explaining your understanding of your role, responsibilities, and the accountability framework.'
) ON CONFLICT (name) DO NOTHING;

-- MODULE 3 — Platform Systems Audit (Technology Track)
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  time_limit_minutes,
  pass_threshold,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  is_archived,
  version,
  instructions
) VALUES (
  'Platform Systems Audit',
  'Comprehensive audit of platform systems architecture, identifying strengths, weaknesses, and improvement opportunities.',
  'Tech',
  ARRAY['systems-thinking', 'architecture'],
  'L3',
  'Artifact',
  120,
  85,
  'Executive',
  true,
  true,
  ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
  false,
  1,
  'Conduct a comprehensive audit of the platform systems. Provide written analysis and architectural diagrams identifying strengths, weaknesses, and improvement opportunities.'
) ON CONFLICT (name) DO NOTHING;

-- MODULE 4 — Internal Tool / Automation Build (Technology Track)
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  time_limit_minutes,
  pass_threshold,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  is_archived,
  version,
  instructions
) VALUES (
  'Internal Tool / Automation Build',
  'Build a functional internal tool or automation that solves a real business problem.',
  'Tech',
  ARRAY['execution', 'engineering'],
  'L3',
  'Build',
  4320, -- 72 hours in minutes
  70, -- Functional delivery threshold
  'Executive',
  true,
  true,
  ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
  false,
  1,
  'Build a functional internal tool or automation that solves a real business problem. Deliver working code, documentation, and deployment instructions.'
) ON CONFLICT (name) DO NOTHING;

-- MODULE 5 — Executive Decision Memo (Technology Track)
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  pass_threshold,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  is_archived,
  version,
  instructions
) VALUES (
  'Executive Decision Memo (Technology)',
  'Write an executive-level decision memo addressing a critical technology decision with strategic implications.',
  'Leadership',
  ARRAY['judgment', 'executive-communication'],
  'L3',
  'Memo',
  80, -- Executive approval threshold
  'Executive',
  false,
  true,
  ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
  false,
  1,
  'Write an executive-level decision memo addressing a critical technology decision. Include problem statement, options analysis, recommendation, and strategic implications.'
) ON CONFLICT (name) DO NOTHING;

-- MODULE 6 — KPI Framework Design (Strategy/Ops Track)
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  pass_threshold,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  is_archived,
  version,
  instructions
) VALUES (
  'KPI Framework Design',
  'Design a comprehensive KPI framework for a business unit or strategic initiative.',
  'Ops',
  ARRAY['analytics', 'strategic-ops'],
  'L3',
  'Artifact',
  85,
  'Executive',
  true,
  true,
  ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
  false,
  1,
  'Design a comprehensive KPI framework for a business unit or strategic initiative. Include metric definitions, targets, measurement methodology, and reporting structure.'
) ON CONFLICT (name) DO NOTHING;

-- MODULE 7 — Process Bottleneck & Risk Analysis (Strategy/Ops Track)
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  pass_threshold,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  is_archived,
  version,
  instructions
) VALUES (
  'Process Bottleneck & Risk Analysis',
  'Analyze a business process to identify bottlenecks and risks, proposing actionable solutions.',
  'Quality',
  ARRAY['process-design', 'risk'],
  'L2',
  'Scenario',
  80,
  'Manager',
  false,
  true,
  ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
  false,
  1,
  'Analyze a provided business process scenario to identify bottlenecks and risks. Propose actionable solutions with implementation recommendations.'
) ON CONFLICT (name) DO NOTHING;

-- MODULE 8 — Executive Readiness Brief (Strategy/Ops Track)
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  pass_threshold,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  is_archived,
  version,
  instructions
) VALUES (
  'Executive Readiness Brief',
  'Prepare an executive-level readiness brief demonstrating strategic thinking and executive judgment.',
  'Leadership',
  ARRAY['executive-judgment'],
  'L3',
  'Memo',
  80, -- Executive approval threshold
  'Executive',
  false,
  true,
  ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
  false,
  1,
  'Prepare an executive-level readiness brief on a strategic topic. Demonstrate strategic thinking, executive judgment, and clear communication.'
) ON CONFLICT (name) DO NOTHING;

-- MODULE 9 — Driver Onboarding Workflow Mapping (Operations Track)
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  pass_threshold,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  is_archived,
  version,
  instructions
) VALUES (
  'Driver Onboarding Workflow Mapping',
  'Map and optimize the driver onboarding workflow, identifying improvements and efficiency gains.',
  'Ops',
  ARRAY['ops-design', 'logistics'],
  'L2',
  'Artifact',
  80,
  'Manager',
  true,
  true,
  ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
  false,
  1,
  'Map the current driver onboarding workflow and propose optimizations. Include process diagrams, pain points, and efficiency improvement recommendations.'
) ON CONFLICT (name) DO NOTHING;

-- MODULE 10 — Surge Operations Scenario (Operations Track)
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  pass_threshold,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  is_archived,
  version,
  instructions
) VALUES (
  'Surge Operations Scenario',
  'Respond to a surge operations scenario, demonstrating prioritization and decision-making under pressure.',
  'Ops',
  ARRAY['prioritization', 'decision-making'],
  'L2',
  'Scenario',
  80,
  'Manager',
  false,
  true,
  ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
  false,
  1,
  'Respond to a provided surge operations scenario. Demonstrate prioritization, decision-making under pressure, and operational judgment.'
) ON CONFLICT (name) DO NOTHING;

-- MODULE 11 — Safety & Compliance Knowledge Test (Operations Track)
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  pass_threshold,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  is_archived,
  version,
  instructions
) VALUES (
  'Safety & Compliance Knowledge Test',
  'Comprehensive knowledge test covering safety protocols and regulatory compliance requirements.',
  'Compliance',
  ARRAY['safety', 'regulatory'],
  'L1',
  'Quiz',
  90,
  'Auto',
  false,
  false, -- Baseline requirement, not for promotion
  ARRAY['INTERN_ACTIVE'],
  false,
  1,
  'Complete the safety and compliance knowledge test. This is a baseline requirement covering safety protocols and regulatory compliance.'
) ON CONFLICT (name) DO NOTHING;

-- MODULE 12 — Internship Learning Objectives & Initial Reflection (Academic Credit)
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  pass_threshold,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  retake_limit,
  is_archived,
  version,
  instructions
) VALUES (
  'Internship Learning Objectives & Initial Reflection',
  'Document learning objectives and provide initial reflection on internship experience for academic credit.',
  'Onboarding',
  ARRAY['academic-alignment', 'reflection'],
  'L1',
  'Memo',
  70, -- Completion threshold
  'Manager',
  false,
  false, -- Academic credit only, not for promotion
  ARRAY['INTERN_ACTIVE'],
  999, -- Unlimited retakes (high number)
  false,
  1,
  'Document your learning objectives for this internship and provide an initial reflection on your experience. This supports academic credit requirements.'
) ON CONFLICT (name) DO NOTHING;

-- MODULE 13 — Final Internship Summary & Self-Assessment (Academic Credit)
INSERT INTO public.intern_test_modules (
  name,
  description,
  category,
  competency_tags,
  level,
  test_type,
  pass_threshold,
  reviewer_type,
  artifact_required,
  counts_toward_promotion,
  allowed_role_states,
  is_archived,
  version,
  instructions
) VALUES (
  'Final Internship Summary & Self-Assessment',
  'Comprehensive summary and self-assessment of internship experience, growth, and learning outcomes for academic credit.',
  'Leadership',
  ARRAY['reflection', 'professional-growth'],
  'L2',
  'Memo',
  70, -- Completion threshold
  'Manager',
  false,
  false, -- Academic credit only, not for promotion
  ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
  false,
  1,
  'Provide a comprehensive summary and self-assessment of your internship experience. Include growth, learning outcomes, achievements, and future goals. This supports academic credit requirements.'
) ON CONFLICT (name) DO NOTHING;

-- Verify the count
DO $$
DECLARE
  module_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO module_count
  FROM public.intern_test_modules
  WHERE is_archived = false;
  
  IF module_count < 13 THEN
    RAISE NOTICE 'Expected 13 modules, found %', module_count;
  ELSE
    RAISE NOTICE 'Successfully populated % test modules', module_count;
  END IF;
END $$;

-- Add helpful comments
COMMENT ON TABLE public.intern_test_modules IS 'Test Module Library: 13 core modules across Onboarding, Tech, Ops, Leadership, Quality, and Compliance categories. Academic credit modules (12, 13) do not count toward promotion.';

