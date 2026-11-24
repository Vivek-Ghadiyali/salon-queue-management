-- Additive demo seeding for an existing salon project.
-- This migration does not alter salon settings, services, barbers, staff profiles,
-- Auth users, or existing queue entries.

create or replace function public.seed_demo_queue_entries(
  p_seed_key text,
  p_phone_numbers text[]
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_marker jsonb;
  v_entry_ids uuid[];
  v_entries jsonb;
  v_service_id uuid;
  v_entry public.queue_entries;
  v_existing_count integer;
  i integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode='42501', message='Demo seeding requires the local server-side service role.';
  end if;
  if coalesce(p_seed_key,'') !~ '^[A-Za-z0-9_-]{1,64}$' then
    raise exception using errcode='22023', message='Use a 1–64 character demo seed key.';
  end if;
  if coalesce(array_length(p_phone_numbers,1),0)<>3
     or exists(select 1 from unnest(p_phone_numbers) as phones(phone) where phone !~ '^[0-9]{10}$')
     or (select count(distinct phone) from unnest(p_phone_numbers) as phones(phone))<>3 then
    raise exception using errcode='22023', message='Provide three unique 10-digit demo customer phones.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('salon-demo-seed:'||p_seed_key,0));

  select l.details into v_marker
    from public.queue_activity_logs l
   where l.action='demo_seed_v2' and l.details->>'seed_key'=p_seed_key
   order by l.id desc limit 1;
  if found then
    select array_agg(value::uuid order by ordinality) into v_entry_ids
      from jsonb_array_elements_text(v_marker->'entry_ids') with ordinality as ids(value,ordinality);
    if coalesce(cardinality(v_entry_ids),0)<>3 then
      raise exception 'The demo seed marker is incomplete. Existing records were left unchanged.';
    end if;
    select count(*) into v_existing_count
      from public.queue_entries q
     where q.id=any(v_entry_ids) and left(q.customer_name,6)='[DEMO]';
    if v_existing_count<>3 then
      raise exception 'One or more marked demo records are missing or changed. Existing records were left unchanged.';
    end if;
    select jsonb_agg(jsonb_build_object(
      'id',q.id,'token','S-'||q.token_number,'status',q.status,'access_token',q.access_token
    ) order by q.token_date,q.token_number) into v_entries
      from public.queue_entries q where q.id=any(v_entry_ids);
    return jsonb_build_object('status','already_seeded','entries',v_entries);
  end if;

  if exists(select 1 from public.queue_entries q where q.phone_number=any(p_phone_numbers)) then
    raise exception 'A configured demo phone already exists in queue history. Choose unused demo phone numbers; no records were changed.';
  end if;
  select s.id into v_service_id from public.services s
   where s.is_enabled order by s.sort_order,s.name,s.id limit 1;
  if v_service_id is null then
    raise exception 'Enable at least one existing service before seeding demo queue entries.';
  end if;

  v_entry_ids := '{}'::uuid[];
  for i in 1..3 loop
    v_entry := public._insert_queue_entry(
      '[DEMO] Queue Customer '||i,
      p_phone_numbers[i],
      array[v_service_id],
      null,
      'walk_in',
      null
    );
    v_entry_ids := array_append(v_entry_ids,v_entry.id);
    insert into public.queue_activity_logs(queue_entry_id,action,new_status,details)
      values(v_entry.id,'demo_seeded','waiting',jsonb_build_object('seed_key',p_seed_key,'version',2));
  end loop;

  insert into public.queue_activity_logs(action,details)
    values('demo_seed_v2',jsonb_build_object('seed_key',p_seed_key,'version',2,'entry_ids',to_jsonb(v_entry_ids)));

  select jsonb_agg(jsonb_build_object(
    'id',q.id,'token','S-'||q.token_number,'status',q.status,'access_token',q.access_token
  ) order by q.token_date,q.token_number) into v_entries
    from public.queue_entries q where q.id=any(v_entry_ids);
  return jsonb_build_object('status','seeded','entries',v_entries);
end;
$$;

revoke all on function public.seed_demo_queue_entries(text,text[]) from public,anon,authenticated;
grant execute on function public.seed_demo_queue_entries(text,text[]) to service_role;

-- Disable the old fresh-database bootstrap entry point so an outdated script
-- cannot create demo staff accounts or mutate the singleton salon settings.
do $$
begin
  if to_regprocedure('public.seed_demo_data(uuid,uuid,uuid,uuid,uuid)') is not null then
    execute 'revoke all on function public.seed_demo_data(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role';
  end if;
end;
$$;
