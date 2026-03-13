-- Extend exec_users.role constraint to include full C-suite set
-- Including: CEO, COO, CTO, CFO, CPO, CMO, CRO, CLO, CIO, CDO, CISO, CAO, CSO, CCO, CBO, CXO, CHRO

ALTER TABLE public.exec_users DROP CONSTRAINT IF EXISTS exec_users_role_check;

ALTER TABLE public.exec_users
ADD CONSTRAINT exec_users_role_check CHECK (
  role IN (
    'ceo',
    'coo',
    'cto',
    'cfo',
    'cpo',
    'cmo',
    'cro',
    'clo',
    'cio',
    'cdo',
    'ciso',
    'cao',
    'cso',
    'cco',
    'cbo',
    'cxo',
    'chro',
    'board_member',
    'advisor'
  )
);

