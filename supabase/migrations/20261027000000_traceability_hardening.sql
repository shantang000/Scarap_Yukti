-- Traceability hardening. Review before applying; this file is NOT applied automatically.
-- 1) Lock lot details once an offer is accepted. 2) Handover weight + discrepancy flag.
-- 3) Participants (collector / accepted recycler) can raise a dispute.

alter table public.lots
  add column if not exists actual_weight_kg numeric
    check (actual_weight_kg is null or (actual_weight_kg > 0 and actual_weight_kg <= 100000)),
  add column if not exists weight_discrepancy_pct numeric,
  add column if not exists handover_recorded_at timestamptz;

drop policy if exists owners_or_admin_update_lot_details on public.lots;
create policy owners_or_admin_update_lot_details on public.lots
  for update to authenticated
  using (
    (collector_id = (select auth.uid())
      and scarap_private.current_app_role() = 'collector'
      and status in ('open', 'offer_submitted'))
    or scarap_private.current_app_role() = 'admin'
  )
  with check (
    (collector_id = (select auth.uid())
      and scarap_private.current_app_role() = 'collector'
      and status in ('open', 'offer_submitted'))
    or scarap_private.current_app_role() = 'admin'
  );

create or replace function public.record_handover_weight(p_lot_id uuid, p_actual_weight_kg numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_status text; v_est numeric; v_actual numeric; v_pct numeric;
  v_tolerance constant numeric := 10; -- percent
  v_flag boolean;
begin
  if v_user is null then raise exception 'Sign in is required'; end if;
  if p_actual_weight_kg is null or p_actual_weight_kg <= 0 or p_actual_weight_kg > 100000 then
    raise exception 'Actual weight must be greater than 0 and at most 100000 kg';
  end if;
  select l.status, l.weight_kg, l.actual_weight_kg into v_status, v_est, v_actual
  from public.lots as l where l.id = p_lot_id for update;
  if not found then raise exception 'Lot not found'; end if;
  if not exists (select 1 from public.offers as o
                 where o.lot_id = p_lot_id and o.recycler_id = v_user and o.status = 'accepted') then
    raise exception 'Only the accepted recycler can record the handover weight';
  end if;
  if v_status <> 'collected' then raise exception 'Handover weight can be recorded only after collection'; end if;
  if v_actual is not null then raise exception 'Handover weight was already recorded'; end if;

  v_pct := round(abs(p_actual_weight_kg - v_est) / v_est * 100, 2);
  v_flag := v_pct > v_tolerance;
  update public.lots set
    actual_weight_kg = p_actual_weight_kg,
    weight_discrepancy_pct = v_pct,
    handover_recorded_at = now(),
    status = case when v_flag then 'disputed' else status end,
    dispute_return_status = case when v_flag then v_status else dispute_return_status end
  where id = p_lot_id;
  insert into public.workflow_events (lot_id, actor_id, from_status, to_status, event_type, note)
  values (p_lot_id, v_user, v_status, case when v_flag then 'disputed' else v_status end,
          case when v_flag then 'weight_discrepancy_flagged' else 'handover_weight_recorded' end,
          'Estimated ' || v_est || ' kg, actual ' || p_actual_weight_kg || ' kg, difference ' || v_pct || '%');
end; $$;

create or replace function public.raise_dispute(p_lot_id uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_status text; v_collector uuid;
  v_note text := btrim(coalesce(p_note, ''));
begin
  if v_user is null then raise exception 'Sign in is required'; end if;
  if char_length(v_note) < 10 or char_length(v_note) > 500 then
    raise exception 'Dispute note must be between 10 and 500 characters';
  end if;
  select l.status, l.collector_id into v_status, v_collector
  from public.lots as l where l.id = p_lot_id for update;
  if not found then raise exception 'Lot not found'; end if;
  if not (v_collector = v_user or exists (select 1 from public.offers as o
          where o.lot_id = p_lot_id and o.recycler_id = v_user and o.status = 'accepted')) then
    raise exception 'Only the lot collector or the accepted recycler can raise a dispute';
  end if;
  if v_status not in ('pickup_scheduled', 'collected', 'recycling_review') then
    raise exception 'A dispute cannot be raised from status %', v_status;
  end if;
  update public.lots set status = 'disputed', dispute_return_status = v_status where id = p_lot_id;
  insert into public.workflow_events (lot_id, actor_id, from_status, to_status, event_type, note)
  values (p_lot_id, v_user, v_status, 'disputed', 'participant_dispute', v_note);
end; $$;

revoke all on function public.record_handover_weight(uuid, numeric) from public, anon;
revoke all on function public.raise_dispute(uuid, text) from public, anon;
grant execute on function public.record_handover_weight(uuid, numeric) to authenticated;
grant execute on function public.raise_dispute(uuid, text) to authenticated;
