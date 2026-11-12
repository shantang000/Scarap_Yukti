import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { getTraceabilityActionState } from "../src/lib/traceabilityView.js";
import { updateLotDetails } from "../src/lib/lotActions.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appCode = readFileSync(resolve(root, "src/App.jsx"), "utf8");
const sellerViewPath = resolve(root, "src/components/SellerWorkspaceView.jsx");
const collectorViewPath = resolve(root, "src/components/CollectorWorkspaceView.jsx");
const summaryPath = resolve(root, "src/components/OperationalSummary.jsx");

test("Seller and Collector view files exist as separate and distinct components", () => {
  assert.ok(existsSync(sellerViewPath), "SellerWorkspaceView.jsx must exist");
  assert.ok(existsSync(collectorViewPath), "CollectorWorkspaceView.jsx must exist");

  const sellerCode = readFileSync(sellerViewPath, "utf8");
  const collectorCode = readFileSync(collectorViewPath, "utf8");

  // Verify they are genuinely distinct files and not clones
  assert.notEqual(sellerCode, collectorCode, "SellerWorkspaceView and CollectorWorkspaceView must not be identical");

  // Seller-specific terminology and elements
  assert.match(sellerCode, /My E-Waste Listings/);
  assert.match(sellerCode, /seller-workspace-view/);
  assert.match(sellerCode, /Your scrap listings are visible to participating recyclers/);
  assert.match(sellerCode, /Incoming Recycler Offers/);
  assert.match(sellerCode, /Create Listing|Add listing/);

  // Collector-specific terminology and elements
  assert.match(collectorCode, /Consignment Ledger & Scrap Lots/);
  assert.match(collectorCode, /collector-workspace-view/);
  assert.match(collectorCode, /Consolidation Hub/);
  assert.match(collectorCode, /Offers Ledger/);
  assert.match(collectorCode, /Create Lot|Create first lot/);
});

