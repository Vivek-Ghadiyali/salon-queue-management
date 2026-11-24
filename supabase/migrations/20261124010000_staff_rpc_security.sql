-- Tighten staff RPC grants and role checks. This follows the initial schema migration
-- and is safe to apply whether that migration was pushed by the CLI or SQL Editor.

revoke all on public.salon_settings, public.services, public.barbers, public.staff_profiles,
  public.daily_token_counters, public.queue_entries, public.queue_entry_services,
  public.queue_activity_logs from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

create or replace function public._change_queue_status(p_entry_id uuid,p_next_status text,p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.staff_profiles; q public.queue_entries; v_old_status text;
begin
  p := public._assert_staff();
  if p_next_status not in ('in_chair','done','cancelled','no_show') then
    raise exception 'Unsupported queue status action.' using errcode='22023';
  end if;
  if p_next_status in ('cancelled','no_show') and p.role not in ('owner','receptionist') then
    raise exception using errcode='42501', message='Only reception staff can cancel or mark a No-show.';
  end if;
  if p_next_status in ('in_chair','done') and p.role<>'barber' then
    raise exception using errcode='42501', message='Only the assigned barber can start or complete service.';
  end if;
  if p_next_status in ('in_chair','done') and p.role<>'barber' then
    raise exception using errcode='42501', message='Only the assigned barber can start or complete service.';
  end if;
  select * into q from public.queue_entries where id=p_entry_id for update;
  if not found then raise exception 'Queue entry not found.'; end if;
  if p.role='barber' and q.assigned_barber_id is distinct from p.barber_id then
    raise exception using errcode='42501',message='This queue entry is not assigned to your barber profile.';
  end if;
  if p_next_status='no_show' and (q.status<>'called' or q.called_at is null or q.called_at>now()-interval '10 minutes') then
    raise exception 'No-show is available after the 10-minute call grace period.';
  end if;
  if p_next_status='cancelled' and q.status<>'waiting' then raise exception 'Only a waiting queue entry can be cancelled.'; end if;
  if p_next_status='in_chair' and q.status<>'called' then raise exception 'Only a Called queue entry can start service.'; end if;
  if p_next_status='done' and q.status<>'in_chair' then raise exception 'Only an In Chair queue entry can be completed.'; end if;
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

create or replace function public.get_barber_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.staff_profiles; b public.barbers; current_q jsonb; next_q jsonb;
begin
  p := public._assert_staff(array['barber']);
  select * into b from public.barbers where id=p.barber_id;
  if not found then raise exception 'No barber is configured for this staff account.'; end if;
  select jsonb_build_object('id',q.id,'token','S-'||q.token_number,'name',q.customer_name,'status',q.status,
    'service_started_at',q.service_started_at,
    'services',(select jsonb_agg(jsonb_build_object('name',es.service_name,'duration',es.duration_minutes,'price',es.price) order by es.position)
      from public.queue_entry_services es where es.queue_entry_id=q.id))
    into current_q from public.queue_entries q
    where q.assigned_barber_id=b.id and q.status in ('called','in_chair') limit 1;
  select jsonb_build_object('token','S-'||q.token_number,
    'preference',case when q.preferred_barber_id is null then 'Any barber' else b.name end,
    'wait_minutes',public._wait_minutes(q.id))
    into next_q from public.queue_entries q
    where q.status='waiting' and (q.preferred_barber_id is null or q.preferred_barber_id=b.id)
    order by q.token_date,q.token_number limit 1;
  return jsonb_build_object('barber',jsonb_build_object('id',b.id,'name',b.name,'specialty',b.specialty,
    'on_duty',b.on_duty,'on_break',b.on_break),'current',current_q,'next',next_q);
end;
$$;

-- Public/customer RPCs remain available to anon. Staff operations require an authenticated JWT.
revoke all on function public.get_my_staff_profile() from public,anon,authenticated;
revoke all on function public.get_staff_dashboard() from public,anon,authenticated;
revoke all on function public.add_walk_in(text,text,uuid[],uuid) from public,anon,authenticated;
revoke all on function public.call_next(uuid) from public,anon,authenticated;
revoke all on function public.start_queue_service(uuid) from public,anon,authenticated;
revoke all on function public.complete_queue_service(uuid) from public,anon,authenticated;
revoke all on function public.mark_queue_cancelled(uuid) from public,anon,authenticated;
revoke all on function public.mark_queue_no_show(uuid) from public,anon,authenticated;
revoke all on function public.readd_no_show(uuid) from public,anon,authenticated;
revoke all on function public.get_barber_dashboard() from public,anon,authenticated;
revoke all on function public.set_my_barber_break(boolean) from public,anon,authenticated;
revoke all on function public.get_owner_settings() from public,anon,authenticated;
revoke all on function public.save_salon_settings(text,text,time,time,integer[],boolean) from public,anon,authenticated;
revoke all on function public.upsert_service(uuid,text,text,text,integer,numeric,boolean) from public,anon,authenticated;
revoke all on function public.upsert_barber(uuid,text,text,boolean) from public,anon,authenticated;

grant execute on function public.get_my_staff_profile() to authenticated;
grant execute on function public.get_staff_dashboard() to authenticated;
grant execute on function public.add_walk_in(text,text,uuid[],uuid) to authenticated;
grant execute on function public.call_next(uuid) to authenticated;
grant execute on function public.start_queue_service(uuid) to authenticated;
grant execute on function public.complete_queue_service(uuid) to authenticated;
grant execute on function public.mark_queue_cancelled(uuid) to authenticated;
grant execute on function public.mark_queue_no_show(uuid) to authenticated;
grant execute on function public.readd_no_show(uuid) to authenticated;
grant execute on function public.get_barber_dashboard() to authenticated;
grant execute on function public.set_my_barber_break(boolean) to authenticated;
grant execute on function public.get_owner_settings() to authenticated;
grant execute on function public.save_salon_settings(text,text,time,time,integer[],boolean) to authenticated;
grant execute on function public.upsert_service(uuid,text,text,text,integer,numeric,boolean) to authenticated;
grant execute on function public.upsert_barber(uuid,text,text,boolean) to authenticated;

-- Keep the public RPC surface explicit and restore anon/authenticated access only here.
revoke all on function public.get_public_salon_snapshot() from public,anon,authenticated;
revoke all on function public.get_public_tv_snapshot() from public,anon,authenticated;
revoke all on function public.customer_join_queue(text,text,uuid[],uuid) from public,anon,authenticated;
revoke all on function public.get_customer_status(text) from public,anon,authenticated;
revoke all on function public.cancel_customer_queue_entry(text) from public,anon,authenticated;
grant execute on function public.get_public_salon_snapshot() to anon,authenticated;
grant execute on function public.get_public_tv_snapshot() to anon,authenticated;
grant execute on function public.customer_join_queue(text,text,uuid[],uuid) to anon,authenticated;
grant execute on function public.get_customer_status(text) to anon,authenticated;
grant execute on function public.cancel_customer_queue_entry(text) to anon,authenticated;

