-- ============================================================================
-- CEO Merchant Prospect Queue
-- Import targets, assign to rep (Jason), track call workflow + outcomes.
-- ============================================================================

create table if not exists public.merchant_prospect_import_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by_user_id uuid not null,
  filename text not null,
  source_type text not null default 'csv',
  total_rows int not null default 0,
  imported_rows int not null default 0,
  rejected_rows int not null default 0,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed', 'partial')),
  error_report jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create table if not exists public.merchant_prospects (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid null references public.merchant_prospect_import_batches(id) on delete set null,
  owner_user_id uuid null,
  assigned_by_user_id uuid null,
  business_name text not null,
  legal_name text null,
  phone text null,
  email text null,
  website text null,
  address_line1 text null,
  city text null,
  state text null,
  postal_code text null,
  category text null,
  source text not null default 'manual'
    check (source in ('manual', 'import', 'referral')),
  status text not null default 'new'
    check (status in ('new', 'attempted', 'contacted', 'qualified', 'won', 'lost', 'do_not_call')),
  priority int not null default 3 check (priority between 1 and 5),
  score numeric(5,2) null,
  next_call_at timestamptz null,
  last_contact_at timestamptz null,
  notes text null,
  delivery_state text not null default 'draft'
    check (delivery_state in ('draft', 'pushed_to_cpo', 'accepted_by_cpo', 'returned', 'archived')),
  pushed_at timestamptz null,
  pushed_by_user_id uuid null,
  accepted_at timestamptz null,
  accepted_by_user_id uuid null,
  pipeline_partnership_id uuid null,
  won_merchant_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_merchant_prospects_owner on public.merchant_prospects(owner_user_id);
create index if not exists idx_merchant_prospects_status on public.merchant_prospects(status);
create index if not exists idx_merchant_prospects_next_call on public.merchant_prospects(next_call_at);
create index if not exists idx_merchant_prospects_priority on public.merchant_prospects(priority desc);
create index if not exists idx_merchant_prospects_name on public.merchant_prospects(lower(business_name));

create table if not exists public.merchant_prospect_activities (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.merchant_prospects(id) on delete cascade,
  actor_user_id uuid not null,
  activity_type text not null
    check (activity_type in ('call', 'sms', 'email', 'note', 'status_change', 'assignment', 'import', 'system')),
  outcome text null,
  note text null,
  follow_up_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_prospect_activities_prospect on public.merchant_prospect_activities(prospect_id, created_at desc);

-- Keep updated_at current
create or replace function public.set_merchant_prospect_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_merchant_prospects_updated_at on public.merchant_prospects;
create trigger trg_merchant_prospects_updated_at
before update on public.merchant_prospects
for each row
execute function public.set_merchant_prospect_updated_at();

alter table public.merchant_prospect_import_batches enable row level security;
alter table public.merchant_prospects enable row level security;
alter table public.merchant_prospect_activities enable row level security;

drop policy if exists "Prospect batches select" on public.merchant_prospect_import_batches;
create policy "Prospect batches select"
on public.merchant_prospect_import_batches
for select
using (
  uploaded_by_user_id = auth.uid()
  or coalesce(public.has_permission(auth.uid(), 'company.executives.view'), false)
  or coalesce(public.has_permission(auth.uid(), 'company.leadership.view'), false)
);

drop policy if exists "Prospect batches modify" on public.merchant_prospect_import_batches;
create policy "Prospect batches modify"
on public.merchant_prospect_import_batches
for all
using (
  uploaded_by_user_id = auth.uid()
  or coalesce(public.has_permission(auth.uid(), 'company.executives.view'), false)
)
with check (
  uploaded_by_user_id = auth.uid()
  or coalesce(public.has_permission(auth.uid(), 'company.executives.view'), false)
);

drop policy if exists "Prospects select" on public.merchant_prospects;
create policy "Prospects select"
on public.merchant_prospects
for select
using (
  owner_user_id = auth.uid()
  or assigned_by_user_id = auth.uid()
  or coalesce(public.has_permission(auth.uid(), 'company.executives.view'), false)
  or coalesce(public.has_permission(auth.uid(), 'company.leadership.view'), false)
);

drop policy if exists "Prospects modify" on public.merchant_prospects;
create policy "Prospects modify"
on public.merchant_prospects
for all
using (
  owner_user_id = auth.uid()
  or assigned_by_user_id = auth.uid()
  or coalesce(public.has_permission(auth.uid(), 'company.executives.view'), false)
)
with check (
  owner_user_id = auth.uid()
  or assigned_by_user_id = auth.uid()
  or coalesce(public.has_permission(auth.uid(), 'company.executives.view'), false)
);

drop policy if exists "Prospect activities select" on public.merchant_prospect_activities;
create policy "Prospect activities select"
on public.merchant_prospect_activities
for select
using (
  exists (
    select 1
    from public.merchant_prospects p
    where p.id = merchant_prospect_activities.prospect_id
      and (
        p.owner_user_id = auth.uid()
        or p.assigned_by_user_id = auth.uid()
        or coalesce(public.has_permission(auth.uid(), 'company.executives.view'), false)
        or coalesce(public.has_permission(auth.uid(), 'company.leadership.view'), false)
      )
  )
);

drop policy if exists "Prospect activities modify" on public.merchant_prospect_activities;
create policy "Prospect activities modify"
on public.merchant_prospect_activities
for all
using (
  actor_user_id = auth.uid()
  or coalesce(public.has_permission(auth.uid(), 'company.executives.view'), false)
)
with check (
  actor_user_id = auth.uid()
  or coalesce(public.has_permission(auth.uid(), 'company.executives.view'), false)
);

create or replace function public.claim_next_merchant_prospect(p_owner_user_id uuid default auth.uid())
returns setof public.merchant_prospects
language sql
security definer
set search_path = public
as $$
  select *
  from public.merchant_prospects p
  where (p_owner_user_id is null or p.owner_user_id = p_owner_user_id)
    and p.status not in ('won', 'lost', 'do_not_call')
  order by
    case when p.next_call_at is not null and p.next_call_at <= now() then 0 else 1 end,
    coalesce(p.next_call_at, now() + interval '365 days') asc,
    p.priority desc,
    p.created_at asc
  limit 1;
$$;

grant execute on function public.claim_next_merchant_prospect(uuid) to authenticated;

create or replace function public.log_merchant_prospect_activity(
  p_prospect_id uuid,
  p_activity_type text,
  p_outcome text default null,
  p_note text default null,
  p_follow_up_at timestamptz default null,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  v_actor := auth.uid();
  if v_actor is null then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  insert into public.merchant_prospect_activities (
    prospect_id,
    actor_user_id,
    activity_type,
    outcome,
    note,
    follow_up_at
  )
  values (
    p_prospect_id,
    v_actor,
    coalesce(p_activity_type, 'note'),
    p_outcome,
    p_note,
    p_follow_up_at
  );

  update public.merchant_prospects
  set
    last_contact_at = case when p_activity_type = 'call' then now() else last_contact_at end,
    next_call_at = coalesce(p_follow_up_at, next_call_at),
    status = coalesce(p_status, status)
  where id = p_prospect_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.log_merchant_prospect_activity(uuid, text, text, text, timestamptz, text) to authenticated;

create or replace function public.push_merchant_prospect_to_cpo(
  p_prospect_id uuid,
  p_owner_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  v_actor := auth.uid();
  if v_actor is null then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  if not coalesce(public.has_permission(v_actor, 'company.executives.view'), false) then
    return jsonb_build_object('ok', false, 'error', 'Only executives can push prospects');
  end if;

  update public.merchant_prospects
  set
    delivery_state = 'pushed_to_cpo',
    pushed_at = now(),
    pushed_by_user_id = v_actor,
    owner_user_id = coalesce(p_owner_user_id, owner_user_id)
  where id = p_prospect_id;

  insert into public.merchant_prospect_activities (
    prospect_id, actor_user_id, activity_type, outcome, note
  ) values (
    p_prospect_id, v_actor, 'assignment', 'pushed', 'Pushed to CPO execution queue'
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.push_merchant_prospect_to_cpo(uuid, uuid) to authenticated;

create or replace function public.accept_merchant_prospect(
  p_prospect_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  v_actor := auth.uid();
  if v_actor is null then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  update public.merchant_prospects
  set
    delivery_state = 'accepted_by_cpo',
    accepted_at = now(),
    accepted_by_user_id = v_actor,
    owner_user_id = coalesce(owner_user_id, v_actor)
  where id = p_prospect_id
    and delivery_state in ('pushed_to_cpo', 'draft');

  insert into public.merchant_prospect_activities (
    prospect_id, actor_user_id, activity_type, outcome, note
  ) values (
    p_prospect_id, v_actor, 'assignment', 'accepted', 'Accepted into CPO execution queue'
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.accept_merchant_prospect(uuid) to authenticated;

create or replace function public.convert_prospect_to_partnership(
  p_prospect_id uuid,
  p_status text default 'discovery'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_prospect public.merchant_prospects%rowtype;
  v_partnership_id uuid;
begin
  v_actor := auth.uid();
  if v_actor is null then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  select * into v_prospect
  from public.merchant_prospects
  where id = p_prospect_id;

  if v_prospect.id is null then
    return jsonb_build_object('ok', false, 'error', 'Prospect not found');
  end if;

  if v_prospect.pipeline_partnership_id is not null then
    return jsonb_build_object('ok', true, 'partnership_id', v_prospect.pipeline_partnership_id, 'existing', true);
  end if;

  insert into public.partnerships (
    partner_name,
    partner_type,
    status,
    description,
    priority,
    industry,
    website_url,
    owner_user_id,
    created_by
  ) values (
    v_prospect.business_name,
    'merchant',
    coalesce(p_status, 'discovery'),
    v_prospect.notes,
    case when v_prospect.priority >= 4 then 'high' when v_prospect.priority = 3 then 'normal' else 'low' end,
    v_prospect.category,
    v_prospect.website,
    coalesce(v_prospect.owner_user_id, v_actor),
    v_actor
  )
  returning id into v_partnership_id;

  if v_prospect.phone is not null or v_prospect.email is not null then
    insert into public.partnership_contacts (
      partnership_id,
      full_name,
      email,
      phone,
      is_primary
    ) values (
      v_partnership_id,
      coalesce(v_prospect.legal_name, v_prospect.business_name),
      v_prospect.email,
      v_prospect.phone,
      true
    );
  end if;

  update public.merchant_prospects
  set
    pipeline_partnership_id = v_partnership_id,
    delivery_state = 'accepted_by_cpo',
    status = case when status = 'new' then 'qualified' else status end
  where id = p_prospect_id;

  insert into public.merchant_prospect_activities (
    prospect_id, actor_user_id, activity_type, outcome, note, metadata
  ) values (
    p_prospect_id,
    v_actor,
    'status_change',
    'converted_to_pipeline',
    'Converted to CPO Partner Pipeline',
    jsonb_build_object('partnership_id', v_partnership_id)
  );

  return jsonb_build_object('ok', true, 'partnership_id', v_partnership_id);
end;
$$;

grant execute on function public.convert_prospect_to_partnership(uuid, text) to authenticated;
