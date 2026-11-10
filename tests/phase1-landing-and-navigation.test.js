import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appPath = resolve(root, "src/App.jsx");
const landingPath = resolve(root, "src/components/LandingPage.jsx");
const timelinePath = resolve(root, "src/components/TraceabilityTimeline.jsx");
const collectorPath = resolve(root, "src/components/CollectorWorkspaceView.jsx");
const cssPath = resolve(root, "src/App.css");

test("LandingPage component exists and presents all required public sections", () => {
  assert.ok(existsSync(landingPath), "LandingPage.jsx must exist");
  const landingCode = readFileSync(landingPath, "utf8");

  // Core messaging
  assert.match(landingCode, /Industrial E-Waste Logistics/);
  assert.match(landingCode, /Audited Custody\. Closed Loops\./);
  assert.match(landingCode, /INDIAN E-WASTE RULES 2022 ALIGNED/);

  // 4 Target Roles with dedicated test-drive triggers
  assert.match(landingCode, /Launch Seller Demo/);
  assert.match(landingCode, /Launch Collector Demo/);
  assert.match(landingCode, /Launch Recycler Demo/);
  assert.match(landingCode, /Launch Admin Demo/);

  // 4 Workflow stages
  assert.match(landingCode, /Upstream Listing & Privacy Guard/);
  assert.match(landingCode, /Aggregator Intake & Custody Handover/);
  assert.match(landingCode, /Consignment Bundling & Bidding/);
  assert.match(landingCode, /Weighbridge Intake & Refining Audit/);

  // Regulatory & Discrepancy tolerances
  assert.match(landingCode, /Configurable Discrepancy Thresholds/);
  assert.match(landingCode, /Lead-Acid & Lithium Batteries/);
  assert.match(landingCode, /IT Server & PCB Scrap/);
});

test("App.jsx integrates LandingPage and URL hash navigation into the unauthenticated entry flow", () => {
  const appCode = readFileSync(appPath, "utf8");

  // LandingPage import
  assert.match(appCode, /import\s*\{\s*LandingPage\s*\}\s*from\s*"\.\/components\/LandingPage\.jsx"/);

  // Conditional entry flow: LandingPage when unauthenticated, auth-login-gate when authViewOpen
  assert.match(appCode, /if\s*\(!authSession\s*&&\s*!demoAccess\)\s*\{[\s\S]*?if\s*\(authViewOpen\)[\s\S]*?LandingPage/);

  // Hash-based navigation and demo role synchronization
  assert.match(appCode, /#demo\//);
  assert.match(appCode, /handleLaunchDemo/);
  assert.match(appCode, /handleExitDemo/);
  assert.match(appCode, /sessionStorage\.setItem\("scarap_demo_active"/);
});

test("Collector upstream discovery distinguishes Demo mode from Live Supabase RLS isolation", () => {
  const collectorCode = readFileSync(collectorPath, "utf8");

  // 3-way workspace tabs exist
  assert.match(collectorCode, /My Aggregated Consignments/);
  assert.match(collectorCode, /Available Seller Scrap/);
  assert.match(collectorCode, /My Collection Work/);

  // Honest Live-mode compliance notice
  assert.match(collectorCode, /Live Upstream Seller Intake Requires Tier-1 RLS Authorization/);
  assert.match(collectorCode, /lots_read_per_role/);
  assert.match(collectorCode, /HONESTLY ISOLATED \(NO FAKE LIVE DATA\)/);

  // Demo mode claim proposal
  assert.match(collectorCode, /Propose Collection Terms/);
  assert.match(collectorCode, /Target Pickup Window/);
});

test("TraceabilityTimeline renders chain of custody pipeline with status markers", () => {
  assert.ok(existsSync(timelinePath), "TraceabilityTimeline.jsx must exist");
  const timelineCode = readFileSync(timelinePath, "utf8");

  // 6 Pipeline stages
  assert.match(timelineCode, /Upstream Intake/);
  assert.match(timelineCode, /Offer Decided/);
  assert.match(timelineCode, /Pickup Coordinated/);
  assert.match(timelineCode, /Custody Handover/);
  assert.match(timelineCode, /Facility Receiving/);
  assert.match(timelineCode, /Certified Recycled/);

  // Event ledger & dispute badge
  assert.match(timelineCode, /CHAIN OF CUSTODY & AUDIT LEDGER/);
  assert.match(timelineCode, /DISPUTE ACTIVE · CUSTODY FROZEN/);
  assert.match(timelineCode, /RECORDED WORKFLOW EVENTS/);
});

test("CSS design system enforces dark graphite canvas with electric-lime accents and motion bounds", () => {
  const css = readFileSync(cssPath, "utf8");

  // Dark graphite tokens
  assert.match(css, /--bg-canvas:\s*#090b0e/);
  assert.match(css, /--accent-lime:\s*#a3e635/);
  assert.match(css, /--font-mono:\s*'JetBrains Mono'/);

  // Accessibility & reduced motion
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation-duration:\s*0\.01ms/);
});

