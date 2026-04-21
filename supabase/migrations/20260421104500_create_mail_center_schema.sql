create table if not exists public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email_address text not null unique,
  provider text not null default 'icloud',
  username text not null,
  encrypted_app_password text not null,
  imap_host text not null default 'imap.mail.me.com',
  imap_port integer not null default 993,
  imap_secure boolean not null default true,
  smtp_host text not null default 'smtp.mail.me.com',
  smtp_port integer not null default 587,
  smtp_secure boolean not null default false,
  is_active boolean not null default true,
  last_sync_at timestamptz,
  last_sync_status text,
  last_synced_uid_by_folder_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mail_threads (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  thread_key text not null,
  subject text,
  participants_json jsonb not null default '[]'::jsonb,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  is_archived boolean not null default false,
  is_deleted boolean not null default false,
  assigned_user_id uuid,
  status_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(mailbox_id, thread_key)
);

create table if not exists public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  thread_id uuid not null references public.mail_threads(id) on delete cascade,
  external_message_id text,
  external_uid text,
  in_reply_to text,
  references_header text,
  from_name text,
  from_email text,
  to_json jsonb not null default '[]'::jsonb,
  cc_json jsonb not null default '[]'::jsonb,
  bcc_json jsonb not null default '[]'::jsonb,
  subject text,
  preview_text text,
  text_body text,
  html_body text,
  sent_at timestamptz,
  received_at timestamptz,
  is_read boolean not null default false,
  is_inbound boolean not null default true,
  is_outbound boolean not null default false,
  folder_name text,
  has_attachments boolean not null default false,
  raw_headers_json jsonb not null default '{}'::jsonb,
  sync_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(mailbox_id, external_message_id, external_uid)
);

create table if not exists public.mail_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.mail_messages(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  file_size integer not null default 0,
  storage_path text not null,
  content_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.mail_thread_notes (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.mail_threads(id) on delete cascade,
  user_id uuid not null,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mail_thread_activity (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.mail_threads(id) on delete cascade,
  user_id uuid not null,
  activity_type text not null,
  activity_meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mailbox_permissions (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  user_id uuid not null,
  role text not null,
  can_read boolean not null default true,
  can_reply boolean not null default false,
  can_assign boolean not null default false,
  can_archive boolean not null default false,
  can_delete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(mailbox_id, user_id)
);

create index if not exists idx_mail_threads_mailbox_last_message on public.mail_threads (mailbox_id, last_message_at desc);
create index if not exists idx_mail_messages_thread_received on public.mail_messages (thread_id, received_at asc);
create index if not exists idx_mail_messages_mailbox_uid on public.mail_messages (mailbox_id, external_uid, folder_name);
create index if not exists idx_mail_threads_search_subject on public.mail_threads using gin (to_tsvector('english', coalesce(subject, '')));
