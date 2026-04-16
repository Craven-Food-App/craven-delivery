-- Enterprise Company + Executive File System
-- Hierarchical metadata + asset records + permissions + audit log

-- 1) Storage bucket for uploaded documents
insert into storage.buckets (id, name, public)
select 'company-files', 'company-files', true
where not exists (
  select 1 from storage.buckets where id = 'company-files'
);

-- 2) Core hierarchy table
create table if not exists public.company_file_nodes (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.company_file_nodes(id) on delete cascade,
  name text not null,
  node_type text not null check (node_type in ('folder', 'file')),
  scope text not null check (scope in ('company', 'department', 'employee', 'executive')),
  department_id uuid null references public.departments(id) on delete set null,
  employee_id uuid null references public.employees(id) on delete set null,
  executive_id uuid null references public.exec_users(id) on delete set null,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_file_nodes_parent on public.company_file_nodes(parent_id);
create index if not exists idx_company_file_nodes_scope on public.company_file_nodes(scope);
create index if not exists idx_company_file_nodes_employee on public.company_file_nodes(employee_id);
create index if not exists idx_company_file_nodes_executive on public.company_file_nodes(executive_id);

-- 3) File asset metadata table
create table if not exists public.company_file_assets (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null unique references public.company_file_nodes(id) on delete cascade,
  storage_bucket text not null default 'company-files',
  storage_path text not null unique,
  file_url text null,
  mime_type text null,
  size_bytes bigint null,
  version integer not null default 1,
  checksum text null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_file_assets_node on public.company_file_assets(node_id);
create index if not exists idx_company_file_assets_bucket_path on public.company_file_assets(storage_bucket, storage_path);

-- 4) Permissions table (optional explicit grants)
create table if not exists public.company_file_permissions (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.company_file_nodes(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete cascade,
  role text null,
  can_read boolean not null default true,
  can_write boolean not null default false,
  can_delete boolean not null default false,
  can_share boolean not null default false,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (node_id, user_id, role)
);

create index if not exists idx_company_file_permissions_node on public.company_file_permissions(node_id);
create index if not exists idx_company_file_permissions_user on public.company_file_permissions(user_id);

-- 5) Audit trail
create table if not exists public.company_file_audit_log (
  id uuid primary key default gen_random_uuid(),
  node_id uuid null references public.company_file_nodes(id) on delete set null,
  asset_id uuid null references public.company_file_assets(id) on delete set null,
  action text not null,
  actor_id uuid null references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_file_audit_node on public.company_file_audit_log(node_id);
create index if not exists idx_company_file_audit_actor on public.company_file_audit_log(actor_id);
create index if not exists idx_company_file_audit_created on public.company_file_audit_log(created_at desc);

-- 6) Trigger for updated_at
create or replace function public.set_company_file_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_company_file_nodes_updated_at on public.company_file_nodes;
create trigger trg_company_file_nodes_updated_at
before update on public.company_file_nodes
for each row
execute function public.set_company_file_updated_at();

drop trigger if exists trg_company_file_assets_updated_at on public.company_file_assets;
create trigger trg_company_file_assets_updated_at
before update on public.company_file_assets
for each row
execute function public.set_company_file_updated_at();

-- 7) RLS policies (authenticated users for now)
alter table public.company_file_nodes enable row level security;
alter table public.company_file_assets enable row level security;
alter table public.company_file_permissions enable row level security;
alter table public.company_file_audit_log enable row level security;

drop policy if exists "company_file_nodes_select_auth" on public.company_file_nodes;
create policy "company_file_nodes_select_auth"
on public.company_file_nodes
for select
to authenticated
using (true);

drop policy if exists "company_file_nodes_insert_auth" on public.company_file_nodes;
create policy "company_file_nodes_insert_auth"
on public.company_file_nodes
for insert
to authenticated
with check (true);

drop policy if exists "company_file_nodes_update_auth" on public.company_file_nodes;
create policy "company_file_nodes_update_auth"
on public.company_file_nodes
for update
to authenticated
using (true)
with check (true);

drop policy if exists "company_file_nodes_delete_auth" on public.company_file_nodes;
create policy "company_file_nodes_delete_auth"
on public.company_file_nodes
for delete
to authenticated
using (true);

drop policy if exists "company_file_assets_select_auth" on public.company_file_assets;
create policy "company_file_assets_select_auth"
on public.company_file_assets
for select
to authenticated
using (true);

drop policy if exists "company_file_assets_insert_auth" on public.company_file_assets;
create policy "company_file_assets_insert_auth"
on public.company_file_assets
for insert
to authenticated
with check (true);

drop policy if exists "company_file_assets_update_auth" on public.company_file_assets;
create policy "company_file_assets_update_auth"
on public.company_file_assets
for update
to authenticated
using (true)
with check (true);

drop policy if exists "company_file_assets_delete_auth" on public.company_file_assets;
create policy "company_file_assets_delete_auth"
on public.company_file_assets
for delete
to authenticated
using (true);

drop policy if exists "company_file_permissions_select_auth" on public.company_file_permissions;
create policy "company_file_permissions_select_auth"
on public.company_file_permissions
for select
to authenticated
using (true);

drop policy if exists "company_file_permissions_insert_auth" on public.company_file_permissions;
create policy "company_file_permissions_insert_auth"
on public.company_file_permissions
for insert
to authenticated
with check (true);

drop policy if exists "company_file_permissions_update_auth" on public.company_file_permissions;
create policy "company_file_permissions_update_auth"
on public.company_file_permissions
for update
to authenticated
using (true)
with check (true);

