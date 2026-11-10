import React, { useState } from "react";
import { Activity, ArrowLeft, Filter, MapPin, Search, ShieldCheck, Wallet, X } from "lucide-react";
import {
  EmptyState,
  money,
  OfferStatusPill,
  shortDate,
  statusOptions,
  StatusPill
} from "./MarketplaceUi.jsx";
import { TraceabilityTimeline } from "./TraceabilityTimeline.jsx";

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
  readOnly = false,
  onOffer
}) {
  const [selectedLotId, setSelectedLotId] = useState(lots[0]?.id || null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const selectedLot = lots.find((l) => l.id === selectedLotId) || lots[0] || null;
  const userOffer = selectedLot?.offers.find((offer) =>
    currentRecyclerId ? offer.recyclerId === currentRecyclerId : offer.recycler === "Demo Recycler"
  );

  return (
    <section className="panel dashboard-panel">
      <div className="panel-heading">
        <div>
          <h2>Available Material Listings</h2>
          <p>
            {readOnly
              ? "Browse verified scrap lots and submit competitive purchase bids."
              : "Inspect open listings and place demo acquisition offers."}
          </p>
        </div>
        <span className={readOnly ? "connected-label" : "demo-label"}>
          {readOnly ? "CONNECTED RECYCLER" : "DEMO RECYCLER"}
        </span>
      </div>

      <div className="inline-hint">
        <ShieldCheck size={15} />
        Listing locations indicate general municipal or industrial areas. After an offer is accepted, the Seller/Collector may propose a pickup appointment.
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
                <option>All statuses</option>
                {statusOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
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
                      {submitted ? (
                        <span className="bid-placed-tag">Bid Submitted</span>
                      ) : (
                        <span className="offers-badge">
                          {lot.offers.length} {lot.offers.length === 1 ? "bid" : "bids"}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No matching lots"
              detail="Adjust your material category, location, or search filters."
            />
          )}

          {myOffers.length > 0 && (
            <div className="inline-hint my-offers-hint">
              <Activity size={14} /> You have {myOffers.length} active{" "}
              {myOffers.length === 1 ? "bid" : "bids"} tracked in the "My offers" workspace.
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

              <div className="specs-grid">
                <div>
                  <label>Available Mass</label>
                  <strong>{selectedLot.weight} kg</strong>
                </div>
                <div>
                  <label>Logistics Hub</label>
                  <span>
                    <MapPin size={12} /> {selectedLot.location}
                  </span>
                </div>
                <div>
                  <label>Posted Date</label>
                  <span>{shortDate(selectedLot.date)}</span>
                </div>
                <div>
                  <label>Listed By</label>
                  <span>{selectedLot.collector}</span>
                </div>
              </div>

              <div className="inspector-notes">
                <label>Inventory & Quality Notes</label>
                <p>{selectedLot.notes || "No additional technical notes provided by the lister."}</p>
              </div>

              <TraceabilityTimeline
                lot={selectedLot}
                workflowEvents={[]}
                pickupAppointment={null}
                role="Recycler"
              />

              <div className="recycler-action-box">
                {userOffer ? (
                  <div className="user-bid-status">
                    <div>
                      <label>Your Submitted Bid</label>
                      <strong className="user-bid-amount">{money(userOffer.price)}</strong>
                    </div>
                    <div>
                      <label>Bid Status</label>
                      <OfferStatusPill status={userOffer.status} />
                    </div>
                    {userOffer.message && <p className="bid-msg-quote">"{userOffer.message}"</p>}
                  </div>
                ) : (
                  <div className="bid-cta">
                    <div>
                      <strong>Ready to acquire this material?</strong>
                      <p>Submit a firm unit offer. Sellers review bids before confirming pickup.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => onOffer(selectedLot)}>
                      <Wallet size={15} /> {readOnly ? "Submit Purchase Offer" : "Submit Demo Bid"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="inspector-empty">
              <p>Select a consignment from the left to inspect material specifications and submit an offer.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

