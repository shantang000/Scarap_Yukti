import React from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Accessible inline confirmation banner rendered inside a modal when a user tries
 * to close or discard a form that has unsaved changes.
 */
export function DiscardChangesBanner({ visible, onKeepEditing, onConfirmDiscard }) {
  if (!visible) return null;

  return (
    <div className="discard-confirm-banner" role="alertdialog" aria-labelledby="discard-confirm-title">
      <div className="discard-confirm-copy">
        <AlertTriangle size={16} className="text-amber" aria-hidden="true" />
        <div>
          <strong id="discard-confirm-title">Discard unsaved changes?</strong>
          <span>Your entered listing details will be cleared if you close this form.</span>
        </div>
      </div>
      <div className="discard-confirm-actions">
        <button type="button" className="btn btn-light btn-small" onClick={onKeepEditing}>
          Keep editing
        </button>
        <button type="button" className="btn btn-danger btn-small" onClick={onConfirmDiscard}>
          Discard changes
        </button>
      </div>
    </div>
  );
}
