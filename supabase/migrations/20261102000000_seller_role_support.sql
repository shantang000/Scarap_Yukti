-- Migration: Support distinct Seller role in Scarap_Yukti.
--
-- IMPORTANT: Review this file before applying it to any hosted database.
-- It has NOT been applied automatically.
--
-- Product Model:
--   - 'seller': Individual/Enterprise generator disposing of e-waste / scrap assets.
--   - 'collector': Aggregator / local materials dealer consolidating, sorting, and aggregating lots.
--   - 'recycler': Certified dismantler/processor bidding on, collecting, and processing materials.
--   - 'admin': Compliance officer managing workflow transitions, disputes, and evidence verification.
--
-- Security Rules:
--   - Admin role can NEVER be self-assigned.
--   - Commercial Recycler role requires verification.
--   - Only 'seller' or 'collector' may be requested during initial signup; all other inputs default safely to 'collector'.
--   - Users can NEVER alter their own 'role' column via client queries; table-level UPDATE is revoked and granted exclusively on 'display_name'.
--   - Lots may only be edited while strictly in 'open' status.
--
-- Prerequisites & Migration Ordering:
--   - Expected order: 20261023000000 -> 20261025000000 -> 20261027000000 -> 20261028000000 -> 20261102000000 -> 20261102010000.
--   - If 20261028000000 (pickup appointments) is applied later, propose_pickup_appointment() must be re-run from this migration to include 'seller'.

begin;

-- 1. Update the role check constraint on public.profiles to include 'seller'.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('seller', 'collector', 'recycler', 'admin'));

-- 2. Explicitly revoke any broad table-level UPDATE privilege on public.profiles.
-- Ensure that authenticated users can only update display_name and can NEVER update
-- the 'role' column through PostgREST or direct SQL queries.
revoke update on table public.profiles from public, anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- 3. Secure onboarding trigger: Allow self-selection of 'seller' or 'collector' at signup.
-- Privileged roles ('admin', 'recycler') cannot be self-assigned and fall back safely to 'collector'.
create or replace function scarap_private.create_collector_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested_role text;
  v_assigned_role text;
begin
  v_requested_role := lower(btrim(coalesce(new.raw_user_meta_data ->> 'role', new.raw_user_meta_data ->> 'requested_role', '')));
  v_assigned_role := case
    when v_requested_role in ('seller', 'collector') then v_requested_role
    else 'collector'
  end;

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 100),
    v_assigned_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function scarap_private.create_collector_profile() from public, anon, authenticated;

-- 4. Permit both Sellers and Collectors to insert their own listings in 'open' status.
drop policy if exists collectors_insert_own_lots on public.lots;
drop policy if exists sellers_and_collectors_insert_own_lots on public.lots;
create policy sellers_and_collectors_insert_own_lots
  on public.lots for insert to authenticated
  with check (
    collector_id = (select auth.uid())
    and scarap_private.current_app_role() in ('collector', 'seller')
    and status = 'open'
  );

-- 5. Permit Sellers, Collectors, and Admins to update lot details ONLY while strictly in 'open' status.
-- Revisions are strictly locked once an offer is submitted or the workflow advances.
-- Workflow state transitions are handled exclusively through trusted security-definer RPCs.
drop policy if exists owners_or_admin_update_lot_details on public.lots;
create policy owners_or_admin_update_lot_details
  on public.lots for update to authenticated
  using (
    status = 'open'
    and (
      (collector_id = (select auth.uid()) and scarap_private.current_app_role() in ('collector', 'seller'))
      or scarap_private.current_app_role() = 'admin'
    )
  )
  with check (
    status = 'open'
    and (
      (collector_id = (select auth.uid()) and scarap_private.current_app_role() in ('collector', 'seller'))
      or scarap_private.current_app_role() = 'admin'
    )
  );

