-- Restrict direct profile reads and expose only names linked to marketplace
-- records visible to the authenticated caller.
begin;

drop policy if exists profiles_read_signed_in on public.profiles;

create policy profiles_read_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create or replace function public.visible_marketplace_profile_names(
  p_profile_ids uuid[]
)
returns table (id uuid, display_name text)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $function$
begin
  if auth.uid() is null then
    raise exception 'Sign in is required';
  end if;

  if coalesce(cardinality(p_profile_ids), 0) > 500 then
    raise exception 'Request at most 500 profile IDs at a time';
  end if;

  return query
  select p.id, p.display_name
  from public.profiles as p
  where p.id = any(coalesce(p_profile_ids, array[]::uuid[]))
    and (
      exists (
        select 1
        from public.lots as l
        where l.collector_id = p.id
          and scarap_private.can_view_lot(l.id)
      )
      or exists (
        select 1
        from public.offers as o
        where o.recycler_id = p.id
          and scarap_private.can_view_lot_history(o.lot_id)
      )
    );
end;
$function$;

revoke all on function public.visible_marketplace_profile_names(uuid[])
  from public, anon, authenticated;
grant execute on function public.visible_marketplace_profile_names(uuid[])
  to authenticated;

-- Fail and roll back if the SECURITY DEFINER function cannot safely read the
-- required tables or call the existing, caller-scoped visibility helpers.
do $check$
declare
  v_function record;
  v_owner record;
  v_table record;
  v_table_count integer := 0;
  v_helper regprocedure;
begin
  select p.oid, p.proowner, p.prosecdef, p.proconfig
    into v_function
  from pg_catalog.pg_proc as p
  where p.oid = 'public.visible_marketplace_profile_names(uuid[])'::regprocedure;

  if not found then
    raise exception 'Profile-name lookup function was not created';
  end if;

  if not v_function.prosecdef then
    raise exception 'Profile-name lookup must be SECURITY DEFINER';
  end if;

  if not (coalesce(v_function.proconfig, array[]::text[])
      @> array['search_path=""', 'row_security=off']::text[]) then
    raise exception 'Profile-name lookup must use an empty search_path and row_security=off';
  end if;

  select r.rolsuper, r.rolbypassrls
    into v_owner
  from pg_catalog.pg_roles as r
  where r.oid = v_function.proowner;

  for v_table in
    select c.oid, c.relname, c.relowner, c.relforcerowsecurity
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('profiles', 'lots', 'offers')
      and c.relkind in ('r', 'p')
  loop
    v_table_count := v_table_count + 1;

    if not pg_catalog.has_table_privilege(v_function.proowner, v_table.oid, 'SELECT') then
      raise exception 'Profile-name lookup owner lacks SELECT on public.%', v_table.relname;
    end if;

    if not (v_owner.rolsuper or v_owner.rolbypassrls)
       and (v_table.relowner <> v_function.proowner or v_table.relforcerowsecurity) then
      raise exception 'Profile-name lookup owner cannot bypass RLS on public.%', v_table.relname;
    end if;
  end loop;

  if v_table_count <> 3 then
    raise exception 'Profile-name lookup requires public.profiles, public.lots, and public.offers';
  end if;

  foreach v_helper in array array[
    'scarap_private.can_view_lot(uuid)'::regprocedure,
    'scarap_private.can_view_lot_history(uuid)'::regprocedure
  ]
  loop
    if not exists (
      select 1
      from pg_catalog.pg_proc as p
      where p.oid = v_helper
        and p.prosecdef
        and coalesce(p.proconfig, array[]::text[]) @> array['search_path=""']::text[]
    ) then
      raise exception 'Visibility helper % must remain SECURITY DEFINER with an empty search_path', v_helper;
    end if;

    if not pg_catalog.has_function_privilege(v_function.proowner, v_helper, 'EXECUTE') then
      raise exception 'Profile-name lookup owner cannot execute visibility helper %', v_helper;
    end if;

    if not pg_catalog.has_function_privilege('authenticated', v_helper, 'EXECUTE')
       or pg_catalog.has_function_privilege('anon', v_helper, 'EXECUTE') then
      raise exception 'Visibility helper % must be executable by authenticated and not anon', v_helper;
    end if;
  end loop;

  if pg_catalog.has_function_privilege('anon', v_function.oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('authenticated', v_function.oid, 'EXECUTE') then
    raise exception 'Profile-name lookup must be executable by authenticated and not anon';
  end if;
end;
$check$;

commit;
