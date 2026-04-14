-- Merge duplicate exec_users rows that share the SAME person but DIFFERENT user_ids
-- (20260417120000 only collapses multiple rows per single user_id).
-- Also merges NULL user_id duplicates when email/name match.
-- Repoints single-column FKs to public.exec_users(id), then deletes loser rows.

-- Some deployments never ran `20251028000100_add_name_email_to_exec_users.sql`; ensure columns exist.
ALTER TABLE public.exec_users
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE OR REPLACE FUNCTION public._migration_merge_exec_users_repoint(p_keeper uuid, p_loser uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  fk2 RECORD;
  sql2 text;
BEGIN
  IF p_keeper IS NULL OR p_loser IS NULL OR p_keeper = p_loser THEN
    RETURN;
  END IF;

  FOR fk2 IN
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
    sql2 := format(
      'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
      fk2.sch,
      fk2.tbl,
      fk2.col,
      fk2.col
    );
    EXECUTE sql2 USING p_keeper, p_loser;
  END LOOP;

  DELETE FROM public.exec_users WHERE id = p_loser;
END;
$$;

DO $$
DECLARE
  loser RECORD;
  v_keeper_id uuid;
  v_ceo_uid uuid;
  v_ceo_exec_id uuid;
BEGIN
  SELECT id INTO v_ceo_uid
  FROM auth.users
  WHERE lower(email) = lower('tstroman.ceo@cravenusa.com')
  LIMIT 1;

  IF v_ceo_uid IS NOT NULL THEN
    SELECT id INTO v_ceo_exec_id
    FROM public.exec_users
    WHERE user_id = v_ceo_uid
    LIMIT 1;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 1) Torrance: merge every matching row into the exec_users row for tstroman.ceo@cravenusa.com
  -- (Runs first so stragglers are not mishandled by NULL-user_id grouping.)
  -- ---------------------------------------------------------------------------
  IF v_ceo_exec_id IS NULL THEN
    RAISE NOTICE 'exec_users merge: no exec_users row for tstroman.ceo@cravenusa.com — skipping Torrance block';
  ELSE
    FOR loser IN
      SELECT eu.id AS loser_id
      FROM public.exec_users eu
      LEFT JOIN auth.users au ON au.id = eu.user_id
      LEFT JOIN public.user_profiles up ON up.user_id = eu.user_id
      WHERE
        (
          lower(trim(COALESCE(up.full_name, eu.name, ''))) = 'torrance stroman'
          OR (
            au.email IS NOT NULL
            AND (
              lower(au.email) = lower('tstroman.ceo@cravenusa.com')
              OR lower(au.email) LIKE '%tstroman%cravenusa.com%'
            )
          )
        )
        AND eu.id <> v_ceo_exec_id
    LOOP
      PERFORM public._migration_merge_exec_users_repoint(v_ceo_exec_id, loser.loser_id);
    END LOOP;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 2) Same denormalized exec_users.email, different rows (any user_id)
  -- Prefer the exec row for tstroman.ceo@cravenusa.com as keeper when in the group.
  -- ---------------------------------------------------------------------------
  FOR loser IN
    WITH ranked AS (
      SELECT
        eu.id,
        lower(trim(eu.email)) AS em,
        ROW_NUMBER() OVER (
          PARTITION BY lower(trim(eu.email))
          ORDER BY
            CASE WHEN v_ceo_uid IS NOT NULL AND eu.user_id = v_ceo_uid THEN 0 ELSE 1 END,
            eu.created_at ASC NULLS LAST,
            eu.id ASC
        ) AS rn
      FROM public.exec_users eu
      WHERE eu.email IS NOT NULL
        AND length(trim(eu.email)) > 0
    )
    SELECT id AS loser_id, em
    FROM ranked
    WHERE rn > 1
  LOOP
    SELECT eu.id
    INTO v_keeper_id
    FROM public.exec_users eu
    WHERE lower(trim(eu.email)) = loser.em
    ORDER BY
      CASE WHEN v_ceo_uid IS NOT NULL AND eu.user_id = v_ceo_uid THEN 0 ELSE 1 END,
      eu.created_at ASC NULLS LAST,
      eu.id ASC
    LIMIT 1;

    IF v_keeper_id IS NOT NULL THEN
      PERFORM public._migration_merge_exec_users_repoint(v_keeper_id, loser.loser_id);
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------------
  -- 3) NULL user_id: collapse duplicates by email or name
  -- ---------------------------------------------------------------------------
  FOR loser IN
    WITH ranked AS (
      SELECT
        eu.id,
        lower(trim(COALESCE(NULLIF(trim(eu.email), ''), NULLIF(trim(eu.name), '')))) AS grp,
        ROW_NUMBER() OVER (
          PARTITION BY lower(trim(COALESCE(NULLIF(trim(eu.email), ''), NULLIF(trim(eu.name), ''))))
          ORDER BY eu.created_at ASC NULLS LAST, eu.id ASC
        ) AS rn
      FROM public.exec_users eu
      WHERE eu.user_id IS NULL
        AND (
          (eu.email IS NOT NULL AND length(trim(eu.email)) > 0)
          OR (eu.name IS NOT NULL AND length(trim(eu.name)) > 0)
        )
    )
    SELECT id AS loser_id, grp
    FROM ranked
    WHERE rn > 1
      AND grp IS NOT NULL
      AND length(grp) > 0
  LOOP
    SELECT eu.id
    INTO v_keeper_id
    FROM public.exec_users eu
    WHERE eu.user_id IS NULL
      AND lower(trim(COALESCE(NULLIF(trim(eu.email), ''), NULLIF(trim(eu.name), '')))) = loser.grp
    ORDER BY eu.created_at ASC NULLS LAST, eu.id ASC
    LIMIT 1;

    IF lower(loser.grp) = 'torrance stroman' AND v_ceo_exec_id IS NOT NULL THEN
      v_keeper_id := v_ceo_exec_id;
    END IF;

    IF v_keeper_id IS NOT NULL THEN
      PERFORM public._migration_merge_exec_users_repoint(v_keeper_id, loser.loser_id);
    END IF;
  END LOOP;
END $$;

DROP FUNCTION public._migration_merge_exec_users_repoint(uuid, uuid);

-- Keep CEO title aligned after merges
UPDATE public.exec_users eu
SET
  title = 'Founder CEO',
  updated_at = now()
WHERE eu.user_id IN (
  SELECT id FROM auth.users WHERE lower(email) = lower('tstroman.ceo@cravenusa.com')
);