-- 6. Permit Sellers and Collectors to decide incoming offers via the trusted RPC.
create or replace function public.respond_to_offer(p_offer_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_lot_id uuid;
  v_collector_id uuid;
  v_lot_status text;
  v_offer_status text;
  v_recycler_id uuid;
  v_pending_exists boolean;
  v_to_status text;
  v_caller_role text := scarap_private.current_app_role();
begin
  if v_user_id is null then raise exception 'Sign in is required'; end if;
  if v_caller_role is null or v_caller_role not in ('collector', 'seller') then
    raise exception 'Only a Seller or Collector can decide an offer';
  end if;
  if p_decision is null or p_decision not in ('accepted', 'rejected') then
    raise exception 'Decision must be accepted or rejected';
  end if;

  select l.id, l.collector_id, l.status into v_lot_id, v_collector_id, v_lot_status
  from public.lots as l
  join public.offers as o on o.lot_id = l.id
  where o.id = p_offer_id
  for update of l;
  if not found then raise exception 'Offer not found'; end if;
  if v_collector_id <> v_user_id then raise exception 'Only the lot owner can decide this offer'; end if;
  if v_lot_status <> 'offer_submitted' then raise exception 'This lot is not accepting offer decisions'; end if;

  select o.status, o.recycler_id into v_offer_status, v_recycler_id
  from public.offers as o
  where o.id = p_offer_id and o.lot_id = v_lot_id
  for update;
  if not found or v_offer_status <> 'pending' then raise exception 'This offer is no longer pending'; end if;

  if p_decision = 'accepted' then
    update public.offers set status = 'accepted' where id = p_offer_id;
    update public.offers set status = 'rejected'
      where lot_id = v_lot_id and id <> p_offer_id and status = 'pending';
    update public.lots set status = 'pickup_scheduled' where id = v_lot_id;
    insert into public.workflow_events (lot_id, actor_id, from_status, to_status, event_type, note)
    values (v_lot_id, v_user_id, v_lot_status, 'pickup_scheduled', 'offer_accepted', 'Accepted recycler ' || v_recycler_id::text);
  else
    update public.offers set status = 'rejected' where id = p_offer_id;
    select exists (
      select 1 from public.offers as o where o.lot_id = v_lot_id and o.status = 'pending'
    ) into v_pending_exists;
    v_to_status := case when v_pending_exists then 'offer_submitted' else 'open' end;
    if v_to_status <> v_lot_status then
      update public.lots set status = v_to_status where id = v_lot_id;
    end if;
    insert into public.workflow_events (lot_id, actor_id, from_status, to_status, event_type, note)
    values (v_lot_id, v_user_id, v_lot_status, v_to_status, 'offer_rejected', 'Rejected offer ' || p_offer_id::text);
  end if;
end;
$$;

revoke all on function public.respond_to_offer(uuid, text) from public, anon;
grant execute on function public.respond_to_offer(uuid, text) to authenticated;

-- 7. Support pickup appointment proposals for both Sellers and Collectors (when pickup coordination migration is active).
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'pickup_appointments') then
    execute $func$
      create or replace function public.propose_pickup_appointment(
        p_lot_id uuid,
        p_scheduled_at timestamptz,
        p_note text default ''
      )
      returns void
      language plpgsql
      security definer
      set search_path = ''
      as $body$
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
        if scarap_private.current_app_role() is null
          or scarap_private.current_app_role() not in ('collector', 'seller') then
          raise exception 'Only a Seller or Collector can propose a pickup time';
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
        if v_collector_id <> v_user_id then raise exception 'Only the lot owner can propose a pickup time'; end if;
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
        if not found then
          raise exception 'A pending or confirmed pickup time cannot be replaced until the Recycler requests a new time';
        end if;

        insert into public.activity_history (lot_id, actor_id, event_type, summary)
        values (
          p_lot_id, v_user_id, 'pickup_appointment_proposed',
          left(case when scarap_private.current_app_role() = 'seller' then 'Seller' else 'Collector' end || ' proposed a pickup time: ' || v_time_label ||
            case when v_note = '' then '' else '. ' || v_note end, 500)
        );
      end;
      $body$;

      revoke all on function public.propose_pickup_appointment(uuid, timestamptz, text) from public, anon, authenticated;
      grant execute on function public.propose_pickup_appointment(uuid, timestamptz, text) to authenticated;
    $func$;
  end if;
end;
$$;

commit;
