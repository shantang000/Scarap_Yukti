// Demo Data Store for Scarap_Yukti
// Strictly local, isolated simulation store for unauthenticated public walkthrough.
// GUARANTEE: Never makes network calls or mutations against Supabase.

export const DEMO_STORAGE_KEY = "scarap_yukti_demo_state_v2";

export const DEMO_SELLER = "Demo Corporate Seller";
export const DEMO_COLLECTOR = "Demo Aggregator Hub";
export const DEMO_RECYCLER = "Demo Recycler";

export const initialSellerListings = [
  {
    id: "SEL-301",
    collector: DEMO_SELLER,
    title: "Decommissioned Core-i7 Laptops (Batch of 24)",
    category: "Computers",
    weight: 48.0,
    location: "Cyber City, DLF Phase 2, Gurugram",
    date: "2026-10-24",
    status: "Offer submitted",
    notes: "Drives degaussed and extracted per ISO 27001. Intact motherboards, displays, and aluminum chassis.",
    evidence: "",
    pickupAppointment: null,
    offers: [
      {
        id: "OF-SEL-101",
        recycler: "EcoGreen Circular Recovery",
        price: 36000,
        message: "Can collect within 48h with sealed logistics vehicle. Pre-inspected batch.",
        status: "pending"
      },
      {
        id: "OF-SEL-102",
        recycler: "Attero Material Works",
        price: 38400,
        message: "High-yield refining batch. Ready to issue Form 6 Manifest on site.",
        status: "pending"
      }
    ]
  },
  {
    id: "SEL-302",
    collector: DEMO_SELLER,
    title: "12V 100Ah Sealed Lead-Acid UPS Batteries",
    category: "Batteries",
    weight: 120.0,
    location: "Sector 18, Noida Industrial Area",
    date: "2026-10-23",
    status: "Open",
    notes: "Sealed AGM enclosures. No acid leakage, terminal caps installed for transit safety.",
    evidence: "",
    pickupAppointment: null,
    offers: []
  },
  {
    id: "SEL-303",
    collector: DEMO_SELLER,
    title: "Decommissioned 42U Server Enclosures & Busbars",
    category: "Computers",
    weight: 92.5,
    location: "Okhla Phase-3, South Delhi",
    date: "2026-10-20",
    status: "Pickup scheduled",
    notes: "Heavy copper ground busbars, dual PDU strips, fan assemblies included.",
    evidence: "",
    pickupAppointment: {
      status: "confirmed",
      windowStart: "2026-10-28T10:00:00Z",
      windowEnd: "2026-10-28T12:00:00Z",
      proposedBy: DEMO_SELLER,
      note: "Loading dock bay 4 available with freight elevator access."
    },
    offers: [
      {
        id: "OF-SEL-103",
        recycler: DEMO_RECYCLER,
        price: 24500,
        message: "Accepted. Dedicated heavy transit truck dispatched for Oct 28.",
        status: "accepted"
      }
    ]
  },
  {
    id: "SEL-304",
    collector: DEMO_SELLER,
    title: "Legacy CRT & Industrial Display Monitors",
    category: "Displays",
    weight: 65.0,
    location: "Udyog Vihar Phase 4, Gurugram",
    date: "2026-10-18",
    status: "Collected",
    notes: "Cathode ray tubes intact; leaded glass hazard handling required per CPCB rules.",
    evidence: "",
    actualWeight: 64.2,
    pickupAppointment: {
      status: "completed",
      windowStart: "2026-10-22T09:00:00Z",
      windowEnd: "2026-10-22T11:00:00Z",
      proposedBy: DEMO_SELLER,
      note: "Handover completed with physical digital scale calibration slip."
    },
    offers: [
      {
        id: "OF-SEL-104",
        recycler: DEMO_RECYCLER,
        price: 9750,
        message: "Collected and sealed in transport container #NCR-8821.",
        status: "accepted"
      }
    ]
  }
];

