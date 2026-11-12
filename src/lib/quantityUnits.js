// Lossless conversion utilities between UI display weight units and canonical weight_kg storage.
// Note: Piece/unit counts are not supported by the backend schema and cannot be converted into kg.

export const WEIGHT_UNITS = Object.freeze({
  KG: "kg",
  MT: "mt"
});

export const MIN_WEIGHT_KG = 0.1;
export const MAX_WEIGHT_KG = 100000;

/**
 * Convert a user-entered numeric string/value in the selected unit to canonical kilograms.
 * Rounds to 3 decimal places when converting metric tonnes to prevent floating-point drift.
 */
export function toCanonicalKg(rawValue, unit = WEIGHT_UNITS.KG) {
  const num = Number(rawValue);
  if (!Number.isFinite(num) || num <= 0) return NaN;
  if (unit === WEIGHT_UNITS.MT) {
    return Math.round(num * 1000 * 1000) / 1000;
  }
  return Math.round(num * 1000) / 1000;
}

/**
 * Validate a canonical weight (in kg) against marketplace storage bounds.
 */
export function validateCanonicalWeightKg(weightKg) {
  if (!Number.isFinite(weightKg) || weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
    return {
      ok: false,
      reason: "Enter a total weight between 0.1 kg and 100,000 kg (0.0001 to 100 Metric Tonnes)."
    };
  }
  return { ok: true, weightKg };
}

/**
 * Format a canonical kg value clearly for UI display, adding MT equivalent for bulk loads >= 1,000 kg.
 */
export function formatWeightDisplay(weightKg) {
  const num = Number(weightKg);
  if (!Number.isFinite(num)) return "0 kg";
  const formattedKg = `${num.toLocaleString("en-IN")} kg`;
  if (num >= 1000) {
    const mt = (num / 1000).toLocaleString("en-IN", { maximumFractionDigits: 3 });
    return `${formattedKg} (${mt} MT)`;
  }
  return formattedKg;
}
