-- Scarap_Yukti Phase 3 database foundation.
-- Review this file before running it in Supabase SQL Editor. It has not been
-- applied to any hosted database by the project author or this assistant.

begin;

-- Use a project-specific helper schema to avoid changing grants on a generic
-- schema that may already exist in a Supabase project.
create schema if not exists scarap_private;
revoke all on schema scarap_private from public, anon, authenticated;
grant usage on schema scarap_private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  display_name text not null default '' check (char_length(display_name) <= 100),
  role text not null default 'collector' check (role in ('collector', 'recycler', 'admin')),
  created_at timestamptz not null default now()
);

create table public.lots (
  id uuid primary key default gen_random_uuid(),
  collector_id uuid not null references public.profiles (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 2 and 100),
  category text not null check (char_length(btrim(category)) between 1 and 80),
  weight_kg numeric(12, 2) not null check (weight_kg > 0 and weight_kg <= 100000),
  -- Save an approximate pickup area, not a private home address.
  location text not null check (char_length(btrim(location)) between 2 and 160),
  notes text not null default '' check (char_length(notes) <= 500),
  status text not null default 'open' check (status in (
    'open', 'offer_submitted', 'pickup_scheduled', 'collected',
    'recycling_review', 'recycled', 'disputed'
  )),
  evidence_note text not null default '' check (char_length(evidence_note) <= 500),
  dispute_return_status text check (dispute_return_status in (
    'open', 'offer_submitted', 'pickup_scheduled', 'collected', 'recycling_review'
  )),
  constraint lots_dispute_status_consistent check (
    (status = 'disputed' and dispute_return_status is not null)
    or (status <> 'disputed' and dispute_return_status is null)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id) on delete cascade,
  recycler_id uuid not null references public.profiles (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0 and amount <= 1000000000),
  message text not null default '' check (char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  constraint offers_one_per_recycler_per_lot unique (lot_id, recycler_id)
);

create unique index offers_one_accepted_per_lot
  on public.offers (lot_id)
  where status = 'accepted';

create index lots_collector_status_idx on public.lots (collector_id, status);
create index lots_marketplace_idx on public.lots (status, category, location);
create index offers_recycler_created_idx on public.offers (recycler_id, created_at desc);
create index offers_lot_status_idx on public.offers (lot_id, status);

create table public.workflow_events (
  id bigint generated always as identity primary key,
  lot_id uuid not null references public.lots (id) on delete restrict,
  actor_id uuid references public.profiles (id) on delete set null,
  from_status text,
  to_status text not null,
  event_type text not null check (char_length(event_type) <= 80),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create table public.activity_history (
  id bigint generated always as identity primary key,
  lot_id uuid references public.lots (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (char_length(event_type) <= 80),
  summary text not null check (char_length(summary) between 1 and 500),
  created_at timestamptz not null default now()
);

create index workflow_events_lot_created_idx on public.workflow_events (lot_id, created_at desc);
create index activity_history_lot_created_idx on public.activity_history (lot_id, created_at desc);

-- These narrowly scoped SECURITY DEFINER helpers avoid policy recursion.
-- Keep the private schema out of Supabase's exposed API schemas.
create or replace function scarap_private.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
$$;

create or replace function scarap_private.owns_lot(p_lot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lots as l
    where l.id = p_lot_id
      and l.collector_id = (select auth.uid())
  )
$$;

create or replace function scarap_private.can_view_lot(p_lot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lots as l
    where l.id = p_lot_id
      and (
        l.collector_id = (select auth.uid())
        or scarap_private.current_app_role() = 'admin'
        or (
          scarap_private.current_app_role() = 'recycler'
          and l.status in ('open', 'offer_submitted')
        )
        or exists (
          select 1
          from public.offers as o
          where o.lot_id = l.id
            and o.recycler_id = (select auth.uid())
        )
      )
  )
$$;

create or replace function scarap_private.can_view_lot_history(p_lot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lots as l
    where l.id = p_lot_id
      and (
        l.collector_id = (select auth.uid())
        or scarap_private.current_app_role() = 'admin'
        or exists (
          select 1
          from public.offers as o
          where o.lot_id = l.id
            and o.recycler_id = (select auth.uid())
        )
      )
  )
$$;

revoke all on function scarap_private.current_app_role() from public, anon;
revoke all on function scarap_private.owns_lot(uuid) from public, anon;
revoke all on function scarap_private.can_view_lot(uuid) from public, anon;
revoke all on function scarap_private.can_view_lot_history(uuid) from public, anon;
grant execute on function scarap_private.current_app_role() to authenticated;
grant execute on function scarap_private.owns_lot(uuid) to authenticated;
grant execute on function scarap_private.can_view_lot(uuid) to authenticated;
grant execute on function scarap_private.can_view_lot_history(uuid) to authenticated;

-- A new Auth user always starts as a Collector. User metadata cannot choose a role.
create or replace function scarap_private.create_collector_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 100),
    'collector'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function scarap_private.create_collector_profile() from public, anon, authenticated;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function scarap_private.create_collector_profile();

-- Existing Auth users also receive the safe default role on first migration run.
insert into public.profiles (id, display_name, role)
select
  u.id,
  left(coalesce(u.raw_user_meta_data ->> 'display_name', ''), 100),
  'collector'
from auth.users as u
on conflict (id) do nothing;

create or replace function scarap_private.touch_lot_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function scarap_private.touch_lot_updated_at() from public, anon, authenticated;
create trigger lots_touch_updated_at
  before update on public.lots
  for each row execute function scarap_private.touch_lot_updated_at();

create or replace function scarap_private.log_new_lot_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workflow_events (lot_id, actor_id, from_status, to_status, event_type, note)
  values (new.id, new.collector_id, null, new.status, 'lot_created', 'Lot opened');
  return new;
end;
$$;
revoke all on function scarap_private.log_new_lot_workflow() from public, anon, authenticated;
create trigger lots_create_workflow_event
  after insert on public.lots
  for each row execute function scarap_private.log_new_lot_workflow();

create or replace function scarap_private.log_workflow_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_history (lot_id, actor_id, event_type, summary)
  values (
    new.lot_id,
    new.actor_id,
    new.event_type,
    left(coalesce(new.from_status || ' → ', '') || new.to_status ||
      case when new.note = '' then '' else ': ' || new.note end, 500)
  );
  return new;
end;
$$;

revoke all on function scarap_private.log_workflow_event() from public, anon, authenticated;
create trigger workflow_events_add_activity
  after insert on public.workflow_events
  for each row execute function scarap_private.log_workflow_event();

create or replace function scarap_private.log_offer_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.activity_history (lot_id, actor_id, event_type, summary)
    values (
      new.lot_id,
      (select auth.uid()),
      'offer_status_changed',
      'Offer ' || new.id::text || ' changed from ' || old.status || ' to ' || new.status
    );
  end if;
  return new;
end;
$$;

revoke all on function scarap_private.log_offer_status_change() from public, anon, authenticated;
create trigger offers_log_status_change
  after update of status on public.offers
  for each row execute function scarap_private.log_offer_status_change();

create or replace function scarap_private.log_new_offer_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from_status text;
  v_to_status text;
begin
  select l.status into v_from_status
  from public.lots as l
  where l.id = new.lot_id
  for update;

  if v_from_status is null then
    raise exception 'Lot not found';
  end if;

  -- Recheck after taking the lot lock: the insert policy alone can race with
  -- a Collector deciding the final offer.
  if v_from_status not in ('open', 'offer_submitted') then
    raise exception 'Lot is no longer accepting offers';
  end if;

  v_to_status := v_from_status;
  if v_from_status = 'open' then
    v_to_status := 'offer_submitted';
    update public.lots set status = v_to_status where id = new.lot_id;
  end if;

  insert into public.workflow_events (lot_id, actor_id, from_status, to_status, event_type, note)
  values (new.lot_id, new.recycler_id, v_from_status, v_to_status, 'offer_submitted', 'Demo offer submitted');
  return new;
end;
$$;

revoke all on function scarap_private.log_new_offer_workflow() from public, anon, authenticated;
create trigger offers_create_workflow_event
  after insert on public.offers
  for each row execute function scarap_private.log_new_offer_workflow();

-- Trusted RPC: collector accepts/rejects an offer. The offer decision and lot
-- status change happen in one database transaction.
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
begin
  if v_user_id is null then raise exception 'Sign in is required'; end if;
  if scarap_private.current_app_role() is distinct from 'collector' then
    raise exception 'Only a Collector can decide an offer';
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
  if v_collector_id <> v_user_id then raise exception 'Only the lot collector can decide this offer'; end if;
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

-- Trusted RPC: Admin-only collection and evidence/recycling review steps.
create or replace function public.advance_lot_workflow(
  p_lot_id uuid,
  p_next_status text,
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
  v_current_status text;
  v_evidence_note text;
  v_note text := btrim(coalesce(p_note, ''));
begin
  if v_user_id is null then raise exception 'Sign in is required'; end if;
  if v_role is distinct from 'admin' then raise exception 'Only an Admin can advance this workflow step'; end if;

  select l.status, l.evidence_note into v_current_status, v_evidence_note
  from public.lots as l where l.id = p_lot_id for update;
  if not found then raise exception 'Lot not found'; end if;

  if p_next_status = 'collected' and v_current_status = 'pickup_scheduled' then
    null;
  elsif p_next_status = 'recycling_review' and v_current_status = 'collected' then
    if char_length(v_note) < 10 or char_length(v_note) > 500 then
      raise exception 'Evidence/review note must be between 10 and 500 characters';
    end if;
  elsif p_next_status = 'recycled' and v_current_status = 'recycling_review' then
    if char_length(btrim(coalesce(v_evidence_note, ''))) < 10 then
      raise exception 'A recycling evidence/review note is required before this step';
    end if;
  elsif p_next_status = 'disputed'
    and v_current_status in ('open', 'offer_submitted', 'pickup_scheduled', 'collected', 'recycling_review') then
    if char_length(v_note) < 10 or char_length(v_note) > 500 then
      raise exception 'Dispute note must be between 10 and 500 characters';
    end if;
  elsif p_next_status = 'resume' and v_current_status = 'disputed' then
    null;
  else
    raise exception 'Invalid workflow transition from % to %', v_current_status, p_next_status;
  end if;

  update public.lots
  set status = case when p_next_status = 'resume' then dispute_return_status else p_next_status end,
      evidence_note = case when p_next_status = 'recycling_review' then v_note else evidence_note end,
      dispute_return_status = case
        when p_next_status = 'disputed' then v_current_status
        when p_next_status = 'resume' then null
        else dispute_return_status
      end
  where id = p_lot_id;

  insert into public.workflow_events (lot_id, actor_id, from_status, to_status, event_type, note)
  values (
    p_lot_id, v_user_id, v_current_status,
    case when p_next_status = 'resume' then (select l.status from public.lots as l where l.id = p_lot_id) else p_next_status end,
    case when p_next_status in ('disputed', 'resume') then 'admin_dispute_review' else 'admin_status_change' end,
    v_note
  );
end;
$$;

revoke all on function public.respond_to_offer(uuid, text) from public, anon;
revoke all on function public.advance_lot_workflow(uuid, text, text) from public, anon;
grant execute on function public.respond_to_offer(uuid, text) to authenticated;
grant execute on function public.advance_lot_workflow(uuid, text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.lots enable row level security;
alter table public.offers enable row level security;
alter table public.workflow_events enable row level security;
alter table public.activity_history enable row level security;

-- Remove any default API grants for these tables, then grant only required operations.
revoke all on table public.profiles, public.lots, public.offers,
  public.workflow_events, public.activity_history from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.lots to authenticated;
grant insert (collector_id, title, category, weight_kg, location, notes) on public.lots to authenticated;
grant update (title, category, weight_kg, location, notes) on public.lots to authenticated;
grant select on public.offers to authenticated;
grant insert (lot_id, recycler_id, amount, message) on public.offers to authenticated;
grant select on public.workflow_events, public.activity_history to authenticated;

create policy profiles_read_signed_in
  on public.profiles for select to authenticated
  using (true);

create policy profiles_update_own_display_name
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy lots_read_per_role
  on public.lots for select to authenticated
  using (scarap_private.can_view_lot(id));

create policy collectors_insert_own_lots
  on public.lots for insert to authenticated
  with check (
    collector_id = (select auth.uid())
    and scarap_private.current_app_role() = 'collector'
    and status = 'open'
  );

create policy owners_or_admin_update_lot_details
  on public.lots for update to authenticated
  using (
    (collector_id = (select auth.uid()) and scarap_private.current_app_role() = 'collector')
    or scarap_private.current_app_role() = 'admin'
  )
  with check (
    (collector_id = (select auth.uid()) and scarap_private.current_app_role() = 'collector')
    or scarap_private.current_app_role() = 'admin'
  );

create policy offers_read_participants_and_admin
  on public.offers for select to authenticated
  using (
    recycler_id = (select auth.uid())
    or scarap_private.owns_lot(lot_id)
    or scarap_private.current_app_role() = 'admin'
  );

create policy recyclers_insert_own_offer_on_available_lot
  on public.offers for insert to authenticated
  with check (
    recycler_id = (select auth.uid())
    and scarap_private.current_app_role() = 'recycler'
    and status = 'pending'
    and exists (
      select 1 from public.lots as l
      where l.id = lot_id and l.status in ('open', 'offer_submitted')
    )
  );

create policy workflow_history_read_participants_and_admin
  on public.workflow_events for select to authenticated
  using (scarap_private.can_view_lot_history(lot_id));

create policy activity_history_read_participants_and_admin
  on public.activity_history for select to authenticated
  using (lot_id is not null and scarap_private.can_view_lot_history(lot_id));

-- No client INSERT/UPDATE/DELETE policies or grants exist for audit tables.
-- Profiles have no client INSERT policy, and clients cannot update the role column.

commit;
