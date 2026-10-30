-- Private, participant-scoped recycling evidence with Admin review.
-- Apply only after checking the project's Supabase migration history.
begin;

create table public.recycling_evidence (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete restrict,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null unique,
  file_name text not null check (char_length(btrim(file_name)) between 1 and 255),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 10485760),
  description text not null default '' check (char_length(description) <= 500),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  review_note text not null default '' check (char_length(review_note) <= 500),
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint recycling_evidence_storage_path_owner check (
    storage_path like lot_id::text || '/' || submitted_by::text || '/%'
  ),
  constraint recycling_evidence_review_consistent check (
    (review_status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (review_status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
  )
);

create index recycling_evidence_lot_created_idx
  on public.recycling_evidence(lot_id, created_at desc);
create unique index recycling_evidence_one_approval_per_lot_idx
  on public.recycling_evidence(lot_id)
  where review_status = 'approved';

alter table public.recycling_evidence enable row level security;
revoke all on table public.recycling_evidence from public, anon, authenticated;
grant select, insert on public.recycling_evidence to authenticated;

create policy recycling_evidence_read_participants_and_admin
  on public.recycling_evidence for select to authenticated
  using (
    scarap_private.current_app_role() = 'admin'
    or scarap_private.owns_lot(lot_id)
    or exists (
      select 1 from public.offers o
      where o.lot_id = recycling_evidence.lot_id
        and o.recycler_id = (select auth.uid())
        and o.status = 'accepted'
    )
  );

create policy recycling_evidence_insert_accepted_recycler
  on public.recycling_evidence for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and scarap_private.current_app_role() = 'recycler'
    and review_status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1 from public.lots l
      join public.offers o on o.lot_id = l.id
      where l.id = lot_id
        and l.status in ('collected', 'recycling_review')
        and o.recycler_id = (select auth.uid())
        and o.status = 'accepted'
    )
  );

-- Private bucket; evidence is served only through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recycling-evidence',
  'recycling-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists recycling_evidence_objects_read_participants on storage.objects;
create policy recycling_evidence_objects_read_participants
  on storage.objects for select to authenticated
  using (
    bucket_id = 'recycling-evidence'
    and exists (
      select 1
      from public.lots l
      where l.id::text = (storage.foldername(name))[1]
        and (
          l.collector_id = (select auth.uid())
          or scarap_private.current_app_role() = 'admin'
          or exists (
            select 1 from public.offers o
            where o.lot_id = l.id
              and o.recycler_id = (select auth.uid())
              and o.status = 'accepted'
          )
        )
    )
  );

drop policy if exists recycling_evidence_objects_insert_accepted_recycler on storage.objects;
create policy recycling_evidence_objects_insert_accepted_recycler
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recycling-evidence'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1
      from public.lots l
      join public.offers o on o.lot_id = l.id
      where l.id::text = (storage.foldername(name))[1]
        and l.status in ('collected', 'recycling_review')
        and o.recycler_id = (select auth.uid())
        and o.status = 'accepted'
    )
  );

-- Prevent every workflow path from bypassing evidence review.
create or replace function scarap_private.require_approved_recycling_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'recycled' and old.status is distinct from 'recycled'
    and not exists (
      select 1 from public.recycling_evidence e
      where e.lot_id = new.id and e.review_status = 'approved'
    )
  then
    raise exception 'Admin-approved recycling evidence is required before marking a lot recycled';
  end if;
  return new;
end;
$$;

revoke all on function scarap_private.require_approved_recycling_evidence() from public, anon, authenticated;
drop trigger if exists lots_require_approved_recycling_evidence on public.lots;
create trigger lots_require_approved_recycling_evidence
  before update of status on public.lots
  for each row execute function scarap_private.require_approved_recycling_evidence();

create or replace function public.review_recycling_evidence(
  p_evidence_id uuid,
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
  v_lot_id uuid;
  v_review_status text;
  v_lot_status text;
  v_note text := btrim(coalesce(p_note, ''));
begin
  if v_user_id is null then raise exception 'Sign in is required'; end if;
  if scarap_private.current_app_role() is distinct from 'admin' then
    raise exception 'Only an Admin can review recycling evidence';
  end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;
  if char_length(v_note) > 500 then raise exception 'Review note must be 500 characters or fewer'; end if;
  if p_decision = 'rejected' and char_length(v_note) < 10 then
    raise exception 'Explain the rejection in 10 to 500 characters';
  end if;

  select e.lot_id, e.review_status into v_lot_id, v_review_status
  from public.recycling_evidence e
  where e.id = p_evidence_id
  for update;
  if not found then raise exception 'Recycling evidence not found'; end if;
  if v_review_status <> 'pending' then raise exception 'This evidence has already been reviewed'; end if;

  select l.status into v_lot_status
  from public.lots l where l.id = v_lot_id for update;
  if not found then raise exception 'Lot not found'; end if;
  if v_lot_status <> 'recycling_review' then
    raise exception 'The lot must be in recycling review before evidence can be approved or rejected';
  end if;

  update public.recycling_evidence
  set review_status = p_decision,
      review_note = v_note,
      reviewed_by = v_user_id,
      reviewed_at = now()
  where id = p_evidence_id;

  if p_decision = 'approved' then
    update public.lots set status = 'recycled' where id = v_lot_id;
    insert into public.workflow_events (lot_id, actor_id, from_status, to_status, event_type, note)
    values (v_lot_id, v_user_id, 'recycling_review', 'recycled', 'recycling_evidence_approved', v_note);
    insert into public.activity_history (lot_id, actor_id, event_type, summary)
    values (v_lot_id, v_user_id, 'recycling_evidence_approved',
      left('Admin approved recycling evidence. ' || v_note, 500));
  else
    insert into public.workflow_events (lot_id, actor_id, from_status, to_status, event_type, note)
    values (v_lot_id, v_user_id, 'recycling_review', 'recycling_review', 'recycling_evidence_rejected', v_note);
    insert into public.activity_history (lot_id, actor_id, event_type, summary)
    values (v_lot_id, v_user_id, 'recycling_evidence_rejected',
      left('Admin rejected recycling evidence. ' || v_note, 500));
  end if;
end;
$$;

revoke all on function public.review_recycling_evidence(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_recycling_evidence(uuid, text, text) to authenticated;

commit;
