-- Create normalized roles catalog to support portal RBAC (including intern program)
-- This is additive and does NOT change the existing public.user_roles structure,
-- so all current RLS policies and code that reference user_roles(role text) keep working.

-- 1) Enum for all known role names (existing + governance + marketplace + intern program)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'role_name'
  ) THEN
    CREATE TYPE public.role_name AS ENUM (
      -- Core / legacy roles
      'admin',
      'moderator',
      'user',
      'employee',
      'executive',
      'customer',
      'driver',

      -- C-level & board roles
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

      -- Intern program roles (new)
      'INTERN',
      'INTERN_MANAGER',
      'INTERN_SPONSOR',
      'INTERN_PROGRAM_ADMIN'
    );
  END IF;
END$$;

-- 2) Roles catalog table
CREATE TABLE IF NOT EXISTS public.roles (
  id BIGSERIAL PRIMARY KEY,
  name public.role_name UNIQUE NOT NULL,
  label TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Seed known roles (idempotent)
INSERT INTO public.roles (name, label, description)
VALUES
  -- Core / legacy
  ('admin', 'Admin', 'Administrative access'),
  ('moderator', 'Moderator', 'Moderation access'),
  ('user', 'User', 'Standard user'),
  ('employee', 'Employee', 'Employee account'),
  ('executive', 'Executive', 'Executive-level account'),
  ('customer', 'Customer', 'Customer account'),
  ('driver', 'Driver', 'Driver account'),

  -- C-level / board
  ('ceo', 'CEO', 'Chief Executive Officer'),
  ('cfo', 'CFO', 'Chief Financial Officer'),
  ('coo', 'COO', 'Chief Operating Officer'),
  ('cto', 'CTO', 'Chief Technology Officer'),
  ('cxo', 'CXO', 'Chief Experience Officer'),
  ('cmo', 'CMO', 'Chief Marketing Officer'),
  ('cro', 'CRO', 'Chief Revenue Officer'),
  ('cpo', 'CPO', 'Chief Product Officer'),
  ('cdo', 'CDO', 'Chief Data Officer'),
  ('chro', 'CHRO', 'Chief HR Officer'),
  ('clo', 'CLO', 'Chief Legal Officer'),
  ('cso', 'CSO', 'Chief Strategy Officer'),
  ('board_member', 'Board Member', 'Company board member'),
  ('advisor', 'Advisor', 'Company advisor'),

  -- CRAVEN governance
  ('CRAVEN_FOUNDER', 'Crave''n Founder', 'Founder-level governance role'),
  ('CRAVEN_CORPORATE_SECRETARY', 'Corporate Secretary', 'Corporate records authority'),
  ('CRAVEN_BOARD_MEMBER', 'Crave''n Board Member', 'Crave''n board role'),
  ('CRAVEN_EXECUTIVE', 'Crave''n Executive', 'Crave''n executive role'),
  ('CRAVEN_CEO', 'Crave''n CEO', 'Crave''n CEO role'),
  ('CRAVEN_CFO', 'Crave''n CFO', 'Crave''n CFO role'),
  ('CRAVEN_CTO', 'Crave''n CTO', 'Crave''n CTO role'),
  ('CRAVEN_CXO', 'Crave''n CXO', 'Crave''n CXO role'),
  ('CRAVEN_COO', 'Crave''n COO', 'Crave''n COO role'),
  ('CRAVEN_CMO', 'Crave''n CMO', 'Crave''n CMO role'),
  ('CRAVEN_CCO', 'Crave''n CCO', 'Crave''n CCO role'),

  -- Operational
  ('CRAVEN_STAFF', 'Staff', 'Crave''n staff role'),
  ('CRAVEN_SUPPORT', 'Support', 'Crave''n support team'),
  ('CRAVEN_DISPATCH', 'Dispatch', 'Dispatch / logistics'),

  -- Marketplace
  ('CRAVEN_DRIVER', 'Driver', 'Crave''n driver marketplace role'),
  ('CRAVEN_RESTAURANT', 'Restaurant', 'Restaurant marketplace role'),
  ('CRAVEN_CUSTOMER', 'Customer', 'Customer marketplace role'),

  -- Intern program (new)
  ('INTERN', 'Intern', 'Intern portal user'),
  ('INTERN_MANAGER', 'Intern Manager', 'Manager for one or more interns'),
  ('INTERN_SPONSOR', 'Executive Sponsor', 'Executive sponsor for intern conversion'),
  ('INTERN_PROGRAM_ADMIN', 'Intern Program Admin', 'Program operations / admin')
ON CONFLICT (name) DO NOTHING;

-- 4) (Optional) Backfill catalog with any ad-hoc roles from user_roles
-- This keeps the catalog in sync even if new roles were inserted directly into user_roles.
INSERT INTO public.roles (name)
SELECT DISTINCT ur.role::public.role_name
FROM public.user_roles ur
WHERE ur.role IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.roles r WHERE r.name = ur.role::public.role_name
  );



