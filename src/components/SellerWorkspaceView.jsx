import React, { useState } from "react";
import { ArrowLeft, Edit3, Filter, MapPin, Plus, Search, ShieldCheck, X } from "lucide-react";
import {
  EmptyState,
  money,
  OfferStatusPill,
  ProgressTrack,
  shortDate,
  statusLabel,
  statusOptions,
  StatusPill
} from "./MarketplaceUi.jsx";
import { TraceabilityTimeline } from "./TraceabilityTimeline.jsx";

export function SellerWorkspaceView({
  lots,
  allLotCount,
  query,
  setQuery,
  statusFilter = "All statuses",
  setStatusFilter,
  onAdd,
  onEdit,
  onDecision,
  decisionBusyOfferId,
  pickupAppointmentsByLot,
  pickupCoordinationAvailable,
  pickupBusyLotId,
  onProposePickup,
  traceProps,
  traceabilityAvailable,
  readOnly = false,
  role = "Seller",
  LotTraceActions,
  PickupCoordination
}) {
  const [selectedLotId, setSelectedLotId] = useState(lots[0]?.id || null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const selectedLot = lots.find((l) => l.id === selectedLotId) || lots[0] || null;

  return (
    <section className="panel dashboard-panel seller-workspace-view">
      <div className="panel-heading">
        <div>
          <h2>My E-Waste Listings</h2>
          <p>
            {readOnly
              ? "Manage your electronic scrap listings, review incoming recycler offers, and coordinate pickup appointments."
              : "Review offers, accept or reject recycler bids, and revise open listings."}
          </p>
        </div>
        <span className={readOnly ? "connected-label" : "demo-label"}>
          {readOnly ? "CONNECTED SELLER" : "DEMO SELLER"}
        </span>
      </div>

      <div className="inline-hint seller-guidance-hint">
        <ShieldCheck size={15} />
        <span>
          Your scrap listings are visible to authorized recyclers. Contact details and exact addresses remain private. Review bids, accept an offer, and coordinate pickup when ready.
        </span>
      </div>

      <div className="master-detail-workspace">
        {/* MASTER LIST PANE */}
        <div className={`master-pane ${mobileDetailOpen ? "hide-on-mobile" : ""}`}>
          <div className="filters role-filters">
            <div className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search my listings by title, ID, area..."
                aria-label="Search my listings"
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
            {setStatusFilter && (
              <div className="filter-select">
                <Filter size={14} />
                <select
                  aria-label="Filter listings by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option>All statuses</option>
                  {statusOptions.map((st) => (
                    <option key={st} value={st}>
                      {statusLabel(st)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <span className="filters-note">
              {lots.length} of {allLotCount}
            </span>
          </div>

          {lots.length ? (
            <div className="master-list" role="listbox" aria-label="Seller listings">
              {lots.map((lot) => {
                const isSelected = selectedLot?.id === lot.id;
                const pendingBids = lot.offers.filter((o) => o.status === "pending").length;
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
                      <span className={`offers-badge ${pendingBids > 0 ? "has-pending" : ""}`}>
                        {lot.offers.length === 0
                          ? "Awaiting offers"
                          : `${lot.offers.length} ${lot.offers.length === 1 ? "offer" : "offers"}`}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={query ? "No matching listings" : "No scrap listings yet"}
              detail={
                query
                  ? "Try a different search term or status filter."
                  : "Post an e-waste listing to start receiving acquisition offers from recyclers."
              }
              action={
                !query ? (
                  <button className="btn btn-primary" onClick={onAdd}>
                    <Plus size={16} /> {readOnly ? "Create Listing" : "Add listing"}
                  </button>
                ) : null
              }
            />
          )}
        </div>

        {/* DETAIL INSPECTOR PANE */}
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
                <div className="inspector-header-actions">
                  <StatusPill status={selectedLot.status} />
                  {selectedLot.status === "Open" ? (
                    <button
                      type="button"
                      className="btn btn-light btn-small edit-lot-btn"
                      onClick={() => onEdit(selectedLot)}
                      title="Edit this listing"
                    >
                      <Edit3 size={13} /> Edit Listing
                    </button>
                  ) : selectedLot.status === "Offer submitted" ? (
                    <span
                      className="offers-badge"
                      title="Listing specifications are locked while active bids are pending. Reject bids to reopen and revise."
                    >
                      Revisions locked (bids pending)
                    </span>
                  ) : (
                    <span className="offers-badge">
                      Listing locked ({statusLabel(selectedLot.status)})
                    </span>
                  )}
                </div>
              </div>

              <div className="specs-grid">
                <div>
                  <label>Declared Weight</label>
                  <strong>{selectedLot.weight} kg</strong>
                </div>
                <div>
                  <label>Pickup Location</label>
                  <span>
                    <MapPin size={12} /> {selectedLot.location}
                  </span>
                </div>
                <div>
                  <label>Date Listed</label>
                  <span>{shortDate(selectedLot.date)}</span>
                </div>
                <div>
                  <label>Current Status</label>
                  <span>{statusLabel(selectedLot.status)}</span>
                </div>
              </div>

              {selectedLot.notes && (
                <div className="inspector-notes">
                  <label>Listing Specifications & Notes</label>
                  <p>{selectedLot.notes}</p>
                </div>
              )}

              <div className="workflow-progress">
                <span>Disposal & Recycling Progress</span>
                <strong>{statusLabel(selectedLot.status)}</strong>
                <ProgressTrack status={selectedLot.status} />
              </div>

              <TraceabilityTimeline
                lot={selectedLot}
                workflowEvents={traceProps?.workflowEvents || []}
                pickupAppointment={pickupAppointmentsByLot?.get(selectedLot.id)}
                role="Seller"
              />

              {/* Sellers do NOT record handover weight (Recycler action), but CAN dispute eligible statuses */}
              {LotTraceActions && (
                <LotTraceActions
                  lot={selectedLot}
                  mode={readOnly ? "seller" : "info"}
                  available={traceabilityAvailable}
                  onDispute={traceProps?.onDispute}
                />
              )}

              {selectedLot.status === "Pickup scheduled" &&
                selectedLot.offers.some((offer) => offer.status === "accepted") &&
                PickupCoordination && (
                  <PickupCoordination
                    role="seller"
                    lot={selectedLot}
                    appointment={pickupAppointmentsByLot.get(selectedLot.id)}
                    available={pickupCoordinationAvailable}
                    busy={pickupBusyLotId === selectedLot.id}
                    connected={readOnly}
                    onPropose={onProposePickup}
                  />
                )}

              {selectedLot.status === "Recycling review" && selectedLot.evidence && (
                <div className="evidence-note">
                  <ShieldCheck size={15} />
                  <div>
                    <strong>
                      {readOnly ? "Verified Evidence/Review Note" : "Demo Evidence Record"}
                    </strong>
                    <span>{selectedLot.evidence}</span>
                  </div>
                </div>
              )}

              {/* OFFERS SECTION */}
              <div className="offers-section">
                <div className="offers-heading">
                  <strong>Incoming Recycler Offers ({selectedLot.offers.length})</strong>
                  <span>Compare offers from certified recyclers before accepting</span>
                </div>

                {selectedLot.offers.length ? (
                  <div className="offer-ledger-list">
                    {selectedLot.offers
                      .slice()
                      .sort((a, b) => b.price - a.price)
                      .map((offer) => (
                        <article className={`offer-ledger-item ${offer.status}`} key={offer.id}>
                          <div className="offer-ledger-top">
                            <div>
                              <strong>{offer.recycler}</strong>
                              <small>{offer.message || "No commercial terms attached."}</small>
                            </div>
                            <div className="offer-price-col">
                              <span className="offer-price">{money(offer.price)}</span>
                              <OfferStatusPill status={offer.status} />
                            </div>
                          </div>

                          {offer.status === "pending" && selectedLot.status === "Offer submitted" ? (
                            <div className="offer-actions">
                              <button
                                className="btn btn-light btn-small"
                                disabled={Boolean(decisionBusyOfferId)}
                                onClick={() => onDecision(selectedLot.id, offer.id, "rejected")}
                              >
                                {decisionBusyOfferId === offer.id ? "Saving…" : "Reject"}
                              </button>
                              <button
                                className="btn btn-primary btn-small"
                                disabled={Boolean(decisionBusyOfferId)}
                                onClick={() => onDecision(selectedLot.id, offer.id, "accepted")}
                              >
                                {decisionBusyOfferId === offer.id ? "Saving…" : "Accept Offer"}
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No offers received yet"
                    detail="Incoming acquisition bids from authorized recyclers will appear here for comparison."
                    compact
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="inspector-empty">
              <p>Select a listing from the left to inspect specifications, review recycler bids, or coordinate pickup.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

