import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { buildLotsCsv, formatCsvCell } from "../src/lib/exportUtils.js";
import { toCanonicalKg, validateCanonicalWeightKg, formatWeightDisplay, WEIGHT_UNITS } from "../src/lib/quantityUnits.js";
import { validateLotFormInputs } from "../src/lib/lotFormValidation.js";
import { getLotNextStepGuidance } from "../src/lib/workflowGuidance.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("CSV export escapes RFC-4180 delimiters and neutralizes spreadsheet formula injection", () => {
  assert.equal(formatCsvCell("=CMD('calc')"), "'=CMD('calc')");
  assert.equal(formatCsvCell("+SUM(A1:A2)"), "'+SUM(A1:A2)");
  assert.equal(formatCsvCell("-100+20"), "'-100+20");
  assert.equal(formatCsvCell("@IMPORTXML"), "'@IMPORTXML");
  assert.equal(formatCsvCell('Batch, "Grade A"\nLine 2'), '"Batch, ""Grade A""\nLine 2"');

  const csv = buildLotsCsv(
    [
      {
        id: "SEL-101",
        title: '=HYPERLINK("http://bad")',
        category: "Computers",
        weight: 100,
        actualWeight: 85,
        location: "Peenya, Bengaluru",
        date: "2026-11-01",
        status: "Collected",
        offers: [{ price: 24000 }, { price: 32500 }]
      }
    ],
    { isDemo: true }
  );

  assert.match(csv, /^Lot ID,Title,Category,Declared Weight \(kg\),Actual Weight \(kg\),Weight Variance \(%\)/);
  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /-15\.00/);
  assert.match(csv, /32500/);
  assert.match(csv, /Browser Demo Data \(Simulated\)/);
  assert.doesNotMatch(csv, /Form-?6/i);
});

test("Quantity unit conversion between Metric Tonnes and kg is lossless and bounded", () => {
  assert.equal(toCanonicalKg("1.25", WEIGHT_UNITS.MT), 1250);
  assert.equal(toCanonicalKg("48.5", WEIGHT_UNITS.KG), 48.5);
  assert.equal(validateCanonicalWeightKg(toCanonicalKg("1.5", WEIGHT_UNITS.MT)).ok, true);
  assert.equal(validateCanonicalWeightKg(toCanonicalKg("0.05", WEIGHT_UNITS.KG)).ok, false);
  assert.equal(validateCanonicalWeightKg(toCanonicalKg("150", WEIGHT_UNITS.MT)).ok, false);
  assert.equal(formatWeightDisplay(1500), "1,500 kg (1.5 MT)");
  assert.equal(formatWeightDisplay(48.5), "48.5 kg");
});

test("Lot form validation returns targeted field errors for privacy leaks and preserves canonical kg", () => {
  const phoneInNotes = validateLotFormInputs({
    title: "Retired Servers",
    category: "Computers",
    weight: "1.2",
    weightUnit: WEIGHT_UNITS.MT,
    location: "Okhla Phase-2, Delhi",
    notes: "Call Ramesh at 9876543210"
  });
  assert.equal(phoneInNotes.ok, false);
  assert.equal(phoneInNotes.field, "notes");

  const validMt = validateLotFormInputs({
    title: "Retired Servers",
    category: "Computers",
    weight: "1.2",
    weightUnit: WEIGHT_UNITS.MT,
    location: "Okhla Phase-2, Delhi",
    notes: "Intact power supplies, dock gate pickup"
  });
  assert.equal(validMt.ok, true);
  assert.equal(validMt.payload.weight, 1200);
});

test("Workflow next-step guidance reports accurate status and responsible party", () => {
  const openGuidance = getLotNextStepGuidance({ status: "Open", offers: [] }, null, "Seller");
  assert.equal(openGuidance.responsible, "Registered Recyclers");

  const offerGuidance = getLotNextStepGuidance(
    { status: "Offer submitted", offers: [{ status: "pending" }] },
    null,
    "Seller"
  );
  assert.match(offerGuidance.responsible, /Owner action needed/);

  const pickupProposed = getLotNextStepGuidance(
    { status: "Pickup scheduled", offers: [{ status: "accepted" }] },
    { status: "proposed" },
    "Recycler"
  );
  assert.match(pickupProposed.responsible, /Confirm or reschedule/);
});

test("Phase 2 removes alert() prototype stubs, developer test-count badges, and restores Admin search clear icon", () => {
  const collectorCode = readFileSync(resolve(root, "src/components/CollectorWorkspaceView.jsx"), "utf8");
  const landingCode = readFileSync(resolve(root, "src/components/LandingPage.jsx"), "utf8");
  const adminCode = readFileSync(resolve(root, "src/components/AdminWorkspaceView.jsx"), "utf8");
  const appCode = readFileSync(resolve(root, "src/App.jsx"), "utf8");

  assert.doesNotMatch(collectorCode, /\balert\s*\(/);
  assert.doesNotMatch(landingCode, /81\s+(?:Automated|Tests)/);
  assert.doesNotMatch(appCode, /Supabase Account Access|81 Automated/);
  assert.match(adminCode, /import\s*\{[^}]*\bX\b[^}]*\}\s*from\s*"lucide-react"/);
});