drop policy if exists "company_file_permissions_delete_auth" on public.company_file_permissions;
create policy "company_file_permissions_delete_auth"
on public.company_file_permissions
for delete
to authenticated
using (true);

drop policy if exists "company_file_audit_select_auth" on public.company_file_audit_log;
create policy "company_file_audit_select_auth"
on public.company_file_audit_log
for select
to authenticated
using (true);

drop policy if exists "company_file_audit_insert_auth" on public.company_file_audit_log;
create policy "company_file_audit_insert_auth"
on public.company_file_audit_log
for insert
to authenticated
with check (true);

-- 8) Storage policies
drop policy if exists "company_files_bucket_read_auth" on storage.objects;
create policy "company_files_bucket_read_auth"
on storage.objects
for select
to authenticated
using (bucket_id = 'company-files');

drop policy if exists "company_files_bucket_insert_auth" on storage.objects;
create policy "company_files_bucket_insert_auth"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'company-files');

drop policy if exists "company_files_bucket_update_auth" on storage.objects;
create policy "company_files_bucket_update_auth"
on storage.objects
for update
to authenticated
using (bucket_id = 'company-files')
with check (bucket_id = 'company-files');

drop policy if exists "company_files_bucket_delete_auth" on storage.objects;
create policy "company_files_bucket_delete_auth"
on storage.objects
for delete
to authenticated
using (bucket_id = 'company-files');

-- 9) Seed default extensive hierarchy
do $$
declare
  v_company_root uuid;
  v_executive_root uuid;
  v_company_governance uuid;
  v_company_finance uuid;
  v_company_hr uuid;
  v_company_legal uuid;
begin
  insert into public.company_file_nodes (name, node_type, scope)
  values ('Company File System', 'folder', 'company')
  on conflict do nothing;

  insert into public.company_file_nodes (name, node_type, scope)
  values ('Executive File System', 'folder', 'executive')
  on conflict do nothing;

  select id into v_company_root
  from public.company_file_nodes
  where parent_id is null and scope = 'company' and name = 'Company File System'
  order by created_at asc
  limit 1;

  select id into v_executive_root
  from public.company_file_nodes
  where parent_id is null and scope = 'executive' and name = 'Executive File System'
  order by created_at asc
  limit 1;

  if v_company_root is not null then
    insert into public.company_file_nodes (parent_id, name, node_type, scope) values
      (v_company_root, 'Corporate Governance', 'folder', 'company'),
      (v_company_root, 'Finance', 'folder', 'company'),
      (v_company_root, 'HR', 'folder', 'company'),
      (v_company_root, 'Operations', 'folder', 'company'),
      (v_company_root, 'Legal', 'folder', 'company'),
      (v_company_root, 'IT & Security', 'folder', 'company'),
      (v_company_root, 'Marketing', 'folder', 'company'),
      (v_company_root, 'Department Archives', 'folder', 'company')
    on conflict do nothing;

    select id into v_company_governance
    from public.company_file_nodes
    where parent_id = v_company_root and name = 'Corporate Governance'
    limit 1;

    select id into v_company_finance
    from public.company_file_nodes
    where parent_id = v_company_root and name = 'Finance'
    limit 1;

    select id into v_company_hr
    from public.company_file_nodes
    where parent_id = v_company_root and name = 'HR'
    limit 1;

    select id into v_company_legal
    from public.company_file_nodes
    where parent_id = v_company_root and name = 'Legal'
    limit 1;

    if v_company_governance is not null then
      insert into public.company_file_nodes (parent_id, name, node_type, scope) values
        (v_company_governance, 'Board Resolutions', 'folder', 'company'),
        (v_company_governance, 'Meeting Minutes', 'folder', 'company'),
        (v_company_governance, 'Officer Appointments', 'folder', 'company'),
        (v_company_governance, 'Compliance Filings', 'folder', 'company')
      on conflict do nothing;
    end if;

    if v_company_finance is not null then
      insert into public.company_file_nodes (parent_id, name, node_type, scope) values
        (v_company_finance, 'Accounts Payable', 'folder', 'company'),
        (v_company_finance, 'Accounts Receivable', 'folder', 'company'),
        (v_company_finance, 'Payroll', 'folder', 'company'),
        (v_company_finance, 'Tax', 'folder', 'company'),
        (v_company_finance, 'Audit', 'folder', 'company'),
        (v_company_finance, 'Treasury & Banking', 'folder', 'company')
      on conflict do nothing;
    end if;

    if v_company_hr is not null then
      insert into public.company_file_nodes (parent_id, name, node_type, scope) values
        (v_company_hr, 'Policies', 'folder', 'company'),
        (v_company_hr, 'Employee Master Files', 'folder', 'company'),
        (v_company_hr, 'Exit Workflows', 'folder', 'company'),
        (v_company_hr, 'Benefits', 'folder', 'company')
      on conflict do nothing;
    end if;

    if v_company_legal is not null then
      insert into public.company_file_nodes (parent_id, name, node_type, scope) values
        (v_company_legal, 'Contracts', 'folder', 'company'),
        (v_company_legal, 'Litigation', 'folder', 'company'),
        (v_company_legal, 'Regulatory', 'folder', 'company')
      on conflict do nothing;
    end if;
  end if;

  if v_executive_root is not null then
    insert into public.company_file_nodes (parent_id, name, node_type, scope) values
      (v_executive_root, 'Active Executives', 'folder', 'executive'),
      (v_executive_root, 'Archived Executives', 'folder', 'executive'),
      (v_executive_root, 'Executive Templates', 'folder', 'executive')
    on conflict do nothing;
  end if;
end
$$;
