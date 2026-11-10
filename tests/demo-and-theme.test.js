import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getInitialDemoState,
  initialSellerListings,
  initialCollectorConsignments,
  initialAvailableSellerScrap,
  initialCollectionWork,
  initialActivity,
  resetDemoState,
  DEMO_SELLER,
  DEMO_COLLECTOR,
  DEMO_RECYCLER
} from "../src/lib/demoStore.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appPath = resolve(root, "src/App.jsx");
const landingPath = resolve(root, "src/components/LandingPage.jsx");
const cssPath = resolve(root, "src/App.css");
const themeTogglePath = resolve(root, "src/components/ThemeToggle.jsx");
const accessibleMenusPath = resolve(root, "src/components/AccessibleMenus.jsx");

test("demoStore provides complete and realistic fixtures for all 4 roles", () => {
  const state = getInitialDemoState();
  assert.ok(Array.isArray(state.lots), "state.lots must be an array");
  assert.ok(state.lots.length >= 6, "state.lots must have comprehensive records across roles");

  // Seller fixtures
  assert.ok(initialSellerListings.length >= 4, "Must have at least 4 initial seller listings");
  const sellerLot = initialSellerListings.find(l => l.id === "SEL-301");
  assert.ok(sellerLot, "SEL-301 must exist");
  assert.equal(sellerLot.collector, DEMO_SELLER);
  assert.ok(sellerLot.offers.length >= 2, "SEL-301 must have competing recycler offers");

  // Collector fixtures
  assert.ok(initialCollectorConsignments.length >= 4, "Must have at least 4 collector consignments");
  const collectorLot = initialCollectorConsignments.find(l => l.id === "COL-401");
  assert.ok(collectorLot, "COL-401 must exist");
  assert.equal(collectorLot.collector, DEMO_COLLECTOR);

  // Upstream scrap discovery for collectors
  assert.ok(initialAvailableSellerScrap.length >= 3, "Must have available seller scrap to claim");
  assert.ok(initialCollectionWork.length >= 1, "Must have collection work staged");

  // Recycler bids
  const allOffers = state.lots.flatMap(l => l.offers);
  const recyclerOffers = allOffers.filter(o => o.recycler === DEMO_RECYCLER);
  assert.ok(recyclerOffers.length >= 3, "Must have multiple bids submitted by demo recycler");

  // Admin audit / lifecycle variety
  const statuses = new Set(state.lots.map(l => l.status));
  assert.ok(statuses.has("Open"), "Must contain Open lots");
  assert.ok(statuses.has("Offer submitted"), "Must contain Offer submitted lots");
  assert.ok(statuses.has("Pickup scheduled"), "Must contain Pickup scheduled lots");
  assert.ok(statuses.has("Collected"), "Must contain Collected lots");
  assert.ok(statuses.has("Recycling review"), "Must contain Recycling review lots");
});

test("resetDemoState restores pristine initial sample records without mutating remote state", () => {
  const pristine = resetDemoState();
  assert.equal(pristine.lots.length, initialSellerListings.length + initialCollectorConsignments.length);
  assert.equal(pristine.availableSellerScrap.length, initialAvailableSellerScrap.length);
  assert.equal(pristine.collectionWork.length, initialCollectionWork.length);
});

test("CSS design system supports both dark graphite and high-contrast light themes", () => {
  const css = readFileSync(cssPath, "utf8");

  // Dark theme default
  assert.match(css, /--bg-canvas:\s*#090b0e/);
  assert.match(css, /--text-primary:\s*#f3f4f6/);

  // Light theme overrides
  assert.match(css, /\[data-theme="light"\]\s*\{/);
  assert.match(css, /--bg-canvas:\s*#f8fafc/);
  assert.match(css, /--bg-surface:\s*#ffffff/);
  assert.match(css, /--text-primary:\s*#0f172a/);
  assert.match(css, /--border-subtle:\s*rgba\(15,\s*23,\s*42/);
});

test("Hero video visibility is enhanced with increased opacity and responsive presentation", () => {
  const css = readFileSync(cssPath, "utf8");
  const landingCode = readFileSync(landingPath, "utf8");

  // CSS opacity & overlay
  assert.match(css, /\.hero-background-video\s*\{[\s\S]*?opacity:\s*0\.52/);
  assert.match(css, /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.hero-background-video\s*\{[\s\S]*?opacity:\s*0\.42/);

  // Accessibility: prefers-reduced-motion preserves suppression
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.hero-background-video\s*\{[\s\S]*?display:\s*none\s*!important/);

  // LandingPage video structure
  assert.match(landingCode, /<video[\s\S]*?className="hero-background-video"/);
  assert.match(landingCode, /scarap-hero\.mp4/);
  assert.match(landingCode, /scarap-hero-poster\.webp/);
});

test("Accessible dropdown menus and theme toggles are integrated into App.jsx and LandingPage.jsx", () => {
  assert.ok(existsSync(themeTogglePath), "ThemeToggle.jsx must exist");
  assert.ok(existsSync(accessibleMenusPath), "AccessibleMenus.jsx must exist");

  const appCode = readFileSync(appPath, "utf8");
  const landingCode = readFileSync(landingPath, "utf8");

  // ThemeToggle rendered in both views
  assert.match(landingCode, /<ThemeToggle/);
  assert.match(appCode, /<ThemeToggle/);

  // Accessible menus rendered in App
  assert.match(appCode, /ProfileMenuDropdown/);
  assert.match(appCode, /RoleSwitcherDropdown/);

  // Demo notification banner and reset button
  assert.match(appCode, /demo-notification-banner/);
  assert.match(appCode, /handleResetDemo/);
  assert.match(appCode, /btn-reset-demo/);
});
