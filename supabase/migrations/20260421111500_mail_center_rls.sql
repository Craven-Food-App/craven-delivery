alter table public.mailboxes enable row level security;
alter table public.mail_threads enable row level security;
alter table public.mail_messages enable row level security;
alter table public.mail_attachments enable row level security;
alter table public.mail_thread_notes enable row level security;
alter table public.mail_thread_activity enable row level security;
alter table public.mailbox_permissions enable row level security;

drop policy if exists "mailboxes readable by permission" on public.mailboxes;
create policy "mailboxes readable by permission" on public.mailboxes
for select using (
  exists (
    select 1 from public.mailbox_permissions mp
    where mp.mailbox_id = mailboxes.id
      and mp.user_id = auth.uid()
      and mp.can_read = true
  )
);

drop policy if exists "mailbox permissions self or admin read" on public.mailbox_permissions;
create policy "mailbox permissions self or admin read" on public.mailbox_permissions
for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

drop policy if exists "mail threads readable by permission" on public.mail_threads;
create policy "mail threads readable by permission" on public.mail_threads
for select using (
  exists (
    select 1 from public.mailbox_permissions mp
    where mp.mailbox_id = mail_threads.mailbox_id
      and mp.user_id = auth.uid()
      and mp.can_read = true
  )
);

drop policy if exists "mail messages readable by permission" on public.mail_messages;
create policy "mail messages readable by permission" on public.mail_messages
for select using (
  exists (
    select 1 from public.mailbox_permissions mp
    where mp.mailbox_id = mail_messages.mailbox_id
      and mp.user_id = auth.uid()
      and mp.can_read = true
  )
);

drop policy if exists "mail attachments readable by thread permission" on public.mail_attachments;
create policy "mail attachments readable by thread permission" on public.mail_attachments
for select using (
  exists (
    select 1
    from public.mail_messages mm
    join public.mailbox_permissions mp on mp.mailbox_id = mm.mailbox_id
    where mm.id = mail_attachments.message_id
      and mp.user_id = auth.uid()
      and mp.can_read = true
  )
);

drop policy if exists "mail notes readable by permission" on public.mail_thread_notes;
create policy "mail notes readable by permission" on public.mail_thread_notes
for select using (
  exists (
    select 1
    from public.mail_threads mt
    join public.mailbox_permissions mp on mp.mailbox_id = mt.mailbox_id
    where mt.id = mail_thread_notes.thread_id
      and mp.user_id = auth.uid()
      and mp.can_read = true
  )
);

drop policy if exists "mail notes insert by permission" on public.mail_thread_notes;
create policy "mail notes insert by permission" on public.mail_thread_notes
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.mail_threads mt
    join public.mailbox_permissions mp on mp.mailbox_id = mt.mailbox_id
    where mt.id = mail_thread_notes.thread_id
      and mp.user_id = auth.uid()
      and mp.can_read = true
  )
);

drop policy if exists "mail activity readable by permission" on public.mail_thread_activity;
create policy "mail activity readable by permission" on public.mail_thread_activity
for select using (
  exists (
    select 1
    from public.mail_threads mt
    join public.mailbox_permissions mp on mp.mailbox_id = mt.mailbox_id
    where mt.id = mail_thread_activity.thread_id
      and mp.user_id = auth.uid()
      and mp.can_read = true
  )
);
