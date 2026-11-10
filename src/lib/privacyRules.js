// Privacy protection rules for marketplace listings.
// Protects Sellers and Collectors from inadvertently exposing private phone numbers,
// email addresses, or exact residential addresses in public listings,
// while preserving legitimate commercial/industrial titles, areas and plot designations.

const PHONE_REGEX = /(?:\+?91[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}\b|\b[6-9]\d{9}\b|\b0\d{2,4}[\s.-]?\d{6,8}\b/;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const RESIDENTIAL_ADDRESS_REGEX = /\b(?:flat|house|door|room|apt|apartment|villa|bungalow|h[\s.-]*no)\b[\s#.-]*(?:(?:no\.?|num\.?|number|#)\s*)?[0-9]+/i;

export function validateListingPrivacy({ title = "", location = "", notes = "" }) {
  const t = typeof title === "string" ? title.trim() : "";
  const loc = typeof location === "string" ? location.trim() : "";
  const n = typeof notes === "string" ? notes.trim() : "";

  // Check title field
  if (PHONE_REGEX.test(t)) {
    return {
      ok: false,
      field: "title",
      reason: "To protect your privacy, do not enter phone numbers in the lot title. Use a concise material description."
    };
  }
  if (EMAIL_REGEX.test(t)) {
    return {
      ok: false,
      field: "title",
      reason: "Do not enter email addresses in the lot title. Use a clear material or asset description."
    };
  }

  // Check location field
  if (PHONE_REGEX.test(loc)) {
    return {
      ok: false,
      field: "location",
      reason: "To protect your privacy, do not enter phone numbers in the pickup area. Provide only an approximate area and city (e.g. 'Okhla Phase-2, New Delhi')."
    };
  }
  if (EMAIL_REGEX.test(loc)) {
    return {
      ok: false,
      field: "location",
      reason: "Do not enter email addresses in the pickup location field. Use a general area or industrial corridor."
    };
  }
  if (RESIDENTIAL_ADDRESS_REGEX.test(loc)) {
    return {
      ok: false,
      field: "location",
      reason: "Do not enter an exact residential flat, door, or house number in public listings. Enter a neighbourhood, industrial estate, or city."
    };
  }

  // Check notes field
  if (PHONE_REGEX.test(n)) {
    return {
      ok: false,
      field: "notes",
      reason: "To protect your privacy, do not include phone numbers in listing notes. Operational coordination occurs securely after an offer is accepted."
    };
  }
  if (EMAIL_REGEX.test(n)) {
    return {
      ok: false,
      field: "notes",
      reason: "Do not include email addresses in listing notes. Use notes strictly for material description and pickup conditions."
    };
  }

  return { ok: true };
}
