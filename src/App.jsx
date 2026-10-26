import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Bell, Check, ChevronDown, CircleHelp, ClipboardList, Download,
  Filter, Leaf, MapPin, Package, Plus, Recycle, Search, ShieldCheck, Sparkles,
  Truck, Users, Wallet, X, Zap
} from "lucide-react";
import { hasSupabaseConfig, supabase } from "./lib/supabase.js";
import { loadMarketplaceSnapshot } from "./lib/marketplaceReads.js";
import { raiseDispute, recordHandoverWeight } from "./lib/lotActions.js";
import { applyDemoWorkflowTransition, decideDemoOffer } from "./lib/workflowRules.js";

const STORAGE_KEY = "scarap-yukti-demo-v1";
const DEMO_COLLECTOR = "Demo Collector";
const DEMO_RECYCLER = "Demo Recycler";
const starterLots = [
  { id: "SY-1048", collector: DEMO_COLLECTOR, title: "Mixed computer scrap", category: "Computers", weight: 42, location: "Indirapuram, Ghaziabad", date: "2026-10-22", status: "Offer submitted", notes: "CPU towers, RAM and cables", offers: [{ id: "OF-301", recycler: "Demo Recycler A", price: 38, message: "Pickup available tomorrow", status: "pending" }] },
  { id: "SY-1047", collector: DEMO_COLLECTOR, title: "Office monitors", category: "Displays", weight: 26, location: "Vaishali, Ghaziabad", date: "2026-10-21", status: "Offer submitted", notes: "LCD monitors; condition varies", offers: [{ id: "OF-302", recycler: "Demo Recycler B", price: 24, message: "Subject to inspection", status: "pending" }] },
  { id: "SY-1046", collector: DEMO_COLLECTOR, title: "Small electronics", category: "Small electronics", weight: 13, location: "Raj Nagar, Ghaziabad", date: "2026-10-19", status: "Pickup scheduled", notes: "Routers, keyboards and chargers", offers: [] }
];
const seed = { lots: starterLots, activity: [{ id: 1, text: "Welcome to your Scarap_Yukti demo workspace", time: "Just now" }] };
const statusOptions = ["Open", "Offer submitted", "Pickup scheduled", "Collected", "Recycling review", "Recycled", "Disputed"];
function safeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeOffer(offer, index) {
  const item = offer && typeof offer === "object" ? offer : {};
  const price = Number(item.price);
  return {
    id: safeString(item.id, `OF-legacy-${index + 1}`),
    recycler: safeString(item.recycler, "Demo Recycler"),
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    message: safeString(item.message),
    status: ["pending", "accepted", "rejected"].includes(item.status) ? item.status : "pending"
  };
}

function normalizeLot(lot, index) {
  const item = lot && typeof lot === "object" ? lot : {};
  const weight = Number(item.weight);
  const legacyStatus = item.status === "Offer received" ? "Offer submitted" : item.status === "Recycling documented" ? "Recycling review" : item.status;
  const status = statusOptions.includes(legacyStatus) ? legacyStatus : "Open";
  const date = typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    ? item.date
    : new Date().toISOString().slice(0, 10);
  return {
    id: safeString(item.id, `SY-legacy-${index + 1}`),
    collector: safeString(item.collector, DEMO_COLLECTOR),
    title: safeString(item.title, "Untitled lot"),
    category: safeString(item.category, "Other"),
    weight: Number.isFinite(weight) && weight >= 0 ? weight : 0,
    location: safeString(item.location, "Location not provided"),
    date,
    status,
    notes: safeString(item.notes),
    evidence: safeString(item.evidence),
    offers: Array.isArray(item.offers) ? item.offers.map(normalizeOffer) : []
  };
}

function normalizeSavedData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return seed;
  const lots = Array.isArray(value.lots) ? value.lots.map(normalizeLot) : seed.lots;
  const activity = Array.isArray(value.activity)
    ? value.activity.filter(item => item && typeof item === "object").map((item, index) => ({
      id: item.id ?? `legacy-activity-${index + 1}`,
      text: safeString(item.text, "Previous activity"),
      time: safeString(item.time, "Time unavailable")
    }))
    : seed.activity;
  return { lots, activity };
}

function readSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeSavedData(JSON.parse(raw)) : seed;
  } catch {
    return seed;
  }
}
function createUniqueId(prefix, usedIds) {
  const used = new Set(usedIds.map(id => String(id).toLowerCase()));
  let id;
  do {
    const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    id = `${prefix}-${randomPart}`;
  } while (used.has(id.toLowerCase()));
  return id;
}
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const shortDate = (d) => {
  const date = new Date(`${d}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function App() {
  const [data, setData] = useState(readSaved);
  const [demoRole, setDemoRole] = useState("Collector");
  const [authSession, setAuthSession] = useState(null);
  const authUserId = useRef(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileState, setProfileState] = useState("idle");
  const [connectedData, setConnectedData] = useState(null);
  const [marketplaceState, setMarketplaceState] = useState("idle");
  const [marketplaceError, setMarketplaceError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [authMode, setAuthMode] = useState("signin");
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authMessageType, setAuthMessageType] = useState("success");
  const [authForm, setAuthForm] = useState({ displayName: "", email: "", password: "" });
  const [section, setSection] = useState("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [locationFilter, setLocationFilter] = useState("All locations");
  const [evidenceDrafts, setEvidenceDrafts] = useState({});
  const [disputeDrafts, setDisputeDrafts] = useState({});
  const [workflowBusyLotId, setWorkflowBusyLotId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [offerLot, setOfferLot] = useState(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [decisionBusyOfferId, setDecisionBusyOfferId] = useState(null);
  const [formError, setFormError] = useState("");
  const [offerError, setOfferError] = useState("");
  const [form, setForm] = useState({ title: "", category: "Computers", weight: "", location: "", notes: "" });

  useEffect(() => {
    if (!supabase) {
      setAuthInitializing(false);
      return undefined;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setRecoveryPassword("");
        setRecoveryPasswordConfirm("");
        setAuthFeedback("");
      }
      setAuthSession(session);
      const nextUserId = session?.user?.id ?? null;
      if (authUserId.current !== nextUserId) {
        authUserId.current = nextUserId;
        setProfile(null);
        setProfileState(session ? "loading" : "idle");
        setConnectedData(null);
        setMarketplaceState(session ? "loading" : "idle");
        setMarketplaceError("");
        setShowForm(false);
        setOfferLot(null);
      }
      setAuthInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !authSession?.user?.id) {
      setProfile(null);
      setProfileState("idle");
      return undefined;
    }

    let active = true;
    setProfileState("loading");

    async function loadProfile() {
      const { data: row, error } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", authSession.user.id)
        .single();

      if (!active) return;
      if (error) {
        setProfile(null);
        setProfileState("error");
        setAuthMessage(`Signed in, but your profile could not be loaded: ${error.message}`);
        setAuthMessageType("error");
        return;
      }
      if (!row || !["collector", "recycler", "admin"].includes(row.role)) {
        setProfile(null);
        setProfileState("error");
        setAuthMessage("Your profile is missing or has an unsupported role. Ask a project administrator to review it.");
        setAuthMessageType("error");
        return;
      }

      setProfile(row);
      setProfileState("ready");
      setAuthMessage("");
    }

    loadProfile().catch(error => {
      if (!active) return;
      setProfile(null);
      setProfileState("error");
      setAuthMessage(`Could not load your profile: ${error.message || "Please try again."}`);
      setAuthMessageType("error");
    });

    return () => { active = false; };
  }, [authSession?.user?.id]);

  useEffect(() => {
    if (!authSession?.user?.id || profileState !== "ready") return undefined;

    let active = true;
    setMarketplaceState("loading");
    setMarketplaceError("");

    loadMarketplaceSnapshot()
      .then(snapshot => {
        if (!active) return;
        setConnectedData(snapshot);
        setMarketplaceState("ready");
      })
      .catch(error => {
        if (!active) return;
        setConnectedData(null);
        setMarketplaceError(error.message || "Could not load marketplace data. Please try again.");
        setMarketplaceState("error");
      });

    return () => { active = false; };
  }, [authSession?.user?.id, profileState, reloadToken]);

  const role = authSession
    ? profile?.role ? profile.role[0].toUpperCase() + profile.role.slice(1) : null
    : demoRole;

  useEffect(() => {
    if (authSession) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch { notify("Could not save to this browser. Check browser storage settings.", "error"); }
  }, [data, authSession]);

  const viewData = authSession ? connectedData || { lots: [], activity: [], workflowEvents: [] } : data;

  const visibleLots = useMemo(() => viewData.lots.filter(lot => {
    const matchesQuery = `${lot.id} ${lot.title} ${lot.category} ${lot.location} ${lot.status}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (statusFilter === "All statuses" || lot.status === statusFilter)
      && (categoryFilter === "All categories" || lot.category === categoryFilter)
      && (locationFilter === "All locations" || lot.location === locationFilter);
  }), [viewData.lots, query, statusFilter, categoryFilter, locationFilter]);

  const totalWeight = viewData.lots.reduce((sum, lot) => sum + Number(lot.weight || 0), 0);
  const activeLots = viewData.lots.filter(lot => lot.status !== "Recycled").length;
  const offerCount = viewData.lots.reduce((sum, lot) => sum + lot.offers.length, 0);
  const pendingOfferCount = viewData.lots.reduce((sum, lot) => sum + lot.offers.filter(offer => offer.status === "pending").length, 0);
  const locations = [...new Set(viewData.lots.map(lot => lot.location).filter(Boolean))].sort();
  const categories = [...new Set(viewData.lots.map(lot => lot.category).filter(Boolean))].sort();

  function logActivity(prev, text) {
    return [{ id: createUniqueId("ACT", prev.activity.map(item => item.id)), text, time: "Just now" }, ...prev.activity].slice(0, 30);
  }
  function notify(message, type = "success") {
    setNoticeType(type);
    setNotice(message);
  }

  function setAuthFeedback(message, type = "success") {
    setAuthMessageType(type);
    setAuthMessage(message);
  }

  async function submitAuth(e) {
    e.preventDefault();
    if (!supabase) {
      setAuthFeedback("Add the Supabase URL and publishable key to .env.local, then restart Vite.", "error");
      return;
    }

    const email = authForm.email.trim();
    const password = authForm.password;
    const displayName = authForm.displayName.trim();
    if (authMode === "signup" && displayName.length > 100) {
      setAuthFeedback("Name must be 100 characters or fewer.", "error");
      return;
    }

    setAuthBusy(true);
    setAuthFeedback("");
    try {
      if (authMode === "signup") {
        const { data: result, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } }
        });
        if (error) throw error;
        if (!result.session) {
          setAuthFeedback("Account request received. Check your email to confirm the account, then sign in.");
          setAuthMode("signin");
        } else {
          setAuthFeedback("Account created. The database assigns new users the Collector role.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthFeedback("Signed in. Loading your database profile…");
      }
    } catch (error) {
      setAuthFeedback(error.message || "Authentication failed. Please try again.", "error");
    } finally {
      setAuthBusy(false);
    }
  }

  async function sendPasswordRecovery() {
    if (!supabase) {
      setAuthFeedback("Supabase is not configured. Add the project URL and publishable key first.", "error");
      return;
    }
    const email = authForm.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthFeedback("Enter a valid email address first, then choose Forgot password?", "error");
      return;
    }

    setAuthBusy(true);
    setAuthFeedback("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      setAuthFeedback("If an account is registered for that email, a recovery link will arrive shortly. Check your inbox and spam folder.");
    } catch (error) {
      setAuthFeedback(error.message || "Could not send a recovery email. Please try again.", "error");
    } finally {
      setAuthBusy(false);
    }
  }

  async function updateRecoveredPassword(e) {
    e.preventDefault();
    if (!supabase || !passwordRecovery || !authSession) {
      setAuthFeedback("Open the password recovery link from your email before choosing a new password.", "error");
      return;
    }
    if (recoveryPassword.length < 8) {
      setAuthFeedback("Choose a password with at least 8 characters.", "error");
      return;
    }
    if (recoveryPassword !== recoveryPasswordConfirm) {
      setAuthFeedback("The passwords do not match. Please re-enter them.", "error");
      return;
    }

    setAuthBusy(true);
    setAuthFeedback("");
    try {
      const { error } = await supabase.auth.updateUser({ password: recoveryPassword });
      if (error) throw error;
      setPasswordRecovery(false);
      setRecoveryPassword("");
      setRecoveryPasswordConfirm("");
      setAuthFeedback("Password updated successfully. Use your new password the next time you sign in.");
    } catch (error) {
      setAuthFeedback(error.message || "Could not update your password. Please try again.", "error");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setAuthFeedback("Signed out. The demo dashboard is available below.");
    } catch (error) {
      setAuthFeedback(error.message || "Could not sign out. Please try again.", "error");
    } finally {
      setAuthBusy(false);
    }
  }

  async function createLot(e) {
    e.preventDefault();
    const title = form.title.trim();
    const category = form.category.trim();
    const location = form.location.trim();
    const weight = Number(form.weight);
    if (title.length < 2 || title.length > 100) {
      setFormError("Lot name must be between 2 and 100 characters."); return;
    }
    if (!Number.isFinite(weight) || weight < 0.1 || weight > 100000) {
      setFormError("Enter a weight from 0.1 to 100,000 kg."); return;
    }
    if (!category || category.length > 80) {
      setFormError("Choose a category with no more than 80 characters."); return;
    }
    if (location.length < 2 || location.length > 160) {
      setFormError("Pickup location must be between 2 and 160 characters."); return;
    }
    if (form.notes.trim().length > 500) {
      setFormError("Notes must be 500 characters or fewer."); return;
    }
    if (authSession) {
      if (profile?.role !== "collector" || !authSession.user?.id || !supabase) {
        setFormError("A signed-in Collector account is required to create a database lot.");
        return;
      }
      setCreateBusy(true);
      setFormError("");
      try {
        const { error } = await supabase.from("lots").insert({
          collector_id: authSession.user.id,
          title,
          category,
          weight_kg: weight,
          location,
          notes: form.notes.trim()
        });
        if (error) throw error;
        setForm({ title: "", category: "Computers", weight: "", location: "", notes: "" });
        setShowForm(false);
        setReloadToken(value => value + 1);
        notify("Lot created in Supabase. Your list is refreshing.");
      } catch (error) {
        const message = error.code === "42501"
          ? "Supabase denied this insert. Confirm this account has the Collector role and the lot insert policy is active."
          : error.code === "23503"
            ? "Your profile row was not found. Sign out and back in, or ask the project administrator to check your profile."
            : error.message || "The lot could not be saved. Please try again.";
        setFormError(message);
        notify(message, "error");
      } finally {
        setCreateBusy(false);
      }
      return;
    }

    const id = createUniqueId("SY", data.lots.map(lot => lot.id));
    const lot = { id, ...form, category, collector: DEMO_COLLECTOR, title, location, notes: form.notes.trim(), weight, date: new Date().toISOString().slice(0, 10), status: "Open", evidence: "", offers: [] };
    setData(prev => ({ ...prev, lots: [lot, ...prev.lots], activity: logActivity(prev, `New lot created: ${lot.title} (${id})`) }));
    setForm({ title: "", category: "Computers", weight: "", location: "", notes: "" });
    setFormError("");
    setShowForm(false); notify("Lot added and saved in this browser.");
  }

  function transitionLot(id, status, evidence = "") {
    if (authSession) { notify("Connected mode is read-only in this phase.", "error"); return; }
    const currentLot = data.lots.find(lot => lot.id === id);
    if (!currentLot || currentLot.status === status) return;
    const result = applyDemoWorkflowTransition(currentLot, status, evidence);
    if (!result.ok && result.reason === "invalid_transition") {
      notify(`That workflow step is not allowed from ${currentLot.status}.`, "error"); return;
    }
    if (!result.ok && result.reason === "evidence_note_length") {
      notify("Add a demo recycling evidence note between 10 and 500 characters.", "error"); return;
    }
    if (!result.ok && result.reason === "evidence_required") {
      notify("Recycling evidence is required before marking this lot recycled.", "error"); return;
    }
    if (!result.ok) return;
    setData(prev => ({
      ...prev,
      lots: prev.lots.map(lot => lot.id === id ? result.lot : lot),
      activity: logActivity(prev, `${id} moved to ${status}${result.evidenceSaved ? " with demo evidence notes" : ""}`)
    }));
    notify(`Status updated to “${status}”.`);
  }

  async function advanceAdminWorkflow(lotId, nextStatus, note = "") {
    if (!authSession || !supabase || profile?.role !== "admin" || !authSession.user?.id) {
      notify("A signed-in Admin account is required for database workflow actions.", "error");
      return false;
    }
    const lot = connectedData?.lots.find(item => item.id === lotId);
    if (!lot) {
      notify("This lot is not available in the current marketplace view. Refresh and try again.", "error");
      return false;
    }
    const cleanNote = note.trim();
    if (["recycling_review", "disputed"].includes(nextStatus) && (cleanNote.length < 10 || cleanNote.length > 500)) {
      notify(nextStatus === "disputed"
        ? "Enter a dispute reason between 10 and 500 characters."
        : "Enter an evidence/review note between 10 and 500 characters.", "error");
      return false;
    }
    const successMessages = {
      collected: "Lot marked collected.",
      recycling_review: "Evidence/review note saved and lot moved to recycling review.",
      recycled: "Lot marked recycled after the saved evidence note was checked.",
      disputed: "Lot flagged for Admin review.",
      resume: "Lot workflow resumed from its saved status."
    };

    setWorkflowBusyLotId(lotId);
    try {
      const { error } = await supabase.rpc("advance_lot_workflow", {
        p_lot_id: lotId,
        p_next_status: nextStatus,
        p_note: cleanNote
      });
      if (error) throw error;
      setReloadToken(value => value + 1);
      if (nextStatus === "recycling_review") setEvidenceDrafts(prev => ({ ...prev, [lotId]: "" }));
      if (nextStatus === "disputed") setDisputeDrafts(prev => ({ ...prev, [lotId]: "" }));
      notify(`${successMessages[nextStatus] || "Workflow updated."} Refreshing marketplace data.`);
      return true;
    } catch (error) {
      const detail = error.message || "The workflow change could not be saved.";
      const message = /Only an Admin/i.test(detail)
        ? "The database did not authorize this action. An Admin profile is required."
        : /Invalid workflow transition/i.test(detail)
          ? "This lot has changed or that workflow step is not allowed. Refresh the marketplace and try again."
          : detail;
      notify(message, "error");
      return false;
    } finally {
      setWorkflowBusyLotId(null);
    }
  }

  function handleAdminTransition(lotId, nextStatus, demoStatus, note = "") {
    if (authSession) return advanceAdminWorkflow(lotId, nextStatus, note);
    transitionLot(lotId, demoStatus, note);
    return Promise.resolve(true);
  }

  async function decideOffer(lotId, offerId, decision) {
    if (authSession) {
      if (!supabase || profile?.role !== "collector" || !authSession.user?.id) {
        notify("A signed-in Collector account is required to decide offers.", "error");
        return;
      }
      const ownedLot = connectedData?.lots.find(item => item.id === lotId && item.collectorId === authSession.user.id);
      const targetOffer = ownedLot?.offers.find(item => item.id === offerId);
      if (!ownedLot || ownedLot.status !== "Offer submitted" || targetOffer?.status !== "pending") {
        notify("This offer is no longer pending or the lot is not accepting decisions. Refresh the marketplace.", "error");
        return;
      }
      if (!["accepted", "rejected"].includes(decision)) {
        notify("Choose accept or reject for a pending offer.", "error");
        return;
      }

      setDecisionBusyOfferId(offerId);
      try {
        const { error } = await supabase.rpc("respond_to_offer", {
          p_offer_id: offerId,
          p_decision: decision
        });
        if (error) throw error;
        setReloadToken(value => value + 1);
        notify(decision === "accepted"
          ? "Offer accepted. Pickup coordination is still required; this app does not confirm an appointment. Other pending offers on this lot were rejected. Refreshing marketplace data."
          : "Offer rejected. Other pending offers remain available for review; the lot reopens if none remain. Refreshing marketplace data.");
      } catch (error) {
        const detail = error.message || "The offer decision could not be saved.";
        const message = /no longer pending|not accepting offer decisions/i.test(detail)
          ? "This offer or lot has already changed. Refresh the marketplace before deciding again."
          : /Only the lot collector|Only a Collector/i.test(detail)
            ? "Only the Collector who owns this lot can decide its offers."
            : detail;
        notify(message, "error");
      } finally {
        setDecisionBusyOfferId(null);
      }
      return;
    }

    const lot = data.lots.find(item => item.id === lotId);
    const target = lot?.offers.find(item => item.id === offerId);
    const result = decideDemoOffer(lot, offerId, decision);
    if (!result.ok) {
      notify("This offer can no longer be changed.", "error"); return;
    }
    setData(prev => ({
      ...prev,
      lots: prev.lots.map(item => item.id === lotId ? result.lot : item),
      activity: logActivity(prev, `${lotId}: offer from ${target.recycler} ${decision === "accepted" ? "accepted; pickup coordination required" : "rejected"}`)
    }));
    if (decision === "accepted") {
      notify("Offer accepted. Pickup coordination is still required; this demo does not confirm an appointment.");
      return;
    }
    notify(result.lot.status === "Open" ? "Offer rejected. The lot is open for new offers." : "Offer rejected. Other offers are still pending.");
  }

  async function submitOffer(e) {
    e.preventDefault();
    const price = Number(offerPrice);
    if (!offerLot) { setOfferError("Choose a lot before submitting an offer."); return; }
    if (!Number.isFinite(price) || price <= 0 || price > 1000000000) { setOfferError("Enter an offer amount greater than ₹0 and no more than ₹1,000,000,000."); return; }
    if (offerMessage.trim().length > 500) { setOfferError("Offer message must be 500 characters or fewer."); return; }
    if (authSession) {
      if (profile?.role !== "recycler" || !authSession.user?.id || !supabase) {
        setOfferError("A signed-in Recycler account is required to submit a database offer.");
        return;
      }
      const currentLot = connectedData?.lots.find(lot => lot.id === offerLot.id);
      if (!currentLot || !["Open", "Offer submitted"].includes(currentLot.status)) {
        setOfferError("This lot is no longer accepting offers. Refresh the marketplace and try another lot.");
        return;
      }
      if (currentLot.offers.some(offer => offer.recyclerId === authSession.user.id)) {
        setOfferError("You have already submitted an offer for this lot.");
        return;
      }

      setOfferBusy(true);
      setOfferError("");
      try {
        const { error } = await supabase.from("offers").insert({
          lot_id: offerLot.id,
          recycler_id: authSession.user.id,
          amount: price,
          message: offerMessage.trim()
        });
        if (error) throw error;
        setOfferLot(null);
        setOfferPrice("");
        setOfferMessage("");
        setReloadToken(value => value + 1);
        notify("Offer submitted to Supabase. Your offers and marketplace history are refreshing.");
      } catch (error) {
        const message = error.code === "23505"
          ? "You have already submitted an offer for this lot. Each Recycler can offer once per lot."
          : error.code === "42501"
            ? "Supabase denied this offer. Confirm this account has the Recycler role and the lot is open for offers."
            : error.message?.includes("no longer accepting offers")
              ? "This lot is no longer accepting offers. Refresh the marketplace and try another lot."
              : error.message || "The offer could not be submitted. Please try again.";
        setOfferError(message);
        notify(message, "error");
      } finally {
        setOfferBusy(false);
      }
      return;
    }
    const latestLot = data.lots.find(lot => lot.id === offerLot.id);
    if (!latestLot || !["Open", "Offer submitted"].includes(latestLot.status)) { setOfferError("This lot is no longer accepting offers."); return; }
    if (latestLot.offers.some(offer => offer.recycler === DEMO_RECYCLER)) { setOfferError("This demo recycler has already submitted an offer for this lot."); return; }
    const usedOfferIds = data.lots.flatMap(lot => lot.offers.map(offer => offer.id));
    const offer = { id: createUniqueId("OF", usedOfferIds), recycler: DEMO_RECYCLER, price, message: offerMessage.trim() || "Offer submitted in demo", status: "pending" };
    setData(prev => ({
      ...prev,
      lots: prev.lots.map(lot => lot.id === offerLot.id ? { ...lot, offers: [...lot.offers, offer], status: lot.status === "Open" ? "Offer submitted" : lot.status } : lot),
      activity: logActivity(prev, `Demo offer submitted for ${offerLot.id}: ${money(price)}`)
    }));
    setOfferLot(null); setOfferPrice(""); setOfferMessage(""); setOfferError(""); notify("Demo offer saved locally. No real transaction was made.");
  }

  async function runTraceAction(kind, lotId, value) {
    if (!authSession || !supabase) return;
    try {
      if (kind === "weight") await recordHandoverWeight(lotId, value);
      else await raiseDispute(lotId, value);
      setReloadToken(v => v + 1);
      notify(kind === "weight"
        ? "Handover weight recorded. A difference above 10% is flagged for Admin review."
        : "Dispute raised. An Admin will review this lot. Refreshing marketplace data.");
    } catch (error) {
      notify(error.message || "The action could not be saved.", "error");
    }
  }
  const traceProps = { onWeight: (id, v) => runTraceAction("weight", id, v), onDispute: (id, v) => runTraceAction("dispute", id, v) };

  function exportData() {
    if (authSession) { notify("Demo export is available after signing out.", "error"); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "scarap-yukti-demo-data.json"; a.click();
    URL.revokeObjectURL(url); notify("Demo data export downloaded.");
  }

  const navigation = role === "Collector"
    ? [{ key: "overview", label: "Overview", icon: <Activity size={18} /> }, { key: "lots", label: "My lots", icon: <Package size={18} /> }, { key: "activity", label: "Activity", icon: <ClipboardList size={18} /> }]
    : role === "Recycler"
      ? [{ key: "overview", label: "Browse lots", icon: <Search size={18} /> }, { key: "my-offers", label: "My offers", icon: <Wallet size={18} /> }, { key: "activity", label: "Activity", icon: <ClipboardList size={18} /> }]
      : [{ key: "overview", label: "Marketplace monitor", icon: <ShieldCheck size={18} /> }, { key: "lots", label: "All lots & offers", icon: <Package size={18} /> }, { key: "activity", label: "Activity", icon: <ClipboardList size={18} /> }];
  const currentSection = navigation.some(item => item.key === section) ? section : "overview";
  const myOffers = viewData.lots.flatMap(lot => lot.offers.filter(offer => authSession
    ? offer.recyclerId === authSession.user.id
    : offer.recycler === DEMO_RECYCLER).map(offer => ({ ...offer, lot })));
  const collectorLots = viewData.lots.filter(lot => authSession
    ? lot.collectorId === authSession.user.id
    : lot.collector === DEMO_COLLECTOR);
  const collectorStats = [
    { label: "My lots", value: collectorLots.length, note: authSession ? "Visible to your account" : "Local demo records", icon: <Package />, tone: "teal" },
    { label: "Offers to review", value: collectorLots.flatMap(lot => lot.offers).filter(offer => offer.status === "pending").length, note: "Waiting for your decision", icon: <Wallet />, tone: "orange" },
    { label: "Pickup / recycling", value: collectorLots.filter(lot => ["Pickup scheduled", "Collected", "Recycling review"].includes(lot.status)).length, note: "In progress", icon: <Truck />, tone: "blue" },
    { label: "Recycled", value: collectorLots.filter(lot => lot.status === "Recycled").length, note: authSession ? "Database status" : "Demo status only", icon: <Recycle />, tone: "purple" }
  ];
  const recyclerStats = [
    { label: "Available lots", value: viewData.lots.filter(lot => ["Open", "Offer submitted"].includes(lot.status) && !lot.offers.some(offer => authSession ? offer.recyclerId === authSession.user.id : offer.recycler === DEMO_RECYCLER)).length, note: "Accepting offers", icon: <Search />, tone: "teal" },
    { label: "My offers", value: myOffers.length, note: authSession ? "Submitted by your account" : "Submitted by this demo recycler", icon: <Wallet />, tone: "blue" },
    { label: "Pending", value: myOffers.filter(item => item.status === "pending").length, note: "Awaiting collector decision", icon: <Activity />, tone: "orange" },
    { label: "Accepted", value: myOffers.filter(item => item.status === "accepted").length, note: authSession ? "Database offer status" : "Pickup coordination required in demo", icon: <Check />, tone: "purple" }
  ];
  const adminStats = [
    { label: "All lots", value: viewData.lots.length, note: authSession ? "Visible to your account" : "Across this browser workspace", icon: <Package />, tone: "teal" },
    { label: "Open workflow", value: activeLots, note: "Not yet marked recycled", icon: <Zap />, tone: "blue" },
    { label: "Offers", value: offerCount, note: `${pendingOfferCount} pending decision`, icon: <Wallet />, tone: "orange" },
    { label: "Recorded weight", value: `${totalWeight} kg`, note: authSession ? "Visible database records" : "Local demo records", icon: <Truck />, tone: "purple" }
  ];

  if (authInitializing || (!passwordRecovery && authSession && profileState === "loading")) {
    return <div className="auth-gate"><div className="auth-card"><span className="auth-spinner" /><h1>Loading your account</h1><p>Checking your sign-in and database profile…</p></div></div>;
  }
  if (passwordRecovery) {
    return <PasswordRecoveryGate
      password={recoveryPassword}
      setPassword={setRecoveryPassword}
      confirmPassword={recoveryPasswordConfirm}
      setConfirmPassword={setRecoveryPasswordConfirm}
      onSubmit={updateRecoveredPassword}
      busy={authBusy}
      message={authMessage}
      messageType={authMessageType}
      onSignOut={signOut}
    />;
  }
  if (authSession && profileState !== "ready") {
    return <div className="auth-gate"><div className="auth-card"><span className="eyebrow">ACCOUNT PROFILE</span><h1>We could not load your role</h1><p className="auth-message error" role="alert">{authMessage || "Your profile is missing or unavailable."}</p><p>Your database role must come from the profiles table. The app will not let you choose a role here.</p><button className="btn btn-light" onClick={signOut} disabled={authBusy}>{authBusy ? "Signing out…" : "Sign out"}</button></div></div>;
  }
  if (authSession && marketplaceState === "loading") {
    return <div className="auth-gate"><div className="auth-card"><span className="auth-spinner" /><h1>Loading marketplace records</h1><p>Reading lots, offers, activity, and workflow history allowed for your account…</p></div></div>;
  }
  if (authSession && marketplaceState === "error") {
    return <div className="auth-gate"><div className="auth-card"><span className="eyebrow">SUPABASE READ ERROR</span><h1>Marketplace data could not be loaded</h1><p className="auth-message error" role="alert">{marketplaceError}</p><p>Check that the migration is applied, the <code>public</code> schema is exposed to the Data API, and your signed-in role can read these rows under RLS.</p><div className="auth-form-actions"><button className="btn btn-primary" onClick={() => setReloadToken(value => value + 1)}>Try again</button><button className="btn btn-light" onClick={signOut} disabled={authBusy}>Sign out</button></div></div></div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Recycle size={23} /></div>
          <div><strong>Scarap_Yukti</strong><span>SMART E-WASTE NETWORK</span></div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          {navigation.map(item => <button key={item.key} type="button" className={`nav-item ${currentSection === item.key ? "active" : ""}`} aria-current={currentSection === item.key ? "page" : undefined} onClick={() => setSection(item.key)}><span className="nav-item-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.key === "lots" && role === "Admin" ? <span className="nav-count">{viewData.lots.length}</span> : null}{item.key === "my-offers" ? <span className="nav-count">{myOffers.length}</span> : null}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card"><ShieldCheck size={18} /><div><strong>{authSession ? "Supabase connected" : "Local demo only"}</strong><span>{authSession ? "Collector + Recycler actions · Admin workflow RPC" : "Not shared across users or devices"}</span></div></div>
          <div className="user-mini"><div className="avatar">SY</div><div><strong>{authSession ? profile?.display_name || authSession.user.email : "Scarap_Yukti"}</strong><span>{role} {authSession ? "account" : "view"}</span></div><ChevronDown size={16} /></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">Scarap_Yukti <span>/</span> <strong>Overview</strong></div>
          <div className="top-actions">
            <span className={authSession ? "connected-pill" : "demo-pill"}><span className="dot"></span> {authSession ? role === "Collector" ? "SUPABASE · READ + CREATE LOTS + OFFER DECISIONS" : role === "Recycler" ? "SUPABASE · READ + OFFERS" : "SUPABASE ADMIN WORKFLOW" : "DEMO DATA"}</span>
            <button className="icon-btn" title="Help" onClick={() => notify(authSession ? "Supabase reads, Collector lot creation, Recycler offer submission, and Collector offer decisions are connected. Payments and recycler verification are not connected. Admin workflow actions use the database RPC." : "This is a local frontend demo. The role selector does not sign you in or enforce secure permissions.")}><CircleHelp size={19} /></button>
            <button className="icon-btn" title="Notifications" onClick={() => notify(authSession ? "Supabase notifications are not connected yet." : "You are all caught up in this demo.")}><Bell size={19} /></button>
            {authSession && profile
              ? <span className="auth-role-pill">SIGNED IN · {role}</span>
              : <div className="role-picker"><Users size={17} /><select value={demoRole} onChange={e => { setDemoRole(e.target.value); setSection("overview"); setQuery(""); setStatusFilter("All statuses"); setCategoryFilter("All categories"); setLocationFilter("All locations"); }} aria-label="Choose demo dashboard"><option>Collector</option><option>Recycler</option><option>Admin</option></select><ChevronDown size={14} /></div>}
          </div>
        </header>

        <div className="content">
          <AuthPanel
            configured={hasSupabaseConfig}
            session={authSession}
            profile={profile}
            mode={authMode}
            setMode={mode => { setAuthMode(mode); setAuthFeedback(""); }}
            form={authForm}
            setForm={setAuthForm}
            onSubmit={submitAuth}
            onForgotPassword={sendPasswordRecovery}
            onSignOut={signOut}
            busy={authBusy}
            message={authMessage}
            messageType={authMessageType}
          />
          <section className="welcome-row" id="overview">
            <div><div className="eyebrow"><Sparkles size={14} /> {role.toUpperCase()} {authSession ? "CONNECTED DASHBOARD" : "DEMO DASHBOARD"}</div><h1>{role === "Collector" ? "Manage your e-waste lots" : role === "Recycler" ? "Find lots to recycle" : "Marketplace monitoring"}</h1><p>{authSession ? role === "Collector" ? "Records are loaded from Supabase. You can create lots and accept or reject incoming offers; later workflow updates are not connected yet." : role === "Recycler" ? "Records are loaded from Supabase. You can browse lots and submit offers; workflow updates are not connected yet." : "Records are loaded from Supabase. Admin workflow changes use the database RPC and its authorization checks." : "Local demo data only. The role selector changes this view; it does not sign you in or enforce secure permissions."}</p></div>
            <div className="welcome-actions">{!authSession && <button className="btn btn-light" onClick={exportData}><Download size={16} /> Export data</button>}{role === "Collector" && <button className="btn btn-primary" onClick={() => { setFormError(""); setShowForm(true); }}><Plus size={17} /> {authSession ? "Create Lot" : "Add e-waste lot"}</button>}</div>
          </section>
          <nav className="dashboard-nav" aria-label={`${role} dashboard sections`}>
            {navigation.map(item => <button key={item.key} type="button" className={`dashboard-tab ${currentSection === item.key ? "selected" : ""}`} aria-current={currentSection === item.key ? "page" : undefined} onClick={() => setSection(item.key)}><span className="dashboard-tab-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></button>)}
          </nav>
          <section className="stats-grid">
            {(role === "Collector" ? collectorStats : role === "Recycler" ? recyclerStats : adminStats).map(stat => <StatCard key={stat.label} {...stat} />)}
          </section>
          {currentSection === "activity" ? <ActivityPanel activity={viewData.activity} workflowEvents={viewData.workflowEvents} lots={viewData.lots} connected={Boolean(authSession)} ancillaryErrors={connectedData?.ancillaryErrors || []} onRetry={() => setReloadToken(value => value + 1)} retrying={marketplaceState === "loading"} /> : role === "Collector" ? <CollectorDashboard {...traceProps} lots={visibleLots.filter(lot => authSession ? lot.collectorId === authSession.user.id : lot.collector === DEMO_COLLECTOR)} allLotCount={collectorLots.length} query={query} setQuery={setQuery} onAdd={() => setShowForm(true)} onDecision={decideOffer} decisionBusyOfferId={decisionBusyOfferId} readOnly={Boolean(authSession)} /> : role === "Recycler" ? currentSection === "my-offers" ? <RecyclerOffers {...traceProps} offers={myOffers} connected={Boolean(authSession)} /> : <RecyclerDashboard lots={visibleLots.filter(lot => ["Open", "Offer submitted"].includes(lot.status))} query={query} setQuery={setQuery} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} locationFilter={locationFilter} setLocationFilter={setLocationFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} categories={categories} locations={locations} myOffers={myOffers} currentRecyclerId={authSession?.user?.id} readOnly={Boolean(authSession)} onOffer={lot => { setOfferLot(lot); setOfferPrice(""); setOfferMessage(""); setOfferError(""); }} /> : <AdminDashboard lots={visibleLots} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} evidenceDrafts={evidenceDrafts} setEvidenceDrafts={setEvidenceDrafts} disputeDrafts={disputeDrafts} setDisputeDrafts={setDisputeDrafts} onTransition={transitionLot} onConnectedTransition={handleAdminTransition} busyLotId={workflowBusyLotId} canManage={Boolean(authSession && profile?.role === "admin")} readOnly={Boolean(authSession)} />}
          <footer className="footer"><span>© 2026 Scarap_Yukti · Prototype workspace</span><span>{authSession ? "Supabase reads, Collector lot creation and offer decisions, Recycler offers, and Admin workflow RPC actions." : "Simulated workflow and recycling evidence; no verified recycler service."}</span></footer>
        </div>
      </main>

      {notice && <div className={`toast ${noticeType}`} role={noticeType === "error" ? "alert" : "status"}>{noticeType === "error" ? <CircleHelp size={17} /> : <Check size={17} />}<span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button></div>}

      {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !createBusy) setShowForm(false); }}><AccessibleDialog className="modal" labelledBy="create-lot-dialog-title" describedBy="create-lot-dialog-description" busy={createBusy} onClose={() => setShowForm(false)}><div className="modal-header"><div><span className="eyebrow">NEW RECORD</span><h2 id="create-lot-dialog-title">Add e-waste lot</h2><p id="create-lot-dialog-description">{authSession ? "This lot will be saved to the marketplace under your Collector account." : "Enter the details you know. This demo does not verify claims."}</p></div><button type="button" className="icon-btn" onClick={() => !createBusy && setShowForm(false)} aria-label="Close dialog"><X size={20} /></button></div>
        <form onSubmit={createLot} className="form-grid">
          <label className="full">Lot name<input data-dialog-initial-focus="true" required maxLength="100" value={form.title} onChange={e => { setForm({ ...form, title: e.target.value }); setFormError(""); }} placeholder="e.g. Used laptop batch" /></label>
          <label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option>Computers</option><option>Displays</option><option>Small electronics</option><option>Phones and tablets</option><option>Batteries</option><option>Mixed e-waste</option><option>Other</option></select></label>
          <label>Estimated weight (kg)<input type="number" min="0.1" max="100000" step="0.1" required value={form.weight} onChange={e => { setForm({ ...form, weight: e.target.value }); setFormError(""); }} placeholder="e.g. 18.5" /></label>
          <label className="full">Approximate pickup area<input required minLength="2" maxLength="160" value={form.location} onChange={e => { setForm({ ...form, location: e.target.value }); setFormError(""); }} placeholder="Area, city" /></label>
          <label className="full">Notes (optional)<textarea rows="3" maxLength="500" value={form.notes} onChange={e => { setForm({ ...form, notes: e.target.value }); setFormError(""); }} placeholder="Condition and items included..." /></label>
          {formError && <div className="form-error full" role="alert">{formError}</div>}
          <div className="form-note full"><ShieldCheck size={16} /><span>{authSession ? "Saved using your signed-in session. Database row-level security checks that you are a Collector and assigns ownership to your account." : "This record stays in this browser. It is not shared with other users or devices."}<br /><strong>Privacy:</strong> Recyclers who can view this lot can see its location and notes. Use an approximate area/city only; never enter an exact home address, phone number, or other private contact details.</span></div>
          <div className="modal-actions full"><button type="button" className="btn btn-light" onClick={() => !createBusy && setShowForm(false)} disabled={createBusy}>Cancel</button><button className="btn btn-primary" type="submit" disabled={createBusy}><Plus size={16} /> {createBusy ? "Saving…" : authSession ? "Create lot" : "Save lot"}</button></div>
        </form>
      </AccessibleDialog></div>}

      {offerLot && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !offerBusy) setOfferLot(null); }}><AccessibleDialog className="modal modal-narrow" labelledBy="offer-dialog-title" describedBy="offer-dialog-description" busy={offerBusy} onClose={() => setOfferLot(null)}><div className="modal-header"><div><span className="eyebrow">{authSession ? "SUPABASE OFFER" : "DEMO OFFER"}</span><h2 id="offer-dialog-title">Make an offer</h2><p id="offer-dialog-description">{offerLot.title} · {offerLot.id} · {offerLot.weight} kg</p></div><button type="button" className="icon-btn" onClick={() => !offerBusy && setOfferLot(null)} aria-label="Close dialog"><X size={20} /></button></div>
        <form onSubmit={submitOffer} className="form-grid"><label className="full">Offer amount (₹)<input data-dialog-initial-focus="true" type="number" min="0.01" max="1000000000" step="0.01" required value={offerPrice} onChange={e => { setOfferPrice(e.target.value); setOfferError(""); }} placeholder={authSession ? "Enter your offer amount" : "Enter a demo amount"} /></label><label className="full">Message (optional)<textarea rows="3" maxLength="500" value={offerMessage} onChange={e => { setOfferMessage(e.target.value); setOfferError(""); }} placeholder="Pickup terms or inspection notes" /></label>{offerError && <div className="form-error full" role="alert">{offerError}</div>}<div className="form-note full">{authSession ? "Your offer is sent using your signed-in Recycler account and checked by database RLS." : "This simulated offer is saved only in this browser. It is not a live market quote or payment commitment."}</div><div className="modal-actions full"><button type="button" className="btn btn-light" onClick={() => !offerBusy && setOfferLot(null)} disabled={offerBusy}>Cancel</button><button className="btn btn-primary" type="submit" disabled={offerBusy}>{offerBusy ? "Submitting…" : authSession ? "Submit offer" : "Submit demo offer"}</button></div></form>
      </AccessibleDialog></div>}
    </div>
  );
}

