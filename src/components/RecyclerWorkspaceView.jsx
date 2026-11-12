import React, { useState } from "react";
import { Activity, ArrowLeft, CameraOff, Filter, Info, MapPin, Search, ShieldCheck, Wallet, X } from "lucide-react";
import {
  EmptyState,
  money,
  OfferStatusPill,
  shortDate,
  StatusPill
} from "./MarketplaceUi.jsx";
import { TraceabilityTimeline } from "./TraceabilityTimeline.jsx";
import { formatWeightDisplay } from "../lib/quantityUnits.js";
import { getLotNextStepGuidance } from "../lib/workflowGuidance.js";

export function RecyclerWorkspaceView({
  lots,
  query,
  setQuery,
  categoryFilter,
  setCategoryFilter,
  locationFilter,
  setLocationFilter,
  statusFilter,
  setStatusFilter,
  categories,
  locations,
  myOffers,
  currentRecyclerId,
  pickupAppointmentsByLot = new Map(),
  workflowEvents = [],
  readOnly = false,
  onOffer
}) {
  const [selectedLotId, setSelectedLotId] = useState(lots[0]?.id || null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const selectedLot = lots.find((l) => l.id === selectedLotId) || lots[0] || null;
  const userOffer = selectedLot?.offers.find((offer) =>
    currentRecyclerId ? offer.recyclerId === currentRecyclerId : offer.recycler === "Demo Recycler"
  );
  const selectedAppointment = selectedLot ? pickupAppointmentsByLot?.get(selectedLot.id) : null;
  const nextGuidance = selectedLot ? getLotNextStepGuidance(selectedLot, selectedAppointment, "Recycler") : null;

  return (
    <section className="panel dashboard-panel">
      <div className="panel-heading">
        <div>
          <h2>Available Material Listings</h2>
          <p>
            {readOnly
              ? "Browse available e-waste lots and submit one offer per lot."
              : "Inspect open listings and submit demo acquisition offers."}
          </p>
        </div>
        <span className={readOnly ? "connected-label" : "demo-label"}>
          {readOnly ? "LIVE RECYCLER" : "DEMO RECYCLER"}
        </span>
      </div>

      <div className="inline-hint">
        <ShieldCheck size={15} />
        <span>
          Locations show approximate industrial or municipal areas. Exact pickup details are shared only after an owner accepts your offer. Note: Lot photos and online payment settlement are not active in this version.
        </span>
      </div>

      <div className="master-detail-workspace">
        {/* MASTER PANE */}
        <div className={`master-pane ${mobileDetailOpen ? "hide-on-mobile" : ""}`}>
          <div className="filters role-filters">
            <div className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search lots, categories, areas..."
                aria-label="Search lots"
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
            <div className="filter-select">
              <Filter size={14} />
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option>All categories</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="filter-select">
              <MapPin size={14} />
              <select
                aria-label="Filter by location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option>All locations</option>
                {locations.map((loc) => (
                  <option key={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="filter-select">
              <Filter size={14} />
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All statuses">All open statuses</option>
                <option value="Open">Open (No bids yet)</option>
                <option value="Offer submitted">Offer submitted</option>
              </select>
            </div>
          </div>

          {lots.length ? (
            <div className="master-list" role="listbox" aria-label="Available lots">
              {lots.map((lot) => {
                const isSelected = selectedLot?.id === lot.id;
                const submitted = lot.offers.some((offer) =>
                  currentRecyclerId
                    ? offer.recyclerId === currentRecyclerId
                    : offer.recycler === "Demo Recycler"
                );
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
                        e.preventDefault();
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
                      <b>{formatWeightDisplay(lot.weight)}</b>
                    </div>
                    <div className="master-row-footer">
                      <span className="location-tag">
                        <MapPin size={12} /> {lot.location}
                      </span>
                      {submitted ? (
                        <span className="bid-placed-tag">Your Offer Placed</span>
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
              title="No matching open lots"
              detail="Adjust your category, area, status, or search filter."
            />
          )}

          {myOffers.length > 0 && (
            <div className="inline-hint my-offers-hint">
              <Activity size={14} /> You have {myOffers.length} submitted{" "}
              {myOffers.length === 1 ? "offer" : "offers"} tracked under &ldquo;My offers&rdquo; (including accepted lots ready for weighment).
            </div>
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
                <StatusPill status={selectedLot.status} />
              </div>

              {nextGuidance && (
                <div className="next-step-guidance-card" role="region" aria-label="Lot evaluation status">
                  <div className="next-step-top">
                    <span className="next-step-badge">
                      <Info size={14} /> {nextGuidance.summary}
                    </span>
                    <span className="responsible-party-pill">
                      Next: <strong>{nextGuidance.responsible}</strong>
                    </span>
                  </div>
                  <p className="next-step-body">{nextGuidance.nextStep}</p>
                </div>
              )}

              <div className="specs-grid">
                <div>
                  <label>Estimated Weight</label>
                  <strong>{formatWeightDisplay(selectedLot.weight)}</strong>
                </div>
                <div>
                  <label>Approximate Area</label>
                  <span>
                    <MapPin size={12} /> {selectedLot.location}
                  </span>
                </div>
                <div>
                  <label>Date Listed</label>
                  <span>{shortDate(selectedLot.date)}</span>
                </div>
                <div>
                  <label>Listed By</label>
                  <span>{selectedLot.collector || "Listing Owner"}</span>
                </div>
              </div>

              <div className="inspector-notes">
                <label>Material Description & Condition Notes</label>
                <p>{selectedLot.notes || "No condition or inventory notes provided by the seller."}</p>
              </div>

              <div className="inline-hint evaluation-limitation-box">
                <CameraOff size={15} />
                <span>
                  <strong>Inspection Limitation:</strong> Lot photos are not supported yet. Base your offer on the stated material description, and verify physical condition and net weight on-site before settlement.
                </span>
              </div>

              <div className="recycler-action-box">
                {userOffer ? (
                  <div className="user-bid-status">
                    <div>
                      <label>Your Submitted Offer</label>
                      <strong className="user-bid-amount">{money(userOffer.price)}</strong>
                    </div>
                    <div>
                      <label>Offer Status</label>
                      <OfferStatusPill status={userOffer.status} />
                    </div>
                    {userOffer.message && <p className="bid-msg-quote">&ldquo;{userOffer.message}&rdquo;</p>}
                    <small className="settlement-disclaimer">
                      Offers are non-binding until accepted. Accepted lots move to &ldquo;My offers&rdquo; for pickup coordination and intake weighing.
                    </small>
                  </div>
                ) : (
                  <div className="bid-cta">
                    <div>
                      <strong>Ready to make an offer on this lot?</strong>
                      <p>Submit one offer per lot. Payments, UPI/NEFT settlement, and transport are arranged directly with the owner after acceptance.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => onOffer(selectedLot)}>
                      <Wallet size={15} /> {readOnly ? "Submit Offer" : "Submit Demo Offer"}
                    </button>
                  </div>
                )}
              </div>

              <TraceabilityTimeline
                lot={selectedLot}
                workflowEvents={workflowEvents}
                pickupAppointment={selectedAppointment}
                role="Recycler"
              />
            </div>
          ) : (
            <div className="inspector-empty">
              <p>Select a lot from the left to inspect material details and submit an offer.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
