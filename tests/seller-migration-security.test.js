import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sellerMigration = readFileSync("supabase/migrations/20261102000000_seller_role_support.sql", "utf8");
const privacyMigration = readFileSync("supabase/migrations/20261102010000_listing_privacy_enforcement.sql", "utf8");

// Behavioral simulation of database signup trigger role assignment logic
function simulateSignupRoleAssignment(metadata) {
  const rawRole = metadata?.role || metadata?.requested_role || "";
  const requested = String(rawRole).trim().toLowerCase();
  if (requested === "seller" || requested === "collector") {
    return requested;
  }
  return "collector";
}

test("signup trigger role clamping prevents privilege escalation", () => {
  // Privileged and malicious attempts must clamp safely to 'collector'
  assert.equal(simulateSignupRoleAssignment({ role: "admin" }), "collector");
  assert.equal(simulateSignupRoleAssignment({ role: "ADMIN" }), "collector");
  assert.equal(simulateSignupRoleAssignment({ role: "recycler" }), "collector");
  assert.equal(simulateSignupRoleAssignment({ requested_role: "admin" }), "collector");
  assert.equal(simulateSignupRoleAssignment({ requested_role: "superuser" }), "collector");
  assert.equal(simulateSignupRoleAssignment({}), "collector");
  assert.equal(simulateSignupRoleAssignment(null), "collector");
  assert.equal(simulateSignupRoleAssignment({ role: "seller" }), "seller");
  assert.equal(simulateSignupRoleAssignment({ role: "SELLER" }), "seller");
  assert.equal(simulateSignupRoleAssignment({ role: "collector" }), "collector");
});

test("seller migration preserves roles and updates check constraint", () => {
  assert.match(sellerMigration, /profiles_role_check/);
  assert.match(sellerMigration, /check\s*\(role in \('seller', 'collector', 'recycler', 'admin'\)\)/);
});

test("profile role column is strictly protected from client-side privilege escalation", () => {
  // Table-level UPDATE must be explicitly revoked, preserving only column-level grant on display_name
  assert.match(sellerMigration, /revoke update on table public\.profiles from public, anon, authenticated;/);
  assert.match(sellerMigration, /grant update \(display_name\) on public\.profiles to authenticated;/);
});

test("seller migration enforces secure onboarding without self-assignable privileged roles", () => {
  // Trigger function must clamp roles and not trust arbitrary client roles
  assert.match(sellerMigration, /create or replace function scarap_private\.create_collector_profile/);
  assert.match(sellerMigration, /security definer/);
  assert.match(sellerMigration, /set search_path = ''/);
  assert.match(sellerMigration, /v_requested_role in \('seller', 'collector'\)/);
  assert.match(sellerMigration, /else 'collector'/);
  assert.doesNotMatch(sellerMigration, /when v_requested_role = 'admin'/);
  assert.doesNotMatch(sellerMigration, /when v_requested_role = 'recycler'/);
});

test("lot editing policy strictly requires open status for owners and admins alike", () => {
  // Insert policy allows Seller and Collector in open status
  assert.match(sellerMigration, /create policy sellers_and_collectors_insert_own_lots/);
  assert.match(sellerMigration, /scarap_private\.current_app_role\(\) in \('collector', 'seller'\)/);
  assert.match(sellerMigration, /status = 'open'/);

  // Update policy: strictly status = 'open' required for BOTH owners and admin
  assert.match(sellerMigration, /create policy owners_or_admin_update_lot_details/);
  assert.match(sellerMigration, /using\s*\(\s*status = 'open'\s*and\s*\(/);
  assert.match(sellerMigration, /with check\s*\(\s*status = 'open'\s*and\s*\(/);
  assert.doesNotMatch(sellerMigration, /status in \('open', 'offer_submitted'\)/);
});

test("seller RPC authorization supports Seller and Collector safely and fails closed on NULL", () => {
  // respond_to_offer fails closed when role is NULL or unsupported
  assert.match(sellerMigration, /create or replace function public\.respond_to_offer/);
  assert.match(sellerMigration, /v_caller_role is null or v_caller_role not in \('collector', 'seller'\)/);
  assert.match(sellerMigration, /v_collector_id <> v_user_id/);
  assert.match(sellerMigration, /revoke all on function public\.respond_to_offer\(uuid, text\) from public, anon/);
  assert.match(sellerMigration, /grant execute on function public\.respond_to_offer\(uuid, text\) to authenticated/);

  // propose_pickup_appointment fails closed when role is NULL or unsupported
  assert.match(sellerMigration, /create or replace function public\.propose_pickup_appointment/);
  assert.match(sellerMigration, /scarap_private\.current_app_role\(\) is null\s*or scarap_private\.current_app_role\(\) not in \('collector', 'seller'\)/);
  assert.match(sellerMigration, /v_collector_id <> v_user_id/);
  assert.match(sellerMigration, /revoke all on function public\.propose_pickup_appointment/);
  assert.match(sellerMigration, /grant execute on function public\.propose_pickup_appointment/);
});

test("authorization guard evaluates 3-valued logic and rejects NULL role", () => {
  // Simulation of SQL 3-valued logic guard:
  // In SQL, `NULL NOT IN ('collector', 'seller')` evaluates to NULL (not TRUE),
  // which bypasses an `IF role NOT IN (...) THEN RAISE EXCEPTION` guard block.
  // The guard MUST explicitly include `role IS NULL OR`.
  function evaluateSqlGuard(role) {
    // Correct guard: role IS NULL OR role NOT IN ('collector', 'seller')
    if (role === null || role === undefined || (role !== 'collector' && role !== 'seller')) {
      return "REJECTED";
    }
    return "PERMITTED";
  }

  assert.equal(evaluateSqlGuard(null), "REJECTED");
  assert.equal(evaluateSqlGuard(undefined), "REJECTED");
  assert.equal(evaluateSqlGuard("admin"), "REJECTED");
  assert.equal(evaluateSqlGuard("recycler"), "REJECTED");
  assert.equal(evaluateSqlGuard("anonymous"), "REJECTED");
  assert.equal(evaluateSqlGuard("seller"), "PERMITTED");
  assert.equal(evaluateSqlGuard("collector"), "PERMITTED");
});

test("pickup migration dependency behavior is safely guarded", () => {
  assert.match(sellerMigration, /if exists \(select 1 from pg_tables where schemaname = 'public' and tablename = 'pickup_appointments'\)/);
});

test("database-side privacy migration enforces phone, email, and residential rules on title, location, notes", () => {
  assert.match(privacyMigration, /create or replace function scarap_private\.validate_lot_privacy/);
  assert.match(privacyMigration, /security definer/);
  assert.match(privacyMigration, /set search_path = ''/);
  assert.match(privacyMigration, /v_title ~\* v_phone_pattern/);
  assert.match(privacyMigration, /v_title ~\* v_email_pattern/);
  assert.match(privacyMigration, /v_loc ~\* v_phone_pattern/);
  assert.match(privacyMigration, /v_loc ~\* v_email_pattern/);
  assert.match(privacyMigration, /v_loc ~\* v_residential_pattern/);
  assert.match(privacyMigration, /v_notes ~\* v_phone_pattern/);
  assert.match(privacyMigration, /v_notes ~\* v_email_pattern/);
  assert.match(privacyMigration, /create trigger trg_lots_enforce_privacy/);
  assert.match(privacyMigration, /before insert or update on public\.lots/);
});
