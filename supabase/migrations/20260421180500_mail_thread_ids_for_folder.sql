-- Distinct thread ids for inbox/sent so thread lists match IMAP folders (not the full mailbox dump).
create or replace function public.mail_thread_ids_for_folder(
  p_mailbox_id uuid,
  p_folder text
)
returns setof uuid
language sql
stable
as $$
  select distinct m.thread_id
  from public.mail_messages m
  inner join public.mail_threads t on t.id = m.thread_id and t.mailbox_id = m.mailbox_id
  where m.mailbox_id = p_mailbox_id
    and t.is_archived = false
    and t.is_deleted = false
    and (
      (p_folder = 'inbox' and coalesce(m.folder_name, '') in ('INBOX', 'Inbox'))
      or (p_folder = 'sent' and (m.folder_name = 'Sent' or m.is_outbound = true))
    );
$$;

grant execute on function public.mail_thread_ids_for_folder(uuid, text) to service_role;
