import React, { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Compass,
  Edit3,
  Filter,
  Layers,
  MapPin,
  Package,
  Plus,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
  X,
  Zap
} from "lucide-react";
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

export function CollectorWorkspaceView({
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
  role = "Collector",
  LotTraceActions,
  PickupCoordination,
  availableSellerScrap = [],
  onClaimScrap = null,
  collectionWork = []
}) {
  const [activeTab, setActiveTab] = useState("consignments"); // 'consignments' | 'upstream_discovery' | 'collection_work'
  const [selectedLotId, setSelectedLotId] = useState(lots[0]?.id || null);
  const [selectedScrapId, setSelectedScrapId] = useState(availableSellerScrap[0]?.id || null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [claimModalScrap, setClaimModalScrap] = useState(null);
  const [claimPickupDate, setClaimPickupDate] = useState("");
  const [claimRate, setClaimRate] = useState("");
  const [claimNote, setClaimNote] = useState("");
  const [claimSuccessMsg, setClaimSuccessMsg] = useState("");

  const selectedLot = lots.find((l) => l.id === selectedLotId) || lots[0] || null;
  const selectedScrap = availableSellerScrap.find((s) => s.id === selectedScrapId) || availableSellerScrap[0] || null;

  React.useEffect(() => {
    if (!claimModalScrap) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setClaimModalScrap(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [claimModalScrap]);

  const handleClaimSubmit = (e) => {
    e.preventDefault();
    if (onClaimScrap && claimModalScrap) {
      onClaimScrap(claimModalScrap.id, {
        pickupDate: claimPickupDate,
        proposedRate: claimRate,
        note: claimNote
      });
      setClaimSuccessMsg(`Collection proposal submitted for ${claimModalScrap.title}. Staged in My Collection Work.`);
      setTimeout(() => {
        setClaimSuccessMsg("");
        setClaimModalScrap(null);
      }, 1800);
    } else {
      setClaimModalScrap(null);
    }
  };

  return (
    <section className="panel dashboard-panel collector-workspace-view">
      <div className="panel-heading">
        <div>
          <h2>Consignment Ledger & Scrap Lots</h2>
          <p>
            {readOnly
              ? "Manage aggregated scrap lots, evaluate incoming recycler bids, and coordinate handover logistics."
              : "Review offers, accept or reject recycler bids, and manage consignment lots."}
          </p>
        </div>
        <span className={readOnly ? "connected-label" : "demo-label"}>
          {readOnly ? "CONNECTED COLLECTOR" : "DEMO COLLECTOR"}
        </span>
      </div>

      <div className="inline-hint collector-operational-hint">
        <ShieldCheck size={15} />
        <span>
          Consolidation Hub: Aggregate material streams into consignment lots, review commercial bids from recyclers, and coordinate verified handover logistics.
        </span>
      </div>

      {/* THREE-WAY SEGMENTED WORKSPACE SWITCHER */}
      <div className="collector-tab-nav" role="tablist" aria-label="Collector workspace modes">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "consignments"}
          className={`collector-tab-btn ${activeTab === "consignments" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("consignments");
            setMobileDetailOpen(false);
          }}
        >
          <Layers size={15} />
          <span>My Aggregated Consignments</span>
          <span className="tab-count-badge">{lots.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "upstream_discovery"}
          className={`collector-tab-btn ${activeTab === "upstream_discovery" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("upstream_discovery");
            setMobileDetailOpen(false);
          }}
        >
          <Compass size={15} />
          <span>Available Seller Scrap</span>
          <span className="tab-count-badge">{readOnly ? "Live RLS" : availableSellerScrap.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "collection_work"}
          className={`collector-tab-btn ${activeTab === "collection_work" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("collection_work");
            setMobileDetailOpen(false);
          }}
        >
          <Truck size={15} />
          <span>My Collection Work</span>
          <span className="tab-count-badge">{collectionWork.length}</span>
        </button>
      </div>

      {/* VIEW 1: MY CONSIGNMENTS (STANDARD COLLECTOR LOTS) */}
      {activeTab === "consignments" && (
        <div className="master-detail-workspace">
          {/* MASTER LIST PANE */}
          <div className={`master-pane ${mobileDetailOpen ? "hide-on-mobile" : ""}`}>
            <div className="filters role-filters">
              <div className="search-box">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by ID, title, or area..."
                  aria-label="Search my lots"
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
                    aria-label="Filter lots by status"
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
              <div className="master-list" role="listbox" aria-label="Consignment lots">
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
              <EmptyState
                title={query ? "No matching lots" : "No consignments listed"}
                detail={query ? "Try a different search term or status filter." : "Post an aggregated scrap lot to start receiving bids from recyclers."}
                action={
                  !query ? (
                    <button className="btn btn-primary" onClick={onAdd}>
                      <Plus size={16} /> {readOnly ? "Create Lot" : "Create first lot"}
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
                        <Edit3 size={13} /> Edit Lot
                      </button>
                    ) : selectedLot.status === "Offer submitted" ? (
                      <span className="offers-badge" title="Lot specifications are locked while active bids are pending. Reject bids to reopen and revise.">
                        Revisions locked (bids pending)
                      </span>
                    ) : (
                      <span className="offers-badge">
                        Lot locked ({statusLabel(selectedLot.status)})
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
                    <label>Consolidation Area</label>
                    <span>
                      <MapPin size={12} /> {selectedLot.location}
                    </span>
                  </div>
                  <div>
                    <label>Ingest Date</label>
                    <span>{shortDate(selectedLot.date)}</span>
                  </div>
                  <div>
                    <label>Lister / Aggregator</label>
                    <span>{selectedLot.collector}</span>
                  </div>
                </div>

                {selectedLot.notes && (
                  <div className="inspector-notes">
                    <label>Consolidation Specifications & Inventory Notes</label>
                    <p>{selectedLot.notes}</p>
                  </div>
                )}

                {/* TRACEABILITY TIMELINE PIPELINE */}
                <TraceabilityTimeline
                  lot={selectedLot}
                  workflowEvents={traceProps?.workflowEvents || []}
                  pickupAppointment={pickupAppointmentsByLot?.get(selectedLot.id)}
                  role="Collector"
                />

                {LotTraceActions && (
                  <LotTraceActions
                    lot={selectedLot}
                    mode={readOnly ? "collector" : "info"}
                    available={traceabilityAvailable}
                    onDispute={traceProps?.onDispute}
                  />
                )}

                {selectedLot.status === "Pickup scheduled" &&
                  selectedLot.offers.some((offer) => offer.status === "accepted") &&
                  PickupCoordination && (
                    <PickupCoordination
                      role="collector"
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

                {/* OFFERS LEDGER */}
                <div className="offers-section">
                  <div className="offers-heading">
                    <strong>Offers Ledger ({selectedLot.offers.length})</strong>
                    <span>Compare recycler bids before deciding</span>
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
                                <small>{offer.message || "No commercial message attached."}</small>
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
                                  {decisionBusyOfferId === offer.id ? "Saving…" : "Accept Bid"}
                                </button>
                              </div>
                            ) : null}
                          </article>
                        ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No bids received yet"
                      detail="Incoming bids from authorized recyclers will appear here for comparison."
                      compact
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="inspector-empty">
                <p>Select a consignment from the left to inspect details, review bids, or coordinate pickup.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: UPSTREAM SELLER SCRAP DISCOVERY */}
      {activeTab === "upstream_discovery" && (
        <div className="upstream-discovery-pane">
          {readOnly ? (
            <div className="honest-compliance-box">
              <div className="compliance-icon-wrap">
                <ShieldAlert size={28} className="text-amber" />
              </div>
              <div className="compliance-copy">
                <h3>Live Upstream Seller Intake Requires Tier-1 RLS Authorization</h3>
                <p>
                  Under currently deployed Supabase policies, authenticated Collectors are scoped strictly to rows where <code>collector_id = auth.uid()</code>.
                </p>
                <p>
                  Direct cross-seller listing reads are intentionally rejected by PostgreSQL RLS to protect household PII until the reviewed <code>seller_listings</code> and <code>collection_claims</code> migration is applied.
                </p>
                <div className="compliance-meta-note">
                  <span>DEPLOYED POLICY: <code>lots_read_per_role</code></span>
                  <span>STATUS: HONESTLY ISOLATED (NO FAKE LIVE DATA)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="master-detail-workspace">
              {/* DISCOVERY LIST */}
              <div className="master-pane">
                <div className="discovery-feed-header">
                  <div>
                    <strong>Available Upstream Seller Scrap ({availableSellerScrap.length})</strong>
                    <p>Verified generator listings ready for aggregator pickup claims:</p>
                  </div>
                </div>

                <div className="master-list" role="listbox" aria-label="Available seller scrap">
                  {availableSellerScrap.map((scrap) => {
                    const isSelected = selectedScrap?.id === scrap.id;
                    return (
                      <article
                        key={scrap.id}
                        className={`master-row ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedScrapId(scrap.id)}
                        tabIndex={0}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="master-row-header">
                          <strong className="master-row-title">{scrap.title}</strong>
                          <span className="status-pill open">
                            <span /> Open for Claim
                          </span>
                        </div>
                        <div className="master-row-sub">
                          <span>{scrap.id} · {scrap.category}</span>
                          <b>{scrap.weight} kg</b>
                        </div>
                        <div className="master-row-footer">
                          <span className="location-tag">
                            <MapPin size={12} /> {scrap.location}
                          </span>
                          <span className="seller-name-tag">{scrap.seller || "Generator"}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* DISCOVERY DETAIL */}
              <div className="detail-pane">
                {selectedScrap ? (
                  <div className="inspector-content">
                    <div className="inspector-header">
                      <div>
                        <span className="inspector-eyebrow">UPSTREAM INTAKE · {selectedScrap.id}</span>
                        <h3>{selectedScrap.title}</h3>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={() => setClaimModalScrap(selectedScrap)}
                      >
                        <Zap size={14} /> Propose Collection Claim
                      </button>
                    </div>

                    <div className="specs-grid">
                      <div>
                        <label>Estimated Weight</label>
                        <strong>{selectedScrap.weight} kg</strong>
                      </div>
                      <div>
                        <label>General Area</label>
                        <span><MapPin size={12} /> {selectedScrap.location}</span>
                      </div>
                      <div>
                        <label>Category</label>
                        <span>{selectedScrap.category}</span>
                      </div>
                      <div>
                        <label>Generator / Entity</label>
                        <span>{selectedScrap.seller || "Commercial Generator"}</span>
                      </div>
                    </div>

                    <div className="inspector-notes">
                      <label>Scrap Specifications & Access Terms</label>
                      <p>{selectedScrap.notes || "Standard industrial e-waste batch; ready for on-site weighing and handover."}</p>
                    </div>

                    <div className="intake-verification-card">
                      <div className="intake-card-top">
                        <Scale size={18} />
                        <strong>On-Site Collection Verification Rules</strong>
                      </div>
                      <ul>
                        <li>Collector must bring portable platform scale to pickup site.</li>
                        <li>Handover OTP must be validated against seller's terminal before loading vehicle.</li>
                        <li>Intake weight establishes initial inventory balance for consignment aggregation.</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="inspector-empty">
                    <p>Select an upstream scrap listing to inspect terms and propose collection.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: MY COLLECTION WORK */}
      {activeTab === "collection_work" && (
        <div className="collection-work-pane">
          <div className="collection-work-header">
            <div>
              <strong>Active Intake & Staged Collection Batches ({collectionWork.length})</strong>
              <p>Scrap lots claimed from sellers currently being scheduled, picked up, or staged for consignment bundling:</p>
            </div>
          </div>

          {collectionWork.length ? (
            <div className="collection-work-grid">
              {collectionWork.map((item) => (
                <div key={item.id} className="collection-work-card">
                  <div className="work-card-top">
                    <div>
                      <span className="inspector-eyebrow">{item.id} · {item.category}</span>
                      <h4>{item.title}</h4>
                    </div>
                    <span className="status-pill pickup-scheduled">
                      <span /> {item.status || "Claim Staged"}
                    </span>
                  </div>
                  <div className="work-card-specs">
                    <div><span>Estimated:</span> <b>{item.weight} kg</b></div>
                    <div><span>Location:</span> <b>{item.location}</b></div>
                    <div><span>Target Window:</span> <b>{item.pickupDate || "Next 48 Hours"}</b></div>
                  </div>
                  <div className="work-card-foot">
                    <span className="badge-demo-note">Staged in Collector Inventory</span>
                    <button
                      type="button"
                      className="btn btn-light btn-small"
                      onClick={() => alert(`In production, this initiates the on-site OTP verification and scale weight recording for lot ${item.id}.`)}
                    >
                      <Scale size={13} /> Verify Intake Weight
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active collection batches"
              detail="Claim open upstream scrap from the 'Available Seller Scrap' tab to stage pickups."
              compact
            />
          )}
        </div>
      )}

      {/* CLAIM SUBMISSION MODAL */}
      {claimModalScrap && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setClaimModalScrap(null); }}>
          <div className="modal modal-narrow">
            <div className="modal-header">
              <div>
                <span className="eyebrow">DEMO COLLECTION CLAIM</span>
                <h2>Propose Collection Terms</h2>
                <p>{claimModalScrap.title} · {claimModalScrap.weight} kg estimated</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setClaimModalScrap(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="form-grid">
              <label className="full">
                Target Pickup Window
                <input
                  type="date"
                  required
                  value={claimPickupDate}
                  onChange={(e) => setClaimPickupDate(e.target.value)}
                />
              </label>

              <label className="full">
                Proposed Payout Rate (₹/kg or Lump Sum)
                <input
                  type="number"
                  placeholder="e.g. 45"
                  value={claimRate}
                  onChange={(e) => setClaimRate(e.target.value)}
                />
              </label>

              <label className="full">
                Logistics & Scale Notes
                <textarea
                  rows="2"
                  placeholder="e.g. 300kg platform scale vehicle dispatch."
                  value={claimNote}
                  onChange={(e) => setClaimNote(e.target.value)}
                />
              </label>

              {claimSuccessMsg && (
                <div className="form-success full">
                  <CheckCircle2 size={15} /> {claimSuccessMsg}
                </div>
              )}

              <div className="modal-actions full">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setClaimModalScrap(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
