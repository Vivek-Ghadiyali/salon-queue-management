-- Salon Queue Management System: initial schema and RPC API.
-- Apply with `supabase db push` or paste this file into the Supabase SQL Editor.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.salon_settings (
  id boolean primary key default true check (id),
  salon_name text not null default 'Salon',
  address text not null default '',
  opening_time time not null default '10:00',
  closing_time time not null default '20:00',
  working_days integer[] not null default array[2,3,4,5,6,7],
  timezone text not null default 'Asia/Kolkata',
  currency char(3) not null default 'INR',
  online_joining_manual_open boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salon_settings_hours_check check (opening_time < closing_time),
  constraint salon_settings_days_check check (working_days <@ array[1,2,3,4,5,6,7])
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null default 'General',
  duration_minutes integer not null check (duration_minutes between 1 and 600),
  price numeric(10,2) not null check (price >= 0),
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_name_nonempty check (length(trim(name)) > 0)
);

create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text not null default '',
  on_duty boolean not null default true,
  on_break boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint barbers_name_nonempty check (length(trim(name)) > 0)
);

create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'receptionist', 'barber')),
  barber_id uuid unique references public.barbers(id) on delete restrict,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_barber_role_check check ((role = 'barber') = (barber_id is not null))
);

create table if not exists public.daily_token_counters (
  salon_date date primary key,
  last_token integer not null check (last_token > 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  access_token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  token_date date not null,
  token_number integer not null check (token_number > 0),
  customer_name text not null,
  phone_number text not null check (phone_number ~ '^[0-9]{10}$'),
  preferred_barber_id uuid references public.barbers(id) on delete restrict,
  assigned_barber_id uuid references public.barbers(id) on delete restrict,
  status text not null default 'waiting' check (status in ('waiting','called','in_chair','done','cancelled','no_show')),
  source text not null check (source in ('online','walk_in','no_show_return')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  called_at timestamptz,
  service_started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (token_date, token_number),
  constraint queue_assignment_status_check check (
    (status in ('called','in_chair','done') and assigned_barber_id is not null)
    or (status in ('waiting','cancelled','no_show') and assigned_barber_id is null)
  )
);

create table if not exists public.queue_entry_services (
  queue_entry_id uuid not null references public.queue_entries(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  position smallint not null check (position between 1 and 3),
  service_name text not null,
  duration_minutes integer not null check (duration_minutes between 1 and 600),
  price numeric(10,2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  primary key (queue_entry_id, position),
  unique (queue_entry_id, service_id)
);

create table if not exists public.queue_activity_logs (
  id bigint generated always as identity primary key,
  queue_entry_id uuid references public.queue_entries(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  old_status text,
  new_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists queue_entries_waiting_order_idx
  on public.queue_entries (token_date, token_number)
  where status = 'waiting';
create index if not exists queue_entries_assigned_active_idx
  on public.queue_entries (assigned_barber_id)
  where status in ('called','in_chair');
create index if not exists queue_entries_status_created_idx
  on public.queue_entries (status, created_at);
create index if not exists queue_services_service_idx on public.queue_entry_services (service_id);
create index if not exists queue_logs_created_idx on public.queue_activity_logs (created_at desc);
create unique index if not exists queue_one_active_entry_per_phone_idx
  on public.queue_entries (phone_number)
  where status in ('waiting','called','in_chair');
create unique index if not exists queue_one_active_assignment_per_barber_idx
  on public.queue_entries (assigned_barber_id)
  where status in ('called','in_chair');

alter table public.salon_settings enable row level security;
alter table public.services enable row level security;
alter table public.barbers enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.daily_token_counters enable row level security;
alter table public.queue_entries enable row level security;
alter table public.queue_entry_services enable row level security;
alter table public.queue_activity_logs enable row level security;

revoke all on public.salon_settings, public.services, public.barbers, public.staff_profiles,
  public.daily_token_counters, public.queue_entries, public.queue_entry_services,
  public.queue_activity_logs from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

insert into public.salon_settings(id) values(true) on conflict(id) do nothing;

create or replace function public._touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;

create or replace function public._assert_staff(p_roles text[] default array['owner','receptionist','barber'])
returns public.staff_profiles language plpgsql stable security definer set search_path = '' as $$
declare v_profile public.staff_profiles;
begin
  select * into v_profile from public.staff_profiles where user_id = auth.uid();
  if not found or not (v_profile.role = any(p_roles)) then
    raise exception using errcode = '42501', message = 'Staff access is required for this action.';
  end if;
  return v_profile;
end;
$$;

create or replace function public._local_now()
returns timestamp language sql stable set search_path = '' as $$
  select timezone('Asia/Kolkata', now())
$$;

create or replace function public._online_joining_is_open()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(s.online_joining_manual_open, true)
    and extract(isodow from public._local_now())::integer = any(s.working_days)
    and public._local_now()::time >= s.opening_time
    and public._local_now()::time < (s.closing_time - interval '30 minutes')::time
  from public.salon_settings s where s.id = true
$$;

create or replace function public._next_token()
returns table(token_date date, token_number integer) language plpgsql security definer set search_path = '' as $$
declare v_date date := public._local_now()::date;
begin
  return query insert into public.daily_token_counters as c (salon_date, last_token)
    values (v_date, 1)
    on conflict (salon_date) do update set last_token = c.last_token + 1, updated_at = now()
    returning c.salon_date, c.last_token;
end;
$$;

create or replace function public._insert_queue_entry(
  p_name text, p_phone text, p_service_ids uuid[], p_preferred_barber_id uuid,
  p_source text, p_created_by uuid
) returns public.queue_entries language plpgsql security definer set search_path = '' as $$
declare
  v_date date; v_number integer; v_entry public.queue_entries; v_service_count integer; v_distinct_count integer;
begin
  if length(trim(coalesce(p_name,''))) not between 1 and 100 then raise exception 'Enter a valid customer name.'; end if;
  if coalesce(p_phone,'') !~ '^[0-9]{10}$' then raise exception 'Enter a phone number with exactly 10 digits.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_phone,0));
  v_service_count := coalesce(array_length(p_service_ids,1),0);
  select count(distinct x) into v_distinct_count from unnest(coalesce(p_service_ids,'{}'::uuid[])) x;
  if v_service_count not between 1 and 3 or v_distinct_count <> v_service_count then
    raise exception 'Choose one to three different services.';
  end if;
  if exists (select 1 from public.queue_entries q where q.phone_number=p_phone and q.status in ('waiting','called','in_chair')) then
    raise exception using errcode='23505', message='This phone number already has an active queue entry.';
  end if;
  if p_preferred_barber_id is not null and not exists (
    select 1 from public.barbers b where b.id=p_preferred_barber_id and b.on_duty and not b.on_break
  ) then raise exception 'The selected barber is not available for new assignments.'; end if;
  if (select count(*) from public.services s where s.id=any(p_service_ids) and s.is_enabled) <> v_service_count then
    raise exception 'One or more selected services are no longer available.';
  end if;
  select n.token_date,n.token_number into v_date,v_number from public._next_token() n;
  insert into public.queue_entries(token_date,token_number,customer_name,phone_number,preferred_barber_id,source,created_by)
    values(v_date,v_number,trim(p_name),p_phone,p_preferred_barber_id,p_source,p_created_by)
    returning * into v_entry;
  insert into public.queue_entry_services(queue_entry_id,service_id,position,service_name,duration_minutes,price)
    select v_entry.id,s.id,coalesce(array_position(p_service_ids,s.id),1)::smallint,s.name,s.duration_minutes,s.price
      from public.services s where s.id=any(p_service_ids)
      order by array_position(p_service_ids,s.id);
  insert into public.queue_activity_logs(queue_entry_id,actor_user_id,action,new_status,details)
    values(v_entry.id,p_created_by,'joined', 'waiting', jsonb_build_object('source',p_source));
  return v_entry;
end;
$$;

create or replace function public._wait_minutes(p_entry_id uuid)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare v_total numeric; v_barbers integer; v_target public.queue_entries;
begin
  select * into v_target from public.queue_entries where id=p_entry_id;
  if not found or v_target.status <> 'waiting' then return null; end if;
  select count(*) into v_barbers from public.barbers where on_duty and not on_break;
  if v_barbers=0 then return null; end if;
  select coalesce(sum(case
    when q.status='in_chair' and q.service_started_at is not null
      then greatest(0, s.minutes - extract(epoch from (now()-q.service_started_at))/60)
    else s.minutes end),0)
    into v_total
    from public.queue_entries q
    cross join lateral (select sum(es.duration_minutes)::numeric as minutes from public.queue_entry_services es where es.queue_entry_id=q.id) s
   where q.status in ('waiting','called','in_chair') and q.id<>v_target.id
     and (q.status in ('called','in_chair') or (q.token_date,q.token_number)<(v_target.token_date,v_target.token_number));
  if v_total=0 then return 0; end if;
  return greatest(1,ceil(v_total/v_barbers)::integer);
end;
$$;

create or replace function public._check_service_count()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if tg_table_name='queue_entries' then
    if tg_op='DELETE' then v_id := old.id; else v_id := new.id; end if;
  else
    if tg_op='DELETE' then v_id := old.queue_entry_id; else v_id := new.queue_entry_id; end if;
  end if;
  if exists(select 1 from public.queue_entries where id=v_id)
     and (select count(*) from public.queue_entry_services where queue_entry_id=v_id) not between 1 and 3 then
    raise exception 'A queue entry must have one to three selected services.' using errcode='23514';
  end if;
  return null;
end;
$$;

drop trigger if exists queue_entry_services_count_check on public.queue_entry_services;
create constraint trigger queue_entry_services_count_check
  after insert or update or delete on public.queue_entry_services
  deferrable initially deferred for each row execute function public._check_service_count();
drop trigger if exists queue_entries_service_count_check on public.queue_entries;
create constraint trigger queue_entries_service_count_check
  after insert on public.queue_entries
  deferrable initially deferred for each row execute function public._check_service_count();

create or replace function public._validate_queue_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status=old.status then return new; end if;
  if not ((old.status='waiting' and new.status in ('called','cancelled'))
       or (old.status='called' and new.status in ('in_chair','no_show'))
       or (old.status='in_chair' and new.status='done')) then
    raise exception 'Invalid queue status transition: % to %.',old.status,new.status using errcode='23514';
  end if;
  return new;
end;
$$;

create or replace function public._broadcast_queue_refresh()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(jsonb_build_object('changed_at',now()),'refresh','salon-queue',false);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['salon_settings','services','barbers','staff_profiles','daily_token_counters','queue_entries','queue_entry_services','queue_activity_logs'] loop
    execute format('drop trigger if exists %I_touch on public.%I',t,t);
    if t <> 'daily_token_counters' and t <> 'queue_activity_logs' and t <> 'queue_entry_services' then
      execute format('create trigger %I_touch before update on public.%I for each row execute function public._touch_updated_at()',t,t);
    end if;
  end loop;
end $$;
drop trigger if exists queue_status_transition_guard on public.queue_entries;
create trigger queue_status_transition_guard before update of status on public.queue_entries
  for each row execute function public._validate_queue_transition();
do $$ declare t text; begin
  foreach t in array array['salon_settings','services','barbers','queue_entries'] loop
    execute format('drop trigger if exists %I_realtime_refresh on public.%I',t,t);
    execute format('create trigger %I_realtime_refresh after insert or update or delete on public.%I for each row execute function public._broadcast_queue_refresh()',t,t);
  end loop;
end $$;

-- Public, narrowly scoped customer/display RPCs.
create or replace function public.get_public_salon_snapshot()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'salon',jsonb_build_object('name',s.salon_name,'address',s.address,'opening_time',s.opening_time,'closing_time',s.closing_time,'working_days',s.working_days,'timezone',s.timezone,'currency',s.currency,'online_open',public._online_joining_is_open()),
    'services',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'description',v.description,'category',v.category,'duration',v.duration_minutes,'price',v.price,'enabled',v.is_enabled) order by v.sort_order,v.name) from public.services v), '[]'::jsonb),
    'barbers',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'specialty',b.specialty,'on_duty',b.on_duty,'on_break',b.on_break,'status',case when not b.on_duty then 'Off duty' when b.on_break then 'On break' when exists(select 1 from public.queue_entries q where q.assigned_barber_id=b.id and q.status in ('called','in_chair')) then 'Busy' else 'Available' end) order by b.sort_order,b.name) from public.barbers b), '[]'::jsonb),
    'waiting_count',(select count(*) from public.queue_entries q where q.status='waiting'),
    'wait_minutes',case when (select count(*) from public.barbers b where b.on_duty and not b.on_break)=0 then null else (select case when coalesce(sum(es.duration_minutes),0)=0 then 0 else greatest(1,ceil(sum(es.duration_minutes)::numeric/(select count(*) from public.barbers b where b.on_duty and not b.on_break))::integer) end from public.queue_entries q join public.queue_entry_services es on es.queue_entry_id=q.id where q.status in ('waiting','called','in_chair')) end
  ) from public.salon_settings s where s.id=true