test("App.jsx imports and routes Seller and Collector to separate dashboards", () => {
  // Both imports exist
  assert.match(appCode, /import\s*\{\s*SellerWorkspaceView\s*\}\s*from\s*"\.\/components\/SellerWorkspaceView\.jsx"/);
  assert.match(appCode, /import\s*\{\s*CollectorWorkspaceView\s*\}\s*from\s*"\.\/components\/CollectorWorkspaceView\.jsx"/);

  // Separate dashboard wrappers exist
  assert.match(appCode, /function SellerDashboard\(/);
  assert.match(appCode, /function CollectorDashboard\(/);

  // Route branching routes Seller to SellerDashboard and Collector to CollectorDashboard
  assert.match(appCode, /role === "Seller"\s*\?\s*<SellerDashboard/);
  assert.match(appCode, /role === "Collector"\s*\?\s*<CollectorDashboard/);
});

test("Navigation links are tailored specifically for Seller vs Collector", () => {
  // Seller navigation includes disposal-specific links
  assert.match(appCode, /role === "Seller"[\s\S]*?label:\s*"My listings"/);
  assert.match(appCode, /role === "Seller"[\s\S]*?label:\s*"Price estimator"/);
  assert.match(appCode, /role === "Seller"[\s\S]*?label:\s*"Disposal history"/);

  // Collector navigation includes consignment & consolidation links
  assert.match(appCode, /role === "Collector"[\s\S]*?label:\s*"Consignment lots"/);
  assert.match(appCode, /role === "Collector"[\s\S]*?label:\s*"Rate calculator"/);
  assert.match(appCode, /role === "Collector"[\s\S]*?label:\s*"Ledger history"/);
});

test("DashboardOverview provides dedicated content and action shortcuts for Seller and Collector", () => {
  // Seller overview does NOT fall back to Admin operations
  assert.match(appCode, /role === "Seller"[\s\S]*?title:\s*"Your disposal workspace"/);
  assert.match(appCode, /role === "Seller"[\s\S]*?Manage my listings/);
  assert.match(appCode, /Create a disposal listing/);

  // Collector overview contains collection & consolidation hub content
  assert.match(appCode, /role === "Collector"[\s\S]*?title:\s*"Collection & consolidation hub"/);
  assert.match(appCode, /role === "Collector"[\s\S]*?Consignment ledger/);
  assert.match(appCode, /Create consignment lot/);
});

test("OperationalSummary renders distinct metric labels for all 4 roles", () => {
  const summaryCode = readFileSync(summaryPath, "utf8");

  // Seller metrics
  assert.match(summaryCode, /label:\s*"Active Listings"/);
  assert.match(summaryCode, /label:\s*"Listed Scrap Mass"/);
  assert.match(summaryCode, /label:\s*"Bids to Review"/);
  assert.match(summaryCode, /label:\s*"Disposed & Recycled"/);

  // Collector metrics
  assert.match(summaryCode, /label:\s*"Consignments Managed"/);
  assert.match(summaryCode, /label:\s*"Aggregated Net Mass"/);
  assert.match(summaryCode, /label:\s*"Offers Under Review"/);
  assert.match(summaryCode, /label:\s*"Downstream Recycled"/);

  // Recycler metrics
  assert.match(summaryCode, /label:\s*"Available Lots"/);
  assert.match(summaryCode, /label:\s*"Available Material"/);
  assert.match(summaryCode, /label:\s*"Bidding Open"/);

  // Admin metrics
  assert.match(summaryCode, /label:\s*"Marketplace Lots"/);
  assert.match(summaryCode, /label:\s*"Network Mass"/);
  assert.match(summaryCode, /label:\s*"Active Negotiations"/);
});

test("Action gating: Handover weighing is strictly restricted to Recyclers; Seller and Collector cannot weigh", () => {
  const collectedLot = { status: "Collected", actualWeight: null };

  const sellerState = getTraceabilityActionState(collectedLot, "seller", true);
  assert.equal(sellerState.canWeigh, false, "Seller must NOT have permission to record handover weight");

  const collectorState = getTraceabilityActionState(collectedLot, "collector", true);
  assert.equal(collectorState.canWeigh, false, "Collector must NOT have permission to record handover weight");

  const recyclerState = getTraceabilityActionState(collectedLot, "recycler", true);
  assert.equal(recyclerState.canWeigh, true, "Recycler must be permitted to record handover weight on collected lot");
});

test("Action gating: Seller and Collector can dispute in active statuses, but never in open status", () => {
  for (const role of ["seller", "collector"]) {
    // Eligible statuses
    for (const status of ["Pickup scheduled", "Collected", "Recycling review"]) {
      const state = getTraceabilityActionState({ status }, role, true);
      assert.equal(state.canDispute, true, `${role} should be able to dispute in ${status}`);
    }

    // Ineligible statuses
    for (const status of ["Open", "Offer submitted", "Recycled", "Disputed"]) {
      const state = getTraceabilityActionState({ status }, role, true);
      assert.equal(state.canDispute, false, `${role} must NOT be able to dispute in ${status}`);
    }
  }
});

test("Action gating: Admin workflow advancement is never exposed to Seller or Collector views", () => {
  const sellerCode = readFileSync(sellerViewPath, "utf8");
  const collectorCode = readFileSync(collectorViewPath, "utf8");

  // advance_lot_workflow RPC must NOT be in seller or collector views
  assert.doesNotMatch(sellerCode, /advance_lot_workflow/);
  assert.doesNotMatch(collectorCode, /advance_lot_workflow/);
  assert.doesNotMatch(sellerCode, /advanceAdminWorkflow/);
  assert.doesNotMatch(collectorCode, /advanceAdminWorkflow/);
  assert.doesNotMatch(sellerCode, /onConnectedTransition/);
  assert.doesNotMatch(collectorCode, /onConnectedTransition/);
});

test("Action gating: Lot details editing is strictly locked once offers exist or workflow advances", async () => {
  // Reject edits for lots that are not Open
  await assert.rejects(
    () => updateLotDetails("test-lot-1", {
      title: "Telecom Server Rack",
      category: "Computers",
      weight: 120,
      location: "Industrial Corridor",
      notes: "Functional units",
      currentStatus: "Offer submitted"
    }),
    /Lots can only be edited while in open status/
  );

  await assert.rejects(
    () => updateLotDetails("test-lot-2", {
      title: "Telecom Server Rack",
      category: "Computers",
      weight: 120,
      location: "Industrial Corridor",
      notes: "Functional units",
      currentStatus: "Pickup scheduled"
    }),
    /Lots can only be edited while in open status/
  );
});

test("Authenticated Supabase profile role is the sole source of truth and role picker is locked", () => {
  // Role is derived directly from authenticated profile row
  assert.match(appCode, /const role = authSession\s*\?\s*profile\?\.role/);

  // Role picker dropdown is conditionally rendered ONLY when no authSession exists
  assert.match(appCode, /authSession && profile\s*\?[\s\S]*?profile-menu[\s\S]*?role-picker/);

  // Profiles query fetches verified role column
  assert.match(appCode, /supabase\s*\.from\("profiles"\)\s*\.select\("id, display_name, role"\)/);
});

test("Creation modal and pickup coordination display role-appropriate headings and notes", () => {
  // Fresh app code read
  const currentAppCode = readFileSync(resolve(root, "src/App.jsx"), "utf8");

  // Modal header differentiates Seller listing vs Collector lot
  assert.match(currentAppCode, /role === "Seller"\s*\?\s*"Add e-waste listing"\s*:\s*"Add e-waste lot"/);
  assert.match(currentAppCode, /role === "Seller"\s*\?\s*"Create listing"\s*:\s*"Create lot"/);

  // Pickup coordination reflects seller vs collector proposal note
  assert.match(currentAppCode, /\(role === "seller" \|\| role === "Seller"\)\s*\?\s*"Seller note:\s*"\s*:\s*"Collector note:\s*"/);
});


