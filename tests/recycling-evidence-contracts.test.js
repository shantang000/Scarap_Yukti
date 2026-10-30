import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(resolve(root, "supabase/migrations/20261030000000_recycling_evidence_verification.sql"), "utf8");
const helper = readFileSync(resolve(root, "src/lib/recyclingEvidence.js"), "utf8");

function functionDefinition(name) {
  const escaped = name.replaceAll(".", "\\.");
  const match = migration.match(new RegExp("create or replace function " + escaped + "\\b[\\s\\S]*?\\$\\$;", "i"));
  assert.ok(match, "Expected function " + name);
  return match[0];
}

test("evidence storage is private and accepts only size-limited supported media", () => {
  assert.match(migration, /\x27recycling-evidence\x27[\s\S]*?false[\s\S]*?10485760/i);
  assert.match(migration, /array\x5b\x27image\/jpeg\x27, \x27image\/png\x27, \x27image\/webp\x27, \x27application\/pdf\x27\x5d/i);
  assert.match(migration, /recycling_evidence_objects_insert_accepted_recycler/i);
  assert.match(helper, /file\.size > RECYCLING_EVIDENCE_MAX_BYTES/);
  assert.match(helper, /createSignedUrl\(storagePath, 60\)/);
});

test("evidence rows are participant-readable and insert-only for the accepted Recycler", () => {
  assert.match(migration, /alter table public\.recycling_evidence enable row level security/i);
  assert.match(migration, /grant select, insert on public\.recycling_evidence to authenticated/i);
  assert.match(migration, /recycling_evidence_read_participants_and_admin[\s\S]*?for select to authenticated/i);
  assert.match(migration, /recycling_evidence_insert_accepted_recycler[\s\S]*?for insert to authenticated/i);
  assert.match(migration, /o\.recycler_id = \(select auth\.uid\(\)\)[\s\S]*?o\.status = \x27accepted\x27/i);
  assert.doesNotMatch(migration, /grant\s+(?:update|delete|all)\s+on(?:\s+table)?\s+public\.recycling_evidence/i);
});

test("Admin review RPC records a decision and requires the Admin role", () => {
  const rpc = functionDefinition("public.review_recycling_evidence");
  assert.match(rpc, /security definer[\s\S]*?set search_path = \x27\x27/i);
  assert.match(rpc, /current_app_role\(\) is distinct from \x27admin\x27/i);
  assert.match(rpc, /p_decision not in \(\x27approved\x27, \x27rejected\x27\)/i);
  assert.match(rpc, /for update/i);
  assert.match(rpc, /review_status = p_decision/i);
  assert.match(rpc, /p_decision = \x27approved\x27[\s\S]*?set status = \x27recycled\x27/i);
  assert.match(rpc, /p_decision = \x27rejected\x27[\s\S]*?recycling_evidence_rejected/i);
});

test("no workflow path can mark a lot recycled without Admin-approved evidence", () => {
  const trigger = functionDefinition("scarap_private.require_approved_recycling_evidence");
  assert.match(trigger, /new\.status = \x27recycled\x27/i);
  assert.match(trigger, /review_status = \x27approved\x27/i);
  assert.match(migration, /before update of status on public\.lots/i);
  assert.match(migration, /revoke all on function public\.review_recycling_evidence\(uuid, text, text\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.review_recycling_evidence\(uuid, text, text\) to authenticated/i);
});