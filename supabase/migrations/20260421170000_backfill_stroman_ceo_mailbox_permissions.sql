-- Backfill mailbox_permissions for stroman.ceo@cravenusa.com from help@cravenusa.com.
-- Use when the CEO mailbox was created earlier without permissions (or before the save flow fixed).
-- Safe to re-run: upserts on (mailbox_id, user_id).

INSERT INTO public.mailbox_permissions (
  mailbox_id,
  user_id,
  role,
  can_read,
  can_reply,
  can_assign,
  can_archive,
  can_delete,
  updated_at
)
SELECT
  m_target.id,
  mp.user_id,
  mp.role,
  mp.can_read,
  mp.can_reply,
  mp.can_assign,
  mp.can_archive,
  mp.can_delete,
  now()
FROM public.mailbox_permissions mp
INNER JOIN public.mailboxes m_source
  ON m_source.id = mp.mailbox_id
  AND lower(trim(m_source.email_address)) = 'help@cravenusa.com'
INNER JOIN public.mailboxes m_target
  ON lower(trim(m_target.email_address)) = 'stroman.ceo@cravenusa.com'
ON CONFLICT (mailbox_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  can_read = EXCLUDED.can_read,
  can_reply = EXCLUDED.can_reply,
  can_assign = EXCLUDED.can_assign,
  can_archive = EXCLUDED.can_archive,
  can_delete = EXCLUDED.can_delete,
  updated_at = EXCLUDED.updated_at;
