import React, { useState } from "react";
import { ArrowLeft, Check, MapPin, Search, ShieldCheck } from "lucide-react";
import {
  EmptyState,
  money,
  OfferStatusPill,
  ProgressTrack,
  shortDate,
  statusOptions,
  StatusPill
} from "./MarketplaceUi.jsx";
import { TraceabilityTimeline } from "./TraceabilityTimeline.jsx";

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

  const selectedLot = lots.find((l) => l.id === selectedLotId) || lots[0] || null;

  const runTransition = (lotId, nextStatus, demoStatus, note = "") =>
    readOnly
      ? onConnectedTransition(lotId, nextStatus, demoStatus, note)
      : onTransition(lotId, demoStatus, note);

  const busy = (lotId) => Boolean(busyLotId) && busyLotId === lotId;
  const disabled = () => Boolean(busyLotId);
  const disputeStatuses = ["Open", "Offer submitted", "Pickup scheduled", "Collected", "Recycling review"];

  return (
    <section className="panel dashboard-panel">
      <div className="panel-heading">
        <div>
          <h2>Marketplace Audit & Workflow Governance</h2>
          <p>
            {readOnly
              ? "Oversee compliance, audit recycling evidence notes, and execute authorized transitions via RPC."
              : "Simulate administrative verification, dispute flags, and certified recycling transitions."}
          </p>
        </div>
        <span className={readOnly ? "connected-label warning" : "demo-label warning"}>
          {readOnly ? "CONNECTED ADMIN · RPC GOVERNED" : "ADMIN AUDIT · LOCAL DEMO"}
        </span>
      </div>

      <div className="admin-callout">
        <ShieldCheck size={16} />
        <span>
          {readOnly
            ? "Workflow advancements and recycling review declarations are checked by database RPCs and audit triggers."
            : "Demo administrative actions simulate compliance progression and evidence verification."}
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
                placeholder="Filter all lots by ID, area, title..."
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

          <div className="filters role-filters">
            <div className="filter-select full-width">
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>All statuses</option>
                {statusOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {lots.length ? (
            <div className="master-list" role="listbox" aria-label="All lots">
              {lots.map((lot) => {
                const isSelected = selectedLot?.id === lot.id;
                return (
                  <article
                    key={lot.id}
                    className={`master-row ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedLotId(lot.id);
                      setMobileDetailOpen(true);
                    }}
                    tabIndex={0}
                    role="option"
                    aria-selected={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelectedLotId(lot.id);
                        setMobileDetailOpen(true);
                      }
                    }}
                  >
                    <div className="master-row-header">
                      <strong className="master-row-title">{lot.title}</strong>
                      <StatusPill status={lot.status} />
                    </div>
                    <div className="master-row-sub">
                      <span>{lot.id} · {lot.category}</span>
                      <b>{lot.weight} kg</b>
                    </div>
                    <div className="master-row-footer">
                      <span className="location-tag">
                        <MapPin size={12} /> {lot.location}
                      </span>
                      <span className="offers-badge">
                        {lot.offers.length} {lot.offers.length === 1 ? "bid" : "bids"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No lots match filters" detail="Clear or adjust status and search filters." />
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
                  <ArrowLeft size={14} /> Back to listings
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

              <div className="specs-grid">
                <div>
                  <label>Consignment Owner</label>
                  <strong>{selectedLot.collector}</strong>
                </div>
                <div>
                  <label>Mass</label>
                  <span>{selectedLot.weight} kg</span>
                </div>
                <div>
                  <label>Location Hub</label>
                  <span>
                    <MapPin size={12} /> {selectedLot.location}
                  </span>
                </div>
                <div>
                  <label>Creation Date</label>
                  <span>{shortDate(selectedLot.date)}</span>
                </div>
              </div>

              <div className="workflow-progress">
                <span>Chain of Custody Progress</span>
                <ProgressTrack status={selectedLot.status} />
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

              {pickupAppointmentsByLot.get(selectedLot.id) && (
                <div className="pickup-summary">
                  <strong>
                    Pickup appointment ·{" "}
                    {pickupAppointmentsByLot.get(selectedLot.id).status.replaceAll("_", " ")}
                  </strong>
                  <span>
                    {new Date(
                      pickupAppointmentsByLot.get(selectedLot.id).scheduledAt
                    ).toLocaleString()}{" "}
                    · Participant coordination record
                  </span>
                </div>
              )}

              {/* OFFERS SUMMARY */}
              <div className="admin-offers">
                <strong>Bids Ledger ({selectedLot.offers.length})</strong>
                {selectedLot.offers.length ? (
                  selectedLot.offers.map((offer) => (
                    <div className="admin-offer-row" key={offer.id}>
                      <span>
                        <strong>{offer.recycler}</strong>
                        <small>{offer.message || "No commercial note."}</small>
                      </span>
                      <b>{money(offer.price)}</b>
                      <OfferStatusPill status={offer.status} />
                    </div>
                  ))
                ) : (
                  <p>No bids placed on this lot yet.</p>
                )}
              </div>

              <TraceabilityTimeline
                lot={selectedLot}
                workflowEvents={[]}
                pickupAppointment={pickupAppointmentsByLot?.get(selectedLot.id)}
                role="Admin"
              />

              {/* ADMIN WORKFLOW CONTROLS */}
              <div className="admin-governance-box">
                <h4>Compliance & Stage Advancement</h4>

                {(!readOnly || canManage) && selectedLot.status === "Pickup scheduled" && (
                  <div className="admin-action-row">
                    <span>Confirm physical handover and mark consignment collected.</span>
                    <button
                      className="btn btn-light btn-small"
                      disabled={disabled(selectedLot.id)}
                      onClick={() => runTransition(selectedLot.id, "collected", "Collected")}
                    >
                      {busy(selectedLot.id) ? "Saving…" : "Mark Collected"}
                    </button>
                  </div>
                )}

                {(!readOnly || canManage) && selectedLot.status === "Collected" && (
                  <div className="evidence-entry">
                    <label>
                      Recycling Review & Destruction Note (10–500 characters required)
                      <textarea
                        rows={2}
                        minLength={10}
                        maxLength={500}
                        value={evidenceDrafts[selectedLot.id] || ""}
                        onChange={(e) =>
                          setEvidenceDrafts((prev) => ({
                            ...prev,
                            [selectedLot.id]: e.target.value
                          }))
                        }
                        placeholder="Detail the recycling facility, permit, and dismantling notes..."
                      />
                    </label>
                    <button
                      className="btn btn-primary btn-small"
                      disabled={disabled(selectedLot.id)}
                      onClick={() =>
                        runTransition(
                          selectedLot.id,
                          "recycling_review",
                          "Recycling review",
                          evidenceDrafts[selectedLot.id] || ""
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
                      <strong>Evidence on file:</strong>
                      <span>{selectedLot.evidence}</span>
                    </div>
                    {(!readOnly || canManage) && (
                      <button
                        className="btn btn-primary btn-small"
                        disabled={disabled(selectedLot.id)}
                        onClick={() => runTransition(selectedLot.id, "recycled", "Recycled")}
                      >
                        {busy(selectedLot.id) ? "Saving…" : "Mark Recycled"}
                      </button>
                    )}
                  </div>
                )}

                {(!readOnly || canManage) && selectedLot.status === "Recycled" && (
                  <div className="completed-note">
                    <Check size={15} /> Marked verified recycled in the chain of custody.
                  </div>
                )}

                {canManage && disputeStatuses.includes(selectedLot.status) && (
                  <div className="evidence-entry">
                    <label>
                      Flag Discrepancy / Open Dispute (10–500 characters)
                      <textarea
                        rows={2}
                        minLength={10}
                        maxLength={500}
                        value={disputeDrafts[selectedLot.id] || ""}
                        onChange={(e) =>
                          setDisputeDrafts((prev) => ({
                            ...prev,
                            [selectedLot.id]: e.target.value
                          }))
                        }
                        placeholder="Explain why this lot requires administrative pause or investigation..."
                      />
                    </label>
                    <button
                      className="btn btn-light btn-small"
                      disabled={disabled(selectedLot.id)}
                      onClick={() =>
                        runTransition(
                          selectedLot.id,
                          "disputed",
                          "Disputed",
                          disputeDrafts[selectedLot.id] || ""
                        )
                      }
                    >
                      {busy(selectedLot.id) ? "Saving…" : "Flag for Review"}
                    </button>
                  </div>
                )}

                {canManage && selectedLot.status === "Disputed" && (
                  <div className="admin-action-row">
                    <span>Workflow paused under dispute review. The previous status is preserved.</span>
                    <button
                      className="btn btn-light btn-small"
                      disabled={disabled(selectedLot.id)}
                      onClick={() => runTransition(selectedLot.id, "resume", "Open")}
                    >
                      {busy(selectedLot.id) ? "Saving…" : "Resolve & Resume Workflow"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="inspector-empty">
              <p>Select a consignment from the left to audit compliance and govern workflow steps.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

