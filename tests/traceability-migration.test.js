import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20261027000000_traceability_hardening.sql", "utf8");

test("lot detail edits are locked after an offer is accepted", () => {
  assert.match(sql, /status in \('open', 'offer_submitted'\)/);
});
test("new RPCs are security definer, pinned search_path, and not public", () => {
  assert.equal((sql.match(/security definer set search_path = ''/g) || []).length, 2);
  assert.match(sql, /revoke all on function public\.record_handover_weight[^;]*public, anon/);
  assert.match(sql, /revoke all on function public\.raise_dispute[^;]*public, anon/);
});
test("discrepancy and dispute checks exist", () => {
  assert.match(sql, /weight_discrepancy_pct/);
  assert.match(sql, /accepted recycler/);
  assert.match(sql, /between 10 and 500/);
});
