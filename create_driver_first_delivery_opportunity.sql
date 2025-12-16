-- Create investment opportunity from Driver-First Delivery pitch page
-- This uses the exact data from the angelinvestmentnetwork.us page

INSERT INTO public.investment_opportunities (
  id,
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
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Driver-First Delivery',
  'Ohio, United States',
  'Crave''n is a driver-first, local food delivery marketplace designed to outperform national incumbents at the city level. We increase driver earnings, improve restaurant margins, and deliver faster service through localized logistics and incentives.',
  ARRAY[
    'Driver-first model improves retention and delivery reliability',
    'Localized strategy outperforms national platforms in mid-sized markets',
    'MVP complete with scalable logistics and payment infrastructure',
    'Large, growing market with clear incumbent weaknesses',
    'Capital accelerates expansion, not product discovery'
  ],
  3000000.00,  -- $3,000,000
  25000.00,    -- $25,000
  0.00,        -- $0 raised
  0.00,        -- $0 previous rounds
  'MVP/Finished Product',
  'Monthly Involvement',
  'Crave''n is a local, driver-first food delivery marketplace connecting independent drivers, local restaurants, and consumers. The platform improves delivery reliability and unit economics by prioritizing driver compensation, localized logistics, and operational efficiency. Crave''n enables restaurants to retain more margin while giving customers faster, more reliable service in regional markets underserved by national incumbents.',
  'The U.S. food delivery market exceeds $100B annually and continues to grow as consumer demand for convenience accelerates. Crave''n focuses on mid-sized and regional markets where national platforms struggle with high costs, driver churn, and weak local engagement. By executing a city-by-city expansion strategy, Crave''n targets profitable local market share before scaling regionally, creating strong network effects and defensible unit economics.',
  'Crave''n has completed its MVP with core driver, merchant, and administrative platforms operational. Key infrastructure including payments, onboarding, routing, and internal controls has been built and tested. The company is now positioned to activate user acquisition, onboard restaurants and drivers, and scale market operations immediately following capital deployment.',
  'Over the next 3–5 years, Crave''n plans to expand across multiple regional markets, achieving strong local market share and sustainable unit economics in each city before scaling further. The company aims to operate profitably at the regional level, build durable network effects with drivers and restaurants, and position itself as a leading alternative to national delivery platforms, with optionality for strategic acquisition or continued independent growth.',
  'Crave''n is built to win at the local level where national platforms underperform. By prioritizing driver economics, local market density, and disciplined city-by-city expansion, the company avoids the high burn, low retention dynamics that plague large incumbents. Capital is being raised to accelerate a proven operating model, not to validate an idea, positioning early investors for meaningful upside as the platform scales regionally.',
  'Crave''n is raising $3,000,000 through a founder-friendly equity structure, with flexibility for SAFE or priced seed participation. Target ownership for the round is approximately 15–20%, with final valuation and terms set based on investor profile and round composition. Early investors will receive standard pro-rata rights and information rights. Detailed terms are available upon request.',
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
    {"year": 2025, "turnover": 0, "profit": -900000},
    {"year": 2026, "turnover": 5000000, "profit": 0},
    {"year": 2027, "turnover": 18000000, "profit": 2500000}
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
      "role": "Founder & CEO",
      "bio": "Founder and CEO of Crave''n, responsible for strategy, execution, and capital deployment. Leads product development, market expansion, and operational discipline across the platform. Focused on building scalable, locally dominant food delivery operations with strong unit economics and long-term value creation.",
      "photo_url": null
    }
  ]'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  location = EXCLUDED.location,
  short_summary = EXCLUDED.short_summary,
  highlights = EXCLUDED.highlights,
  target_amount = EXCLUDED.target_amount,
  minimum_investment = EXCLUDED.minimum_investment,
  investment_raised = EXCLUDED.investment_raised,
  previous_rounds = EXCLUDED.previous_rounds,
  stage = EXCLUDED.stage,
  investor_role = EXCLUDED.investor_role,
  business_description = EXCLUDED.business_description,
  market_description = EXCLUDED.market_description,
  progress_description = EXCLUDED.progress_description,
  objectives_description = EXCLUDED.objectives_description,
  why_we_win = EXCLUDED.why_we_win,
  deal_description = EXCLUDED.deal_description,
  tags = EXCLUDED.tags,
  financials = EXCLUDED.financials,
  documents = EXCLUDED.documents,
  team_members = EXCLUDED.team_members,
  is_active = EXCLUDED.is_active,
  updated_at = now()
RETURNING id, company_name;

