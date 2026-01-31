-- ========================================================================
-- DEPLOYMENT VALIDATION QUERIES (PROD-SAFE)
-- Run in Supabase SQL Editor BEFORE deploying
-- ========================================================================

-- ========================================================================
-- TEST A) stripe_events dedupe must be enforced (PK or UNIQUE on event_id)
-- ========================================================================
SELECT
  i.relname AS index_name,
  ix.indisunique AS is_unique,
  pg_get_indexdef(ix.indexrelid) AS ddl
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='public'
  AND t.relname='stripe_events'
  AND pg_get_indexdef(ix.indexrelid) ILIKE '%(event_id)%'
ORDER BY ix.indisunique DESC, i.relname;

-- EXPECTED:
-- At least one row with is_unique=true where ddl shows UNIQUE/PK on (event_id).
-- If none, STOP: insert-first dedupe is not real.

-- ========================================================================
-- TEST B) append-only refund protection must exist
-- ========================================================================
SELECT
  i.relname AS index_name,
  ix.indisunique AS is_unique,
  pg_get_indexdef(ix.indexrelid) AS ddl
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='public'
  AND t.relname='ledger_entries'
  AND i.relname='ledger_entries_refund_unique';

-- EXPECTED:
-- One row, is_unique=true, filtered WHERE entry_type='refund' AND stripe_object_id IS NOT NULL.
-- If missing, STOP: partial refunds will not be append-only.

-- ========================================================================
-- TEST C) Transfer columns UNIQUE (your architectural decision)
-- ========================================================================
SELECT 
  conname AS constraint_name, 
  pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'public.orders'::regclass
  AND conname IN (
    'orders_stripe_transfer_restaurant_id_key',
    'orders_stripe_transfer_driver_id_key'
  );

-- EXPECTED:
-- Two rows. If missing, you decided to keep UNIQUE, so STOP and fix migration.

-- ========================================================================
-- TEST D) RLS policy includes WITH CHECK for ledger_entries_admin_only
-- ========================================================================
SELECT 
  polname AS policy_name,
  polcmd AS command,
  pg_get_expr(polqual, polrelid) AS using_clause,
  pg_get_expr(polwithcheck, polrelid) AS with_check_clause
FROM pg_policy
WHERE polrelid = 'public.ledger_entries'::regclass
  AND polname = 'ledger_entries_admin_only';

-- EXPECTED:
-- using_clause NOT NULL AND with_check_clause NOT NULL.
-- If with_check_clause is NULL, STOP: inserts/updates will fail under RLS.

-- ========================================================================
-- TEST E) RPC functions execute permissions are service_role only (FIXED)
-- ========================================================================
WITH funcs AS (
  SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('lock_order_for_transfers', 'finalize_order_transfers', 'mark_transfer_failed')
),
acl AS (
  SELECT
    f.proname,
    f.args,
    x.grantee::regrole::text AS grantee,
    x.privilege_type
  FROM funcs f
  LEFT JOIN LATERAL aclexplode(COALESCE((SELECT proacl FROM pg_proc WHERE oid = f.oid), acldefault('f'::"char", f.oid))) x
    ON TRUE
  WHERE x.privilege_type = 'EXECUTE'
)
SELECT
  proname AS function_name,
  args AS arguments,
  array_agg(DISTINCT grantee ORDER BY grantee) FILTER (WHERE grantee IS NOT NULL) AS granted_to
FROM acl
GROUP BY proname, args
ORDER BY proname;

-- EXPECTED:
-- Each function shows granted_to = {service_role}
-- If you see authenticated / anon / public, STOP.

-- QUICK FAIL CHECK (optional): show any non-service_role execute grants
WITH funcs AS (
  SELECT p.oid, p.proname
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='public'
    AND p.proname IN ('lock_order_for_transfers', 'finalize_order_transfers', 'mark_transfer_failed')
)
SELECT f.proname, x.grantee::regrole::text AS grantee
FROM funcs f
JOIN LATERAL aclexplode(COALESCE((SELECT proacl FROM pg_proc WHERE oid = f.oid), acldefault('f'::"char", f.oid))) x ON TRUE
WHERE x.privilege_type='EXECUTE'
  AND x.grantee::regrole::text <> 'service_role';

-- EXPECTED:
-- zero rows

-- ========================================================================
-- TEST F) payment_status includes partial_refund (enum OR check constraint)
-- ========================================================================
DO $$
DECLARE
  v_is_enum BOOLEAN;
  v_has_partial BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname='public'
      AND t.typname='payment_status'
      AND t.typtype='e'
  ) INTO v_is_enum;

  IF v_is_enum THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname='payment_status'
        AND e.enumlabel='partial_refund'
    ) INTO v_has_partial;

    IF NOT v_has_partial THEN
      RAISE EXCEPTION 'payment_status enum missing partial_refund';
    END IF;
  ELSE
    -- Check constraint path
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid='public.orders'::regclass
        AND conname ILIKE '%payment_status%'
        AND pg_get_constraintdef(oid) ILIKE '%partial_refund%'
    ) THEN
      RAISE EXCEPTION 'payment_status check constraint missing partial_refund';
    END IF;
  END IF;
END $$;

-- EXPECTED:
-- DO block completes without exception.

-- ========================================================================
-- TEST G) Lease columns exist on orders
-- ========================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='orders'
  AND column_name IN ('transfers_lease_id', 'transfers_lease_expires_at')
ORDER BY column_name;

-- EXPECTED:
-- two rows.

-- ========================================================================
-- END
-- ========================================================================
