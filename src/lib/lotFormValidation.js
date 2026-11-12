import { validateListingPrivacy } from "./privacyRules.js";
import { toCanonicalKg, validateCanonicalWeightKg, WEIGHT_UNITS } from "./quantityUnits.js";

/**
 * Validate create/edit lot form inputs and return field-targeted errors
 * alongside sanitized payload values in canonical kilograms.
 */
export function validateLotFormInputs(values) {
  const cleanTitle = typeof values?.title === "string" ? values.title.trim() : "";
  const cleanCategory = typeof values?.category === "string" ? values.category.trim() : "";
  const cleanLocation = typeof values?.location === "string" ? values.location.trim() : "";
  const cleanNotes = typeof values?.notes === "string" ? values.notes.trim() : "";
  const weightUnit = values?.weightUnit || WEIGHT_UNITS.KG;
  const canonicalWeightKg = toCanonicalKg(values?.weight, weightUnit);

  if (cleanTitle.length < 2 || cleanTitle.length > 100) {
    return { ok: false, field: "title", message: "Lot name must be between 2 and 100 characters." };
  }
  if (!cleanCategory || cleanCategory.length > 80) {
    return { ok: false, field: "category", message: "Choose a category with no more than 80 characters." };
  }
  const weightCheck = validateCanonicalWeightKg(canonicalWeightKg);
  if (!weightCheck.ok) {
    return { ok: false, field: "weight", message: weightCheck.reason };
  }
  if (cleanLocation.length < 2 || cleanLocation.length > 160) {
    return { ok: false, field: "location", message: "Pickup location must be between 2 and 160 characters." };
  }
  if (cleanNotes.length > 500) {
    return { ok: false, field: "notes", message: "Notes must be 500 characters or fewer." };
  }

  const privacyCheck = validateListingPrivacy({
    title: cleanTitle,
    location: cleanLocation,
    notes: cleanNotes
  });
  if (!privacyCheck.ok) {
    return { ok: false, field: privacyCheck.field, message: privacyCheck.reason };
  }

  return {
    ok: true,
    payload: {
      title: cleanTitle,
      category: cleanCategory,
      weight: weightCheck.weightKg,
      location: cleanLocation,
      notes: cleanNotes
    }
  };
}
