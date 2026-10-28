import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(resolve(root, "src/App.jsx"), "utf8");
const supabaseClient = readFileSync(resolve(root, "src/lib/supabase.js"), "utf8");
const schemaMigration = readFileSync(
  resolve(root, "supabase/migrations/20261023000000_marketplace_schema_and_rls.sql"),
  "utf8"
);
const privacyMigration = readFileSync(
  resolve(root, "supabase/migrations/20261025000000_profile_privacy_lookup.sql"),
  "utf8"
);
const pickupMigration = readFileSync(
  resolve(root, "supabase/migrations/20261028000000_pickup_appointment_coordination.sql"),
  "utf8"
);

function policy(name) {
  const match = schemaMigration.match(new RegExp(`create policy ${name}\\b[\\s\\S]*?;`, "i"));
  assert.ok(match, `Expected migration policy ${name}`);
  return match[0];
}

function functionDefinition(sql, qualifiedName) {
  const escapedName = qualifiedName.replaceAll(".", "\\.");
  const match = sql.match(new RegExp(`create or replace function ${escapedName}\\b[\\s\\S]*?(?:\\$\\$|\\$function\\$);`, "i"));
  assert.ok(match, `Expected migration function ${qualifiedName}`);
  return match[0];
}

test("authenticated role comes from the caller's own database profile", () => {
  assert.match(
    app,
    /\.from\("profiles"\)\s*\.select\("id, display_name, role"\)\s*\.eq\("id", authSession\.user\.id\)\s*\.single\(\)/
  );
  assert.match(app, /const role = authSession\s*\?\s*profile\?\.role/);
  assert.match(app, /authSession && profile\s*\?[\s\S]*?role-picker/);
  assert.match(schemaMigration, /grant update \(display_name\) on public\.profiles to authenticated;/i);
  assert.doesNotMatch(schemaMigration, /grant update\s*\([^)]*\brole\b/i);
  assert.match(functionDefinition(schemaMigration, "scarap_private.create_collector_profile"), /'collector'/i);
  assert.match(privacyMigration, /drop policy if exists profiles_read_signed_in on public\.profiles;/i);
  assert.match(privacyMigration, /create policy profiles_read_own[\s\S]*?using \(id = \(select auth\.uid\(\)\)\)/i);
});

test("all marketplace tables enable RLS and history tables have no client write grant", () => {
  for (const table of ["profiles", "lots", "offers", "workflow_events", "activity_history"]) {
    assert.match(schemaMigration, new RegExp(`alter table public\\.${table} enable row level security;`, "i"));
  }
  assert.match(schemaMigration, /grant select on public\.workflow_events, public\.activity_history to authenticated;/i);
  assert.doesNotMatch(
    schemaMigration,
    /grant\s+(?:insert|update|delete|all)\s+on(?:\s+table)?\s+public\.(?:workflow_events|activity_history)/i
  );
  assert.match(policy("workflow_history_read_participants_and_admin"), /for select to authenticated/i);
  assert.match(policy("activity_history_read_participants_and_admin"), /for select to authenticated/i);
});

