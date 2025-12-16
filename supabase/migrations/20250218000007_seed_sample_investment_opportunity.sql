-- Seed a sample investment opportunity for testing
-- This creates a complete sample record with all fields populated

INSERT INTO public.investment_opportunities (
  company_name,
  location,
  short_summary,
  highlights,
  target_amount,
  minimum_investment,
  investment_raised,
  previous_rounds,
  stage,
  investor_role,
  business_description,
  market_description,
  progress_description,
  objectives_description,
  why_we_win,
  deal_description,
  tags,
  financials,
  documents,
  team_members,
  is_active
) VALUES (
  'Craven Delivery',
  'United States',
  'Craven Delivery is a revolutionary on-demand delivery platform connecting local restaurants with customers through a seamless, technology-driven marketplace. We combine cutting-edge logistics optimization with exceptional customer service to create the fastest, most reliable delivery experience in the market.',
  ARRAY[
    'Proven business model with 300% year-over-year growth',
    'Expanding to 50+ cities nationwide',
    'Experienced leadership team with 50+ years combined experience',
    'Strong unit economics with 25%+ profit margins',
    'Strategic partnerships with 500+ restaurant partners'
  ],
  5000000.00,  -- $5M target
  25000.00,    -- $25K minimum
  1250000.00,  -- $1.25M raised
  500000.00,   -- $500K previous rounds
  'Series A',
  'Angel Investor',
  'Craven Delivery operates a three-sided marketplace connecting restaurants, delivery drivers, and customers. Our platform uses advanced route optimization algorithms to minimize delivery times while maximizing driver earnings. We provide restaurants with a complete technology stack including POS integration, order management, and analytics dashboards. Our driver network benefits from flexible scheduling, competitive pay, and comprehensive support services.',
  'The on-demand food delivery market is projected to reach $200 billion globally by 2025, with the US market representing $100 billion. Post-pandemic consumer behavior has permanently shifted toward convenience and contactless delivery. Market consolidation is creating opportunities for regional players with strong local relationships and superior service quality. Our focus on underserved markets and independent restaurants positions us to capture significant market share.',
  'Since launch, we have processed over 500,000 orders, onboarded 500+ restaurant partners, and built a network of 1,000+ active delivery drivers. Our average delivery time is 28 minutes, 20% faster than industry average. Customer retention rate is 85% with a 4.7/5 average rating. We have achieved profitability in our initial markets and are scaling proven operations to new cities. Key milestones include securing strategic partnerships with major restaurant chains and launching our driver loyalty program.',
  'Over the next 18 months, we plan to expand to 50 cities, onboard 2,000+ restaurant partners, and grow our driver network to 5,000+. We will invest in technology infrastructure to support 10x growth, launch a subscription program for frequent customers, and develop proprietary logistics technology. Revenue targets include $50M ARR by end of year 2 and achieving positive unit economics in all markets within 6 months of launch.',
  'Our competitive advantages include: (1) Deep local market knowledge and restaurant relationships, (2) Proprietary route optimization technology reducing delivery times by 30%, (3) Focus on independent restaurants underserved by major platforms, (4) Strong unit economics with 25%+ margins, (5) Experienced team with proven track record in logistics and technology, (6) Customer-first approach resulting in industry-leading retention rates.',
  'We are raising $5M in Series A funding to accelerate expansion and technology development. The round will be used for: (1) Market expansion to 50 cities ($2M), (2) Technology infrastructure and development ($1.5M), (3) Marketing and customer acquisition ($1M), (4) Operations and team scaling ($500K). Investors will receive equity with standard Series A terms including board representation for lead investors. We are offering a minimum investment of $25,000 with no maximum. Previous investors include [Previous Investor Names] who participated in our seed round.',
  ARRAY[
    'Logistics',
    'Gig Economy',
    'On-Demand Services',
    'Last-Mile Delivery',
    'Local Commerce',
    'Transportation',
    'Marketplace',
    'Food Delivery'
  ],
  '[
    {"year": 2022, "turnover": 2500000, "profit": 250000},
    {"year": 2023, "turnover": 7500000, "profit": 1500000},
    {"year": 2024, "turnover": 15000000, "profit": 3750000}
  ]'::jsonb,
  '[
    {"id": "1", "type": "PDF", "name": "Business Plan", "url": "/documents/business-plan.pdf"},
    {"id": "2", "type": "PDF", "name": "Financials", "url": "/documents/financials.pdf"},
    {"id": "3", "type": "PDF", "name": "Pitch Deck", "url": "/documents/pitch-deck.pdf"},
    {"id": "4", "type": "PDF", "name": "Executive Summary", "url": "/documents/executive-summary.pdf"},
    {"id": "5", "type": "PDF", "name": "Internship & Pathway Program", "url": "/documents/internship-program.pdf"},
    {"id": "6", "type": "PDF", "name": "Craven Governance and Controls Overview", "url": "/documents/governance-overview.pdf"}
  ]'::jsonb,
  '[
    {
      "name": "Torrance Stroman",
      "role": "CEO & Founder",
      "bio": "Serial entrepreneur with 15+ years of experience in logistics and technology. Previously founded and scaled two successful startups, with one achieving $50M+ in revenue before acquisition.",
      "photo_url": null
    },
    {
      "name": "Sarah Johnson",
      "role": "COO",
      "bio": "Operations expert with 12 years in supply chain and logistics. Led operations for a Fortune 500 delivery company, managing 10,000+ drivers and $500M+ in annual delivery volume.",
      "photo_url": null
    },
    {
      "name": "Michael Chen",
      "role": "CTO",
      "bio": "Technology leader with expertise in marketplace platforms and route optimization. Previously built and scaled the technology infrastructure for a major ride-sharing platform.",
      "photo_url": null
    }
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Display the created ID
DO $$
DECLARE
  opportunity_id UUID;
BEGIN
  SELECT id INTO opportunity_id 
  FROM public.investment_opportunities 
  WHERE company_name = 'Craven Delivery' 
  LIMIT 1;
  
  IF opportunity_id IS NOT NULL THEN
    RAISE NOTICE 'Sample investment opportunity created with ID: %', opportunity_id;
    RAISE NOTICE 'Access the pitch deck at: /pitch-deck/%', opportunity_id;
  END IF;
END $$;

