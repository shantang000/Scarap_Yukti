import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasSupabaseConfig } from "../src/lib/supabase.js";
import { validateListingPrivacy } from "../src/lib/privacyRules.js";
import { updateLotDetails } from "../src/lib/lotActions.js";
import { getTraceabilityActionState } from "../src/lib/traceabilityView.js";
import { validatePickupSchedule, validateRescheduleRequest } from "../src/lib/pickupAppointmentRules.js";

const appCode = readFileSync("src/App.jsx", "utf8");

test("Supabase configuration uses only publishable variables and excludes private service keys", () => {
  const supabaseJs = readFileSync("src/lib/supabase.js", "utf8");
  assert.match(supabaseJs, /VITE_SUPABASE_URL/);
  assert.match(supabaseJs, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(supabaseJs, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(supabaseJs, /SUPABASE_SECRET/);
  assert.doesNotMatch(appCode, /service_role/i);
});

test("Frontend workspace supports all 4 database roles: seller, collector, recycler, admin", () => {
  // Profiles role validation in App.jsx
  assert.match(appCode, /\["seller",\s*"collector",\s*"recycler",\s*"admin"\]\.includes\(row\.role\)/);

  // Navigation and view routing
  assert.match(appCode, /role === "Collector" \|\| role === "Seller"/);
  assert.match(appCode, /role === "Recycler"/);
  assert.match(appCode, /role === "Admin"/);
});

test("Seller and Collector accounts are both authorized to create lots and decide offers", () => {
  // Lot creation role check
  assert.match(appCode, /\["collector",\s*"seller"\]\.includes\(profile\?\.role\)/);

  // Offer decision role check includes both seller and collector
  assert.match(appCode, /!\["collector",\s*"seller"\]\.includes\(profile\?\.role\)/);
  assert.match(appCode, /respond_to_offer/);
});

test("Seller and Collector accounts are both authorized to propose pickup appointments", () => {
  // proposePickupTime checks for both seller and collector
  const pickupCheckRegex = /if\s*\(!\["collector",\s*"seller"\]\.includes\(profile\?\.role\)\s*\|\|\s*!supabase\s*\|\|\s*!authSession\.user\?\.id\)/;
  assert.match(appCode, pickupCheckRegex);
  assert.match(appCode, /propose_pickup_appointment/);
});

test("Seller and Collector can raise disputes on their lots when in eligible statuses", () => {
  for (const role of ["seller", "collector"]) {
    const active = getTraceabilityActionState({ status: "Pickup scheduled" }, role, true);
    assert.equal(active.canDispute, true, `Expected ${role} to be able to dispute in Pickup scheduled`);

    const inReview = getTraceabilityActionState({ status: "Recycling review" }, role, true);
    assert.equal(inReview.canDispute, true, `Expected ${role} to be able to dispute in Recycling review`);

    const open = getTraceabilityActionState({ status: "Open" }, role, true);
    assert.equal(open.canDispute, false, `Expected ${role} to not dispute in Open status`);
  }
});

test("Pickup appointment schedule validation rejects invalid and out-of-bounds proposals", () => {
  const now = Date.now();
  // Less than 30 mins from now -> rejected
  assert.equal(validatePickupSchedule(new Date(now + 10 * 60 * 1000).toISOString(), now).ok, false);
  // More than 90 days ahead -> rejected
  assert.equal(validatePickupSchedule(new Date(now + 95 * 24 * 60 * 60 * 1000).toISOString(), now).ok, false);
  // Invalid string -> rejected
  assert.equal(validatePickupSchedule("invalid-date", now).ok, false);
  // Valid (e.g. 2 days ahead) -> ok
  const valid = validatePickupSchedule(new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(), now);
  assert.equal(valid.ok, true);
});

test("Reschedule requests require 10 to 500 character justification", () => {
  assert.equal(validateRescheduleRequest("").ok, false);
  assert.equal(validateRescheduleRequest("Too short").ok, false); // 9 chars
  assert.equal(validateRescheduleRequest("Reschedule to tomorrow morning please").ok, true);
  assert.equal(validateRescheduleRequest("a".repeat(501)).ok, false);
});

test("Lot privacy rules enforce phone, email, and residential bans across title, location, notes", () => {
  // Title privacy
  assert.equal(validateListingPrivacy({ title: "Call 9876543210 for copper", location: "Noida", notes: "" }).ok, false);
  assert.equal(validateListingPrivacy({ title: "Email me at scrap@dealer.com", location: "Noida", notes: "" }).ok, false);
  assert.equal(validateListingPrivacy({ title: "Telecom Server Racks - Lot 4", location: "Plot 12, Sector 62, Noida", notes: "" }).ok, true);

  // Location privacy
  assert.equal(validateListingPrivacy({ title: "Laptops", location: "Flat no 402, Lotus Tower", notes: "" }).ok, false);
  assert.equal(validateListingPrivacy({ title: "Laptops", location: "Plot 45, Sector 62, Noida 201301", notes: "" }).ok, true);
});

test("Lot editing strictly enforces open status requirement", async () => {
  await assert.rejects(
    () => updateLotDetails("lot-1", {
      title: "Circuit Boards",
      category: "Computers",
      weight: 50,
      location: "Peenya Industrial Area",
      currentStatus: "Offer submitted"
    }),
    /Lots can only be edited while in open status/
  );

  await assert.rejects(
    () => updateLotDetails("lot-1", {
      title: "Circuit Boards",
      category: "Computers",
      weight: 50,
      location: "Peenya Industrial Area",
      currentStatus: "pickup_scheduled"
    }),
    /Lots can only be edited while in open status/
  );
});