test("lot creation is tied to the signed-in Collector and lot status is not directly writable", () => {
  const insertPolicy = policy("collectors_insert_own_lots");
  assert.match(insertPolicy, /collector_id = \(select auth\.uid\(\)\)/i);
  assert.match(insertPolicy, /current_app_role\(\) = 'collector'/i);
  assert.match(insertPolicy, /status = 'open'/i);
  assert.match(app, /collector_id: authSession\.user\.id/);
  assert.match(schemaMigration, /grant update \(title, category, weight_kg, location, notes\) on public\.lots to authenticated;/i);
  assert.doesNotMatch(schemaMigration, /grant update\s*\([^)]*\b(?:status|evidence_note|collector_id)\b/i);
  assert.doesNotMatch(app, /\.from\("lots"\)\s*\.update\(/);
});

test("offer creation is limited to one pending offer per Recycler and eligible lot", () => {
  assert.match(schemaMigration, /unique \(lot_id, recycler_id\)/i);
  const insertPolicy = policy("recyclers_insert_own_offer_on_available_lot");
  assert.match(insertPolicy, /recycler_id = \(select auth\.uid\(\)\)/i);
  assert.match(insertPolicy, /current_app_role\(\) = 'recycler'/i);
  assert.match(insertPolicy, /status = 'pending'/i);
  assert.match(insertPolicy, /l\.status in \('open', 'offer_submitted'\)/i);
  assert.match(app, /recycler_id: authSession\.user\.id/);
  assert.doesNotMatch(app, /\.from\("offers"\)\s*\.update\(/);
});

test("offer decisions use the Collector-owned-lot RPC and enforce pending state", () => {
  const rpc = functionDefinition(schemaMigration, "public.respond_to_offer");
  assert.match(rpc, /security definer[\s\S]*?set search_path = ''/i);
  assert.match(rpc, /current_app_role\(\) is distinct from 'collector'/i);
  assert.match(rpc, /v_collector_id <> v_user_id/i);
  assert.match(rpc, /v_offer_status <> 'pending'/i);
  assert.match(rpc, /p_decision not in \('accepted', 'rejected'\)/i);
  assert.match(rpc, /for update of l/i);
  assert.match(rpc, /for update;/i);
  assert.match(rpc, /status = 'rejected'[\s\S]*?status = 'pending'/i);
  assert.match(rpc, /set status = 'pickup_scheduled'/i);
  assert.match(app, /supabase\.rpc\("respond_to_offer",\s*\{\s*p_offer_id: offerId,\s*p_decision: decision\s*\}\)/);
  assert.match(schemaMigration, /revoke all on function public\.respond_to_offer\(uuid, text\) from public, anon;/i);
  assert.match(schemaMigration, /grant execute on function public\.respond_to_offer\(uuid, text\) to authenticated;/i);
});

test("Admin workflow RPC restricts role, transitions, and evidence-note length", () => {
  const rpc = functionDefinition(schemaMigration, "public.advance_lot_workflow");
  assert.match(rpc, /v_role is distinct from 'admin'/i);
  assert.match(rpc, /p_next_status = 'collected' and v_current_status = 'pickup_scheduled'/i);
  assert.match(rpc, /p_next_status = 'recycling_review' and v_current_status = 'collected'/i);
  assert.match(rpc, /char_length\(v_note\) < 10 or char_length\(v_note\) > 500/i);
  assert.match(rpc, /p_next_status = 'recycled' and v_current_status = 'recycling_review'/i);
  assert.match(rpc, /char_length\(btrim\(coalesce\(v_evidence_note, ''\)\)\) < 10/i);
  assert.match(rpc, /p_next_status = 'disputed'[\s\S]*?p_next_status = 'resume'/i);
  assert.match(app, /supabase\.rpc\("advance_lot_workflow",\s*\{\s*p_lot_id: lotId,\s*p_next_status: nextStatus,\s*p_note: cleanNote\s*\}\)/);
  assert.match(schemaMigration, /revoke all on function public\.advance_lot_workflow\(uuid, text, text\) from public, anon;/i);
  assert.match(schemaMigration, /grant execute on function public\.advance_lot_workflow\(uuid, text, text\) to authenticated;/i);
});

test("profile-name lookup returns minimal fields for relevant records only", () => {
  const rpc = functionDefinition(privacyMigration, "public.visible_marketplace_profile_names");
  assert.match(rpc, /returns table \(id uuid, display_name text\)/i);
  assert.match(rpc, /security definer[\s\S]*?set search_path = ''[\s\S]*?set row_security = off/i);
  assert.match(rpc, /auth\.uid\(\) is null/i);
  assert.match(rpc, /cardinality\(p_profile_ids\)[\s\S]*?> 500/i);
  assert.match(rpc, /scarap_private\.can_view_lot\(l\.id\)/i);
  assert.match(rpc, /scarap_private\.can_view_lot_history\(o\.lot_id\)/i);
  assert.match(privacyMigration, /revoke all on function public\.visible_marketplace_profile_names\(uuid\[\]\)\s+from public, anon, authenticated;/i);
  assert.match(privacyMigration, /grant execute on function public\.visible_marketplace_profile_names\(uuid\[\]\)\s+to authenticated;/i);
});

test("browser Supabase client reads only the publishable configuration variables", () => {
  assert.match(supabaseClient, /VITE_SUPABASE_URL/);
  assert.match(supabaseClient, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(supabaseClient, /VITE_SUPABASE_(?:SECRET|SERVICE_ROLE)/i);
});

test("pickup appointment table is read-only to clients and RPCs enforce the participant roles", () => {
  assert.match(pickupMigration, /create table public\.pickup_appointments/i);
  assert.match(pickupMigration, /alter table public\.pickup_appointments enable row level security/i);
  assert.match(pickupMigration, /revoke all on table public\.pickup_appointments from public, anon, authenticated/i);
  assert.match(pickupMigration, /grant select on public\.pickup_appointments to authenticated/i);
  assert.doesNotMatch(pickupMigration, /create policy[\s\S]*?on public\.pickup_appointments for (?:insert|update|delete)/i);
  const appointmentPolicy = pickupMigration.match(/create policy pickup_appointments_read_participants_and_admin[\s\S]*?;/i)?.[0];
  assert.ok(appointmentPolicy, "Expected the participant/Admin appointment-read policy");
  assert.match(appointmentPolicy, /current_app_role\(\) = 'admin'/i);
  assert.match(appointmentPolicy, /scarap_private\.owns_lot\(lot_id\)/i);
  assert.match(appointmentPolicy, /o\.recycler_id = \(select auth\.uid\(\)\)[\s\S]*?o\.status = 'accepted'/i);

  const collectorRpc = functionDefinition(pickupMigration, "public.propose_pickup_appointment");
  assert.match(collectorRpc, /security definer[\s\S]*?set search_path = ''/i);
  assert.match(collectorRpc, /current_app_role\(\) is distinct from 'collector'/i);
  assert.match(collectorRpc, /v_collector_id <> v_user_id/i);
  assert.match(collectorRpc, /v_lot_status <> 'pickup_scheduled'/i);
  assert.match(collectorRpc, /o\.status = 'accepted'/i);
  assert.match(collectorRpc, /interval '30 minutes'[\s\S]*?interval '90 days'/i);
  assert.match(collectorRpc, /existing\.status = 'reschedule_requested'/i);

  const recyclerRpc = functionDefinition(pickupMigration, "public.respond_to_pickup_appointment");
  assert.match(recyclerRpc, /security definer[\s\S]*?set search_path = ''/i);
  assert.match(recyclerRpc, /v_role is distinct from 'recycler'/i);
  assert.match(recyclerRpc, /v_recycler_id <> v_user_id/i);
  assert.match(recyclerRpc, /p_decision not in \('confirm', 'request_reschedule'\)/i);
  assert.match(recyclerRpc, /char_length\(v_note\) < 10/i);
  assert.match(pickupMigration, /revoke all on function public\.propose_pickup_appointment\(uuid, timestamptz, text\) from public, anon, authenticated/i);
  assert.match(pickupMigration, /revoke all on function public\.respond_to_pickup_appointment\(uuid, text, text\) from public, anon, authenticated/i);
  assert.match(pickupMigration, /grant execute on function public\.propose_pickup_appointment\(uuid, timestamptz, text\) to authenticated/i);
  assert.match(pickupMigration, /grant execute on function public\.respond_to_pickup_appointment\(uuid, text, text\) to authenticated/i);

  assert.match(app, /supabase\.rpc\("propose_pickup_appointment"/);
  assert.match(app, /supabase\.rpc\("respond_to_pickup_appointment"/);
  assert.doesNotMatch(app, /\.from\("pickup_appointments"\)\s*\.(?:insert|update|delete)\(/);
});
