import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  Edit3,
  Filter,
  Info,
  Layers,
  MapPin,
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
  shortDate,
  statusLabel,
  statusOptions,
  StatusPill
} from "./MarketplaceUi.jsx";
import { TraceabilityTimeline } from "./TraceabilityTimeline.jsx";
import { DiscardChangesBanner } from "./DiscardChangesBanner.jsx";
import { formatWeightDisplay } from "../lib/quantityUnits.js";
import { getLotNextStepGuidance } from "../lib/workflowGuidance.js";

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
  // In demo mode, make Available Pickups prominent while defaulting connected accounts to their active Consignment Lots
  const [activeTab, setActiveTab] = useState(readOnly ? "consignments" : "upstream_discovery");
  const [selectedLotId, setSelectedLotId] = useState(lots[0]?.id || null);
  const [selectedScrapId, setSelectedScrapId] = useState(availableSellerScrap[0]?.id || null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Upstream pickup search & category filter state
  const [pickupQuery, setPickupQuery] = useState("");
  const [pickupCategory, setPickupCategory] = useState("All categories");

  // Claim modal & unsaved changes state
  const [claimModalScrap, setClaimModalScrap] = useState(null);
  const [claimPickupDate, setClaimPickupDate] = useState("");
  const [claimRate, setClaimRate] = useState("");
  const [claimNote, setClaimNote] = useState("");
  const [claimError, setClaimError] = useState("");
  const [claimSuccessMsg, setClaimSuccessMsg] = useState("");
  const [confirmClaimDiscard, setConfirmClaimDiscard] = useState(false);

  // Honest explanation modal for unavailable physical intake verification
  const [intakeInfoItem, setIntakeInfoItem] = useState(null);

  const pickupCategories = useMemo(
    () => [...new Set(availableSellerScrap.map((s) => s.category).filter(Boolean))].sort(),
    [availableSellerScrap]
  );

  const filteredPickups = useMemo(() => {
    const q = pickupQuery.trim().toLowerCase();
    return availableSellerScrap.filter((scrap) => {
      const matchesQuery =
        !q ||
        `${scrap.id} ${scrap.title} ${scrap.category} ${scrap.location} ${scrap.seller || ""}`
          .toLowerCase()
          .includes(q);
      const matchesCategory =
        pickupCategory === "All categories" || scrap.category === pickupCategory;
      return matchesQuery && matchesCategory;
    });
  }, [availableSellerScrap, pickupQuery, pickupCategory]);

  const selectedLot = lots.find((l) => l.id === selectedLotId) || lots[0] || null;
  const selectedScrap =
    filteredPickups.find((s) => s.id === selectedScrapId) || filteredPickups[0] || null;
  const selectedAppointment = selectedLot ? pickupAppointmentsByLot?.get(selectedLot.id) : null;
  const nextGuidance = selectedLot
    ? getLotNextStepGuidance(selectedLot, selectedAppointment, "Collector")
    : null;

  const isClaimDirty = Boolean(claimPickupDate || claimRate || claimNote);

  const closeClaimModalImmediate = () => {
    setClaimModalScrap(null);
    setClaimPickupDate("");
    setClaimRate("");
    setClaimNote("");
    setClaimError("");
    setClaimSuccessMsg("");
    setConfirmClaimDiscard(false);
  };

  const requestCloseClaimModal = () => {
    if (isClaimDirty && !claimSuccessMsg && !confirmClaimDiscard) {
      setConfirmClaimDiscard(true);
      return;
    }
    closeClaimModalImmediate();
  };

  React.useEffect(() => {
    if (!claimModalScrap && !intakeInfoItem) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (intakeInfoItem) {
          setIntakeInfoItem(null);
          return;
        }
        if (claimModalScrap) {
          if (isClaimDirty && !claimSuccessMsg && !confirmClaimDiscard) {
            setConfirmClaimDiscard(true);
          } else {
            closeClaimModalImmediate();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [claimModalScrap, intakeInfoItem, isClaimDirty, claimSuccessMsg, confirmClaimDiscard]);

  const handleClaimSubmit = (e) => {
    e.preventDefault();
    if (!claimPickupDate) {
      setClaimError("Choose a target pickup date.");
      return;
    }
    if (claimRate && (!Number.isFinite(Number(claimRate)) || Number(claimRate) <= 0)) {
      setClaimError("Enter a valid positive rate or leave it blank.");
      return;
    }
    setClaimError("");
    if (onClaimScrap && claimModalScrap) {
      onClaimScrap(claimModalScrap.id, {
        pickupDate: claimPickupDate,
        proposedRate: claimRate,
        note: claimNote.trim()
      });
      setClaimSuccessMsg(
        `Pickup staged in Collection Work for ${claimModalScrap.title}. Note: Demo claims stay in this browser.`
      );
      setTimeout(() => {
        closeClaimModalImmediate();
      }, 1500);
    } else {
      closeClaimModalImmediate();
    }
  };

  return (
    <section className="panel dashboard-panel collector-workspace-view">
      <div className="panel-heading">
        <div>
          <h2>Consignment Ledger & Scrap Lots</h2>
          <p>
            {readOnly
              ? "Manage your aggregated scrap consignments, review buyer offers, and coordinate pickup times."
              : "Discover open seller pickups, manage collection batches, and bundle consignment lots for recyclers."}
          </p>
        </div>
        <span className={readOnly ? "connected-label" : "demo-label"}>
          {readOnly ? "LIVE COLLECTOR" : "DEMO COLLECTOR"}
        </span>
      </div>

      <div className="inline-hint collector-operational-hint">
        <ShieldCheck size={15} />
        <span>
          Consolidation Hub: Discover nearby scrap pickups, stage collection batches, and bundle material into consignment lots for recycler bids.
        </span>
      </div>

      {/* THREE-WAY SEGMENTED WORKSPACE SWITCHER */}
      <div className="collector-tab-nav" role="tablist" aria-label="Collector workspace modes">
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
          <span>Available Pickups</span>
          <span className="tab-count-badge">
            {readOnly ? "Preview only" : availableSellerScrap.length}
          </span>
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
          <span>Collection Work</span>
          <span className="tab-count-badge">{collectionWork.length}</span>
        </button>

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
          <span>My Consignments</span>
          <span className="tab-count-badge">{lots.length}</span>
        </button>
      </div>

      {/* VIEW 1: AVAILABLE PICKUPS (UPSTREAM SELLER SCRAP DISCOVERY) */}
      {activeTab === "upstream_discovery" && (
        <div className="upstream-discovery-pane">
          {readOnly ? (
            <div className="honest-compliance-box">
              <div className="compliance-icon-wrap">
                <ShieldAlert size={28} className="text-amber" />
              </div>
              <div className="compliance-copy">
                <h3>Direct Seller Pickup Claims Are Not Enabled in Live Mode Yet</h3>
                <p>
                  To protect seller contact privacy, live collector accounts currently see only their own consignment lots and recycler offers.
                </p>
                <p>
                  Browsing open seller listings and staging pickup claims is demonstrated in the browser demo, while live cross-account pickup assignment awaits backend seller-claim support.
                </p>
                <div className="compliance-meta-note">
                  <span>AVAILABLE NOW: Create & manage consignment lots under &ldquo;My Consignments&rdquo;</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="master-detail-workspace">
              {/* DISCOVERY LIST */}
              <div className={`master-pane ${mobileDetailOpen ? "hide-on-mobile" : ""}`}>
                <div className="discovery-feed-header">
                  <div>
                    <strong>Open Seller Pickups ({filteredPickups.length})</strong>
                    <p>Select a lot to review specs, location, and propose a pickup date:</p>
                  </div>
                </div>

                <div className="filters role-filters">
                  <div className="search-box">
                    <Search size={16} />
                    <input
                      value={pickupQuery}
                      onChange={(e) => setPickupQuery(e.target.value)}
                      placeholder="Search pickups by area, item, or seller..."
                      aria-label="Search available pickups"
                    />
                    {pickupQuery && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => setPickupQuery("")}
                        aria-label="Clear pickup search"
                        title="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="filter-select">
                    <Filter size={14} />
                    <select
                      aria-label="Filter pickups by category"
                      value={pickupCategory}
                      onChange={(e) => setPickupCategory(e.target.value)}
                    >
                      <option>All categories</option>
                      {pickupCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredPickups.length ? (
                  <div className="master-list" role="listbox" aria-label="Available seller pickups">
                    {filteredPickups.map((scrap) => {
                      const isSelected = selectedScrap?.id === scrap.id;
                      return (
                        <article
                          key={scrap.id}
                          className={`master-row ${isSelected ? "selected" : ""}`}
                          onClick={() => {
                            setSelectedScrapId(scrap.id);
                            setMobileDetailOpen(true);
                          }}
                          tabIndex={0}
                          role="option"
                          aria-selected={isSelected}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedScrapId(scrap.id);
                              setMobileDetailOpen(true);
                            }
                          }}
                        >
                          <div className="master-row-header">
                            <strong className="master-row-title">{scrap.title}</strong>
                            <span className="status-pill open">
                              <span /> Available
                            </span>
                          </div>
                          <div className="master-row-sub">
                            <span>{scrap.id} · {scrap.category}</span>
                            <b>{formatWeightDisplay(scrap.weight)}</b>
                          </div>
                          <div className="master-row-footer">
                            <span className="location-tag">
                              <MapPin size={12} /> {scrap.location}
                            </span>
                            <span className="seller-name-tag">{scrap.seller || "Seller"}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title={pickupQuery || pickupCategory !== "All categories" ? "No matching pickups" : "No pickups available right now"}
                    detail={
                      pickupQuery || pickupCategory !== "All categories"
                        ? "Clear or adjust your search and category filter."
                        : "All sample seller pickups have been staged in Collection Work."
                    }
                    compact
                  />
                )}
              </div>

              {/* DISCOVERY DETAIL */}
              <div className={`detail-pane ${!mobileDetailOpen ? "hide-on-mobile" : ""}`}>
                {selectedScrap ? (
                  <div className="inspector-content">
                    {mobileDetailOpen && (
                      <button
                        type="button"
                        className="btn btn-light btn-small detail-back-btn"
                        onClick={() => setMobileDetailOpen(false)}
                      >
                        <ArrowLeft size={14} /> Back to pickups
                      </button>
                    )}

                    <div className="inspector-header">
                      <div>
                        <span className="inspector-eyebrow">SELLER PICKUP · {selectedScrap.id}</span>
                        <h3>{selectedScrap.title}</h3>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={() => setClaimModalScrap(selectedScrap)}
                      >
                        <Zap size={14} /> Claim Pickup
                      </button>
                    </div>

                    <div className="specs-grid">
                      <div>
                        <label>Estimated Weight</label>
                        <strong>{formatWeightDisplay(selectedScrap.weight)}</strong>
                      </div>
                      <div>
                        <label>Pickup Area</label>
                        <span><MapPin size={12} /> {selectedScrap.location}</span>
                      </div>
                      <div>
                        <label>Material Category</label>
                        <span>{selectedScrap.category}</span>
                      </div>
                      <div>
                        <label>Posted By</label>
                        <span>{selectedScrap.seller || "Business Seller"}</span>
                      </div>
                    </div>

                    <div className="inspector-notes">
                      <label>Material Notes & Access Details</label>
                      <p>{selectedScrap.notes || "No special access instructions provided."}</p>
                    </div>

                    <div className="intake-verification-card">
                      <div className="intake-card-top">
                        <Scale size={18} />
                        <strong>What Happens After Claiming (Demo Workflow)</strong>
                      </div>
                      <ul>
                        <li>Claiming moves this batch into your <strong>Collection Work</strong> tab in this browser.</li>
                        <li>Exact street contact details and physical scale weighing are not automated in this prototype.</li>
                        <li>Once collected off-platform, bundle collected weights into a lot under <strong>My Consignments</strong> to receive recycler bids.</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="inspector-empty">
                    <p>Select an available pickup from the left to inspect material details and schedule collection.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: COLLECTION WORK */}
      {activeTab === "collection_work" && (
        <div className="collection-work-pane">
          <div className="collection-work-header">
            <div>
              <strong>Staged Collection Batches ({collectionWork.length})</strong>
              <p>Pickups you have claimed from sellers. Physical weighing and gate dispatch happen offline in this version.</p>
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
                    <div><span>Estimated Weight:</span> <b>{formatWeightDisplay(item.weight)}</b></div>
                    <div><span>Pickup Area:</span> <b>{item.location}</b></div>
                    <div><span>Target Pickup:</span> <b>{item.pickupDate || "Not specified"}</b></div>
                    {item.proposedRate && (
                      <div><span>Proposed Rate Note:</span> <b>{item.proposedRate}</b></div>
                    )}
                  </div>
                  <div className="work-card-foot">
                    <span className="badge-demo-note">Unverified weight · Staged locally</span>
                    <button
                      type="button"
                      className="btn btn-light btn-small"
                      onClick={() => setIntakeInfoItem(item)}
                    >
                      <Info size={13} /> Intake Verification Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No staged pickups yet"
              detail="Select a batch from the 'Available Pickups' tab to plan your next collection run."
              action={
                !readOnly ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    onClick={() => setActiveTab("upstream_discovery")}
                  >
                    Browse Available Pickups
                  </button>
                ) : null
              }
              compact
            />
          )}
        </div>
      )}

      {/* VIEW 3: MY CONSIGNMENTS (STANDARD COLLECTOR LOTS) */}
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
                detail={
                  query
                    ? "Try a different search term or status filter."
                    : "Create an aggregated scrap lot to start receiving bids from recyclers."
                }
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
                    <ArrowLeft size={14} /> Back to consignments
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
                        title="Edit this lot"
                      >
                        <Edit3 size={13} /> Edit Lot
                      </button>
                    ) : selectedLot.status === "Offer submitted" ? (
                      <span
                        className="offers-badge"
                        title="Lot specifications are locked while bids are pending. Reject bids to reopen editing."
                      >
                        Locked (bids pending)
                      </span>
                    ) : (
                      <span className="offers-badge">
                        Lot locked ({statusLabel(selectedLot.status)})
                      </span>
                    )}
                  </div>
                </div>

                {nextGuidance && (
                  <div className="next-step-guidance-card" role="region" aria-label="Lot status and next step">
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
                    <label>Declared Weight</label>
                    <strong>{formatWeightDisplay(selectedLot.weight)}</strong>
                  </div>
                  <div>
                    <label>Dispatch Area</label>
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
                    <span>{selectedLot.collector}</span>
                  </div>
                </div>

                {selectedLot.notes && (
                  <div className="inspector-notes">
                    <label>Material Notes & Packing Details</label>
                    <p>{selectedLot.notes}</p>
                  </div>
                )}

                {/* OFFERS LEDGER */}
                <div className="offers-section">
                  <div className="offers-heading">
                    <strong>Offers Ledger ({selectedLot.offers.length})</strong>
                    <span>Compare bids before accepting. Payment settles externally.</span>
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
                                <small>{offer.message || "No additional terms attached."}</small>
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
                      detail="Incoming recycler offers will appear here for review."
                      compact
                    />
                  )}
                </div>

                {selectedLot.status === "Pickup scheduled" &&
                  selectedLot.offers.some((offer) => offer.status === "accepted") &&
                  PickupCoordination && (
                    <PickupCoordination
                      role="collector"
                      lot={selectedLot}
                      appointment={selectedAppointment}
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
                        {readOnly ? "Participant Review Note (Not Independently Verified)" : "Demo Review Note"}
                      </strong>
                      <span>{selectedLot.evidence}</span>
                    </div>
                  </div>
                )}

                {LotTraceActions && (
                  <LotTraceActions
                    lot={selectedLot}
                    mode={readOnly ? "collector" : "info"}
                    available={traceabilityAvailable}
                    onDispute={traceProps?.onDispute}
                  />
                )}

                <TraceabilityTimeline
                  lot={selectedLot}
                  workflowEvents={traceProps?.workflowEvents || []}
                  pickupAppointment={selectedAppointment}
                  role="Collector"
                />
              </div>
            ) : (
              <div className="inspector-empty">
                <p>Select a consignment from the left to inspect details, review bids, or coordinate pickup.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CLAIM SUBMISSION MODAL */}
      {claimModalScrap && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) requestCloseClaimModal();
          }}
        >
          <div
            className="modal modal-narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="claim-modal-title"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">DEMO COLLECTION PLAN</span>
                <h2 id="claim-modal-title">Claim Pickup Batch</h2>
                <p>{claimModalScrap.title} · {formatWeightDisplay(claimModalScrap.weight)} estimated</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={requestCloseClaimModal}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <DiscardChangesBanner
              visible={confirmClaimDiscard}
              onKeepEditing={() => setConfirmClaimDiscard(false)}
              onConfirmDiscard={closeClaimModalImmediate}
            />

            <form onSubmit={handleClaimSubmit} className="form-grid" noValidate>
              <div className="auth-field full">
                <label className="auth-field-label" htmlFor="claim-pickup-date">
                  Planned Pickup Date <span className="req-mark">*</span>
                </label>
                <input
                  id="claim-pickup-date"
                  type="date"
                  required
                  value={claimPickupDate}
                  onChange={(e) => {
                    setClaimPickupDate(e.target.value);
                    setClaimError("");
                    setConfirmClaimDiscard(false);
                  }}
                />
              </div>

              <div className="auth-field full">
                <label className="auth-field-label" htmlFor="claim-payout-rate">
                  Indicative Rate Note (₹/kg, optional)
                </label>
                <input
                  id="claim-payout-rate"
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="e.g. 45"
                  value={claimRate}
                  onChange={(e) => {
                    setClaimRate(e.target.value);
                    setClaimError("");
                    setConfirmClaimDiscard(false);
                  }}
                />
              </div>

              <div className="auth-field full">
                <label className="auth-field-label" htmlFor="claim-notes">
                  Vehicle & Scale Notes (optional)
                </label>
                <textarea
                  id="claim-notes"
                  rows={3}
                  placeholder="e.g. Small pickup van with portable platform scale."
                  value={claimNote}
                  onChange={(e) => {
                    setClaimNote(e.target.value);
                    setClaimError("");
                    setConfirmClaimDiscard(false);
                  }}
                />
              </div>

              <div className="form-note full">
                <Info size={16} />
                <span>
                  Staged locally in this browser demo under <strong>Collection Work</strong>. No message or booking is dispatched externally.
                </span>
              </div>

              {claimError && (
                <div className="form-error full" role="alert">
                  {claimError}
                </div>
              )}

              {claimSuccessMsg && (
                <div className="form-success full" role="status">
                  <CheckCircle2 size={16} /> {claimSuccessMsg}
                </div>
              )}

              <div className="modal-actions full">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={requestCloseClaimModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={Boolean(claimSuccessMsg)}>
                  Stage Pickup Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HONEST PHYSICAL INTAKE VERIFICATION EXPLANATION MODAL (REPLACES window.alert) */}
      {intakeInfoItem && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIntakeInfoItem(null);
          }}
        >
          <div
            className="modal modal-narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intake-info-title"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">PHYSICAL HANDOVER STATUS</span>
                <h2 id="intake-info-title">Physical Scale Verification Unavailable</h2>
                <p>{intakeInfoItem.title} · {intakeInfoItem.id}</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIntakeInfoItem(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="intake-modal-body">
              <div className="inline-hint warning">
                <ShieldAlert size={16} />
                <span>
                  On-site digital scale integration and handover OTP verification are not connected in this version. This lot remains <strong>unverified</strong> ({formatWeightDisplay(intakeInfoItem.weight)} declared).
                </span>
              </div>

              <div className="intake-checklist-box">
                <strong>What a live field handover requires:</strong>
                <ul>
                  <li>Measure gross and tare weight using a calibrated platform scale at the pickup site.</li>
                  <li>Inspect electronics for completeness (missing boards, broken displays, or battery leaks).</li>
                  <li>Record seller handover confirmation before loading transport and bundling into a consignment lot.</li>
                </ul>
              </div>

              <div className="modal-actions full">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIntakeInfoItem(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
