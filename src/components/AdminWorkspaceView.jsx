import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Info, MapPin, Search, ShieldCheck, X } from "lucide-react";
import {
  EmptyState,
  money,
  OfferStatusPill,
  shortDate,
  statusLabel,
  statusOptions,
  StatusPill
} from "./MarketplaceUi.jsx";
import { TraceabilityTimeline } from "./TraceabilityTimeline.jsx";
import { computeDiscrepancyPct } from "../lib/exportUtils.js";
import { formatWeightDisplay } from "../lib/quantityUnits.js";
import { getLotNextStepGuidance } from "../lib/workflowGuidance.js";

export function AdminWorkspaceView({
  lots,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  evidenceDrafts,
  setEvidenceDrafts,
  disputeDrafts,
  setDisputeDrafts,
  onTransition,
  onConnectedTransition,
  busyLotId,
  pickupAppointmentsByLot,
  canManage = false,
  readOnly = false,
  traceProps,
  traceabilityAvailable,
  LotTraceActions
}) {
  const [selectedLotId, setSelectedLotId] = useState(lots[0]?.id || null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [inlineAdminError, setInlineAdminError] = useState({ lotId: null, field: null, message: "" });

  const hasVarianceException = (lot) => {
    const pct = computeDiscrepancyPct(lot);
    return pct !== "" && Math.abs(Number(pct)) > 10;
  };

  const isExceptionLot = (lot) =>
    lot.status === "Disputed" ||
    lot.status === "Recycling review" ||
    hasVarianceException(lot);

  const displayedLots = useMemo(() => {
    if (!exceptionsOnly) return lots;
    return lots.filter(isExceptionLot);
  }, [lots, exceptionsOnly]);

  const exceptionCount = useMemo(() => lots.filter(isExceptionLot).length, [lots]);

  const selectedLot =
    displayedLots.find((l) => l.id === selectedLotId) || displayedLots[0] || null;
  const selectedAppointment = selectedLot ? pickupAppointmentsByLot?.get(selectedLot.id) : null;
  const nextGuidance = selectedLot
    ? getLotNextStepGuidance(selectedLot, selectedAppointment, "Admin")
    : null;

  const runTransition = async (lotId, nextStatus, demoStatus, note = "", requireNote = false, fieldKey = null) => {
    const cleanNote = (note || "").trim();
    if (requireNote && (cleanNote.length < 10 || cleanNote.length > 500)) {
      setInlineAdminError({
        lotId,
        field: fieldKey,
        message: "Please enter a clear operational note between 10 and 500 characters before continuing."
      });
      return;
    }
    setInlineAdminError({ lotId: null, field: null, message: "" });
    return readOnly
      ? onConnectedTransition(lotId, nextStatus, demoStatus, cleanNote)
      : onTransition(lotId, demoStatus, cleanNote);
  };

  const busy = (lotId) => Boolean(busyLotId) && busyLotId === lotId;
  const isDisabled = () => Boolean(busyLotId);
  const disputeStatuses = ["Open", "Offer submitted", "Pickup scheduled", "Collected", "Recycling review"];

  const evidenceValue = selectedLot ? evidenceDrafts[selectedLot.id] || "" : "";
  const disputeValue = selectedLot ? disputeDrafts[selectedLot.id] || "" : "";
  const selectedVariancePct = selectedLot ? computeDiscrepancyPct(selectedLot) : "";

  return (
    <section className="panel dashboard-panel">
      <div className="panel-heading">
        <div>
          <h2>Operations Audit & Exception Review</h2>
          <p>
            {readOnly
              ? "Monitor active listings, verify receiving weight variances, and record official workflow decisions."
              : "Review sample lots, test exception handling, and practice workflow arbitration in this browser demo."}
          </p>
        </div>
        <span className={readOnly ? "connected-label warning" : "demo-label warning"}>
          {readOnly ? "LIVE ADMIN WORKSPACE" : "ADMIN REVIEW · LOCAL DEMO"}
        </span>
      </div>

      <div className="admin-callout">
        <ShieldCheck size={16} />
        <span>
          {readOnly
            ? "Compliance updates and dispute resolutions are saved to the permanent audit log. Notes must be accurate and complete."
            : "Changes made here stay in your browser demo. Use this view to inspect weight discrepancies, review notes, and dispute holds."}
        </span>
      </div>

      <div className="master-detail-workspace">
        {/* MASTER LIST */}
        <div className={`master-pane ${mobileDetailOpen ? "hide-on-mobile" : ""}`}>
          <div className="filters role-filters">
            <div className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search lots by ID, area, or title..."
                aria-label="Filter lots"
              />
              {query && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="filters role-filters admin-filter-strip">
            <div className="filter-select">
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>All statuses</option>
                {statusOptions.map((item) => (
                  <option key={item} value={item}>
                    {statusLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={`exception-filter-chip ${exceptionsOnly ? "active" : ""}`}
              onClick={() => setExceptionsOnly((v) => !v)}
              aria-pressed={exceptionsOnly}
            >
              <AlertTriangle size={14} />
              <span>Needs Attention ({exceptionCount})</span>
            </button>
          </div>

          {displayedLots.length ? (
            <div className="master-list" role="listbox" aria-label="All lots">
              {displayedLots.map((lot) => {
                const isSelected = selectedLot?.id === lot.id;
                const variancePct = computeDiscrepancyPct(lot);
                const flagged = variancePct !== "" && Math.abs(Number(variancePct)) > 10;
                return (
                  <article
                    key={lot.id}
                    className={`master-row ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedLotId(lot.id);
                      setMobileDetailOpen(true);
                      setInlineAdminError({ lotId: null, field: null, message: "" });
                    }}
                    tabIndex={0}
                    role="option"
                    aria-selected={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedLotId(lot.id);
                        setMobileDetailOpen(true);
                        setInlineAdminError({ lotId: null, field: null, message: "" });
                      }
                    }}
                  >
                    <div className="master-row-header">
                      <strong className="master-row-title">{lot.title}</strong>
                      <StatusPill status={lot.status} />
                    </div>
                    <div className="master-row-sub">
                      <span>{lot.id} · {lot.category}</span>
                      <b>{formatWeightDisplay(lot.weight)}</b>
                    </div>
                    <div className="master-row-footer">
                      <span className="location-tag">
                        <MapPin size={12} /> {lot.location}
                      </span>
                      {flagged ? (
                        <span className="offers-badge warning-pill">
                          Variance {variancePct}%
                        </span>
                      ) : (
                        <span className="offers-badge">
                          {lot.offers.length} {lot.offers.length === 1 ? "offer" : "offers"}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={exceptionsOnly ? "No exceptions requiring review" : "No lots match filters"}
              detail={
                exceptionsOnly
                  ? "No lots currently have disputes, pending recycling reviews, or >10% weight discrepancy."
                  : "Clear or adjust status and search filters."
              }
            />
          )}
        </div>

        {/* DETAIL INSPECTOR */}
        <div className={`detail-pane ${!mobileDetailOpen ? "hide-on-mobile" : ""}`}>
          {selectedLot ? (
            <div className="inspector-content">
              {mobileDetailOpen && (
                <button
                  type="button"
                  className="btn btn-light btn-small detail-back-btn"
                  onClick={() => setMobileDetailOpen(false)}
                >
                  <ArrowLeft size={14} /> Back to lots
                </button>
              )}

              <div className="inspector-header">
                <div>
                  <span className="inspector-eyebrow">
                    {selectedLot.id} · {selectedLot.category}
                  </span>
                  <h3>{selectedLot.title}</h3>
                </div>
                <StatusPill status={selectedLot.status} />
              </div>

              {nextGuidance && (
                <div className="next-step-guidance-card" role="region" aria-label="Operational status">
                  <div className="next-step-top">
                    <span className="next-step-badge">
                      <Info size={14} /> {nextGuidance.summary}
                    </span>
                    <span className="responsible-party-pill">
                      Waiting on: <strong>{nextGuidance.responsible}</strong>
                    </span>
                  </div>
                  <p className="next-step-body">{nextGuidance.nextStep}</p>
                </div>
              )}

              <div className="specs-grid">
                <div>
                  <label>Listing Owner</label>
                  <strong>{selectedLot.collector}</strong>
                </div>
                <div>
                  <label>Declared vs Actual Weight</label>
                  <span>
                    {formatWeightDisplay(selectedLot.weight)}
                    {selectedLot.actualWeight != null
                      ? ` · Actual: ${selectedLot.actualWeight} kg (${selectedVariancePct}%)`
                      : " · Not weighed yet"}
                  </span>
                </div>
                <div>
                  <label>Pickup Area</label>
                  <span>
                    <MapPin size={12} /> {selectedLot.location}
                  </span>
                </div>
                <div>
                  <label>Date Listed</label>
                  <span>{shortDate(selectedLot.date)}</span>
                </div>
              </div>

              {LotTraceActions && (
                <LotTraceActions
                  lot={selectedLot}
                  mode="info"
                  available={traceabilityAvailable}
                  onWeight={traceProps.onWeight}
                  onDispute={traceProps.onDispute}
                />
              )}

              {selectedAppointment && (
                <div className="pickup-summary">
                  <strong>
                    Pickup appointment ·{" "}
                    {selectedAppointment.status.replaceAll("_", " ")}
                  </strong>
                  <span>
                    {selectedAppointment.scheduledAt
                      ? new Date(selectedAppointment.scheduledAt).toLocaleString("en-IN")
                      : "Date pending"}{" "}
                    · Coordination record (transport occurs off-platform)
                  </span>
                </div>
              )}

              {/* OFFERS SUMMARY */}
              <div className="admin-offers">
                <strong>Offers Summary ({selectedLot.offers.length})</strong>
                {selectedLot.offers.length ? (
                  selectedLot.offers.map((offer) => (
                    <div className="admin-offer-row" key={offer.id}>
                      <span>
                        <strong>{offer.recycler}</strong>
                        <small>{offer.message || "No terms attached."}</small>
                      </span>
                      <b>{money(offer.price)}</b>
                      <OfferStatusPill status={offer.status} />
                    </div>
                  ))
                ) : (
                  <p>No offers submitted on this lot yet.</p>
                )}
              </div>

              {/* ADMIN WORKFLOW CONTROLS */}
              <div className="admin-governance-box">
                <h4>Compliance Actions</h4>

                {(!readOnly || canManage) && selectedLot.status === "Pickup scheduled" && (
                  <div className="admin-action-row">
                    <span>
                      <strong>Confirm Collection:</strong> Advances status to <em>Collected</em> after physical pickup handover has occurred.
                    </span>
                    <button
                      className="btn btn-light btn-small"
                      disabled={isDisabled()}
                      onClick={() => runTransition(selectedLot.id, "collected", "Collected")}
                    >
                      {busy(selectedLot.id) ? "Saving…" : "Mark Collected"}
                    </button>
                  </div>
                )}

                {(!readOnly || canManage) && selectedLot.status === "Collected" && (
                  <div className={`evidence-entry ${inlineAdminError.lotId === selectedLot.id && inlineAdminError.field === "evidence" ? "has-error" : ""}`}>
                    <label htmlFor={`evidence-note-${selectedLot.id}`}>
                      Recycling Review Note <span className="req-mark">*</span> (10–500 characters)
                    </label>
                    <textarea
                      id={`evidence-note-${selectedLot.id}`}
                      rows={2}
                      minLength={10}
                      maxLength={500}
                      value={evidenceValue}
                      aria-invalid={inlineAdminError.lotId === selectedLot.id && inlineAdminError.field === "evidence"}
                      onChange={(e) => {
                        setEvidenceDrafts((prev) => ({
                          ...prev,
                          [selectedLot.id]: e.target.value
                        }));
                        setInlineAdminError({ lotId: null, field: null, message: "" });
                      }}
                      placeholder="Summarize facility receiving verification, batch dismantling outcome, and permit reference..."
                    />
                    <div className="field-helper-split">
                      <small className="field-helper">
                        Consequence: Moves lot to <em>Recycling review</em> and attaches this permanent note.
                      </small>
                      <small className={`char-counter ${evidenceValue.trim().length > 0 && evidenceValue.trim().length < 10 ? "warn" : ""}`}>
                        {evidenceValue.trim().length}/500 (min 10)
                      </small>
                    </div>
                    {inlineAdminError.lotId === selectedLot.id && inlineAdminError.field === "evidence" && (
                      <div className="field-inline-error" role="alert">
                        {inlineAdminError.message}
                      </div>
                    )}
                    <button
                      className="btn btn-primary btn-small"
                      disabled={isDisabled()}
                      onClick={() =>
                        runTransition(
                          selectedLot.id,
                          "recycling_review",
                          "Recycling review",
                          evidenceValue,
                          true,
                          "evidence"
                        )
                      }
                    >
                      {busy(selectedLot.id) ? "Saving…" : "Submit for Recycling Review"}
                    </button>
                  </div>
                )}

                {selectedLot.status === "Recycling review" && (
                  <div className="evidence-note">
                    <ShieldCheck size={15} />
                    <div>
                      <strong>Saved Review Note:</strong>
                      <span>{selectedLot.evidence}</span>
                      <small className="action-consequence-note">
                        Consequence: Marking Recycled closes this lot permanently. Ensure weighbridge records match before confirming.
                      </small>
                    </div>
                    {(!readOnly || canManage) && (
                      <button
                        className="btn btn-primary btn-small"
                        disabled={isDisabled()}
                        onClick={() => runTransition(selectedLot.id, "recycled", "Recycled")}
                      >
                        {busy(selectedLot.id) ? "Saving…" : "Mark Recycled"}
                      </button>
                    )}
                  </div>
                )}

                {(!readOnly || canManage) && selectedLot.status === "Recycled" && (
                  <div className="completed-note">
                    <Check size={15} /> Marked recycled in workflow history. Statutory Form-6 documents must be issued by the processing recycler.
                  </div>
                )}

                {(!readOnly || canManage) && disputeStatuses.includes(selectedLot.status) && (
                  <div className={`evidence-entry ${inlineAdminError.lotId === selectedLot.id && inlineAdminError.field === "dispute" ? "has-error" : ""}`}>
                    <label htmlFor={`dispute-note-${selectedLot.id}`}>
                      Flag Discrepancy / Hold Lot (10–500 characters)
                    </label>
                    <textarea
                      id={`dispute-note-${selectedLot.id}`}
                      rows={2}
                      minLength={10}
                      maxLength={500}
                      value={disputeValue}
                      aria-invalid={inlineAdminError.lotId === selectedLot.id && inlineAdminError.field === "dispute"}
                      onChange={(e) => {
                        setDisputeDrafts((prev) => ({
                          ...prev,
                          [selectedLot.id]: e.target.value
                        }));
                        setInlineAdminError({ lotId: null, field: null, message: "" });
                      }}
                      placeholder="Explain the weight discrepancy, missing material, or compliance issue requiring a hold..."
                    />
                    <div className="field-helper-split">
                      <small className="field-helper">
                        Consequence: Freezes offer acceptance and workflow progression until resolved.
                      </small>
                      <small className={`char-counter ${disputeValue.trim().length > 0 && disputeValue.trim().length < 10 ? "warn" : ""}`}>
                        {disputeValue.trim().length}/500 (min 10)
                      </small>
                    </div>
                    {inlineAdminError.lotId === selectedLot.id && inlineAdminError.field === "dispute" && (
                      <div className="field-inline-error" role="alert">
                        {inlineAdminError.message}
                      </div>
                    )}
                    <button
                      className="btn btn-light btn-small"
                      disabled={isDisabled()}
                      onClick={() =>
                        runTransition(
                          selectedLot.id,
                          "disputed",
                          "Disputed",
                          disputeValue,
                          true,
                          "dispute"
                        )
                      }
                    >
                      {busy(selectedLot.id) ? "Saving…" : "Flag for Review"}
                    </button>
                  </div>
                )}

                {(!readOnly || canManage) && selectedLot.status === "Disputed" && (
                  <div className="admin-action-row">
                    <span>
                      <strong>Dispute Hold Active:</strong> Resolving returns the lot to its prior status (<em>{selectedLot.preDisputeStatus || "Open"}</em>) and records the resolution in the audit log.
                    </span>
                    <button
                      className="btn btn-primary btn-small"
                      disabled={isDisabled()}
                      onClick={() => runTransition(selectedLot.id, "resume", selectedLot.preDisputeStatus || "Open")}
                    >
                      {busy(selectedLot.id) ? "Saving…" : "Resolve & Resume Workflow"}
                    </button>
                  </div>
                )}
              </div>

              <TraceabilityTimeline
                lot={selectedLot}
                workflowEvents={traceProps?.workflowEvents || []}
                pickupAppointment={selectedAppointment}
                role="Admin"
              />
            </div>
          ) : (
            <div className="inspector-empty">
              <p>Select a lot from the left to inspect compliance notes and workflow status.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
