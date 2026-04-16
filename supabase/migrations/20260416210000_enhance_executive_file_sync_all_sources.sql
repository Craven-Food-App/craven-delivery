-- Fix executive file sync: include documents matched via appointment_id,
-- URLs stored on executive_appointments columns, and run as SECURITY DEFINER
-- so the catalog is complete regardless of invoker RLS visibility.

create or replace function public.sync_executive_file_system_from_records()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_root uuid;
  v_active uuid;
  v_archived uuid;
  v_templates uuid;
  r record;
  v_parent uuid;
  v_exec_folder uuid;
  v_linked uuid;
  disp_name text;
  is_archived boolean;
  d record;
  v_node uuid;
  v_url text;
  inserted_exec_folders integer := 0;
  inserted_subfolders integer := 0;
  inserted_files integer := 0;
  inserted_template_folders integer := 0;
  row_ct integer;
  appt record;
  u record;
begin
  select id into v_root
  from public.company_file_nodes
  where parent_id is null
    and scope = 'executive'
    and name = 'Executive File System'
  order by created_at asc
  limit 1;

  if v_root is null then
    return jsonb_build_object('ok', false, 'error', 'Executive File System root not found');
  end if;

  select id into v_active
  from public.company_file_nodes
  where parent_id = v_root and name = 'Active Executives'
  limit 1;

  select id into v_archived
  from public.company_file_nodes
  where parent_id = v_root and name = 'Archived Executives'
  limit 1;

  select id into v_templates
  from public.company_file_nodes
  where parent_id = v_root and name = 'Executive Templates'
  limit 1;

  if v_templates is not null then
    insert into public.company_file_nodes (parent_id, name, node_type, scope)
    select v_templates, v.name, 'folder', 'executive'
    from (
      values
        ('Onboarding — templates'),
        ('Governance — templates'),
        ('Equity — templates'),
        ('Exit — templates')
    ) as v(name)
    where not exists (
      select 1
      from public.company_file_nodes cn
      where cn.parent_id = v_templates
        and cn.name = v.name
        and cn.node_type = 'folder'
    );
    get diagnostics row_ct = row_count;
    inserted_template_folders := inserted_template_folders + row_ct;
  end if;

  if v_active is null or v_archived is null then
    return jsonb_build_object('ok', false, 'error', 'Active/Archived executive buckets missing');
  end if;

  for r in
    select
      eu.id as exec_id,
      eu.officer_status,
      eu.name,
      eu.title,
      eu.linked_employee_id,
      e.employment_status,
      e.termination_date
    from public.exec_users eu
    left join public.employees e on e.id = eu.linked_employee_id
  loop
    disp_name := trim(coalesce(nullif(r.name, ''), nullif(r.title, ''), 'Executive'));
    if disp_name is null or disp_name = '' then
      disp_name := 'Executive';
    end if;

    is_archived :=
      lower(coalesce(r.officer_status, '')) in ('terminated', 'exited', 'removed', 'inactive')
      or lower(coalesce(r.employment_status, '')) in ('terminated', 'exited')
      or (
        r.termination_date is not null
        and lower(coalesce(r.employment_status, 'active')) <> 'active'
      );

    v_parent := case when is_archived then v_archived else v_active end;

    select id into v_exec_folder
    from public.company_file_nodes
    where parent_id = v_parent
      and executive_id = r.exec_id
      and node_type = 'folder'
    limit 1;

    if v_exec_folder is null then
      insert into public.company_file_nodes (parent_id, name, node_type, scope, executive_id)
      values (v_parent, disp_name, 'folder', 'executive', r.exec_id)
      returning id into v_exec_folder;
      inserted_exec_folders := inserted_exec_folders + 1;
    end if;

    insert into public.company_file_nodes (parent_id, name, node_type, scope, executive_id)
    select v_exec_folder, sf.name, 'folder', 'executive', r.exec_id
    from (
      values
        ('01 — Appointment & board'),
        ('02 — Governance & compliance'),
        ('03 — Equity & certificates'),
        ('04 — Exit & termination'),
        ('05 — General'),
        ('Linked executive records')
    ) as sf(name)
    where not exists (
      select 1
      from public.company_file_nodes cn
      where cn.parent_id = v_exec_folder
        and cn.name = sf.name
        and cn.node_type = 'folder'
    );
    get diagnostics row_ct = row_count;
    inserted_subfolders := inserted_subfolders + row_ct;

    select id into v_linked
    from public.company_file_nodes
    where parent_id = v_exec_folder
      and name = 'Linked executive records'
      and node_type = 'folder'
    limit 1;

    if v_linked is null then
      continue;
    end if;

    -- A) executive_documents: match exec OR appointment belonging to this exec
    for d in
      select distinct on (ed.id) ed.*
      from public.executive_documents ed
      left join public.executive_appointments ea on ea.id = ed.appointment_id
      where (ed.executive_id = r.exec_id or ea.executive_id = r.exec_id)
        and (
          coalesce(trim(ed.file_url), '') <> ''
          or coalesce(trim(ed.signed_file_url), '') <> ''
        )
      order by ed.id
    loop
      v_url := coalesce(nullif(trim(d.signed_file_url), ''), nullif(trim(d.file_url), ''));

      if v_url is null or v_url = '' then
        continue;
      end if;

      if exists (
        select 1
        from public.company_file_assets a
        where a.storage_path = 'executive_documents:' || d.id::text
      ) then
        continue;
      end if;

      insert into public.company_file_nodes (parent_id, name, node_type, scope, executive_id)
      values (
        v_linked,
        replace(coalesce(d.type, 'document'), '_', ' ') || ' — ' || left(d.id::text, 8),
        'file',
        'executive',
        r.exec_id
      )
      returning id into v_node;

      insert into public.company_file_assets (
        node_id,
        storage_bucket,
        storage_path,
        file_url,
        mime_type,
        metadata
      )
      values (
        v_node,
        'linked',
        'executive_documents:' || d.id::text,
        v_url,
        null,
        jsonb_build_object(
          'source', 'executive_documents',
          'executive_document_id', d.id,
          'officer_name', d.officer_name,
          'document_type', d.type
        )
      );

      inserted_files := inserted_files + 1;
    end loop;

    -- B) executive_appointments: many generated docs only exist as *_url columns
    for appt in
      select *
      from public.executive_appointments ea
      where ea.executive_id = r.exec_id
    loop
      for u in
        select * from (
          values
            ('appointment_letter', appt.appointment_letter_url, 'Appointment letter'),
            ('board_resolution', appt.board_resolution_url, 'Board resolution'),
            ('certificate', appt.certificate_url, 'Certificate'),
            ('employment_agreement', appt.employment_agreement_url, 'Employment agreement'),
            ('confidentiality_ip', appt.confidentiality_ip_url, 'Confidentiality & IP'),
            ('conflict_disclosure', appt.conflict_disclosure_url, 'Conflict disclosure'),
            ('officer_indemnification', appt.officer_indemnification_url, 'Officer indemnification'),
            ('deferred_compensation', appt.deferred_compensation_url, 'Deferred compensation'),
            ('stock_subscription', appt.stock_subscription_url, 'Stock subscription'),
            ('bylaws', appt.bylaws_url, 'Bylaws'),
            ('bylaws_acknowledgment', appt.bylaws_acknowledgment_url, 'Bylaws acknowledgment'),
            ('certificate_of_incorporation', appt.certificate_of_incorporation_url, 'Certificate of incorporation'),
            ('equity_plan', appt.equity_plan_url, 'Equity plan'),
            ('option_rsu_award', appt.option_rsu_award_url, 'Option / RSU award'),
            ('pre_incorporation_consent', appt.pre_incorporation_consent_url, 'Pre-incorporation consent'),
            ('fiduciary_ethics', appt.fiduciary_ethics_url, 'Fiduciary & ethics')
        ) as t(slot, url, label)
        where coalesce(trim(t.url), '') <> ''
      loop
        if exists (
          select 1
          from public.company_file_assets a
          where a.storage_path = 'executive_appointment:' || appt.id::text || ':' || u.slot
        ) then
          continue;
        end if;

        insert into public.company_file_nodes (parent_id, name, node_type, scope, executive_id)
        values (
          v_linked,
          u.label || ' — ' || left(appt.id::text, 8),
          'file',
          'executive',
          r.exec_id
        )
        returning id into v_node;

        insert into public.company_file_assets (
          node_id,
          storage_bucket,
          storage_path,
          file_url,
          mime_type,
          metadata
        )
        values (
          v_node,
          'linked',
          'executive_appointment:' || appt.id::text || ':' || u.slot,
          trim(u.url),
          null,
          jsonb_build_object(
            'source', 'executive_appointments',
            'appointment_id', appt.id,
            'slot', u.slot,
            'label', u.label
          )
        );

        inserted_files := inserted_files + 1;
      end loop;
    end loop;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'inserted_exec_folders', inserted_exec_folders,
    'inserted_subfolders', inserted_subfolders,
    'inserted_files', inserted_files,
    'inserted_template_folders', inserted_template_folders
  );
end;
$$;

comment on function public.sync_executive_file_system_from_records() is
  'Provisions executive folders; links executive_documents (by exec or appointment) and executive_appointments URL columns.';

grant execute on function public.sync_executive_file_system_from_records() to authenticated;
