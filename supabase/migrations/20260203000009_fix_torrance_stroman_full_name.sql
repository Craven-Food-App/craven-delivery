-- Fix Torrance Stroman's full name in user_profiles
-- Ensures his stock certificates and documents display "Torrance Stroman" not "tstroman.ceo"

-- Update or insert Torrance Stroman's full name
INSERT INTO public.user_profiles (
  user_id,
  full_name,
  created_at,
  updated_at
)
SELECT 
  id,
  'Torrance Stroman',
  now(),
  now()
FROM auth.users
WHERE email = 'tstroman.ceo@cravenusa.com'
ON CONFLICT (user_id) 
DO UPDATE SET
  full_name = 'Torrance Stroman',
  updated_at = now();

COMMENT ON TABLE public.user_profiles IS
  'User profile information. CEO profile must have full legal name for proper document generation.';

