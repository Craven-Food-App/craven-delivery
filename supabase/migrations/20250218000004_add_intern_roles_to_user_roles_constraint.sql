-- Add Intern Program roles to user_roles constraint
-- This allows assigning INTERN, INTERN_MANAGER, INTERN_SPONSOR, and INTERN_PROGRAM_ADMIN roles

-- Drop the existing constraint
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new constraint with all allowed roles including intern program roles
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN (
  -- Original roles
  'admin', 
  'moderator', 
  'user', 
  'employee', 
  'executive', 
  'customer', 
  'driver',
  -- C-level executive roles
  'ceo',
  'cfo',
  'coo',
  'cto',
  'cxo',
  'cmo',
  'cro',
  'cpo',
  'cdo',
  'chro',
  'clo',
  'cso',
  'board_member',
  'advisor',
  -- CRAVEN governance roles
  'CRAVEN_FOUNDER',
  'CRAVEN_CORPORATE_SECRETARY',
  'CRAVEN_BOARD_MEMBER',
  'CRAVEN_EXECUTIVE',
  'CRAVEN_CEO',
  'CRAVEN_CFO',
  'CRAVEN_CTO',
  'CRAVEN_CXO',
  'CRAVEN_COO',
  'CRAVEN_CMO',
  'CRAVEN_CCO',
  -- Operational roles
  'CRAVEN_STAFF',
  'CRAVEN_SUPPORT',
  'CRAVEN_DISPATCH',
  -- Marketplace roles
  'CRAVEN_DRIVER',
  'CRAVEN_RESTAURANT',
  'CRAVEN_CUSTOMER',
  -- Intern Program roles
  'INTERN',
  'INTERN_MANAGER',
  'INTERN_SPONSOR',
  'INTERN_PROGRAM_ADMIN'
));

COMMENT ON CONSTRAINT user_roles_role_check ON public.user_roles IS 
'Allows all system roles including intern program roles: INTERN, INTERN_MANAGER, INTERN_SPONSOR, INTERN_PROGRAM_ADMIN';


