import React from "react";
import { ShieldCheck } from "lucide-react";
import { toCanonicalKg, WEIGHT_UNITS } from "../lib/quantityUnits.js";

export const MATERIAL_CATEGORIES = [
  { value: "Computers", help: "Laptops, desktops, servers, UPS power supplies, motherboards, RAM" },
  { value: "Displays", help: "LED/LCD monitors, panels, television units, digital signage" },
  { value: "Small electronics", help: "Routers, switches, printers, scanners, medical/lab electronics" },
  { value: "Phones and tablets", help: "Mobile handsets, VoIP desk phones, tablets, POS terminals" },
  { value: "Batteries", help: "Sealed lead-acid (UPS), lithium-ion battery packs (leak-free only)" },
  { value: "Mixed e-waste", help: "Unsorted cables, chargers, adapters, and mixed IT hardware" },
  { value: "Other", help: "Industrial electricals or non-standard electronic scrap" }
];

/**
 * Shared accessible form fields for creating and editing electronic scrap lots.
 * Surfaces privacy guidelines upfront, supports kg/MT unit conversion, and binds
 * inline errors directly to offending controls with accessible descriptions.
 */
export function LotFormFields({
  values,
  onChange,
  fieldError,
  disabled = false,
  fieldRefs = {},
  autoFocusTitle = false,
  idPrefix = "lot"
}) {
  const unit = values.weightUnit || WEIGHT_UNITS.KG;
  const canonicalKg = toCanonicalKg(values.weight, unit);
  const selectedCategoryInfo = MATERIAL_CATEGORIES.find((c) => c.value === values.category);

  const errorFor = (field) => (fieldError?.field === field ? fieldError.message : "");

  return (
    <>
      <div className={`form-field full ${errorFor("title") ? "has-error" : ""}`}>
        <label htmlFor={`${idPrefix}-title`}>
          Lot name / Material summary <span className="req-mark">*</span>
        </label>
        <input
          ref={fieldRefs.title}
          id={`${idPrefix}-title`}
          data-dialog-initial-focus={autoFocusTitle ? "true" : undefined}
          required
          maxLength={100}
          disabled={disabled}
          value={values.title}
          aria-invalid={Boolean(errorFor("title"))}
          aria-describedby={errorFor("title") ? `${idPrefix}-title-error` : `${idPrefix}-title-hint`}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="e.g. Retired Core-i7 laptops (approx 24 units) or server racks"
        />
        <small id={`${idPrefix}-title-hint`} className="field-helper">
          Describe the type and approximate condition. Do not put phone numbers or emails in the title.
        </small>
        {errorFor("title") && (
          <div id={`${idPrefix}-title-error`} className="field-inline-error" role="alert">
            {errorFor("title")}
          </div>
        )}
      </div>

      <div className={`form-field ${errorFor("category") ? "has-error" : ""}`}>
        <label htmlFor={`${idPrefix}-category`}>
          Material category <span className="req-mark">*</span>
        </label>
        <select
          ref={fieldRefs.category}
          id={`${idPrefix}-category`}
          disabled={disabled}
          value={values.category}
          aria-invalid={Boolean(errorFor("category"))}
          aria-describedby={errorFor("category") ? `${idPrefix}-category-error` : `${idPrefix}-category-hint`}
          onChange={(e) => onChange("category", e.target.value)}
        >
          {MATERIAL_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.value}
            </option>
          ))}
        </select>
        <small id={`${idPrefix}-category-hint`} className="field-helper">
          {selectedCategoryInfo?.help || "Select the closest e-waste classification."}
        </small>
        {errorFor("category") && (
          <div id={`${idPrefix}-category-error`} className="field-inline-error" role="alert">
            {errorFor("category")}
          </div>
        )}
      </div>

      <div className={`form-field ${errorFor("weight") ? "has-error" : ""}`}>
        <div className="field-label-row">
          <label htmlFor={`${idPrefix}-weight`}>
            Estimated weight <span className="req-mark">*</span>
          </label>
          <div className="unit-switch-group" role="group" aria-label="Weight unit">
            <button
              type="button"
              disabled={disabled}
              className={`unit-pill ${unit === WEIGHT_UNITS.KG ? "active" : ""}`}
              onClick={() => onChange("weightUnit", WEIGHT_UNITS.KG)}
            >
              kg
            </button>
            <button
              type="button"
              disabled={disabled}
              className={`unit-pill ${unit === WEIGHT_UNITS.MT ? "active" : ""}`}
              onClick={() => onChange("weightUnit", WEIGHT_UNITS.MT)}
            >
              Tonnes (MT)
            </button>
          </div>
        </div>
        <input
          ref={fieldRefs.weight}
          id={`${idPrefix}-weight`}
          type="number"
          min={unit === WEIGHT_UNITS.MT ? "0.0001" : "0.1"}
          max={unit === WEIGHT_UNITS.MT ? "100" : "100000"}
          step={unit === WEIGHT_UNITS.MT ? "0.001" : "0.1"}
          inputMode="decimal"
          required
          disabled={disabled}
          value={values.weight}
          aria-invalid={Boolean(errorFor("weight"))}
          aria-describedby={errorFor("weight") ? `${idPrefix}-weight-error` : `${idPrefix}-weight-hint`}
          onChange={(e) => onChange("weight", e.target.value)}
          placeholder={unit === WEIGHT_UNITS.MT ? "e.g. 1.5" : "e.g. 45.5"}
        />
        <small id={`${idPrefix}-weight-hint`} className="field-helper">
          {unit === WEIGHT_UNITS.MT && Number.isFinite(canonicalKg) && canonicalKg > 0
            ? `Stored as ${canonicalKg.toLocaleString("en-IN")} kg. `
            : ""}
          Enter estimated net weight (0.1 kg – 100,000 kg). Piece counts must be entered by total estimated weight.
        </small>
        {errorFor("weight") && (
          <div id={`${idPrefix}-weight-error`} className="field-inline-error" role="alert">
            {errorFor("weight")}
          </div>
        )}
      </div>

      <div className={`form-field full ${errorFor("location") ? "has-error" : ""}`}>
        <label htmlFor={`${idPrefix}-location`}>
          Approximate pickup area <span className="req-mark">*</span>
        </label>
        <input
          ref={fieldRefs.location}
          id={`${idPrefix}-location`}
          required
          minLength={2}
          maxLength={160}
          disabled={disabled}
          value={values.location}
          aria-invalid={Boolean(errorFor("location"))}
          aria-describedby={errorFor("location") ? `${idPrefix}-location-error` : `${idPrefix}-location-hint`}
          onChange={(e) => onChange("location", e.target.value)}
          placeholder="e.g. Peenya Industrial Area, Bengaluru or Sector 62, Noida"
        />
        <small id={`${idPrefix}-location-hint`} className="field-helper privacy-pre-hint">
          <ShieldCheck size={13} aria-hidden="true" />
          <span>
            <strong>Privacy protection:</strong> Enter only a neighbourhood, industrial estate, or city. Exact house/flat numbers, phone numbers, and emails are blocked to keep your contact details private until you accept an offer.
          </span>
        </small>
        {errorFor("location") && (
          <div id={`${idPrefix}-location-error`} className="field-inline-error" role="alert">
            {errorFor("location")}
          </div>
        )}
      </div>

      <div className={`form-field full ${errorFor("notes") ? "has-error" : ""}`}>
        <label htmlFor={`${idPrefix}-notes`}>Condition & pickup notes (optional)</label>
        <textarea
          ref={fieldRefs.notes}
          id={`${idPrefix}-notes`}
          rows={3}
          maxLength={500}
          disabled={disabled}
          value={values.notes}
          aria-invalid={Boolean(errorFor("notes"))}
          aria-describedby={errorFor("notes") ? `${idPrefix}-notes-error` : `${idPrefix}-notes-hint`}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Describe completeness, battery condition, storage access, or packing (no phone numbers or emails)..."
        />
        <div className="field-helper-split">
          <small id={`${idPrefix}-notes-hint`} className="field-helper">
            Public to buyers reviewing open lots. Keep notes focused on hardware specs and loading access.
          </small>
          <small className="char-counter">{(values.notes || "").length}/500</small>
        </div>
        {errorFor("notes") && (
          <div id={`${idPrefix}-notes-error`} className="field-inline-error" role="alert">
            {errorFor("notes")}
          </div>
        )}
      </div>

      {fieldError && !fieldError.field && (
        <div className="form-error full" role="alert">
          {fieldError.message}
        </div>
      )}
    </>
  );
}
