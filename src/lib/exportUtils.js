// Safe CSV serialization and export utilities for marketplace lot records.
// Protects against CSV delimiters/newlines and spreadsheet formula injection.

const FORMULA_TRIGGER_REGEX = /^[=+\-@\t\r]/;

/**
 * Neutralize spreadsheet formula triggers and RFC-4180 escape a single CSV cell.
 */
export function formatCsvCell(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = FORMULA_TRIGGER_REGEX.test(raw) ? `'${raw}` : raw;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replaceAll('"', '""')}"`;
  }
  return safe;
}

/**
 * Compute percentage discrepancy between declared weight and actual receiving weight.
 */
export function computeDiscrepancyPct(lot) {
  if (!lot || lot.actualWeight == null || !Number.isFinite(Number(lot.actualWeight))) {
    return "";
  }
  if (lot.discrepancyPct !== undefined && lot.discrepancyPct !== null && lot.discrepancyPct !== "") {
    return String(lot.discrepancyPct);
  }
  const declared = Number(lot.weight);
  const actual = Number(lot.actualWeight);
  if (!Number.isFinite(declared) || declared <= 0) return "";
  return (((actual - declared) / declared) * 100).toFixed(2);
}

/**
 * Serialize visible lot records into RFC-4180 CSV with canonical kg and INR units.
 * Note: Produces a workspace data export, not a statutory Form-6 compliance document.
 */
export function buildLotsCsv(lots = [], { isDemo = true } = {}) {
  const headers = [
    "Lot ID",
    "Title",
    "Category",
    "Declared Weight (kg)",
    "Actual Weight (kg)",
    "Weight Variance (%)",
    "Approximate Location",
    "Date Listed",
    "Workflow Status",
    "Offer Count",
    "Highest Offer (INR)",
    "Data Environment"
  ];

  const dataModeLabel = isDemo ? "Browser Demo Data (Simulated)" : "Connected Workspace Records";
  const rows = (Array.isArray(lots) ? lots : []).map((lot) => {
    const offers = Array.isArray(lot.offers) ? lot.offers : [];
    const highestOffer = offers.length
      ? Math.max(...offers.map((o) => Number(o.price) || 0))
      : "";

    return [
      lot.id || "",
      lot.title || "",
      lot.category || "",
      lot.weight ?? "",
      lot.actualWeight ?? "",
      computeDiscrepancyPct(lot),
      lot.location || "",
      lot.date || "",
      lot.status || "",
      offers.length,
      highestOffer,
      dataModeLabel
    ]
      .map(formatCsvCell)
      .join(",");
  });

  return [headers.map(formatCsvCell).join(","), ...rows].join("\r\n");
}
