-- Automatically keep the Corporate Bylaws (template_key = 'bylaws_complete')
-- officer roster in sync with current executives in exec_users / employees.
--
-- Behavior:
-- - For each key role (CEO, CFO, CTO, CXO, CPO, Secretary), pick the first
--   active executive based on exec_users.role / title + linked employee status.
-- - Generate a fresh <ul>...</ul> block with those officers.
-- - Replace the existing officer list <ul> in the bylaws HTML template.
-- - Wire an AFTER trigger on exec_users so changes to officers automatically
--   refresh the bylaws template.

create or replace function public.refresh_bylaws_officer_roster()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
  v_html text;
  v_new_ul text;

  v_ceo_name text;
  v_cfo_name text;
  v_cto_name text;
  v_cxo_name text;
  v_cpo_name text;
  v_secretary_name text;

  terminated_statuses text[] := array['terminated','exited','removed','inactive','revoked'];
begin
  -- Locate the bylaws template row.
  select id, html_content
  into v_template_id, v_html
  from public.document_templates
  where template_key = 'bylaws_complete'
    and is_active = true
  limit 1;

  if v_template_id is null then
    -- Nothing to do if the template is missing.
    return;
  end if;

  -- Helper CTE to define "active" executives.
  with active_execs as (
    select
      eu.id,
      eu.name,
      lower(coalesce(eu.role, '')) as role,
      lower(coalesce(eu.title, '')) as title,
      lower(coalesce(eu.officer_status, '')) as officer_status,
      lower(coalesce(e.employment_status, '')) as employment_status
    from public.exec_users eu
    left join public.employees e on e.id = eu.linked_employee_id
    where coalesce(eu.officer_status, '')::text not in (select unnest(terminated_statuses))
      and coalesce(e.employment_status, 'active') not in (select unnest(terminated_statuses))
  )
  select
    -- CEO
    (select ae.name
       from active_execs ae
      where ae.role = 'ceo'
         or ae.title like '%chief executive officer%'
      order by ae.id
      limit 1),
    -- CFO
    (select ae.name
       from active_execs ae
      where ae.role = 'cfo'
         or ae.title like '%chief financial officer%'
      order by ae.id
      limit 1),
    -- CTO
    (select ae.name
       from active_execs ae
      where ae.role = 'cto'
         or ae.title like '%chief technology officer%'
      order by ae.id
      limit 1),
    -- CXO
    (select ae.name
       from active_execs ae
      where ae.role = 'cxo'
         or ae.title like '%chief experience officer%'
      order by ae.id
      limit 1),
    -- CPO (Chief Partnership Officer)
    (select ae.name
       from active_execs ae
      where ae.role = 'cpo'
         or ae.title like '%chief partnership officer%'
         or ae.title like '%chief partnerships officer%'
      order by ae.id
      limit 1),
    -- Secretary (explicit or fall back to CEO)
    (select coalesce(
              (select ae2.name
                 from active_execs ae2
                where ae2.role = 'secretary'
                   or ae2.title like '%secretary%'
                order by ae2.id
                limit 1),
              (select ae3.name
                 from active_execs ae3
                where ae3.role = 'ceo'
                   or ae3.title like '%chief executive officer%'
                order by ae3.id
                limit 1)
           ))
  into
    v_ceo_name,
    v_cfo_name,
    v_cto_name,
    v_cxo_name,
    v_cpo_name,
    v_secretary_name;

  -- Build a fresh <ul> roster block.
  v_new_ul := '<ul>' ||
    coalesce(
      format(E'\n  <li><strong>Chief Executive Officer:</strong> %s</li>',
             coalesce(v_ceo_name, 'To be appointed by the Board')),
      ''
    ) ||
    coalesce(
      format(E'\n  <li><strong>Chief Financial Officer:</strong> %s</li>',
             coalesce(v_cfo_name, 'To be appointed by the Board')),
      ''
    ) ||
    coalesce(
      format(E'\n  <li><strong>Chief Technology Officer:</strong> %s</li>',
             coalesce(v_cto_name, 'To be appointed by the Board')),
      ''
    ) ||
    coalesce(
      format(E'\n  <li><strong>Chief Experience Officer:</strong> %s</li>',
             coalesce(v_cxo_name, 'To be appointed by the Board')),
      ''
    ) ||
    coalesce(
      format(E'\n  <li><strong>Chief Partnership Officer:</strong> %s</li>',
             coalesce(v_cpo_name, 'To be appointed by the Board')),
      ''
    ) ||
    coalesce(
      format(E'\n  <li><strong>Secretary:</strong> %s</li>',
             coalesce(v_secretary_name, 'To be appointed by the Board')),
      ''
    ) ||
    E'\n</ul>';

  -- Replace the existing officer <ul> block that contains "Chief Executive Officer".
  -- We only target the first such <ul> to avoid touching other lists.
  update public.document_templates dt
  set html_content = regexp_replace(
        dt.html_content,
        '(<ul>\\s*(?:.|\\n)*?Chief Executive Officer(?:.|\\n)*?</ul>)',
        v_new_ul,
        'n'
      )
  where dt.id = v_template_id;
end;
$$;

comment on function public.refresh_bylaws_officer_roster() is
  'Rebuilds the officer roster <ul> in the bylaws_complete template from current active executives.';

grant execute on function public.refresh_bylaws_officer_roster() to authenticated;

-- Trigger: whenever exec_users changes, refresh the bylaws roster.

create or replace function public.on_exec_users_change_refresh_bylaws()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_bylaws_officer_roster();
  return null;
end;
$$;

drop trigger if exists trg_exec_users_refresh_bylaws on public.exec_users;

create trigger trg_exec_users_refresh_bylaws
after insert or update or delete on public.exec_users
for each statement
execute function public.on_exec_users_change_refresh_bylaws();

