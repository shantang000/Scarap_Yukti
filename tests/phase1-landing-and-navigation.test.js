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

  // Core plain-English messaging
  assert.match(landingCode, /Sell, Collect, and Recycle E-Waste/);
  assert.match(landingCode, /With Tracked Custody\./);
  assert.match(landingCode, /INDIAN E-WASTE RULES 2022 ALIGNED/);

  // 4 Target Roles with dedicated test-drive triggers
  assert.match(landingCode, /Launch Seller Demo/);
  assert.match(landingCode, /Launch Collector Demo/);
  assert.match(landingCode, /Launch Recycler Demo/);
  assert.match(landingCode, /Launch Admin Demo/);

  // Core safeguards & honest prototype boundaries
  assert.match(landingCode, /Privacy Before Acceptance/);
  assert.match(landingCode, /Weight Discrepancy Checks/);
  assert.match(landingCode, /Locked Terms After Bidding/);
  assert.match(landingCode, /Online Inquiry Form Unavailable/);

  // Discrepancy guide categories
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

test("Collector upstream discovery distinguishes Demo mode from Live mode restrictions honestly", () => {
  const collectorCode = readFileSync(collectorPath, "utf8");

  // 3-way workspace tabs exist with Indian operator-friendly labels
  assert.match(collectorCode, /Available Pickups/);
  assert.match(collectorCode, /Collection Work/);
  assert.match(collectorCode, /My Consignments/);

  // Honest Live-mode limitation notice (without internal RLS jargon)
  assert.match(collectorCode, /Direct Seller Pickup Claims Are Not Enabled in Live Mode Yet/);
  assert.match(collectorCode, /My Consignments/);

  // Demo mode claim proposal
  assert.match(collectorCode, /Claim Pickup Batch/);
  assert.match(collectorCode, /Planned Pickup Date/);
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

