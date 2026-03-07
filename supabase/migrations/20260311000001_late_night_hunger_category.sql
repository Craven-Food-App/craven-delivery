-- ============================================================================
-- Tag late-night fast food chains so they appear in "Late Night Hunger" section.
-- Chains commonly open until midnight or later (Wendy's, Taco Bell, McDonald's,
-- Burger King, KFC, etc.). Run after seed migrations that insert these names.
-- ============================================================================

UPDATE public.restaurants_master
SET category = 'Late Night Hunger',
    updated_at = now()
WHERE marketplace_type = 'restaurant'
  AND name IN (
    'McDonald''s', 'Wendy''s', 'Burger King', 'Taco Bell', 'KFC',
    'Subway', 'Chipotle', 'Five Guys', 'White Castle', 'Wingstop',
    'Raising Cane''s', 'Popeyes', 'Steak ''n Shake', 'Little Caesars',
    'Pizza Hut', 'Domino''s', 'Jimmy John''s', 'Qdoba', 'Jersey Mike''s'
  );
