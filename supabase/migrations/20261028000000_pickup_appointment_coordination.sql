-- Follow-up migration for optional Collector/Recycler pickup-time coordination.
-- Review and test on a disposable database before applying to any shared project.
-- This file has not been executed against any database by this change.

begin;

create table public.pickup_appointments (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null unique references public.lots (id) on delete cascade,
  offer_id uuid not null references public.offers (id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'proposed' check (status in (
    'proposed', 'confirmed', 'reschedule_requested'
  )),
  proposed_note text not null default '' check (char_length(proposed_note) <= 500),
  response_note text not null default '' check (char_length(response_note) <= 500),
  proposed_by uuid not null references public.profiles (id) on delete restrict,
  responded_by uuid references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pickup_appointments_response_consistent check (
    (status = 'proposed' and responded_by is null)
    or (status in ('confirmed', 'reschedule_requested') and responded_by is not null)
  )
);

alter table public.pickup_appointments enable row level security;
revoke all on table public.pickup_appointments from public, anon, authenticated;
grant select on public.pickup_appointments to authenticated;

create policy pickup_appointments_read_participants_and_admin
  on public.pickup_appointments for select to authenticated
  using (
    scarap_private.current_app_role() = 'admin'
    or scarap_private.owns_lot(lot_id)
    or exists (
      select 1
      from public.offers as o
      where o.id = pickup_appointments.offer_id
        and o.lot_id = pickup_appointments.lot_id
        and o.recycler_id = (select auth.uid())
        and o.status = 'accepted'
    )
  );

-- Only the Collector who owns the accepted lot may propose a time or replace
-- one after the Recycler has requested a reschedule.
create or replace function public.propose_pickup_appointment(
  p_lot_id uuid,
  p_scheduled_at timestamptz,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_collector_id uuid;
  v_lot_status text;
  v_offer_id uuid;
  v_appointment_id uuid;
  v_note text := btrim(coalesce(p_note, ''));
  v_time_label text;
begin
  if v_user_id is null then raise exception 'Sign in is required'; end if;
  if scarap_private.current_app_role() is distinct from 'collector' then
    raise exception 'Only a Collector can propose a pickup time';
  end if;
  if p_scheduled_at is null
    or p_scheduled_at <= now() + interval '30 minutes'
    or p_scheduled_at > now() + interval '90 days' then
    raise exception 'Choose a pickup time at least 30 minutes from now and within 90 days';
  end if;
  if char_length(v_note) > 500 then raise exception 'Pickup note must be 500 characters or fewer'; end if;

  select l.collector_id, l.status
    into v_collector_id, v_lot_status
  from public.lots as l
  where l.id = p_lot_id
  for update;
  if not found then raise exception 'Lot not found'; end if;
  if v_collector_id <> v_user_id then raise exception 'Only the lot Collector can propose a pickup time'; end if;
  if v_lot_status <> 'pickup_scheduled' then raise exception 'A pickup time can only be proposed after an offer is accepted'; end if;

  select o.id into v_offer_id
  from public.offers as o
  where o.lot_id = p_lot_id and o.status = 'accepted'
  for update;
  if not found then raise exception 'This lot has no accepted Recycler offer'; end if;

  v_time_label := to_char(p_scheduled_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC';
  insert into public.pickup_appointments as existing (
    lot_id, offer_id, scheduled_at, status, proposed_note, response_note,
    proposed_by, responded_by
  ) values (
    p_lot_id, v_offer_id, p_scheduled_at, 'proposed', v_note, '', v_user_id, null
  )
  on conflict (lot_id) do update
    set offer_id = excluded.offer_id,
        scheduled_at = excluded.scheduled_at,
        status = 'proposed',
        proposed_note = excluded.proposed_note,
        response_note = '',
        proposed_by = excluded.proposed_by,
        responded_by = null,
        updated_at = now()
    where existing.offer_id = excluded.offer_id
      and existing.status = 'reschedule_requested'
  returning id into v_appointment_id;
  if not found then raise exception 'A pending or confirmed pickup time cannot be replaced until the Recycler requests a new time'; end if;

  insert into public.activity_history (lot_id, actor_id, event_type, summary)
  values (
    p_lot_id, v_user_id, 'pickup_appointment_proposed',
    left('Collector proposed a pickup time: ' || v_time_label ||
      case when v_note = '' then '' else '. ' || v_note end, 500)
  );
end;
$$;

-- Only the Recycler on the accepted offer may confirm or request another time.
create or replace function public.respond_to_pickup_appointment(
  p_lot_id uuid,
  p_decision text,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text := scarap_private.current_app_role();
  v_lot_status text;
  v_recycler_id uuid;
  v_appointment_id uuid;
  v_appointment_status text;
  v_scheduled_at timestamptz;
  v_note text := btrim(coalesce(p_note, ''));
  v_summary text;
begin
  if v_user_id is null then raise exception 'Sign in is required'; end if;
  if v_role is distinct from 'recycler' then raise exception 'Only the accepted Recycler can respond to a pickup time'; end if;
  if p_decision is null or p_decision not in ('confirm', 'request_reschedule') then
    raise exception 'Choose confirm or request_reschedule';
  end if;
  if char_length(v_note) > 500 then raise exception 'Pickup response note must be 500 characters or fewer'; end if;
  if p_decision = 'request_reschedule' and char_length(v_note) < 10 then
    raise exception 'Explain the reschedule request in 10 to 500 characters';
  end if;

  select l.status into v_lot_status
  from public.lots as l
  where l.id = p_lot_id
  for update;
  if not found then raise exception 'Lot not found'; end if;
  if v_lot_status <> 'pickup_scheduled' then raise exception 'This lot is no longer awaiting pickup coordination'; end if;

  select o.recycler_id into v_recycler_id
  from public.offers as o
  where o.lot_id = p_lot_id and o.status = 'accepted'
  for update;
  if not found or v_recycler_id <> v_user_id then raise exception 'Only the Recycler on the accepted offer can respond'; end if;

  select a.id, a.status, a.scheduled_at
    into v_appointment_id, v_appointment_status, v_scheduled_at
  from public.pickup_appointments as a
  where a.lot_id = p_lot_id and a.offer_id = (select o.id from public.offers as o where o.lot_id = p_lot_id and o.status = 'accepted')
  for update;
  if not found or v_appointment_status <> 'proposed' then raise exception 'There is no pending pickup-time proposal'; end if;

  if p_decision = 'confirm' and v_scheduled_at <= now() then
    raise exception 'This proposed time has passed; ask the Collector for another time';
  end if;

  update public.pickup_appointments
  set status = case when p_decision = 'confirm' then 'confirmed' else 'reschedule_requested' end,
      response_note = v_note,
      responded_by = v_user_id,
      updated_at = now()
  where id = v_appointment_id;

  v_summary := case
    when p_decision = 'confirm' then 'Recycler confirmed the proposed pickup time'
    else 'Recycler requested a different pickup time: ' || v_note
  end;
  insert into public.activity_history (lot_id, actor_id, event_type, summary)
  values (p_lot_id, v_user_id, 'pickup_appointment_response', left(v_summary, 500));
end;
$$;

revoke all on function public.propose_pickup_appointment(uuid, timestamptz, text) from public, anon, authenticated;
revoke all on function public.respond_to_pickup_appointment(uuid, text, text) from public, anon, authenticated;
grant execute on function public.propose_pickup_appointment(uuid, timestamptz, text) to authenticated;
grant execute on function public.respond_to_pickup_appointment(uuid, text, text) to authenticated;

commit;
