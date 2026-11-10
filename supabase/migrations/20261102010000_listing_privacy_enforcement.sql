-- Migration: Database-side listing privacy enforcement.
--
-- IMPORTANT: Review before applying. This migration has NOT been executed on live Supabase.
--
-- Purpose:
-- Enforces privacy rules at the PostgreSQL level so direct Supabase REST API calls
-- cannot bypass frontend validation.
--
-- Prohibits:
--   - Indian phone numbers (10 digits starting with 6-9, +91 prefixes, or landlines with STD codes) in title, location, or notes
--   - Personal email addresses in title, location, or notes
--   - Exact residential premises (flat, house, door, room, apartment, villa, h.no) in location
--
-- Permits:
--   - Legitimate industrial asset titles ('Telecom server racks', 'Circuit boards - Lot 4')
--   - Legitimate industrial plot designations ('Plot 45, Sector 62', 'Plot 12, Phase-1')
--   - Industrial estates and corridors ('Peenya', 'MIDC', 'GIDC', 'Okhla', 'Udyog Vihar')
--   - Standard cities, states, and 6-digit postal PIN codes

begin;

create or replace function scarap_private.validate_lot_privacy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := coalesce(new.title, '');
  v_loc text := coalesce(new.location, '');
  v_notes text := coalesce(new.notes, '');
  v_phone_pattern text := '(\+?91[[:space:].-]?)?[6-9][0-9]{4}[[:space:].-]?[0-9]{5}|\m[6-9][0-9]{9}\M|\m0[0-9]{2,4}[[:space:].-]?[0-9]{6,8}\M';
  v_email_pattern text := '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}';
  v_residential_pattern text := '\m(flat|house|door|room|apt|apartment|villa|bungalow|h[[:space:].-]*no)\M[[:space:]#.-]*((no\.?|num\.?|number|#)[[:space:]]*)?[0-9]+';
begin
  -- Validate title field
  if v_title ~* v_phone_pattern then
    raise exception 'Listing privacy policy: Phone numbers are not permitted in the lot title.';
  end if;
  if v_title ~* v_email_pattern then
    raise exception 'Listing privacy policy: Email addresses are not permitted in the lot title.';
  end if;

  -- Validate location field
  if v_loc ~* v_phone_pattern then
    raise exception 'Listing privacy policy: Phone numbers are not permitted in pickup location. Use approximate area and city.';
  end if;
  if v_loc ~* v_email_pattern then
    raise exception 'Listing privacy policy: Email addresses are not permitted in pickup location.';
  end if;
  if v_loc ~* v_residential_pattern then
    raise exception 'Listing privacy policy: Exact residential flat, door, or house numbers are not permitted in public listings.';
  end if;

  -- Validate notes field
  if v_notes ~* v_phone_pattern then
    raise exception 'Listing privacy policy: Phone numbers are not permitted in listing notes. Operational contact occurs after offer acceptance.';
  end if;
  if v_notes ~* v_email_pattern then
    raise exception 'Listing privacy policy: Email addresses are not permitted in listing notes.';
  end if;

  return new;
end;
$$;

revoke all on function scarap_private.validate_lot_privacy() from public, anon, authenticated;

drop trigger if exists trg_lots_enforce_privacy on public.lots;
create trigger trg_lots_enforce_privacy
  before insert or update on public.lots
  for each row execute function scarap_private.validate_lot_privacy();

commit;
