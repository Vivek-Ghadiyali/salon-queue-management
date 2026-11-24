-- Optional demo bootstrap. The function is callable only by the service_role
-- used from a local script and refuses to run against a populated salon.
create or replace function public.seed_demo_data(
  p_owner_user_id uuid,
  p_reception_user_id uuid,
  p_barber_one_user_id uuid,
  p_barber_two_user_id uuid,
  p_barber_three_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.salon_settings;
  v_today date := public._local_now()::date;
  v_now timestamptz := now();
  v_marker jsonb;
  v_demo_users uuid[] := array[p_owner_user_id,p_reception_user_id,p_barber_one_user_id,p_barber_two_user_id,p_barber_three_user_id];
  v_matches integer;
  v_service_haircut uuid := '90000000-0000-4000-8000-000000000001';
  v_service_beard uuid := '90000000-0000-4000-8000-000000000002';
  v_service_wash uuid := '90000000-0000-4000-8000-000000000003';
  v_service_shave uuid := '90000000-0000-4000-8000-000000000004';
  v_service_facial uuid := '90000000-0000-4000-8000-000000000005';
  v_barber_one uuid := '91000000-0000-4000-8000-000000000001';
  v_barber_two uuid := '91000000-0000-4000-8000-000000000002';
  v_barber_three uuid := '91000000-0000-4000-8000-000000000003';
  v_queue_ids uuid[] := array[
    '92000000-0000-4000-8000-000000000001'::uuid,
    '92000000-0000-4000-8000-000000000002'::uuid,
    '92000000-0000-4000-8000-000000000003'::uuid,
    '92000000-0000-4000-8000-000000000004'::uuid,
    '92000000-0000-4000-8000-000000000005'::uuid,
    '92000000-0000-4000-8000-000000000006'::uuid
  ];
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode='42501', message='Demo seeding requires the server-side service role.';
  end if;
  if array_position(v_demo_users,null) is not null or cardinality(v_demo_users)<>5
     or (select count(distinct user_id) from unnest(v_demo_users) as ids(user_id))<>5 then
    raise exception 'Five distinct demo Auth user IDs are required.';
  end if;
  select count(*) into v_matches from auth.users u
   where u.id=any(v_demo_users) and u.raw_user_meta_data->>'salon_queue_demo'='v1';
  if v_matches<>5 then raise exception using errcode='42501', message='Each demo Auth account must carry the expected demo marker.'; end if;
  if exists(select 1 from auth.users u where u.raw_user_meta_data->>'salon_queue_demo' is distinct from 'v1')
     or (select count(*) from auth.users u where u.raw_user_meta_data->>'salon_queue_demo'='v1')<>5 then
    raise exception 'Demo setup requires an Auth project containing only its five dedicated demo accounts.';
  end if;

  select * into v_settings from public.salon_settings where id=true for update;
  if not found then raise exception 'Run the schema migrations before the demo seed.'; end if;
  select l.details into v_marker from public.queue_activity_logs l
   where l.action='demo_seed_v1' order by l.id desc limit 1;
  if found then
    if v_marker->>'owner_user_id'=p_owner_user_id::text
       and v_marker->>'reception_user_id'=p_reception_user_id::text
       and v_marker->>'barber_one_user_id'=p_barber_one_user_id::text
       and v_marker->>'barber_two_user_id'=p_barber_two_user_id::text
       and v_marker->>'barber_three_user_id'=p_barber_three_user_id::text then
      return jsonb_build_object('status','already_seeded','queue_entries',6);
    end if;
    raise exception 'Demo data already exists with different accounts; no rows were changed.';
  end if;

  if v_settings.salon_name<>'Salon' or v_settings.address<>''
     or exists(select 1 from public.services)
     or exists(select 1 from public.barbers)
     or exists(select 1 from public.staff_profiles)
     or exists(select 1 from public.daily_token_counters)
     or exists(select 1 from public.queue_entries)
     or exists(select 1 from public.queue_entry_services)
     or exists(select 1 from public.queue_activity_logs) then
    raise exception 'Demo setup only runs on a fresh, empty demo project; existing data was left unchanged.';
  end if;

  update public.salon_settings set
    salon_name='Atelier Demo Salon',
    address='Demo address, Ahmedabad',
    opening_time='00:00',
    closing_time='23:59',
    working_days=array[1,2,3,4,5,6,7],
    timezone='Asia/Kolkata',
    currency='INR',
    online_joining_manual_open=true
  where id=true;

  insert into public.services(id,name,description,category,duration_minutes,price,is_enabled,sort_order) values
    (v_service_haircut,'Signature Haircut','Sample haircut service.','Hair',40,500,true,1),
    (v_service_beard,'Beard Trim','Sample beard shaping service.','Grooming',25,250,true,2),
    (v_service_wash,'Hair Wash & Style','Sample wash and styling service.','Hair',20,180,true,3),
    (v_service_shave,'Shaving','Sample shaving service.','Grooming',15,70,true,4),
    (v_service_facial,'Facial','Sample facial service.','Skin Care',45,400,true,5);

  insert into public.barbers(id,name,specialty,on_duty,on_break,sort_order) values
    (v_barber_one,'Amit Demo','Precision cuts',true,false,1),
    (v_barber_two,'Ravi Demo','Style and finish',true,false,2),
    (v_barber_three,'Neel Demo','Classic grooming',true,false,3);

  insert into public.staff_profiles(user_id,role,barber_id,display_name) values
    (p_owner_user_id,'owner',null,'Demo Owner'),
    (p_reception_user_id,'receptionist',null,'Demo Reception'),
    (p_barber_one_user_id,'barber',v_barber_one,'Amit Demo'),
    (p_barber_two_user_id,'barber',v_barber_two,'Ravi Demo'),
    (p_barber_three_user_id,'barber',v_barber_three,'Neel Demo');

  insert into public.daily_token_counters(salon_date,last_token) values(v_today,6);

  insert into public.queue_entries(
    id,token_date,token_number,customer_name,phone_number,preferred_barber_id,assigned_barber_id,
    status,source,created_by,created_at,called_at,service_started_at,completed_at
  ) values
    (v_queue_ids[1],v_today,1,'Demo Customer Waiting','9000000001',v_barber_one,null,'waiting','online',null,v_now-interval '40 minutes',null,null,null),
    (v_queue_ids[2],v_today,2,'Demo Customer Called','9000000002',null,v_barber_one,'called','online',null,v_now-interval '35 minutes',v_now-interval '12 minutes',null,null),
    (v_queue_ids[3],v_today,3,'Demo Customer In Chair','9000000003',v_barber_two,v_barber_two,'in_chair','walk_in',p_reception_user_id,v_now-interval '30 minutes',v_now-interval '20 minutes',v_now-interval '8 minutes',null),
    (v_queue_ids[4],v_today,4,'Demo Customer Done','9000000004',null,v_barber_three,'done','online',null,v_now-interval '25 minutes',v_now-interval '22 minutes',v_now-interval '20 minutes',v_now-interval '5 minutes'),
    (v_queue_ids[5],v_today,5,'Demo Customer No Show','9000000005',v_barber_one,null,'no_show','online',null,v_now-interval '20 minutes',v_now-interval '18 minutes',null,v_now-interval '8 minutes'),
    (v_queue_ids[6],v_today,6,'Demo Customer Cancelled','9000000006',null,null,'cancelled','walk_in',p_reception_user_id,v_now-interval '15 minutes',null,null,v_now-interval '10 minutes');

  insert into public.queue_entry_services(queue_entry_id,service_id,position,service_name,duration_minutes,price) values
    (v_queue_ids[1],v_service_haircut,1,'Signature Haircut',40,500),
    (v_queue_ids[2],v_service_beard,1,'Beard Trim',25,250),
    (v_queue_ids[3],v_service_wash,1,'Hair Wash & Style',20,180),
    (v_queue_ids[4],v_service_haircut,1,'Signature Haircut',40,500),
    (v_queue_ids[5],v_service_shave,1,'Shaving',15,70),
    (v_queue_ids[6],v_service_facial,1,'Facial',45,400);

  insert into public.queue_activity_logs(queue_entry_id,actor_user_id,action,new_status,details)
  select q.id,p_owner_user_id,'demo_queue_seeded',q.status,jsonb_build_object('demo_seed_version','v1')
    from public.queue_entries q where q.id=any(v_queue_ids);
  insert into public.queue_activity_logs(actor_user_id,action,details)
    values(p_owner_user_id,'demo_seed_v1',jsonb_build_object(
      'version','v1','owner_user_id',p_owner_user_id,'reception_user_id',p_reception_user_id,
      'barber_one_user_id',p_barber_one_user_id,'barber_two_user_id',p_barber_two_user_id,
      'barber_three_user_id',p_barber_three_user_id
    ));

  return jsonb_build_object('status','seeded','queue_entries',6);
end;
$$;

revoke all on function public.seed_demo_data(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.seed_demo_data(uuid,uuid,uuid,uuid,uuid) to service_role;
