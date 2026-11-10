import React, { useState, useEffect } from "react";
import { Edit3, ShieldCheck, X } from "lucide-react";
import { validateListingPrivacy } from "../lib/privacyRules.js";

export function EditLotModal({ lot, busy, error, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: lot?.title || "",
    category: lot?.category || "Computers",
    weight: String(lot?.weight ?? ""),
    location: lot?.location || "",
    notes: lot?.notes || ""
  });
  const [localError, setLocalError] = useState(error || "");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = formData.title.trim();
    const cleanCategory = formData.category.trim();
    const cleanLocation = formData.location.trim();
    const cleanNotes = formData.notes.trim();
    const numWeight = Number(formData.weight);

    if (cleanTitle.length < 2 || cleanTitle.length > 100) {
      setLocalError("Lot name must be between 2 and 100 characters.");
      return;
    }
    if (!Number.isFinite(numWeight) || numWeight < 0.1 || numWeight > 100000) {
      setLocalError("Enter a weight from 0.1 to 100,000 kg.");
      return;
    }
    if (!cleanCategory || cleanCategory.length > 80) {
      setLocalError("Choose a category with no more than 80 characters.");
      return;
    }
    if (cleanLocation.length < 2 || cleanLocation.length > 160) {
      setLocalError("Pickup location must be between 2 and 160 characters.");
      return;
    }
    if (cleanNotes.length > 500) {
      setLocalError("Notes must be 500 characters or fewer.");
      return;
    }

    const privacyCheck = validateListingPrivacy({ title: cleanTitle, location: cleanLocation, notes: cleanNotes });
    if (!privacyCheck.ok) {
      setLocalError(privacyCheck.reason);
      return;
    }

    setLocalError("");
    await onSave(lot.id, {
      title: cleanTitle,
      category: cleanCategory,
      weight: numWeight,
      location: cleanLocation,
      notes: cleanNotes,
      currentStatus: lot.status
    });
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
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
              <Edit3 size={13} /> CONSIGNMENT REVISION
            </span>
            <h2 id="edit-lot-dialog-title">Edit Lot Details — {lot?.id}</h2>
            <p>
              Update your listing while it remains in open status. Lots cannot be edited once an offer has been submitted or accepted.
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => !busy && onClose()}
            aria-label="Close dialog"
            disabled={busy}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <label className="full">
            Lot name / Consignment Title
            <input
              required
              maxLength={100}
              value={formData.title}
              disabled={busy}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                setLocalError("");
              }}
              placeholder="e.g. Decommissioned server batch"
            />
          </label>

          <label>
            Material Classification
            <select
              value={formData.category}
              disabled={busy}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option>Computers</option>
              <option>Displays</option>
              <option>Small electronics</option>
              <option>Phones and tablets</option>
              <option>Batteries</option>
              <option>Mixed e-waste</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            Estimated Net Mass (kg)
            <input
              type="number"
              min="0.1"
              max="100000"
              step="0.1"
              required
              disabled={busy}
              value={formData.weight}
              onChange={(e) => {
                setFormData({ ...formData, weight: e.target.value });
                setLocalError("");
              }}
              placeholder="e.g. 42.5"
            />
          </label>

          <label className="full">
            Approximate Logistics Hub / Area
            <input
              required
              minLength={2}
              maxLength={160}
              disabled={busy}
              value={formData.location}
              onChange={(e) => {
                setFormData({ ...formData, location: e.target.value });
                setLocalError("");
              }}
              placeholder="e.g. Sector 62, Noida (Do not enter exact flat/door number)"
            />
          </label>

          <label className="full">
            Material Notes & Condition
            <textarea
              rows={3}
              maxLength={500}
              disabled={busy}
              value={formData.notes}
              onChange={(e) => {
                setFormData({ ...formData, notes: e.target.value });
                setLocalError("");
              }}
              placeholder="Provide specifications, completeness, and packaging notes..."
            />
          </label>

          {(localError || error) && (
            <div className="form-error full" role="alert">
              {localError || error}
            </div>
          )}

          <div className="form-note full">
            <ShieldCheck size={16} />
            <span>
              <strong>Privacy Protection:</strong> Listing areas are public to verified recyclers. Use an approximate industrial hub or neighbourhood. Never enter personal phone numbers, flat/house numbers, or email addresses here.
            </span>
          </div>

          <div className="modal-actions full">
            <button
              type="button"
              className="btn btn-light"
              onClick={() => !busy && onClose()}
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

