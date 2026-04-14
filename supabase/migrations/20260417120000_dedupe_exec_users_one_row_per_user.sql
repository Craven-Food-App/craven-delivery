-- One canonical exec_users row per auth user (user_id). Merge duplicate rows, repoint every FK
-- to public.exec_users(id), delete extras, then enforce UNIQUE (user_id).
-- Fixes duplicate executives at the database layer (Team, Officer Directory, counts, etc.).

DO $$
DECLARE
  loser RECORD;
  v_keeper_id uuid;
  fk RECORD;
  v_sql text;
BEGIN
  FOR loser IN
    WITH ranked AS (
      SELECT
        id,
        user_id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id
          ORDER BY created_at ASC NULLS LAST, id ASC
        ) AS rn
      FROM public.exec_users
      WHERE user_id IS NOT NULL
    )
    SELECT id AS loser_id, user_id
    FROM ranked
    WHERE rn > 1
  LOOP
    SELECT id INTO v_keeper_id
    FROM public.exec_users
    WHERE user_id = loser.user_id
    ORDER BY created_at ASC NULLS LAST, id ASC
    LIMIT 1;

    IF v_keeper_id IS NULL OR v_keeper_id = loser.loser_id THEN
      CONTINUE;
    END IF;

    -- Repoint all foreign keys that reference exec_users(id) (single-column FKs only)
    FOR fk IN
      SELECT
        n.nspname AS sch,
        c.relname AS tbl,
        a.attname AS col
      FROM pg_constraint pc
      JOIN pg_class c ON c.oid = pc.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = pc.conkey[1]
      WHERE pc.confrelid = 'public.exec_users'::regclass
        AND pc.contype = 'f'
        AND pc.conkey IS NOT NULL
        AND array_length(pc.conkey, 1) = 1
        AND c.relkind = 'r'
        AND n.nspname = 'public'
    LOOP
      v_sql := format(
        'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
        fk.sch,
        fk.tbl,
        fk.col,
        fk.col
      );
      EXECUTE v_sql USING v_keeper_id, loser.loser_id;
    END LOOP;

    DELETE FROM public.exec_users WHERE id = loser.loser_id;
  END LOOP;
END $$;

-- Canonical CEO title for Torrance (matches governance migrations)
UPDATE public.exec_users eu
SET
  title = 'Founder CEO',
  updated_at = now()
WHERE eu.user_id IN (
  SELECT id FROM auth.users WHERE lower(email) = lower('tstroman.ceo@cravenusa.com')
);

-- Enforce: at most one exec_users row per auth user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'exec_users'
      AND c.conname = 'exec_users_user_id_unique'
  ) THEN
    ALTER TABLE public.exec_users
    ADD CONSTRAINT exec_users_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

COMMENT ON CONSTRAINT exec_users_user_id_unique ON public.exec_users IS
  'One executive roster row per auth user.';
