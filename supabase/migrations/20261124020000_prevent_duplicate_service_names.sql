-- Prevent new case/whitespace-only duplicate service names without changing
-- or deleting existing service records. Existing duplicates can still be edited
-- or disabled by id so the owner can resolve them deliberately.
create or replace function public.upsert_service(
  p_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_duration_minutes integer,
  p_price numeric,
  p_enabled boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.staff_profiles;
  v public.services;
begin
  p := public._assert_staff(array['owner']);
  if length(trim(coalesce(p_name,''))) not between 1 and 100
     or p_duration_minutes not between 1 and 600
     or p_price is null or p_price < 0 then
    raise exception 'Check the service name, duration and price.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_name)),317890));

  if p_id is null then
    if exists(select 1 from public.services s where lower(trim(s.name))=lower(trim(p_name))) then
      raise exception 'A service with this name already exists. Edit the existing service instead.';
    end if;
    insert into public.services(name,description,category,duration_minutes,price,is_enabled)
      values(trim(p_name),coalesce(p_description,''),coalesce(nullif(trim(p_category),''),'General'),p_duration_minutes,p_price,p_enabled)
      returning * into v;
  else
    select * into v from public.services where id=p_id for update;
    if not found then raise exception 'Service was not found.'; end if;
    if lower(trim(v.name))<>lower(trim(p_name))
       and exists(select 1 from public.services s where s.id<>p_id and lower(trim(s.name))=lower(trim(p_name))) then
      raise exception 'A service with this name already exists. Edit the existing service instead.';
    end if;
    update public.services
       set name=trim(p_name),description=coalesce(p_description,''),
           category=coalesce(nullif(trim(p_category),''),'General'),
           duration_minutes=p_duration_minutes,price=p_price,is_enabled=p_enabled
     where id=p_id returning * into v;
  end if;

  insert into public.queue_activity_logs(actor_user_id,action,details)
    values(auth.uid(),'service_saved',jsonb_build_object('service_id',v.id));
  return jsonb_build_object('id',v.id,'saved',true);
end;
$$;

revoke all on function public.upsert_service(uuid,text,text,text,integer,numeric,boolean) from public,anon,authenticated;
grant execute on function public.upsert_service(uuid,text,text,text,integer,numeric,boolean) to authenticated;