$$;

create or replace function public.get_public_tv_snapshot()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'barbers',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'specialty',b.specialty,'status',case when not b.on_duty then 'Off duty' when b.on_break then 'On break' when q.status='called' then 'Called' when q.status='in_chair' then 'Busy' else 'Available' end,'current_token',case when q.status in ('called','in_chair') then 'S-'||q.token_number end) order by b.sort_order,b.name) from public.barbers b left join public.queue_entries q on q.assigned_barber_id=b.id and q.status in ('called','in_chair')), '[]'::jsonb),
    'up_next',coalesce((select jsonb_agg(jsonb_build_object('token','S-'||q.token_number,'wait_minutes',public._wait_minutes(q.id)) order by q.token_date,q.token_number) from (select * from public.queue_entries where status='waiting' order by token_date,token_number limit 5) q), '[]'::jsonb),
    'updated_at',now()
  )
$$;

create or replace function public.customer_join_queue(p_customer_name text,p_phone_number text,p_service_ids uuid[],p_preferred_barber_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_entry public.queue_entries; v_existing public.queue_entries;
begin
  if not public._online_joining_is_open() then raise exception 'Online joining is closed. Walk-ins are still available through reception.'; end if;
  if coalesce(p_phone_number,'') !~ '^[0-9]{10}$' then raise exception 'Enter a phone number with exactly 10 digits.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_phone_number,0));
  select * into v_existing from public.queue_entries where phone_number=p_phone_number and status in ('waiting','called','in_chair') limit 1;
  if found then return jsonb_build_object('already_active',true,'token','S-'||v_existing.token_number,'status',v_existing.status); end if;
  v_entry := public._insert_queue_entry(p_customer_name,p_phone_number,p_service_ids,p_preferred_barber_id,'online',null);
  return jsonb_build_object('already_active',false,'access_token',v_entry.access_token,'token','S-'||v_entry.token_number,'status',v_entry.status);
end;
$$;

create or replace function public.get_customer_status(p_access_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare q public.queue_entries; v_position integer; v_services jsonb;
begin
  if p_access_token !~ '^[a-f0-9]{64}$' then return null; end if;
  select * into q from public.queue_entries where access_token=p_access_token;
  if not found then return null; end if;
  select count(*)+1 into v_position from public.queue_entries e where e.status='waiting' and (e.token_date,e.token_number)<(q.token_date,q.token_number);
  select coalesce(jsonb_agg(jsonb_build_object('name',service_name,'duration',duration_minutes,'price',price) order by position),'[]'::jsonb)
    into v_services from public.queue_entry_services where queue_entry_id=q.id;
  return jsonb_build_object('token','S-'||q.token_number,'status',q.status,'position',case when q.status='waiting' then v_position end,
    'wait_minutes',public._wait_minutes(q.id),'services',v_services,
    'preferred_barber',(select name from public.barbers where id=q.preferred_barber_id),
    'assigned_barber',(select name from public.barbers where id=q.assigned_barber_id),
    'customer_name',q.customer_name,'called_at',q.called_at,'created_at',q.created_at);
end;
$$;

create or replace function public.cancel_customer_queue_entry(p_access_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare q public.queue_entries;
begin
  select * into q from public.queue_entries where access_token=p_access_token for update;
  if not found then raise exception 'Queue entry not found.'; end if;
  if q.status<>'waiting' then raise exception 'Only a waiting queue entry can be cancelled.'; end if;
  update public.queue_entries set status='cancelled',completed_at=now() where id=q.id;
  insert into public.queue_activity_logs(queue_entry_id,action,old_status,new_status) values(q.id,'customer_cancelled',q.status,'cancelled');
  return jsonb_build_object('status','cancelled');
end;
$$;

-- Staff identity and operational RPCs.
create or replace function public.get_my_staff_profile()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.staff_profiles;
begin
  p := public._assert_staff();
  return jsonb_build_object('user_id',p.user_id,'role',p.role,'display_name',p.display_name,'barber_id',p.barber_id,
    'barber_name',(select name from public.barbers where id=p.barber_id));
end;
$$;

create or replace function public.get_staff_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.staff_profiles; v_queue jsonb;
begin
  p := public._assert_staff(array['owner','receptionist']);
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'token','S-'||q.token_number,'token_number',q.token_number,'name',q.customer_name,'phone',q.phone_number,'status',q.status,'source',q.source,'preferred_barber_id',q.preferred_barber_id,'preferred_barber',(select name from public.barbers where id=q.preferred_barber_id),'assigned_barber_id',q.assigned_barber_id,'assigned_barber',(select name from public.barbers where id=q.assigned_barber_id),'created_at',q.created_at,'called_at',q.called_at,'wait_minutes',public._wait_minutes(q.id),'services',(select jsonb_agg(jsonb_build_object('name',es.service_name,'duration',es.duration_minutes,'price',es.price) order by es.position) from public.queue_entry_services es where es.queue_entry_id=q.id)) order by q.token_date,q.token_number),'[]'::jsonb)
  into v_queue from public.queue_entries q where q.token_date=public._local_now()::date and q.status in ('waiting','called','in_chair','done','cancelled','no_show');
  return jsonb_build_object('salon',public.get_public_salon_snapshot(),'queue',v_queue,
    'barbers',(select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'specialty',b.specialty,'on_duty',b.on_duty,'on_break',b.on_break,'status',case when not b.on_duty then 'Off duty' when b.on_break then 'On break' when q.id is not null then 'Busy' else 'Available' end,'current_token',case when q.id is not null then 'S-'||q.token_number end) order by b.sort_order,b.name),'[]'::jsonb) from public.barbers b left join public.queue_entries q on q.assigned_barber_id=b.id and q.status in ('called','in_chair')));