function PasswordRecoveryGate({ password, setPassword, confirmPassword, setConfirmPassword, onSubmit, busy, message, messageType, onSignOut }) {
  return <div className="auth-gate"><section className="auth-card recovery-card">
    <span className="eyebrow"><ShieldCheck size={14} /> ACCOUNT RECOVERY</span>
    <h1>Choose a new password</h1>
    <p>This form is available after opening a recovery link from Supabase. Choose a password with at least 8 characters.</p>
    <form className="recovery-form" onSubmit={onSubmit}>
      <label>New password<input type="password" autoComplete="new-password" minLength="8" required value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" minLength="8" required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
      {message && <p className={`auth-message ${messageType}`} role={messageType === "error" ? "alert" : "status"}>{message}</p>}
      <div className="auth-form-actions"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</button><button className="btn btn-light" type="button" onClick={onSignOut} disabled={busy}>Sign out</button></div>
    </form>
  </section></div>;
}

function AuthPanel({ configured, session, profile, mode, setMode, form, setForm, onSubmit, onForgotPassword, onSignOut, busy, message, messageType }) {
  return <section className={`auth-panel ${session ? "connected" : ""}`} aria-label="Supabase authentication">
    <div className="auth-panel-intro">
      <span className="eyebrow"><ShieldCheck size={14} /> AUTHENTICATION · PHASE 1</span>
      <strong>{session && profile ? `Signed in as ${profile.display_name || session.user.email}` : "Supabase account"}</strong>
      <span>{session && profile ? `Database role: ${profile.role}. Role comes from your profiles row.` : "Sign in to load your Supabase profile. Demo marketplace records remain separate."}</span>
    </div>
    {session && profile ? <div className="auth-panel-actions">
      <span className="auth-role-pill">{profile.role.toUpperCase()}</span>
      <button type="button" className="btn btn-light btn-small" onClick={onSignOut} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>
      <p className="auth-demo-note">Lots, offers, activity, and workflow history are loaded from Supabase. Collectors can create lots and decide pending offers; Recyclers can submit offers; Admins can advance workflow through the database RPC.</p>
    </div> : !configured ? <div className="auth-config-note" role="status">
      <strong>Authentication is not configured yet.</strong>
      <span>Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase URL and publishable key, then restart Vite. The existing demo continues to work.</span>
    </div> : <form className="auth-form" onSubmit={onSubmit}>
      {mode === "signup" && <label>Name (optional)<input type="text" maxLength="100" autoComplete="name" value={form.displayName} onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))} /></label>}
      <label>Email<input type="email" autoComplete="email" required value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} /></label>
      <label>Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} /></label>
      <div className="auth-form-actions"><button className="btn btn-primary btn-small" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button><button className="auth-mode-toggle" type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} disabled={busy}>{mode === "signup" ? "Already registered? Sign in" : "New here? Create an account"}</button>{mode === "signin" && <button className="auth-mode-toggle" type="button" onClick={onForgotPassword} disabled={busy}>Forgot password?</button>}</div>
      {message && <p className={`auth-message ${messageType}`} role={messageType === "error" ? "alert" : "status"}>{message}</p>}
      <p className="auth-demo-note">After sign-in, marketplace data loads from Supabase. New accounts receive the Collector role from the database; users cannot choose or promote their own role here.</p>
    </form>}
    {session && profile && message && <p className={`auth-message ${messageType}`} role={messageType === "error" ? "alert" : "status"}>{message}</p>}
  </section>;
}