export const initialCollectorConsignments = [
  {
    id: "COL-401",
    collector: DEMO_COLLECTOR,
    title: "Aggregated High-Grade Server Motherboards & RAM",
    category: "Computers",
    weight: 85.0,
    location: "Patparganj Industrial Area, East Delhi",
    date: "2026-10-24",
    status: "Offer submitted",
    notes: "Consolidated from corporate IT refresh batches. Gold-plated finger edge connectors intact.",
    evidence: "",
    pickupAppointment: null,
    offers: [
      {
        id: "OF-COL-201",
        recycler: DEMO_RECYCLER,
        price: 68000,
        message: "Competitive bid for precious metal recovery line. Ready for pickup within 24h.",
        status: "pending"
      },
      {
        id: "OF-COL-202",
        recycler: "Nagarjuna Refineries Ltd",
        price: 64500,
        message: "Standard hydrometallurgical processing quote.",
        status: "pending"
      }
    ]
  },
  {
    id: "COL-402",
    collector: DEMO_COLLECTOR,
    title: "Sorted Lithium-Ion & Polymer Battery Packs",
    category: "Batteries",
    weight: 42.0,
    location: "Sector 63, Noida",
    date: "2026-10-22",
    status: "Pickup scheduled",
    notes: "Individual terminal taping completed. Stored in sand-buffered fire-safe drums.",
    evidence: "",
    pickupAppointment: {
      status: "confirmed",
      windowStart: "2026-10-27T14:00:00Z",
      windowEnd: "2026-10-27T16:00:00Z",
      proposedBy: DEMO_COLLECTOR,
      note: "Hazmat transport certified carrier required."
    },
    offers: [
      {
        id: "OF-COL-203",
        recycler: DEMO_RECYCLER,
        price: 18900,
        message: "Black mass extraction processing booked at our Roorkee facility.",
        status: "accepted"
      }
    ]
  },
  {
    id: "COL-403",
    collector: DEMO_COLLECTOR,
    title: "Mixed Small Telecom Routers & IoT Gateways",
    category: "Small electronics",
    weight: 34.0,
    location: "Vaishali, Ghaziabad",
    date: "2026-10-19",
    status: "Collected",
    notes: "Plastics detached; PCB boards pre-sorted.",
    evidence: "",
    actualWeight: 33.7,
    pickupAppointment: null,
    offers: [
      {
        id: "OF-COL-204",
        recycler: DEMO_RECYCLER,
        price: 11200,
        message: "Batch received at transit weighing gate.",
        status: "accepted"
      }
    ]
  },
  {
    id: "COL-404",
    collector: DEMO_COLLECTOR,
    title: "Commercial LED Backlit Flat Panel Monitors",
    category: "Displays",
    weight: 56.0,
    location: "Raj Nagar District Centre, Ghaziabad",
    date: "2026-10-15",
    status: "Recycling review",
    notes: "Disassembled into diffusers, CCFL/LED lightbars, and logic boards.",
    evidence: "Mechanically segregated into plastics (ABS 38%), glass (42%), PCBs (18%), and copper wiring (2%). CPCB Form 6 audit recorded.",
    actualWeight: 55.4,
    pickupAppointment: null,
    offers: [
      {
        id: "OF-COL-205",
        recycler: DEMO_RECYCLER,
        price: 14000,
        message: "Destruction and material yield processing active.",
        status: "accepted"
      }
    ]
  }
];

export const initialAvailableSellerScrap = [
  {
    id: "UP-SCRAP-001",
    seller: "Bharti Airtel Tech Centre",
    title: "Retired Base Station Transceiver Units (BTS)",
    category: "Computers",
    weight: 145.0,
    location: "Manesar Industrial Township, Haryana",
    date: "2026-10-24",
    status: "Open",
    notes: "RF shielding cages, microwave line cards, and multi-pin high-density connectors."
  },
  {
    id: "UP-SCRAP-002",
    seller: "Max Healthcare Central Lab",
    title: "Defective Centrifuge & Diagnostic PC Boards",
    category: "Small electronics",
    weight: 28.5,
    location: "Saket Institutional Area, South Delhi",
    date: "2026-10-23",
    status: "Open",
    notes: "Non-biohazardous control boards; heavy transformers intact."
  },
  {
    id: "UP-SCRAP-003",
    seller: "TechMahindra Campus 2",
    title: "Decommissioned Voice-Over-IP Phone Fleet (180 units)",
    category: "Phones and tablets",
    weight: 62.0,
    location: "Sector 126, Noida Expressway",
    date: "2026-10-21",
    status: "Open",
    notes: "Complete handset sets with power over ethernet splitters."
  }
];

export const initialCollectionWork = [
  {
    id: "UP-SCRAP-004",
    seller: "Fortis Escorts Hospital",
    title: "Decommissioned UPS Lead-Acid Batteries",
    category: "Batteries",
    weight: 96.0,
    location: "Okhla Road, New Delhi",
    date: "2026-10-22",
    status: "Claim Staged",
    pickupDate: "Tomorrow 11:00 AM",
    proposedRate: "₹45/kg",
    collectorNote: "Staged for consolidation run route 3."
  }
];

export const initialActivity = [
  { id: "act-1", text: "Interactive Demo workspace initialized with realistic sample records", time: "Just now" },
  { id: "act-2", text: "Recycler offer of ₹38,400 submitted on Batch of Laptops (SEL-301)", time: "18m ago" },
  { id: "act-3", text: "Pickup appointment confirmed for Server Enclosures (SEL-303) on Oct 28", time: "1h ago" },
  { id: "act-4", text: "Handover weight intake recorded: 64.2 kg on Display Monitors (SEL-304)", time: "3h ago" },
  { id: "act-5", text: "Recycling review documentation certified for Flat Panel Monitors (COL-404)", time: "5h ago" }
];

function getDemoStorage() {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {}
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {}
  return null;
}

export function getInitialDemoState() {
  const allLots = [...initialSellerListings, ...initialCollectorConsignments];
  return {
    lots: allLots,
    availableSellerScrap: [...initialAvailableSellerScrap],
    collectionWork: [...initialCollectionWork],
    activity: [...initialActivity],
    version: 2
  };
}

export function readDemoState() {
  try {
    const storage = getDemoStorage();
    if (!storage) return getInitialDemoState();
    const raw = storage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return getInitialDemoState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.lots)) {
      return getInitialDemoState();
    }
    return parsed;
  } catch {
    return getInitialDemoState();
  }
}

export function writeDemoState(state) {
  try {
    const storage = getDemoStorage();
    if (!storage) return;
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // If quota exceeded or restricted, fail safely
  }
}

export function resetDemoState() {
  const pristine = getInitialDemoState();
  try {
    const storage = getDemoStorage();
    if (storage) {
      storage.removeItem(DEMO_STORAGE_KEY);
      storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(pristine));
    }
  } catch {
    // ignore
  }
  return pristine;
}