end;
$$;

create or replace function public.add_walk_in(p_customer_name text,p_phone_number text,p_service_ids uuid[],p_preferred_barber_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.staff_profiles; q public.queue_entries;
begin
  p := public._assert_staff(array['owner','receptionist']);
  q := public._insert_queue_entry(p_customer_name,p_phone_number,p_service_ids,p_preferred_barber_id,'walk_in',auth.uid());
  return jsonb_build_object('id',q.id,'token','S-'||q.token_number,'status',q.status);
end;
$$;

create or replace function public.call_next(p_barber_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.staff_profiles; b public.barbers; q public.queue_entries;
begin
  p := public._assert_staff(array['owner','receptionist']);
  select * into b from public.barbers where id=p_barber_id for update;
  if not found or not b.on_duty or b.on_break then raise exception 'This barber is not available for a new assignment.'; end if;
  if exists(select 1 from public.queue_entries where assigned_barber_id=b.id and status in ('called','in_chair')) then raise exception 'This barber already has an active assignment.'; end if;
  select * into q from public.queue_entries e where e.status='waiting' and (e.preferred_barber_id is null or e.preferred_barber_id=b.id)
    order by e.token_date,e.token_number limit 1 for update skip locked;
  if not found then raise exception 'No waiting customer matches this barber preference.'; end if;
  update public.queue_entries set status='called',assigned_barber_id=b.id,called_at=now() where id=q.id returning * into q;
  insert into public.queue_activity_logs(queue_entry_id,actor_user_id,action,old_status,new_status,details)
    values(q.id,auth.uid(),'called', 'waiting','called',jsonb_build_object('barber_id',b.id));
  return jsonb_build_object('id',q.id,'token','S-'||q.token_number,'status',q.status,'customer_name',q.customer_name,'barber_name',b.name);
end;
$$;

create or replace function public._change_queue_status(p_entry_id uuid,p_next_status text,p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.staff_profiles; q public.queue_entries; v_old_status text;
begin
  p := public._assert_staff();
  select * into q from public.queue_entries where id=p_entry_id for update;
  if not found then raise exception 'Queue entry not found.'; end if;
  if p.role='barber' and (q.assigned_barber_id is distinct from p.barber_id) then raise exception using errcode='42501',message='This queue entry is not assigned to your barber profile.'; end if;
  if p_next_status='no_show' and (q.status<>'called' or q.called_at>now()-interval '10 minutes') then raise exception 'No-show is available after the 10-minute call grace period.'; end if;
  if p_next_status='cancelled' and q.status<>'waiting' then raise exception 'Only a waiting queue entry can be cancelled.'; end if;
  v_old_status := q.status;
  update public.queue_entries set status=p_next_status,
    service_started_at=case when p_next_status='in_chair' then now() else service_started_at end,
    completed_at=case when p_next_status in ('done','cancelled','no_show') then now() else completed_at end,
    assigned_barber_id=case when p_next_status='no_show' then null else assigned_barber_id end
  where id=q.id returning * into q;
  insert into public.queue_activity_logs(queue_entry_id,actor_user_id,action,old_status,new_status)
    values(q.id,auth.uid(),p_action,v_old_status,p_next_status);
  return jsonb_build_object('id',q.id,'token','S-'||q.token_number,'status',q.status);
end;
$$;

create or replace function public.start_queue_service(p_entry_id uuid)
returns jsonb language sql security definer set search_path = '' as $$ select public._change_queue_status(p_entry_id,'in_chair','service_started') $$;
create or replace function public.complete_queue_service(p_entry_id uuid)
returns jsonb language sql security definer set search_path = '' as $$ select public._change_queue_status(p_entry_id,'done','service_completed') $$;
create or replace function public.mark_queue_cancelled(p_entry_id uuid)
returns jsonb language sql security definer set search_path = '' as $$ select public._change_queue_status(p_entry_id,'cancelled','staff_cancelled') $$;
create or replace function public.mark_queue_no_show(p_entry_id uuid)
returns jsonb language sql security definer set search_path = '' as $$ select public._change_queue_status(p_entry_id,'no_show','no_show') $$;

create or replace function public.readd_no_show(p_entry_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.staff_profiles; old_q public.queue_entries; q public.queue_entries; v_date date; v_number integer;
begin
  p := public._assert_staff(array['owner','receptionist']);
  select * into old_q from public.queue_entries where id=p_entry_id and status='no_show' for update;
  if not found then raise exception 'Only a No-show entry can be added again.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(old_q.phone_number,0));
  if exists(select 1 from public.queue_entries where phone_number=old_q.phone_number and status in ('waiting','called','in_chair')) then raise exception 'This customer already has another active queue entry.'; end if;
  select n.token_date,n.token_number into v_date,v_number from public._next_token() n;
  insert into public.queue_entries(token_date,token_number,customer_name,phone_number,preferred_barber_id,status,source,created_by)
    values(v_date,v_number,old_q.customer_name,old_q.phone_number,old_q.preferred_barber_id,'waiting','no_show_return',auth.uid()) returning * into q;
  insert into public.queue_entry_services(queue_entry_id,service_id,position,service_name,duration_minutes,price)
    select q.id,service_id,position,service_name,duration_minutes,price from public.queue_entry_services where queue_entry_id=old_q.id order by position;
  insert into public.queue_activity_logs(queue_entry_id,actor_user_id,action,new_status,details)
    values(q.id,auth.uid(),'no_show_readded','waiting',jsonb_build_object('previous_entry_id',old_q.id));
  return jsonb_build_object('id',q.id,'token','S-'||q.token_number,'status',q.status);
end;
$$;

create or replace function public.get_barber_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.staff_profiles; b public.barbers; current_q jsonb; next_q jsonb;
begin
  p := public._assert_staff(array['owner','barber']);
  if p.role='barber' then select * into b from public.barbers where id=p.barber_id;
  else select * into b from public.barbers order by sort_order,name limit 1; end if;
  if not found then raise exception 'No barber is configured yet.'; end if;
  select jsonb_build_object('id',q.id,'token','S-'||q.token_number,'name',q.customer_name,'status',q.status,'service_started_at',q.service_started_at,'services',(select jsonb_agg(jsonb_build_object('name',es.service_name,'duration',es.duration_minutes,'price',es.price) order by es.position) from public.queue_entry_services es where es.queue_entry_id=q.id))
    into current_q from public.queue_entries q where q.assigned_barber_id=b.id and q.status in ('called','in_chair') limit 1;
  select jsonb_build_object('token','S-'||q.token_number,'preference',case when q.preferred_barber_id is null then 'Any barber' else b.name end,'wait_minutes',public._wait_minutes(q.id))
    into next_q from public.queue_entries q where q.status='waiting' and (q.preferred_barber_id is null or q.preferred_barber_id=b.id) order by q.token_date,q.token_number limit 1;
  return jsonb_build_object('barber',jsonb_build_object('id',b.id,'name',b.name,'specialty',b.specialty,'on_duty',b.on_duty,'on_break',b.on_break),'current',current_q,'next',next_q);
end;
$$;

create or replace function public.set_my_barber_break(p_on_break boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.staff_profiles; b public.barbers;
begin
  p := public._assert_staff(array['barber']);
  update public.barbers set on_break=p_on_break where id=p.barber_id returning * into b;
  insert into public.queue_activity_logs(actor_user_id,action,details) values(auth.uid(),'barber_availability_changed',jsonb_build_object('barber_id',b.id,'on_break',p_on_break));
  return jsonb_build_object('id',b.id,'on_break',b.on_break);
end;
$$;

create or replace function public.get_owner_settings()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.staff_profiles; s public.salon_settings;
begin
  p := public._assert_staff(array['owner']);
  select * into s from public.salon_settings where id=true;
  return jsonb_build_object('salon',jsonb_build_object('name',s.salon_name,'address',s.address,'opening_time',s.opening_time,'closing_time',s.closing_time,'working_days',s.working_days,'timezone',s.timezone,'currency',s.currency,'manual_open',s.online_joining_manual_open,'online_open',public._online_joining_is_open()),
    'services',(select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'description',v.description,'category',v.category,'duration',v.duration_minutes,'price',v.price,'enabled',v.is_enabled) order by v.sort_order,v.name),'[]'::jsonb) from public.services v),
    'barbers',(select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'specialty',b.specialty,'on_duty',b.on_duty,'on_break',b.on_break) order by b.sort_order,b.name),'[]'::jsonb) from public.barbers b),
    'stats',jsonb_build_object('served_today',(select count(*) from public.queue_entries where status='done' and completed_at::date=public._local_now()::date),'no_shows',(select count(*) from public.queue_entries where status='no_show' and completed_at::date=public._local_now()::date),'average_wait',(select round(avg(extract(epoch from (service_started_at-created_at))/60))::integer from public.queue_entries where status in ('in_chair','done') and service_started_at::date=public._local_now()::date)));