function AccessibleDialog({ children, className, labelledBy, describedBy, busy, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    if (!dialog) return undefined;

    const focusableElements = () => [...dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter(element => element.getClientRects().length > 0 && element.getAttribute("aria-hidden") !== "true");

    const initialFocus = dialog.querySelector("[data-dialog-initial-focus]") || focusableElements()[0] || dialog;
    initialFocus.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (!busyRef.current) {
          event.preventDefault();
          closeRef.current();
        }
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  return <div ref={dialogRef} className={className} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1}>{children}</div>;
}

function ActivityPanel({ activity, workflowEvents = [], lots = [], connected = false, ancillaryErrors = [], onRetry, retrying = false }) {
  const lotNames = new Map(lots.map(lot => [lot.id, lot.title]));
  const activityUnavailable = ancillaryErrors.includes("activity");
  const workflowUnavailable = ancillaryErrors.includes("workflow");
  const unavailableLabels = [activityUnavailable && "activity history", workflowUnavailable && "workflow events"].filter(Boolean);
  return <section className="panel activity-panel dashboard-panel">
    <div className="panel-heading"><div><h2>{connected ? "Marketplace history" : "Recent activity"}</h2><p>{connected ? "Read-only history returned by your Supabase RLS policies." : "Local demo workflow history."}</p></div><Activity size={19} className="muted-icon" /></div>
    {connected && unavailableLabels.length > 0 && <div className="inline-hint history-read-warning" role="status"><span>Marketplace lots and offers loaded, but {unavailableLabels.join(" and ")} could not be loaded.</span><button type="button" className="btn btn-light btn-small" onClick={onRetry} disabled={retrying}>{retrying ? "Retrying…" : "Retry history"}</button></div>}
    <div className="history-columns">
      <div><h3>{connected ? "Activity history" : "Activity"}</h3>
        {activity.length ? <div className="activity-list">{activity.slice(0, 20).map((item, i) => <div className="activity-item" key={item.id}><div className={`activity-marker marker-${i % 3}`}><Check size={14} /></div><div className="activity-copy"><strong>{item.text}</strong><span>{item.time}{item.lotId ? ` · ${lotNames.get(item.lotId) || "Marketplace lot"}` : ""}</span></div></div>)}</div> : <EmptyState title={activityUnavailable ? "Activity history unavailable" : "No activity yet"} detail={activityUnavailable ? "The activity query failed. Retry to check again." : connected ? "No activity-history rows are visible for this account." : "Actions in this local demo will appear here."} />}
      </div>
      {connected && <div><h3>Workflow events</h3>
        {workflowEvents.length ? <div className="activity-list">{workflowEvents.slice(0, 20).map((item, i) => <div className="activity-item" key={item.id}><div className={`activity-marker marker-${i % 3}`}><Package size={14} /></div><div className="activity-copy"><strong>{item.fromStatus ? `${statusLabel(item.fromStatus)} → ${statusLabel(item.toStatus)}` : statusLabel(item.toStatus)} · {item.eventType}</strong><span>{item.note || "No event note"}{item.lotId ? ` · ${lotNames.get(item.lotId) || "Marketplace lot"}` : ""} · {item.time}</span></div></div>)}</div> : <EmptyState title={workflowUnavailable ? "Workflow history unavailable" : "No workflow events yet"} detail={workflowUnavailable ? "The workflow-history query failed. Retry to check again." : "No workflow-event rows are visible for this account."} />}
      </div>}
    </div>
  </section>;
}

function LotFilters({ query, setQuery, statusFilter, setStatusFilter, categories, categoryFilter, setCategoryFilter, locations, locationFilter, setLocationFilter, includeCategory = false, includeLocation = false }) {
  return <div className="filters role-filters">
    <div className="search-box"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search lot, category or location..." aria-label="Search lots" /></div>
    {includeCategory && <div className="filter-select"><Filter size={16} /><select aria-label="Filter by category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option>All categories</option>{categories.map(item => <option key={item}>{item}</option>)}</select></div>}
    {includeLocation && <div className="filter-select"><MapPin size={15} /><select aria-label="Filter by location" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}><option>All locations</option>{locations.map(item => <option key={item}>{item}</option>)}</select></div>}
    <div className="filter-select"><Filter size={16} /><select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All statuses</option>{statusOptions.map(item => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></div>
  </div>;
}

function CollectorDashboard({ onWeight, onDispute, lots, allLotCount, query, setQuery, onAdd, onDecision, decisionBusyOfferId, readOnly = false }) {
  return <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>My e-waste lots</h2><p>{readOnly ? "Supabase lot and offer records. Accept/reject decisions are checked by the database; other workflow updates are not connected." : "Compare recycler offers, then accept or reject each pending offer."}</p></div><span className={readOnly ? "connected-label" : "demo-label"}>{readOnly ? "CONNECTED COLLECTOR" : "DEMO COLLECTOR"}</span></div>
    <div className="filters role-filters"><div className="search-box"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search my lots..." aria-label="Search my lots" /></div><span className="filters-note">Showing {lots.length} of {allLotCount} lots</span></div>
    {lots.length ? <div className="lot-card-list">{lots.map(lot => <article className="workflow-card" key={lot.id}>
      <LotHeading lot={lot} />
      <div className="lot-meta-grid"><span><strong>{lot.weight} kg</strong><small>Estimated weight</small></span><span><MapPin size={14} /> {lot.location}<small>Approximate pickup area</small></span><span><strong>{shortDate(lot.date)}</strong><small>Created</small></span></div>
      {lot.notes && <p className="lot-notes">{lot.notes}</p>}
      <div className="workflow-progress"><span>Pickup and recycling status</span><strong>{statusLabel(lot.status)}</strong><ProgressTrack status={lot.status} /></div>
      <LotTraceActions lot={lot} mode={readOnly ? "collector" : "info"} onWeight={onWeight} onDispute={onDispute} />
      {lot.status === "Recycling review" && lot.evidence && <div className="evidence-note"><ShieldCheck size={15} /><div><strong>{readOnly ? "Evidence/review note · not independently verified" : "Demo evidence submitted"}</strong><span>{lot.evidence}</span></div></div>}
      <div className="offers-heading"><strong>Offers received ({lot.offers.length})</strong><span>Compare amounts and terms before deciding</span></div>
      {lot.offers.length ? <div className="offer-grid">{lot.offers.slice().sort((a, b) => b.price - a.price).map(offer => <article className={`offer-card ${offer.status}`} key={offer.id}><div className="offer-card-top"><strong>{offer.recycler}</strong><OfferStatusPill status={offer.status} /></div><div className="offer-price">{money(offer.price)}</div><p>{offer.message || "No message provided."}</p>{offer.status === "pending" && lot.status === "Offer submitted" ? <div className="offer-actions"><button className="btn btn-light btn-small" disabled={Boolean(decisionBusyOfferId)} onClick={() => onDecision(lot.id, offer.id, "rejected")}>{decisionBusyOfferId === offer.id ? "Saving…" : "Reject"}</button><button className="btn btn-primary btn-small" disabled={Boolean(decisionBusyOfferId)} onClick={() => onDecision(lot.id, offer.id, "accepted")}>{decisionBusyOfferId === offer.id ? "Saving…" : "Accept offer"}</button></div> : null}</article>)}</div> : <EmptyState title="No offers yet" detail="Recycler offers will appear here for comparison." compact />}
    </article>)}</div> : <EmptyState title={query ? "No matching lots" : "No lots available"} detail={query ? "Try a different search." : readOnly ? "This account has no visible lots yet." : "Create a lot to start your demo workflow."} action={!query ? <button className="btn btn-primary" onClick={onAdd}><Plus size={16} /> {readOnly ? "Create Lot" : "Create first lot"}</button> : null} />}
  </section>;
}

function RecyclerDashboard({ lots, query, setQuery, categoryFilter, setCategoryFilter, locationFilter, setLocationFilter, statusFilter, setStatusFilter, categories, locations, myOffers, currentRecyclerId, readOnly = false, onOffer }) {
  return <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Available lots</h2><p>{readOnly ? "Browse lots visible to your account and submit one offer per lot." : "Browse open lots and submit one offer per lot as the demo recycler."}</p></div><span className={readOnly ? "connected-label" : "demo-label"}>{readOnly ? "CONNECTED RECYCLER" : "DEMO RECYCLER"}</span></div>
    <div className="inline-hint"><ShieldCheck size={15} /> Lot locations and notes are listing details, not private contact fields. After an offer is accepted, pickup must be coordinated separately; this app does not schedule or confirm an appointment.</div>
    {readOnly && <div className="inline-hint"><ShieldCheck size={15} /> Offer rows follow the database policy: recyclers can see their own offers; offers on lots they do not own may not be visible.</div>}
    <LotFilters query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} categories={categories} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} locations={locations} locationFilter={locationFilter} setLocationFilter={setLocationFilter} includeCategory includeLocation />
    {lots.length ? <div className="lot-card-list">{lots.map(lot => { const submitted = lot.offers.find(offer => currentRecyclerId ? offer.recyclerId === currentRecyclerId : offer.recycler === DEMO_RECYCLER); return <article className="workflow-card recycler-lot" key={lot.id}>
      <LotHeading lot={lot} />
      <p className="lot-notes">{lot.notes || "No additional lot notes provided."}</p>
      <div className="lot-meta-grid"><span><strong>{lot.weight} kg</strong><small>Estimated weight</small></span><span><MapPin size={14} /> {lot.location}<small>Approximate pickup area</small></span><span><strong>{lot.offers.filter(offer => currentRecyclerId ? offer.recyclerId !== currentRecyclerId : offer.recycler !== DEMO_RECYCLER).length}</strong><small>{readOnly ? "Other visible offers" : "Other offers"}</small></span></div>
      <div className="recycler-card-action">{submitted ? <><span>Your offer: <strong>{money(submitted.price)}</strong></span><OfferStatusPill status={submitted.status} /></> : <button className="btn btn-primary" onClick={() => onOffer(lot)}><Wallet size={15} /> {readOnly ? "Submit offer" : "Submit demo offer"}</button>}</div>
    </article>; })}</div> : <EmptyState title="No available lots match" detail="Change the category, location, status, or search filters." />}
    {myOffers.length > 0 && <div className="inline-hint"><Activity size={15} /> Your {myOffers.length} submitted {myOffers.length === 1 ? "offer is" : "offers are"} tracked in the My offers section.</div>}
  </section>;
}

function RecyclerOffers({ offers, connected = false, onWeight, onDispute }) {
  return <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>My submitted offers</h2><p>Follow collector decisions and the associated lot workflow.</p></div><span className={connected ? "connected-label" : "demo-label"}>{connected ? "CONNECTED RECYCLER" : "DEMO RECYCLER"}</span></div>
    {offers.length ? <div className="lot-card-list">{offers.map(offer => <article className="workflow-card compact-card" key={offer.id}><div className="offer-card-top"><div><strong>{offer.lot.title}</strong><small>{offer.lot.id} · {offer.lot.category} · {offer.lot.location}</small></div><OfferStatusPill status={offer.status} /></div><div className="submitted-offer-details"><span className="offer-price">{money(offer.price)}</span><span>Lot status <StatusPill status={offer.lot.status} /></span></div><p className="lot-notes">{offer.message}</p>{connected && offer.status === "accepted" && <LotTraceActions lot={offer.lot} mode="recycler" onWeight={onWeight} onDispute={onDispute} />}</article>)}</div> : <EmptyState title="No offers submitted" detail={connected ? "Submit an offer from an available lot to see it here." : "Browse available lots and submit a demo offer to see it here."} />}
  </section>;
}

function AdminDashboard({ lots, query, setQuery, statusFilter, setStatusFilter, evidenceDrafts, setEvidenceDrafts, disputeDrafts, setDisputeDrafts, onTransition, onConnectedTransition, busyLotId, canManage = false, readOnly = false }) {
  const runTransition = (lotId, nextStatus, demoStatus, note = "") => readOnly
    ? onConnectedTransition(lotId, nextStatus, demoStatus, note)
    : onTransition(lotId, demoStatus, note);
  const busy = lotId => Boolean(busyLotId) && busyLotId === lotId;
  const disabled = () => Boolean(busyLotId);
  const rpcControls = canManage && readOnly;
  const disputeStatuses = ["Open", "Offer submitted", "Pickup scheduled", "Collected", "Recycling review"];
  return <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>All marketplace lots and offers</h2><p>{readOnly ? "Connected workflow controls use the database Admin RPC. The demo remains browser-only." : "Monitor each workflow step and review local demo evidence notes."}</p></div><span className={readOnly ? "connected-label warning" : "demo-label warning"}>{readOnly ? "CONNECTED ADMIN · RPC CONTROLLED" : "ADMIN VIEW · DEMO ONLY"}</span></div>
    <div className="admin-callout"><ShieldCheck size={17} /><span>{readOnly ? "Status and evidence changes are checked by the database RPC and RLS. An evidence note is text for review; it does not independently verify collection or recycling." : "Monitoring controls change browser data only. No users, recyclers, permits, or recycling outcomes are actually verified."}</span></div>
    <LotFilters query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
    {lots.length ? <div className="lot-card-list">{lots.map(lot => <article className="workflow-card" key={lot.id}>
      <LotHeading lot={lot} /><div className="admin-lot-topline"><span>Collector: {lot.collector || DEMO_COLLECTOR}</span><span>{lot.weight} kg · {lot.location}</span></div>
      <ProgressTrack status={lot.status} />
      <LotTraceActions lot={lot} mode="info" />
      <div className="admin-offers"><strong>Offers ({lot.offers.length})</strong>{lot.offers.length ? lot.offers.map(offer => <div className="admin-offer-row" key={offer.id}><span><strong>{offer.recycler}</strong><small>{offer.message}</small></span><b>{money(offer.price)}</b><OfferStatusPill status={offer.status} /></div>) : <p>No offers submitted.</p>}</div>
      {(!readOnly || canManage) && lot.status === "Pickup scheduled" && <div className="admin-action-row"><span>{readOnly ? "Coordinate pickup separately; mark collected only after handover has happened." : "No appointment is scheduled by this demo. Record collection only after the demo handover."}</span><button className="btn btn-light btn-small" disabled={disabled(lot.id)} onClick={() => runTransition(lot.id, "collected", "Collected")}>{busy(lot.id) ? "Saving…" : "Mark collected"}</button></div>}
      {(!readOnly || canManage) && lot.status === "Collected" && <div className="evidence-entry"><label>{readOnly ? "Evidence / review note (10–500 characters)" : "Demo recycling evidence / review notes"}<textarea rows="2" minLength="10" maxLength="500" value={evidenceDrafts[lot.id] || ""} onChange={e => setEvidenceDrafts(prev => ({ ...prev, [lot.id]: e.target.value }))} placeholder="Describe the evidence or review note" /></label><button className="btn btn-primary btn-small" disabled={disabled(lot.id)} onClick={() => runTransition(lot.id, "recycling_review", "Recycling review", evidenceDrafts[lot.id] || "")}>{busy(lot.id) ? "Saving…" : "Submit for recycling review"}</button></div>}
      {lot.status === "Recycling review" && <div className="evidence-note"><ShieldCheck size={15} /><div><strong>{readOnly ? "Evidence/review note · not independently verified" : "Evidence note on file · demo only"}</strong><span>{lot.evidence}</span></div>{(!readOnly || canManage) && <button className="btn btn-primary btn-small" disabled={disabled(lot.id)} onClick={() => runTransition(lot.id, "recycled", "Recycled")}>{busy(lot.id) ? "Saving…" : "Mark recycled"}</button>}</div>}
      {(!readOnly || canManage) && lot.status === "Recycled" && <div className="completed-note"><Check size={15} /> {readOnly ? "Marked recycled in the database workflow." : "Marked recycled in local demo · this is not independently verified."}</div>}
      {canManage && disputeStatuses.includes(lot.status) && <div className="evidence-entry"><label>Dispute reason (10–500 characters)<textarea rows="2" minLength="10" maxLength="500" value={disputeDrafts[lot.id] || ""} onChange={e => setDisputeDrafts(prev => ({ ...prev, [lot.id]: e.target.value }))} placeholder="Explain why this lot needs Admin review" /></label><button className="btn btn-light btn-small" disabled={disabled(lot.id)} onClick={() => runTransition(lot.id, "disputed", "Disputed", disputeDrafts[lot.id] || "")}>{busy(lot.id) ? "Saving…" : "Flag for review"}</button></div>}
      {canManage && lot.status === "Disputed" && <div className="admin-action-row"><span>Workflow paused for Admin review. The original status is saved by the database.</span><button className="btn btn-light btn-small" disabled={disabled(lot.id)} onClick={() => runTransition(lot.id, "resume", "Open")}>{busy(lot.id) ? "Saving…" : "Resume workflow"}</button></div>}
    </article>)}</div> : <EmptyState title="No lots match these filters" detail="Clear or change the filters to see marketplace records." />}
  </section>;
}

const DISPUTE_FROM = ["Pickup scheduled", "Collected", "Recycling review"];

function LotTraceActions({ lot, mode, onWeight, onDispute }) {
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn, value) => {
    setBusy(true);
    try { await fn(lot.id, value); setWeight(""); setNote(""); } finally { setBusy(false); }
  };
  const canWeigh = mode === "recycler" && lot.status === "Collected" && !lot.actualWeight;
  const canDispute = (mode === "recycler" || mode === "collector") && DISPUTE_FROM.includes(lot.status);
  const flagged = Number(lot.discrepancyPct) > 10;
  if (!lot.actualWeight && !canWeigh && !canDispute) return null;
  return <div className="trace-actions">
    {lot.actualWeight ? <div className={`inline-hint ${flagged ? "warning" : ""}`}><ShieldCheck size={15} /> Handover weight: <strong>{lot.actualWeight} kg</strong> vs estimated {lot.weight} kg · difference {lot.discrepancyPct}%{flagged ? " · flagged for Admin review" : ""}. Recorded by the accepted recycler; not independently verified.</div> : null}
    {canWeigh && <div className="evidence-entry"><label>Actual handover weight (kg)<input type="number" min="0.1" max="100000" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 9.5" /></label><button className="btn btn-primary btn-small" disabled={busy || !weight} onClick={() => run(onWeight, weight)}>{busy ? "Saving…" : "Record weight"}</button></div>}
    {canDispute && <div className="evidence-entry"><label>Raise a dispute (10–500 characters)<textarea rows="2" minLength="10" maxLength="500" value={note} onChange={e => setNote(e.target.value)} placeholder="Describe the problem for Admin review" /></label><button className="btn btn-light btn-small" disabled={busy || note.trim().length < 10} onClick={() => run(onDispute, note)}>{busy ? "Saving…" : "Raise dispute"}</button></div>}
  </div>;
}

function LotHeading({ lot }) {
  return <div className="workflow-heading"><div className="lot-title"><div className="lot-icon"><Package size={17} /></div><div><strong>{lot.title}</strong><span>{lot.id} · {lot.category} · Added {shortDate(lot.date)}</span></div></div><StatusPill status={lot.status} /></div>;
}

function ProgressTrack({ status }) {
  const stages = ["Open", "Offer submitted", "Pickup scheduled", "Collected", "Recycling review", "Recycled"];
  const index = stages.indexOf(status);
  return <div className="progress-track" aria-label={`Workflow status: ${statusLabel(status)}`}>{stages.map((stage, i) => <span className={i <= index ? "done" : ""} key={stage} title={statusLabel(stage)}></span>)}</div>;
}

function OfferStatusPill({ status }) {
  const labels = { pending: "Pending", accepted: "Accepted", rejected: "Rejected" };
  return <span className={`offer-status ${status}`}><i></i>{labels[status] || status}</span>;
}

function EmptyState({ title, detail, action, compact = false }) {
  return <div className={`empty-state role-empty ${compact ? "compact" : ""}`}><Package size={25} /><strong>{title}</strong><span>{detail}</span>{action}</div>;
}

function StatCard({ label, value, note, icon, tone }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${tone}`}>{icon}</div></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>;
}
function StatusPill({ status }) {
  const cls = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`status-pill ${cls}`}><span></span>{statusLabel(status)}</span>;
}

function statusLabel(status) {
  return status === "Pickup scheduled" ? "Accepted - coordinate pickup" : status;
}
