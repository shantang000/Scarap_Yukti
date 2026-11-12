import React, { useEffect, useRef, useState } from "react";
import { Edit3, ShieldCheck, X } from "lucide-react";
import { validateLotFormInputs } from "../lib/lotFormValidation.js";
import { WEIGHT_UNITS } from "../lib/quantityUnits.js";
import { DiscardChangesBanner } from "./DiscardChangesBanner.jsx";
import { LotFormFields } from "./LotFormFields.jsx";

export function EditLotModal({ lot, busy, error, onClose, onSave }) {
  const initialValues = {
    title: lot?.title || "",
    category: lot?.category || "Computers",
    weight: String(lot?.weight ?? ""),
    weightUnit: WEIGHT_UNITS.KG,
    location: lot?.location || "",
    notes: lot?.notes || ""
  };

  const [formData, setFormData] = useState(initialValues);
  const [fieldError, setFieldError] = useState(error ? { field: null, message: error } : null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const titleRef = useRef(null);
  const categoryRef = useRef(null);
  const weightRef = useRef(null);
  const locationRef = useRef(null);
  const notesRef = useRef(null);
  const fieldRefs = {
    title: titleRef,
    category: categoryRef,
    weight: weightRef,
    location: locationRef,
    notes: notesRef
  };

  const isDirty =
    formData.title !== initialValues.title ||
    formData.category !== initialValues.category ||
    formData.weight !== initialValues.weight ||
    formData.location !== initialValues.location ||
    formData.notes !== initialValues.notes;

  const requestClose = () => {
    if (busy) return;
    if (isDirty && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        if (isDirty && !confirmDiscard) {
          setConfirmDiscard(true);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, confirmDiscard, isDirty, onClose]);

  const handleFieldChange = (field, value) => {
    setConfirmDiscard(false);
    setFieldError(null);
    if (field === "weightUnit") {
      // Convert displayed numeric value seamlessly when switching unit
      const currentNum = Number(formData.weight);
      let converted = formData.weight;
      if (Number.isFinite(currentNum) && currentNum > 0) {
        converted = value === WEIGHT_UNITS.MT
          ? String(Math.round((currentNum / 1000) * 10000) / 10000)
          : String(Math.round(currentNum * 1000 * 1000) / 1000);
      }
      setFormData((prev) => ({ ...prev, weightUnit: value, weight: converted }));
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateLotFormInputs(formData);
    if (!validation.ok) {
      setFieldError({ field: validation.field, message: validation.message });
      const targetEl = fieldRefs[validation.field]?.current;
      targetEl?.focus();
      targetEl?.scrollIntoView?.({ behavior: "instant", block: "center" });
      return;
    }

    setFieldError(null);
    await onSave(lot.id, {
      ...validation.payload,
      currentStatus: lot.status
    });
  };

  const activeError = fieldError || (error ? { field: null, message: error } : null);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-lot-dialog-title"
        tabIndex={-1}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">
              <Edit3 size={13} /> EDIT OPEN LISTING
            </span>
            <h2 id="edit-lot-dialog-title">Edit Listing — {lot?.id}</h2>
            <p>
              Update your details while this listing is open for bids. Editing locks once an offer is submitted or accepted.
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={requestClose}
            aria-label="Close dialog"
            disabled={busy}
          >
            <X size={18} />
          </button>
        </div>

        <DiscardChangesBanner
          visible={confirmDiscard}
          onKeepEditing={() => setConfirmDiscard(false)}
          onConfirmDiscard={onClose}
        />

        <form onSubmit={handleSubmit} className="form-grid" noValidate>
          <LotFormFields
            values={formData}
            onChange={handleFieldChange}
            fieldError={activeError}
            disabled={busy}
            fieldRefs={fieldRefs}
            autoFocusTitle
            idPrefix="edit-lot"
          />

          <div className="form-note full">
            <ShieldCheck size={16} />
            <span>
              Your listing area and hardware notes are visible to buyers evaluating this lot. Personal phone numbers, emails, and exact house numbers stay hidden until an offer is accepted.
            </span>
          </div>

          <div className="modal-actions full">
            <button
              type="button"
              className="btn btn-light"
              onClick={requestClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Saving Changes…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