end;
$$;

create or replace function public.save_salon_settings(p_name text,p_address text,p_opening_time time,p_closing_time time,p_working_days integer[],p_online_manual_open boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.staff_profiles; s public.salon_settings;
begin
  p := public._assert_staff(array['owner']);
  if length(trim(p_name)) not between 1 and 120 or p_opening_time>=p_closing_time then raise exception 'Enter a salon name and valid opening/closing times.'; end if;
  if coalesce(array_length(p_working_days,1),0)=0 or not p_working_days <@ array[1,2,3,4,5,6,7] then raise exception 'Select at least one valid working day.'; end if;
  update public.salon_settings set salon_name=trim(p_name),address=trim(p_address),opening_time=p_opening_time,closing_time=p_closing_time,working_days=p_working_days,online_joining_manual_open=p_online_manual_open where id=true returning * into s;
  insert into public.queue_activity_logs(actor_user_id,action,details) values(auth.uid(),'salon_settings_updated','{}'::jsonb);
  return jsonb_build_object('saved',true,'online_open',public._online_joining_is_open());
end;
$$;

create or replace function public.upsert_service(p_id uuid,p_name text,p_description text,p_category text,p_duration_minutes integer,p_price numeric,p_enabled boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.staff_profiles; v public.services;
begin
  p := public._assert_staff(array['owner']);
  if length(trim(p_name)) not between 1 and 100 or p_duration_minutes not between 1 and 600 or p_price<0 then raise exception 'Check the service name, duration and price.'; end if;
  if p_id is null then insert into public.services(name,description,category,duration_minutes,price,is_enabled) values(trim(p_name),coalesce(p_description,''),coalesce(nullif(trim(p_category),''),'General'),p_duration_minutes,p_price,p_enabled) returning * into v;
  else update public.services set name=trim(p_name),description=coalesce(p_description,''),category=coalesce(nullif(trim(p_category),''),'General'),duration_minutes=p_duration_minutes,price=p_price,is_enabled=p_enabled where id=p_id returning * into v; end if;
  if v.id is null then raise exception 'Service was not found.'; end if;
  insert into public.queue_activity_logs(actor_user_id,action,details) values(auth.uid(),'service_saved',jsonb_build_object('service_id',v.id));
  return jsonb_build_object('id',v.id,'saved',true);
end;
$$;

create or replace function public.upsert_barber(p_id uuid,p_name text,p_specialty text,p_on_duty boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.staff_profiles; b public.barbers;
begin
  p := public._assert_staff(array['owner']);
  if length(trim(p_name)) not between 1 and 100 then raise exception 'Enter a barber name.'; end if;
  if p_id is null then insert into public.barbers(name,specialty,on_duty) values(trim(p_name),coalesce(p_specialty,''),p_on_duty) returning * into b;
  else update public.barbers set name=trim(p_name),specialty=coalesce(p_specialty,''),on_duty=p_on_duty where id=p_id returning * into b; end if;
  if b.id is null then raise exception 'Barber was not found.'; end if;
  insert into public.queue_activity_logs(actor_user_id,action,details) values(auth.uid(),'barber_saved',jsonb_build_object('barber_id',b.id));
  return jsonb_build_object('id',b.id,'saved',true);
end;
$$;

-- Only these RPCs are callable by the browser. Internal helpers stay private.
revoke all on function public._touch_updated_at() from public,anon,authenticated;
revoke all on function public._assert_staff(text[]) from public,anon,authenticated;
revoke all on function public._local_now() from public,anon,authenticated;
revoke all on function public._online_joining_is_open() from public,anon,authenticated;
revoke all on function public._next_token() from public,anon,authenticated;
revoke all on function public._insert_queue_entry(text,text,uuid[],uuid,text,uuid) from public,anon,authenticated;
revoke all on function public._wait_minutes(uuid) from public,anon,authenticated;
revoke all on function public._check_service_count() from public,anon,authenticated;
revoke all on function public._validate_queue_transition() from public,anon,authenticated;
revoke all on function public._broadcast_queue_refresh() from public,anon,authenticated;
revoke all on function public._change_queue_status(uuid,text,text) from public,anon,authenticated;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
    'get_public_salon_snapshot','get_public_tv_snapshot','customer_join_queue','get_customer_status','cancel_customer_queue_entry'
  ) loop
    execute format('revoke all on function %s from public, anon, authenticated',f.sig);
    execute format('grant execute on function %s to anon, authenticated',f.sig);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
    'get_my_staff_profile','get_staff_dashboard','add_walk_in','call_next','start_queue_service','complete_queue_service',
    'mark_queue_cancelled','mark_queue_no_show','readd_no_show','get_barber_dashboard','set_my_barber_break','get_owner_settings',
    'save_salon_settings','upsert_service','upsert_barber'
  ) loop
    execute format('revoke all on function %s from public, anon, authenticated',f.sig);
    execute format('grant execute on function %s to authenticated',f.sig);
  end loop;
end $$;

