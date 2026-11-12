import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, Bell, Check, CheckCircle2, ChevronDown, CircleHelp, ClipboardList, Download, Edit3, Menu,
  Eye, EyeOff, Filter, Leaf, Lock, MapPin, Package, Plus, Recycle, RefreshCw, Scale, Search, ShieldCheck, Sparkles,
  Truck, Users, Wallet, X, Zap
} from "lucide-react";
import { hasSupabaseConfig, supabase } from "./lib/supabase.js";
import { loadMarketplaceSnapshot } from "./lib/marketplaceReads.js";
import { subscribeToMarketplaceChanges } from "./lib/marketplaceRealtime.js";
import { raiseDispute, recordHandoverWeight, updateLotDetails } from "./lib/lotActions.js";
import { validateListingPrivacy } from "./lib/privacyRules.js";
import { EditLotModal } from "./components/EditLotModal.jsx";
import { OperationalSummary } from "./components/OperationalSummary.jsx";
import { SellerWorkspaceView } from "./components/SellerWorkspaceView.jsx";
import { CollectorWorkspaceView } from "./components/CollectorWorkspaceView.jsx";
import { RecyclerWorkspaceView } from "./components/RecyclerWorkspaceView.jsx";
import { AdminWorkspaceView } from "./components/AdminWorkspaceView.jsx";
import { LandingPage } from "./components/LandingPage.jsx";
import { ThemeToggle } from "./components/ThemeToggle.jsx";
import { ProfileMenuDropdown, RoleSwitcherDropdown } from "./components/AccessibleMenus.jsx";
import {
  readDemoState,
  writeDemoState,
  resetDemoState,
  getInitialDemoState,
  DEMO_SELLER,
  DEMO_COLLECTOR,
  DEMO_RECYCLER
} from "./lib/demoStore.js";
import { buildLotsCsv } from "./lib/exportUtils.js";
import { toCanonicalKg, WEIGHT_UNITS, formatWeightDisplay } from "./lib/quantityUnits.js";
import { validateLotFormInputs } from "./lib/lotFormValidation.js";
import { DiscardChangesBanner } from "./components/DiscardChangesBanner.jsx";
import { LotFormFields } from "./components/LotFormFields.jsx";
import { getTraceabilityActionState } from "./lib/traceabilityView.js";
import { applyDemoWorkflowTransition, decideDemoOffer } from "./lib/workflowRules.js";
import { normalizeDemoPickupAppointment, respondToDemoPickupAppointment, validatePickupSchedule, validateRescheduleRequest } from "./lib/pickupAppointmentRules.js";

const STORAGE_KEY = "scarap-yukti-demo-v1";
const initialDemoState = getInitialDemoState();
const starterLots = initialDemoState.lots;
const starterSellerScrap = initialDemoState.availableSellerScrap;
const seed = { lots: starterLots, activity: initialDemoState.activity };
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
  const id = safeString(item.id, `SY-legacy-${index + 1}`);
  const weight = Number(item.weight);
  const legacyStatus = item.status === "Offer received" ? "Offer submitted" : item.status === "Recycling documented" ? "Recycling review" : item.status;
  const status = statusOptions.includes(legacyStatus) ? legacyStatus : "Open";
  const date = typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    ? item.date
    : new Date().toISOString().slice(0, 10);
  return {
    id,
    collector: safeString(item.collector, DEMO_COLLECTOR),
    seller: safeString(item.seller),
    title: safeString(item.title, "Untitled lot"),
    category: safeString(item.category, "Other"),
    weight: Number.isFinite(weight) && weight >= 0 ? weight : 0,
    actualWeight: typeof item.actualWeight === "number" ? item.actualWeight : undefined,
    location: safeString(item.location, "Location not provided"),
    date,
    status,
    notes: safeString(item.notes),
    evidence: safeString(item.evidence),
    pickupAppointment: normalizeDemoPickupAppointment(item.pickupAppointment, id),
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
    const demo = readDemoState();
    if (demo && Array.isArray(demo.lots) && demo.lots.length > 0) {
      return {
        lots: demo.lots.map(normalizeLot),
        activity: Array.isArray(demo.activity) ? demo.activity : seed.activity
      };
    }
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
  const [demoAccess, setDemoAccess] = useState(false);
  const [authViewOpen, setAuthViewOpen] = useState(false);
  const [availableSellerScrap, setAvailableSellerScrap] = useState(() => {
    try {
      const demo = readDemoState();
      return demo?.availableSellerScrap || starterSellerScrap;
    } catch {
      return starterSellerScrap;
    }
  });
  const [collectionWork, setCollectionWork] = useState(() => {
    try {
      const demo = readDemoState();
      return demo?.collectionWork || [];
    } catch {
      return [];
    }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const authUserId = useRef(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileState, setProfileState] = useState("idle");
  const [connectedData, setConnectedData] = useState(null);
  const hasMarketplaceSnapshot = useRef(false);
  const [marketplaceState, setMarketplaceState] = useState("idle");
  const [marketplaceRefreshing, setMarketplaceRefreshing] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("idle");
  const [reloadToken, setReloadToken] = useState(0);
  const [authMode, setAuthMode] = useState("signin");
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authMessageType, setAuthMessageType] = useState("success");
  const [rememberEmail, setRememberEmail] = useState(() => {
    try {
      return Boolean(localStorage.getItem("scarap_remembered_email"));
    } catch {
      return false;
    }
  });
  const [authForm, setAuthForm] = useState(() => {
    let savedEmail = "";
    try {
      savedEmail = localStorage.getItem("scarap_remembered_email") || "";
    } catch {}
    return { displayName: "", email: savedEmail, password: "", role: "seller" };
  });
  const [section, setSection] = useState("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [locationFilter, setLocationFilter] = useState("All locations");
  const [evidenceDrafts, setEvidenceDrafts] = useState({});
  const [disputeDrafts, setDisputeDrafts] = useState({});
  const [workflowBusyLotId, setWorkflowBusyLotId] = useState(null);
  const [pickupBusyLotId, setPickupBusyLotId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [editLotTarget, setEditLotTarget] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [offerLot, setOfferLot] = useState(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [decisionBusyOfferId, setDecisionBusyOfferId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [offerError, setOfferError] = useState(null);
  const [form, setForm] = useState({ title: "", category: "Computers", weight: "", weightUnit: WEIGHT_UNITS.KG, location: "", notes: "" });
  const [confirmCreateDiscard, setConfirmCreateDiscard] = useState(false);
  const [confirmOfferDiscard, setConfirmOfferDiscard] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const createTitleRef = useRef(null);
  const createCategoryRef = useRef(null);
  const createWeightRef = useRef(null);
  const createLocationRef = useRef(null);
  const createNotesRef = useRef(null);
  const createFieldRefs = {
    title: createTitleRef,
    category: createCategoryRef,
    weight: createWeightRef,
    location: createLocationRef,
    notes: createNotesRef
  };
  const offerPriceRef = useRef(null);
  const offerMessageRef = useRef(null);

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
        hasMarketplaceSnapshot.current = false;
        setMarketplaceState(session ? "loading" : "idle");
        setMarketplaceRefreshing(false);
        setMarketplaceError("");
        setRealtimeStatus(session ? "connecting" : "idle");
        setShowForm(false);
        setOfferLot(null);
      }
      setAuthInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = (window.location.hash || "").toLowerCase();
      if (hash === "#login" || hash === "#signin") {
        setAuthViewOpen(true);
        setDemoAccess(false);
      } else if (hash.startsWith("#demo/")) {
        const rawRole = hash.replace("#demo/", "");
        const matchedRole = rawRole === "seller" ? "Seller" : rawRole === "recycler" ? "Recycler" : rawRole === "admin" ? "Admin" : "Collector";
        setDemoRole(matchedRole);
        setDemoAccess(true);
        setAuthViewOpen(false);
        try {
          sessionStorage.setItem("scarap_demo_active", "true");
          sessionStorage.setItem("scarap_demo_role", matchedRole);
        } catch {}
      } else {
        setAuthViewOpen(false);
        setDemoAccess(false);
        try {
          sessionStorage.removeItem("scarap_demo_active");
          sessionStorage.removeItem("scarap_demo_role");
        } catch {}
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [authSession]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  function handleLaunchDemo(targetRole = "Collector") {
    setDemoRole(targetRole);
    setDemoAccess(true);
    setAuthViewOpen(false);
    try {
      sessionStorage.setItem("scarap_demo_active", "true");
      sessionStorage.setItem("scarap_demo_role", targetRole);
    } catch {}
    setSection("overview");
    window.location.hash = `#demo/${targetRole.toLowerCase()}`;
  }

  function handleExitDemo() {
    setDemoAccess(false);
    setAuthViewOpen(false);
    try {
      sessionStorage.removeItem("scarap_demo_active");
      sessionStorage.removeItem("scarap_demo_role");
    } catch {}
    window.location.hash = "";
  }

  function handleResetDemo() {
    const pristine = resetDemoState();
    setData({
      lots: pristine.lots.map(normalizeLot),
      activity: pristine.activity
    });
    setAvailableSellerScrap(pristine.availableSellerScrap);
    setCollectionWork(pristine.collectionWork);
    notify("Demo workspace reset to original sample records.", "success");
  }

  function handleClaimScrap(scrapId, claimData) {
    const target = availableSellerScrap.find(s => s.id === scrapId);
    if (!target) return;
    setAvailableSellerScrap(prev => prev.filter(s => s.id !== scrapId));
    setCollectionWork(prev => [
      ...prev,
      {
        ...target,
        status: "Claim Staged",
        pickupDate: claimData?.pickupDate || "Next 48 Hours",
        proposedRate: claimData?.proposedRate || "",
        collectorNote: claimData?.note || ""
      }
    ]);
    notify(`Collection claim staged for ${target.title}. Tracked in My Collection Work.`);
  }


  useEffect(() => {
    return () => {};
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
      if (!row || !["seller", "collector", "recycler", "admin"].includes(row.role)) {
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
    setMarketplaceRefreshing(true);
    if (!hasMarketplaceSnapshot.current) setMarketplaceState("loading");
    setMarketplaceError("");

    loadMarketplaceSnapshot()
      .then(snapshot => {
        if (!active) return;
        setConnectedData(snapshot);
        hasMarketplaceSnapshot.current = true;
        setMarketplaceState("ready");
        setMarketplaceRefreshing(false);
      })
      .catch(error => {
        if (!active) return;
        setMarketplaceRefreshing(false);
        setMarketplaceError(error.message || "Could not load marketplace data. Please try again.");
        if (hasMarketplaceSnapshot.current) {
          setMarketplaceState("ready");
        } else {
          setConnectedData(null);
          setMarketplaceState("error");
        }
      });

    return () => { active = false; };
  }, [authSession?.user?.id, profileState, reloadToken]);

  useEffect(() => {
    const userId = authSession?.user?.id;
    if (!supabase || !userId || profileState !== "ready") {
      setRealtimeStatus("idle");
      return undefined;
    }

    setRealtimeStatus("connecting");
    return subscribeToMarketplaceChanges(supabase, {
      userId,
      onChange: () => setReloadToken(value => value + 1),
      onStatus: setRealtimeStatus
    });
  }, [authSession?.user?.id, profileState]);

  const role = authSession
    ? profile?.role ? profile.role[0].toUpperCase() + profile.role.slice(1) : null
    : demoRole;

  useEffect(() => {
    if (authSession) return;
    try {
      writeDemoState({
        lots: data.lots,
        availableSellerScrap,
        collectionWork,
        activity: data.activity,
        version: 2
      });
    }
    catch { notify("Could not save to this browser. Check browser storage settings.", "error"); }
  }, [data, availableSellerScrap, collectionWork, authSession]);

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
      setAuthFeedback("Account sign-in is not configured in this environment. Use Interactive Demo Mode below to explore.", "error");
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
      try {
        if (rememberEmail) {
          localStorage.setItem("scarap_remembered_email", email);
        } else {
          localStorage.removeItem("scarap_remembered_email");
        }
      } catch {}

      if (authMode === "signup") {
        const { data: result, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName, role: ["seller", "collector"].includes(authForm.role) ? authForm.role : "collector" } }
        });
        if (error) throw error;
        if (!result.session) {
          setAuthFeedback("Account created. Check your email to confirm your account, then sign in.");
          setAuthMode("signin");
        } else {
          setAuthFeedback("Account created. You can now sign in with your registered account.");
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
      setAuthFeedback("Password recovery is unavailable because live account sign-in is not configured here.", "error");
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
      setAuthFeedback("Signed out. You can sign in again or open the local demo.");
    } catch (error) {
      setAuthFeedback(error.message || "Could not sign out. Please try again.", "error");
    } finally {
      setAuthBusy(false);
    }
  }

  async function createLot(e) {
    e.preventDefault();
    const validation = validateLotFormInputs(form);
    if (!validation.ok) {
      setFormError({ field: validation.field, message: validation.message });
      const targetEl = createFieldRefs[validation.field]?.current;
      targetEl?.focus();
      targetEl?.scrollIntoView?.({ behavior: "instant", block: "center" });
      return;
    }
    const { title, category, weight, location, notes } = validation.payload;

    if (authSession) {
      if (!["collector", "seller"].includes(profile?.role) || !authSession.user?.id || !supabase) {
        setFormError({ field: null, message: "A signed-in Seller or Collector account is required to create a listing." });
        return;
      }
      setCreateBusy(true);
      setFormError(null);
      try {
        const { error } = await supabase.from("lots").insert({
          collector_id: authSession.user.id,
          title,
          category,
          weight_kg: weight,
          location,
          notes
        });
        if (error) throw error;
        setForm({ title: "", category: "Computers", weight: "", weightUnit: WEIGHT_UNITS.KG, location: "", notes: "" });
        setConfirmCreateDiscard(false);
        setShowForm(false);
        setSection("lots");
        setReloadToken(value => value + 1);
        notify(role === "Seller" ? "Listing published. Registered recyclers can now review it and submit offers." : "Consignment lot published. Recyclers can now review it and submit offers.");
      } catch (error) {
        const message = error.code === "42501"
          ? "Your account does not have permission to create listings. Verify your account type is Seller or Collector."
          : error.code === "23503"
            ? "Your profile could not be matched. Sign out and sign in again, or contact an administrator."
            : error.message || "The listing could not be saved. Please try again.";
        setFormError({ field: null, message });
        notify(message, "error");
      } finally {
        setCreateBusy(false);
      }
      return;
    }

    const prefix = role === "Seller" ? "SEL" : "COL";
    const id = createUniqueId(prefix, data.lots.map(lot => lot.id));
    const lot = {
      id,
      category,
      collector: role === "Seller" ? DEMO_SELLER : DEMO_COLLECTOR,
      seller: role === "Seller" ? DEMO_SELLER : undefined,
      title,
      location,
      notes,
      weight,
      date: new Date().toISOString().slice(0, 10),
      status: "Open",
      evidence: "",
      offers: []
    };
    setData(prev => ({ ...prev, lots: [lot, ...prev.lots], activity: logActivity(prev, `New ${role === "Seller" ? "listing" : "lot"} created: ${lot.title} (${id})`) }));
    setForm({ title: "", category: "Computers", weight: "", weightUnit: WEIGHT_UNITS.KG, location: "", notes: "" });
    setFormError(null);
    setConfirmCreateDiscard(false);
    setShowForm(false);
    setSection("lots");
    notify(role === "Seller" ? "Listing saved in browser demo. View it under My listings; bids can be simulated by switching to Recycler." : "Consignment lot saved in browser demo. View it under Consignment lots.");
  }

  async function handleEditLot(lotId, updates) {
    const targetLot = data.lots.find(l => l.id === lotId) || editLotTarget;
    if (targetLot && targetLot.status !== "Open" && targetLot.status !== "open") {
      const msg = "Lots can only be edited while in Open status. Revisions are locked once bids exist or the workflow advances.";
      setEditError(msg);
      notify(msg, "error");
      return;
    }
    if (authSession) {
      if (!["collector", "seller", "admin"].includes(profile?.role) || !authSession.user?.id || !supabase) {
        setEditError("A signed-in owner or admin account is required to edit lots.");
        return;
      }
      setEditBusy(true);
      setEditError("");
      try {
        await updateLotDetails(lotId, updates);
        setEditLotTarget(null);
        setReloadToken(value => value + 1);
        notify("Consignment details updated successfully.");
      } catch (err) {
        setEditError(err.message || "Failed to update lot details.");
        notify(err.message || "Failed to update lot details.", "error");
      } finally {
        setEditBusy(false);
      }
      return;
    }

    setData(prev => ({
      ...prev,
      lots: prev.lots.map(l => l.id === lotId ? {
        ...l,
        title: updates.title,
        category: updates.category,
        weight: updates.weight,
        location: updates.location,
        notes: updates.notes
      } : l),
      activity: logActivity(prev, `Updated consignment ${lotId}: ${updates.title}`)
    }));
    setEditLotTarget(null);
    notify("Consignment details updated in local demo.");
  }

  function transitionLot(id, status, evidence = "") {
    if (authSession) { notify("Use a live Admin account action to change workflow state.", "error"); return; }
    const currentLot = data.lots.find(lot => lot.id === id);
    if (!currentLot) return;

    // Demo-only dispute hold and resume arbitration (preserves workflowRules.js strictly for sequential rules)
    if (status === "Disputed") {
      const cleanNote = (evidence || "").trim();
      if (cleanNote.length < 10 || cleanNote.length > 500) {
        notify("Enter a dispute reason between 10 and 500 characters.", "error");
        return;
      }
      setData(prev => ({
        ...prev,
        lots: prev.lots.map(lot => lot.id === id ? { ...lot, preDisputeStatus: lot.status, status: "Disputed" } : lot),
        activity: logActivity(prev, `${id} flagged for Admin dispute hold: "${cleanNote}"`)
      }));
      setDisputeDrafts(prev => ({ ...prev, [id]: "" }));
      notify(`Lot ${id} placed on dispute hold in local demo.`);
      return;
    }

    if (currentLot.status === "Disputed") {
      const restored = currentLot.preDisputeStatus || status || "Open";
      setData(prev => ({
        ...prev,
        lots: prev.lots.map(lot => lot.id === id ? { ...lot, status: restored, preDisputeStatus: undefined } : lot),
        activity: logActivity(prev, `${id} dispute resolved; resumed at ${restored}`)
      }));
      notify(`Dispute cleared; lot returned to "${restored}".`);
      return;
    }

    if (currentLot.status === status) return;
    const result = applyDemoWorkflowTransition(currentLot, status, evidence);
    if (!result.ok && result.reason === "invalid_transition") {
      notify(`That workflow step is not allowed from ${currentLot.status}.`, "error"); return;
    }
    if (!result.ok && result.reason === "evidence_note_length") {
      notify("Add a recycling review note between 10 and 500 characters.", "error"); return;
    }
    if (!result.ok && result.reason === "evidence_required") {
      notify("A saved recycling review note is required before marking this lot recycled.", "error"); return;
    }
    if (!result.ok) return;
    setData(prev => ({
      ...prev,
      lots: prev.lots.map(lot => lot.id === id ? result.lot : lot),
      activity: logActivity(prev, `${id} moved to ${status}${result.evidenceSaved ? " with review note" : ""}`)
    }));
    if (status === "Recycling review") setEvidenceDrafts(prev => ({ ...prev, [id]: "" }));
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

  async function runTraceAction(kind, lotId, value) {
    if (!authSession) {
      if (kind === "weight") {
        setData(prev => ({
          ...prev,
          lots: prev.lots.map(l => l.id === lotId ? { ...l, actualWeight: Number(value) } : l),
          activity: logActivity(prev, `Handover weight ${value} kg recorded on lot ${lotId}`)
        }));
        notify("Handover weight recorded locally in demo. Discrepancy checked against tolerance.", "success");
        return true;
      } else {
        setData(prev => ({
          ...prev,
          lots: prev.lots.map(l => l.id === lotId ? { ...l, preDisputeStatus: l.status, status: "Disputed" } : l),
          activity: logActivity(prev, `Dispute raised on lot ${lotId}: "${value}"`)
        }));
        notify("Dispute flagged in local demo. Lot paused for Admin review.", "success");
        return true;
      }
    }
    if (!supabase) return;
    try {
      if (kind === "weight") await recordHandoverWeight(lotId, value);
      else await raiseDispute(lotId, value);
      setReloadToken(current => current + 1);
      notify(kind === "weight"
        ? "Handover weight recorded. A difference above 10% is flagged for Admin review."
        : "Dispute raised. An Admin can review the lot. Refreshing marketplace data.");
      return true;
    } catch (error) {
      notify(error.message || "The action could not be saved.", "error");
      return false;
    }
  }
  const traceProps = {
    onWeight: (id, value) => runTraceAction("weight", id, value),
    onDispute: (id, value) => runTraceAction("dispute", id, value)
  };

  async function decideOffer(lotId, offerId, decision) {
    if (authSession) {
      if (!supabase || !["collector", "seller"].includes(profile?.role) || !authSession.user?.id) {
        notify("A signed-in Seller or Collector account is required to decide offers.", "error");
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
          : /Only the lot collector|Only the lot owner|Only a Collector|Only a Seller/i.test(detail)
            ? "Only the lot owner can decide its offers."
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

  async function proposePickupTime(lotId, scheduledAt, note) {
    const validation = validatePickupSchedule(scheduledAt);
    if (!validation.ok) {
      const messages = {
        invalid_time: "Choose a valid pickup date and time.",
        too_soon: "Choose a pickup time at least 30 minutes from now.",
        too_far: "Choose a pickup time within the next 90 days."
      };
      notify(messages[validation.reason], "error");
      return false;
    }
    const cleanNote = note.trim();
    if (cleanNote.length > 500) {
      notify("Pickup note must be 500 characters or fewer.", "error");
      return false;
    }

    if (authSession) {
      if (!["collector", "seller"].includes(profile?.role) || !supabase || !authSession.user?.id) {
        notify("A signed-in Seller or Collector account is required to propose a pickup time.", "error");
        return false;
      }
      const lot = connectedData?.lots.find(item => item.id === lotId && item.collectorId === authSession.user.id);
      if (!lot || lot.status !== "Pickup scheduled" || !lot.offers.some(offer => offer.status === "accepted")) {
        notify("A pickup time can only be proposed for your lot after an offer is accepted.", "error");
        return false;
      }
      setPickupBusyLotId(lotId);
      try {
        const { error } = await supabase.rpc("propose_pickup_appointment", {
          p_lot_id: lotId,
          p_scheduled_at: new Date(validation.timestamp).toISOString(),
          p_note: cleanNote
        });
        if (error) throw error;
        setReloadToken(value => value + 1);
        notify("Pickup time proposed to the accepted Recycler. It is not confirmed until they respond.");
        return true;
      } catch (error) {
        notify(error.message || "The pickup time could not be saved.", "error");
        return false;
      } finally {
        setPickupBusyLotId(null);
      }
    }

    const lot = data.lots.find(item => item.id === lotId);
    if (!lot || lot.status !== "Pickup scheduled" || !lot.offers.some(offer => offer.status === "accepted")) {
      notify("A pickup time can only be proposed after a demo offer is accepted.", "error");
      return false;
    }
    const previous = lot.pickupAppointment;
    if (previous?.status === "confirmed") {
      notify("The Recycler has confirmed this time. They must request a change before another time is proposed.", "error");
      return false;
    }
    const appointment = {
      id: previous?.id || createUniqueId("PA", data.lots.map(item => item.pickupAppointment?.id).filter(Boolean)),
      lotId,
      offerId: lot.offers.find(offer => offer.status === "accepted")?.id,
      scheduledAt: new Date(validation.timestamp).toISOString(),
      status: "proposed",
      proposedNote: cleanNote,
      responseNote: "",
      proposedBy: DEMO_COLLECTOR,
      respondedBy: null
    };
    setData(prev => ({
      ...prev,
      lots: prev.lots.map(item => item.id === lotId ? { ...item, pickupAppointment: appointment } : item),
      activity: logActivity(prev, `${lotId}: pickup time proposed; awaiting Recycler response`)
    }));
    notify("Pickup time proposed in the local demo. It is not confirmed until the demo Recycler responds.");
    return true;
  }

  async function respondToPickupTime(lotId, decision, note = "") {
    if (!['confirm', 'request_reschedule'].includes(decision)) {
      notify("Choose whether to confirm the proposed pickup time or request a different time.", "error");
      return false;
    }
    const cleanNote = note.trim();
    if (decision === "request_reschedule") {
      const validation = validateRescheduleRequest(cleanNote);
      if (!validation.ok) {
        notify("Explain the requested change in 10 to 500 characters.", "error");
        return false;
      }
    } else if (cleanNote.length > 500) {
      notify("Response note must be 500 characters or fewer.", "error");
      return false;
    }

    if (authSession) {
      if (profile?.role !== "recycler" || !supabase || !authSession.user?.id) {
        notify("A signed-in Recycler account is required to respond to this pickup proposal.", "error");
        return false;
      }
      const acceptedOffer = connectedData?.lots.find(item => item.id === lotId)?.offers.find(offer =>
        offer.status === "accepted" && offer.recyclerId === authSession.user.id
      );
      const appointment = connectedData?.pickupAppointments?.find(item => item.lotId === lotId);
      if (!acceptedOffer || !appointment || appointment.status !== "proposed") {
        notify("There is no pending pickup proposal for your accepted offer. Refresh the marketplace.", "error");
        return false;
      }
      setPickupBusyLotId(lotId);
      try {
        const { error } = await supabase.rpc("respond_to_pickup_appointment", {
          p_lot_id: lotId,
          p_decision: decision,
          p_note: cleanNote
        });
        if (error) throw error;
        setReloadToken(value => value + 1);
        notify(decision === "confirm" ? "Pickup time confirmed. Keep coordination and handover details with the participants." : "Reschedule request sent to the lot owner.");
        return true;
      } catch (error) {
        notify(error.message || "Your pickup response could not be saved.", "error");
        return false;
      } finally {
        setPickupBusyLotId(null);
      }
    }

    const lot = data.lots.find(item => item.id === lotId);
    const result = respondToDemoPickupAppointment(lot?.pickupAppointment, decision, cleanNote, DEMO_RECYCLER);
    if (!result.ok) {
        notify(result.reason === "note_length" ? "Explain the requested change in 10 to 500 characters." : result.reason === "time_passed" ? "This proposed time has passed. Ask the Collector to propose another time." : "There is no pending demo pickup proposal to respond to.", "error");
      return false;
    }
    setData(prev => ({
      ...prev,
      lots: prev.lots.map(item => item.id === lotId ? { ...item, pickupAppointment: result.appointment } : item),
      activity: logActivity(prev, `${lotId}: Recycler ${decision === "confirm" ? "confirmed the proposed pickup time" : "requested a different pickup time"}`)
    }));
    notify(decision === "confirm" ? "Demo pickup time confirmed; this does not verify that collection happened." : "Demo reschedule request sent to the Collector.");
    return true;
  }

  async function submitOffer(e) {
    e.preventDefault();
    const price = Number(offerPrice);
    if (!offerLot) { setOfferError({ field: null, message: "Choose a lot before submitting an offer." }); return; }
    if (!Number.isFinite(price) || price <= 0 || price > 1000000000) {
      setOfferError({ field: "price", message: "Enter an offer amount greater than ₹0 and no more than ₹1,000,000,000." });
      offerPriceRef.current?.focus();
      offerPriceRef.current?.scrollIntoView?.({ behavior: "instant", block: "center" });
      return;
    }
    if (offerMessage.trim().length > 500) {
      setOfferError({ field: "message", message: "Offer notes must be 500 characters or fewer." });
      offerMessageRef.current?.focus();
      offerMessageRef.current?.scrollIntoView?.({ behavior: "instant", block: "center" });
      return;
    }
    if (authSession) {
      if (profile?.role !== "recycler" || !authSession.user?.id || !supabase) {
        setOfferError({ field: null, message: "A signed-in Recycler account is required to submit an offer." });
        return;
      }
      const currentLot = connectedData?.lots.find(lot => lot.id === offerLot.id);
      if (!currentLot || !["Open", "Offer submitted"].includes(currentLot.status)) {
        setOfferError({ field: null, message: "This lot is no longer accepting offers. Refresh the marketplace and try another lot." });
        return;
      }
      if (currentLot.offers.some(offer => offer.recyclerId === authSession.user.id)) {
        setOfferError({ field: null, message: "You have already submitted an offer for this lot." });
        return;
      }

      setOfferBusy(true);
      setOfferError(null);
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
        setConfirmOfferDiscard(false);
        setReloadToken(value => value + 1);
        notify("Offer submitted. Your offer now appears under My offers while the owner reviews bids.");
      } catch (error) {
        const message = error.code === "23505"
          ? "You have already submitted an offer for this lot. Each Recycler can offer once per lot."
          : error.code === "42501"
            ? "Your account does not have permission to place offers on open lots."
            : error.message?.includes("no longer accepting offers")
              ? "This lot is no longer accepting offers. Refresh the marketplace and try another lot."
              : error.message || "The offer could not be submitted. Please try again.";
        setOfferError({ field: null, message });
        notify(message, "error");
      } finally {
        setOfferBusy(false);
      }
      return;
    }
    const latestLot = data.lots.find(lot => lot.id === offerLot.id);
    if (!latestLot || !["Open", "Offer submitted"].includes(latestLot.status)) { setOfferError({ field: null, message: "This lot is no longer accepting offers." }); return; }
    if (latestLot.offers.some(offer => offer.recycler === DEMO_RECYCLER)) { setOfferError({ field: null, message: "You have already submitted a demo offer for this lot." }); return; }
    const usedOfferIds = data.lots.flatMap(lot => lot.offers.map(offer => offer.id));
    const offer = { id: createUniqueId("OF", usedOfferIds), recycler: DEMO_RECYCLER, price, message: offerMessage.trim() || "Offer submitted in demo", status: "pending" };
    setData(prev => ({
      ...prev,
      lots: prev.lots.map(lot => lot.id === offerLot.id ? { ...lot, offers: [...lot.offers, offer], status: lot.status === "Open" ? "Offer submitted" : lot.status } : lot),
      activity: logActivity(prev, `Demo offer submitted for ${offerLot.id}: ${money(price)}`)
    }));
    setOfferLot(null); setOfferPrice(""); setOfferMessage(""); setOfferError(null); setConfirmOfferDiscard(false);
    notify("Demo offer saved locally in this browser. Switch to Seller or Collector to accept or reject it.");
  }

  function exportData(exportLots = viewData.lots) {
    const targetLots = Array.isArray(exportLots) ? exportLots : viewData.lots;
    const csvContent = buildLotsCsv(targetLots, { isDemo: !authSession });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = authSession ? "scarap-yukti-marketplace-lots.csv" : "scarap-yukti-demo-lots.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("CSV exported (workspace records only — not a statutory Form-6 document).");
  }

  async function updateDisplayName(nextName) {
    if (!authSession?.user?.id || !supabase) return false;
    const clean = (nextName || "").trim();
    if (clean.length > 100) {
      notify("Display name must be 100 characters or fewer.", "error");
      return false;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: clean })
      .eq("id", authSession.user.id);
    if (error) {
      notify(error.message || "Could not update your display name.", "error");
      return false;
    }
    setProfile(prev => (prev ? { ...prev, display_name: clean } : prev));
    notify("Display name updated.");
    return true;
  }

  const navigation = role === "Seller"
    ? [{ key: "overview", label: "Overview", icon: <Activity size={18} /> }, { key: "lots", label: "My listings", icon: <Package size={18} /> }, { key: "pricing", label: "Price estimator", icon: <Wallet size={18} /> }, { key: "activity", label: "Disposal history", icon: <ClipboardList size={18} /> }, { key: "settings", label: "Settings", icon: <Users size={18} /> }]
    : role === "Collector"
      ? [{ key: "overview", label: "Operations", icon: <Activity size={18} /> }, { key: "lots", label: "Consignment lots", icon: <Package size={18} /> }, { key: "pricing", label: "Rate calculator", icon: <Wallet size={18} /> }, { key: "activity", label: "Ledger history", icon: <ClipboardList size={18} /> }, { key: "settings", label: "Settings", icon: <Users size={18} /> }]
    : role === "Recycler"
      ? [{ key: "overview", label: "Dashboard", icon: <Search size={18} /> }, { key: "lots", label: "Scrap requests", icon: <Package size={18} /> }, { key: "my-offers", label: "My offers", icon: <Wallet size={18} /> }, { key: "pricing", label: "Pricing", icon: <Wallet size={18} /> }, { key: "activity", label: "History", icon: <ClipboardList size={18} /> }, { key: "settings", label: "Settings", icon: <Users size={18} /> }]
      : [{ key: "overview", label: "Dashboard", icon: <ShieldCheck size={18} /> }, { key: "lots", label: "Scrap requests", icon: <Package size={18} /> }, { key: "pricing", label: "Pricing", icon: <Wallet size={18} /> }, { key: "activity", label: "History", icon: <ClipboardList size={18} /> }, { key: "settings", label: "Settings", icon: <Users size={18} /> }];
  const currentSection = navigation.some(item => item.key === section) ? section : "overview";
  const currentNavigationItem = navigation.find(item => item.key === currentSection);
  const myOffers = viewData.lots.flatMap(lot => lot.offers.filter(offer => authSession
    ? offer.recyclerId === authSession.user.id
    : offer.recycler === DEMO_RECYCLER).map(offer => ({ ...offer, lot })));
  const collectorLots = viewData.lots.filter(lot => authSession
    ? lot.collectorId === authSession.user.id
    : role === "Seller"
      ? (lot.collector === DEMO_SELLER || lot.seller === DEMO_SELLER || lot.id.startsWith("SEL-"))
      : (lot.collector === DEMO_COLLECTOR || lot.id.startsWith("COL-") || lot.id.startsWith("SY-")));
  const pickupAppointmentsByLot = new Map(authSession
    ? (connectedData?.pickupAppointments || []).map(appointment => [appointment.lotId, appointment])
    : viewData.lots.filter(lot => lot.pickupAppointment).map(lot => [lot.id, lot.pickupAppointment]));
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
  const workspaceTitle = currentSection === "pricing" ? "Arithmetic value calculator"
    : currentSection === "settings" ? "Account & preferences"
      : currentSection === "activity" ? (role === "Seller" ? "Disposal history & activity" : role === "Collector" ? "Ledger audit & workflow" : "History and workflow")
        : currentSection === "lots" ? (role === "Seller" ? "My disposal listings" : role === "Collector" ? "Consignment ledger & pickups" : role === "Recycler" ? "Browse open listings" : "Marketplace audit & requests")
          : role === "Seller" ? "E-waste disposal listings" : role === "Collector" ? "Pickups & consignment lots" : role === "Recycler" ? "Find lots to recycle" : "Marketplace monitoring";
  const workspaceDescription = currentSection === "pricing" ? "Multiply an estimated weight by a rate you enter. This is arithmetic only, not a market quote."
    : currentSection === "settings" ? "Manage your display preferences and review your current account status."
      : currentSection === "activity" ? "Review recorded activity and workflow events visible to your account."
        : currentSection === "lots" ? (role === "Seller" ? "Manage your electronic scrap listings, review incoming offers, and coordinate pickup times." : role === "Collector" ? "Discover seller pickups, manage collection work, and oversee consignment lots." : role === "Recycler" ? "Browse eligible marketplace lots and submit offers." : "Audit marketplace listings, review weight discrepancies, and resolve disputes.")
          : authSession ? (role === "Collector" || role === "Seller") ? "Live workspace connected. Create listings, review offers, and coordinate pickup times." : role === "Recycler" ? "Live workspace connected. Browse lots, submit offers, and respond to pickup proposals." : "Live Admin workspace connected. Review processing notes and resolve holds." : "Interactive browser demo only. Switch roles anytime; changes stay on this device.";

  if (authInitializing || (!passwordRecovery && authSession && profileState === "loading")) {
    return <div className="auth-gate"><div className="auth-card"><span className="auth-spinner" /><h1>Loading your account</h1><p>Checking your sign-in and workspace profile…</p></div></div>;
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
    return <div className="auth-gate"><div className="auth-card"><span className="eyebrow">ACCOUNT PROFILE</span><h1>Account type unavailable</h1><p className="auth-message error" role="alert">{authMessage || "Your account profile is missing or incomplete."}</p><p>Your workspace access level is assigned by an administrator and cannot be chosen on this screen.</p><button className="btn btn-light" onClick={signOut} disabled={authBusy}>{authBusy ? "Signing out…" : "Sign out"}</button></div></div>;
  }
  if (authSession && marketplaceState === "loading") {
    return <div className="auth-gate"><div className="auth-card"><span className="auth-spinner" /><h1>Loading workspace</h1><p>Loading lots, offers, and activity visible to your account…</p></div></div>;
  }
  if (authSession && marketplaceState === "error") {
    return <div className="auth-gate"><div className="auth-card"><span className="eyebrow">CONNECTION ERROR</span><h1>Workspace records could not be loaded</h1><p className="auth-message error" role="alert">{marketplaceError}</p><p>Please refresh or check your network connection. If the issue persists, contact the workspace administrator.</p><div className="auth-form-actions"><button className="btn btn-primary" onClick={() => setReloadToken(value => value + 1)}>Try again</button><button className="btn btn-light" onClick={signOut} disabled={authBusy}>Sign out</button></div></div></div>;
  }
  if (!authSession && !demoAccess) {
    if (authViewOpen) {
      return <div className="auth-gate auth-login-gate">
        <section className="auth-login-layout" aria-labelledby="auth-welcome-title">
          <div className="auth-brand-panel">
            <div className="auth-brand">
              <span className="brand-icon"><Recycle size={24} /></span>
              <div>
                <strong>Scarap_Yukti</strong>
                <small>RESPONSIBLE E-WASTE MARKETPLACE</small>
              </div>
            </div>

            <div className="auth-brand-hero">
              <span className="eyebrow"><Leaf size={14} /> STRUCTURED E-WASTE LOGISTICS</span>
              <h1 id="auth-welcome-title">List, collect, and track scrap safely.</h1>
              <p>Sign in to manage live scrap listings, compare recycler bids, and coordinate pickup times without leaking contact details.</p>
            </div>

            <div className="auth-brand-circuit-preview">
              <div className="preview-node"><Package size={15} /><span>Seller Listing</span></div>
              <div className="preview-arrow">→</div>
              <div className="preview-node"><Truck size={15} /><span>Pickup Plan</span></div>
              <div className="preview-arrow">→</div>
              <div className="preview-node"><Recycle size={15} /><span>Recycler Intake</span></div>
            </div>

            <div className="auth-brand-stats-list">
              <div className="auth-stat-row">
                <CheckCircle2 size={16} className="text-lime" />
                <span>Area-Only Privacy (Phones &amp; Door Numbers Blocked)</span>
              </div>
              <div className="auth-stat-row">
                <ShieldCheck size={16} className="text-lime" />
                <span>Single-Bid Offer Comparison &amp; Locked Specs</span>
              </div>
              <div className="auth-stat-row">
                <Scale size={16} className="text-lime" />
                <span>Receiving Weight Discrepancy &amp; Dispute Review</span>
              </div>
            </div>

            <div className="auth-brand-foot">
              <ShieldCheck size={16} />
              <span>Your account type and permissions load automatically after sign-in.</span>
            </div>
          </div>

          <div className="auth-login-card">
            <div className="auth-login-heading-row">
              <div className="auth-login-heading">
                <span className="eyebrow">AUTHENTICATED PORTAL</span>
                <h2>{authMode === "signup" ? "Create an account" : "Sign in to continue"}</h2>
                <p>{authMode === "signup" ? "Register as an upstream Seller or field Collector." : "Use your credentials to open your role-specific dashboard."}</p>
              </div>
              <button
                type="button"
                className="btn btn-light btn-small"
                onClick={() => { setAuthViewOpen(false); window.location.hash = ""; }}
              >
                Back to Home
              </button>
            </div>

            <AuthPanel
              configured={hasSupabaseConfig}
              session={null}
              profile={null}
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
              rememberEmail={rememberEmail}
              setRememberEmail={setRememberEmail}
            />

            <div className="auth-demo-divider"><span>or test without credentials</span></div>
            <div className="auth-demo-entry-modern">
              <div className="demo-entry-title">
                <Zap size={15} className="text-lime" />
                <strong>Instant Role Experience (Browser Demo)</strong>
              </div>
              <p>Explore any role workspace immediately with realistic test records:</p>
              <div className="auth-demo-persona-grid">
                <button type="button" className="btn btn-light btn-small" onClick={() => handleLaunchDemo("Seller")}>
                  <Package size={14} /> Seller Demo
                </button>
                <button type="button" className="btn btn-light btn-small" onClick={() => handleLaunchDemo("Collector")}>
                  <Truck size={14} /> Collector Demo
                </button>
                <button type="button" className="btn btn-light btn-small" onClick={() => handleLaunchDemo("Recycler")}>
                  <Recycle size={14} /> Recycler Demo
                </button>
                <button type="button" className="btn btn-light btn-small" onClick={() => handleLaunchDemo("Admin")}>
                  <ShieldCheck size={14} /> Admin Demo
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>;
    }

    return (
      <LandingPage
        onLaunchDemo={handleLaunchDemo}
        onSignIn={() => { setAuthViewOpen(true); window.location.hash = "#login"; }}
      />
    );
  }

  // Legacy Unauth
  if (false && !authSession && !demoAccess) {
    return <div className="auth-gate auth-login-gate">

      <section className="auth-login-layout" aria-labelledby="auth-welcome-title">
        <div className="auth-brand-panel">
          <div className="auth-brand"><span className="brand-icon"><Recycle size={23} /></span><span><strong>Scarap_Yukti</strong><small>RESPONSIBLE E-WASTE MARKETPLACE</small></span></div>
          <div><span className="eyebrow"><Leaf size={14} /> A MORE CIRCULAR WORKSPACE</span><h1 id="auth-welcome-title">Move useful materials forward.</h1><p>Connect e-waste collectors and recyclers, review offers, and follow each lot through its recorded workflow.</p></div>
          <div className="auth-brand-foot"><ShieldCheck size={16} /><span>Account roles are loaded from your Supabase profile after sign-in.</span></div>
        </div>
        <div className="auth-login-card">
          <div className="auth-login-heading"><span className="eyebrow">YOUR WORKSPACE</span><h2>Sign in to continue</h2><p>Use your account to open the marketplace dashboard.</p></div>
          <AuthPanel
            configured={hasSupabaseConfig}
            session={null}
            profile={null}
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
          <div className="auth-demo-divider"><span>or</span></div>
          <div className="auth-demo-entry"><div><strong>Explore the local demo</strong><span>Demo records stay in this browser and are not shared.</span></div><button type="button" className="btn btn-light" onClick={() => { setDemoAccess(true); setSection("overview"); }}>Open demo</button></div>
        </div>
      </section>
    </div>;
  }

  const summaryLots = role === "Seller" || role === "Collector"
    ? collectorLots
    : viewData.lots;

  const isCreateDirty = Boolean(
    form.title.trim() ||
    form.weight ||
    form.location.trim() ||
    form.notes.trim() ||
    form.category !== "Computers"
  );
  const closeCreateModalImmediate = () => {
    setShowForm(false);
    setConfirmCreateDiscard(false);
    setFormError(null);
  };
  const requestCloseCreateModal = () => {
    if (createBusy) return;
    if (isCreateDirty && !confirmCreateDiscard) {
      setConfirmCreateDiscard(true);
      return;
    }
    closeCreateModalImmediate();
  };

  const isOfferDirty = Boolean(offerPrice || offerMessage.trim());
  const closeOfferModalImmediate = () => {
    setOfferLot(null);
    setOfferPrice("");
    setOfferMessage("");
    setOfferError(null);
    setConfirmOfferDiscard(false);
  };
  const requestCloseOfferModal = () => {
    if (offerBusy) return;
    if (isOfferDirty && !confirmOfferDiscard) {
      setConfirmOfferDiscard(true);
      return;
    }
    closeOfferModalImmediate();
  };

  const handleFormFieldChange = (field, value) => {
    setConfirmCreateDiscard(false);
    setFormError(null);
    if (field === "weightUnit") {
      const currentNum = Number(form.weight);
      let converted = form.weight;
      if (Number.isFinite(currentNum) && currentNum > 0) {
        converted = value === WEIGHT_UNITS.MT
          ? String(Math.round((currentNum / 1000) * 10000) / 10000)
          : String(Math.round(currentNum * 1000 * 1000) / 1000);
      }
      setForm(prev => ({ ...prev, weightUnit: value, weight: converted }));
      return;
    }
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${mobileNavOpen ? "sidebar-mobile-open" : ""}`}>

      {mobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-icon"><Recycle size={23} /></div>
          <div><strong>Scarap_Yukti</strong><span>E-WASTE LOGISTICS</span></div>
          <button
            type="button"
            className="icon-btn mobile-nav-close"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          {navigation.map(item => <button key={item.key} type="button" className={`nav-item ${currentSection === item.key ? "active" : ""}`} aria-current={currentSection === item.key ? "page" : undefined} aria-label={sidebarCollapsed ? item.label : undefined} onClick={() => { setSection(item.key); setMobileNavOpen(false); }} title={sidebarCollapsed ? item.label : undefined}><span className="nav-item-icon" aria-hidden="true">{item.icon}</span><span className="nav-item-label">{item.label}</span>{item.key === "lots" && role === "Admin" ? <span className="nav-count">{viewData.lots.length}</span> : null}{item.key === "my-offers" ? <span className="nav-count">{myOffers.length}</span> : null}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card"><ShieldCheck size={18} /><div><strong>{authSession ? "Live account" : "Browser demo mode"}</strong><span>{authSession ? "Account actions saved online" : "Saved only in this browser tab"}</span></div></div>
          <div className="user-mini"><div className="avatar">SY</div><div><strong>{authSession ? profile?.display_name || authSession.user.email : "Scarap_Yukti"}</strong><span>{role} {authSession ? "account" : "demo"}</span></div></div>
          {!authSession && <button type="button" className="demo-exit-link" onClick={handleExitDemo}>Exit demo (Return to Home)</button>}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-leading">
            <button
              type="button"
              className="icon-btn sidebar-toggle"
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth <= 768) {
                  setMobileNavOpen(value => !value);
                } else {
                  setSidebarCollapsed(value => !value);
                }
              }}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileNavOpen || !sidebarCollapsed}
            >
              <Menu size={18} aria-hidden="true" />
            </button>
            <div className="breadcrumb"><span className="breadcrumb-brand">Scarap_Yukti</span> <span className="breadcrumb-separator">/</span> <strong>{currentNavigationItem?.label || "Dashboard"}</strong></div>
          </div>
          <div className="top-actions">
            <span className={authSession ? "connected-pill" : "demo-pill"}><span className="dot"></span> {authSession ? "LIVE ACCOUNT" : "DEMO DATA"}</span>
            {authSession && <><span className={`realtime-status ${realtimeStatus}`} role="status" aria-live="polite"><span className="dot"></span>{realtimeStatus === "connected" ? "LIVE" : realtimeStatus === "connecting" ? "SYNCING" : "MANUAL"}</span><button type="button" className="icon-btn" onClick={() => setReloadToken(value => value + 1)} disabled={marketplaceRefreshing} title="Refresh marketplace data" aria-label="Refresh marketplace data"><RefreshCw size={17} /></button></>}
            <ThemeToggle />
            <button type="button" className="icon-btn" title="Role guide & help" aria-label="Role guide & help" onClick={() => setHelpOpen(true)}><CircleHelp size={19} /></button>
            <button type="button" className="icon-btn" title="Recent workspace activity" aria-label="Recent workspace activity" onClick={() => setNotificationsOpen(true)}><Bell size={19} /></button>
            {authSession && profile
              ? <div className="profile-menu"><ProfileMenuDropdown profile={profile} authSession={authSession} role={role} signOut={signOut} authBusy={authBusy} /></div>
              : <div className="role-picker"><RoleSwitcherDropdown currentRole={demoRole} onSelectRole={r => { setDemoRole(r); try { sessionStorage.setItem("scarap_demo_role", r); } catch {} window.location.hash = "#demo/" + r.toLowerCase(); setSection("overview"); setQuery(""); setStatusFilter("All statuses"); setCategoryFilter("All categories"); setLocationFilter("All locations"); }} /></div>}
            {!authSession && <button type="button" className="btn btn-light btn-small demo-sign-in" onClick={() => { setAuthViewOpen(true); setDemoAccess(false); window.location.hash = "#login"; }}>Sign in</button>}
          </div>
        </header>

        {!authSession && (
          <div className="demo-notification-banner" role="region" aria-label="Demo environment status">
            <div className="demo-banner-lead">
              <span className="demo-banner-badge">DEMO</span>
              <span className="demo-banner-disclaimer">
                Browser simulation · Switch roles to test each side:
              </span>
              <div className="demo-banner-role-switcher" role="radiogroup" aria-label="Demo Role Switcher">
                {["Seller", "Collector", "Recycler", "Admin"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={demoRole === r}
                    className={`demo-role-btn ${demoRole === r ? "active" : ""}`}
                    onClick={() => {
                      setDemoRole(r);
                      try { sessionStorage.setItem("scarap_demo_role", r); } catch {}
                      window.location.hash = "#demo/" + r.toLowerCase();
                      setSection("overview");
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="demo-banner-actions">
              <button
                type="button"
                className="btn-reset-demo"
                onClick={handleResetDemo}
                title="Reset demo data to initial sample records"
              >
                <RefreshCw size={13} />
                <span>Reset Demo</span>
              </button>
              <button
                type="button"
                className="btn btn-light btn-small"
                onClick={handleExitDemo}
              >
                Exit
              </button>
            </div>
          </div>
        )}

        <div className="content">
          {authSession && marketplaceError && connectedData && <div className="marketplace-refresh-warning" role="alert"><span>Marketplace data may be out of date: {marketplaceError}</span><button type="button" className="btn btn-light btn-small" onClick={() => setReloadToken(value => value + 1)} disabled={marketplaceRefreshing}>{marketplaceRefreshing ? "Refreshing…" : "Retry refresh"}</button></div>}
          {authSession && connectedData?.ancillaryErrors?.includes("pickup_appointments") && <div className="marketplace-refresh-warning" role="status"><span>Pickup appointment details could not be loaded right now. Core listings and offers remain available.</span><button type="button" className="btn btn-light btn-small" onClick={() => setReloadToken(value => value + 1)} disabled={marketplaceRefreshing}>{marketplaceRefreshing ? "Refreshing…" : "Retry refresh"}</button></div>}
          {authSession && connectedData?.ancillaryErrors?.includes("traceability") && <div className="marketplace-refresh-warning" role="status"><span>Receiving weight details could not be loaded right now. Core listings and offers remain available.</span><button type="button" className="btn btn-light btn-small" onClick={() => setReloadToken(value => value + 1)} disabled={marketplaceRefreshing}>{marketplaceRefreshing ? "Refreshing…" : "Retry refresh"}</button></div>}
          <section className="welcome-row" id="overview">
            <div><div className="eyebrow"><Sparkles size={14} /> {role.toUpperCase()} {authSession ? "LIVE WORKSPACE" : "DEMO WORKSPACE"}</div><h1>{workspaceTitle}</h1><p>{workspaceDescription}</p></div>
            <div className="welcome-actions">{["overview", "lots"].includes(currentSection) && <button type="button" className="btn btn-light" onClick={() => exportData(summaryLots)} title="Download CSV spreadsheet of visible lots (workspace export only, not Form-6)"><Download size={16} /> Export CSV</button>}{(role === "Collector" || role === "Seller") && ["overview", "lots"].includes(currentSection) && <button type="button" className="btn btn-primary" onClick={() => { setFormError(null); setConfirmCreateDiscard(false); setShowForm(true); }}><Plus size={17} /> {authSession ? (role === "Seller" ? "Create Listing" : "Create Lot") : (role === "Seller" ? "Add listing" : "Add e-waste lot")}</button>}</div>
          </section>

          {["overview", "lots"].includes(currentSection) && (
            <OperationalSummary lots={summaryLots} role={role} />
          )}


          {currentSection === "pricing" ? <PricingWorkspace />
            : currentSection === "settings" ? <SettingsWorkspace session={authSession} profile={profile} role={role} onSignOut={signOut} onReturnToSignIn={() => setDemoAccess(false)} onUpdateDisplayName={updateDisplayName} />
              : currentSection === "activity" ? <ActivityPanel activity={viewData.activity} workflowEvents={viewData.workflowEvents} lots={viewData.lots} connected={Boolean(authSession)} ancillaryErrors={connectedData?.ancillaryErrors || []} onRetry={() => setReloadToken(value => value + 1)} retrying={marketplaceState === "loading"} />
                : currentSection === "overview" ? <DashboardOverview role={role} connected={Boolean(authSession)} onNavigate={setSection} onAdd={() => { setFormError(null); setConfirmCreateDiscard(false); setShowForm(true); }} />
                  : role === "Seller" ? <SellerDashboard {...traceProps} workflowEvents={viewData.workflowEvents || []} traceabilityAvailable={!authSession || !connectedData?.ancillaryErrors?.includes("traceability")} lots={visibleLots.filter(lot => authSession ? lot.collectorId === authSession.user.id : (lot.collector === DEMO_SELLER || lot.seller === DEMO_SELLER || lot.id.startsWith("SEL-")))} allLotCount={collectorLots.length} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onAdd={() => { setFormError(null); setConfirmCreateDiscard(false); setShowForm(true); }} onEdit={setEditLotTarget} onDecision={decideOffer} decisionBusyOfferId={decisionBusyOfferId} pickupAppointmentsByLot={pickupAppointmentsByLot} pickupCoordinationAvailable={!authSession || !connectedData?.ancillaryErrors?.includes("pickup_appointments")} pickupBusyLotId={pickupBusyLotId} onProposePickup={proposePickupTime} readOnly={Boolean(authSession)} role={role} />
                  : role === "Collector" ? <CollectorDashboard {...traceProps} workflowEvents={viewData.workflowEvents || []} availableSellerScrap={availableSellerScrap} onClaimScrap={handleClaimScrap} collectionWork={collectionWork} traceabilityAvailable={!authSession || !connectedData?.ancillaryErrors?.includes("traceability")} lots={visibleLots.filter(lot => authSession ? lot.collectorId === authSession.user.id : (lot.collector === DEMO_COLLECTOR || lot.id.startsWith("COL-") || lot.id.startsWith("SY-")))} allLotCount={collectorLots.length} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onAdd={() => { setFormError(null); setConfirmCreateDiscard(false); setShowForm(true); }} onEdit={setEditLotTarget} onDecision={decideOffer} decisionBusyOfferId={decisionBusyOfferId} pickupAppointmentsByLot={pickupAppointmentsByLot} pickupCoordinationAvailable={!authSession || !connectedData?.ancillaryErrors?.includes("pickup_appointments")} pickupBusyLotId={pickupBusyLotId} onProposePickup={proposePickupTime} readOnly={Boolean(authSession)} role={role} />
                  : role === "Recycler" ? currentSection === "my-offers" ? <RecyclerOffers {...traceProps} traceabilityAvailable={!authSession || !connectedData?.ancillaryErrors?.includes("traceability")} offers={myOffers} connected={Boolean(authSession)} pickupAppointmentsByLot={pickupAppointmentsByLot} pickupCoordinationAvailable={!authSession || !connectedData?.ancillaryErrors?.includes("pickup_appointments")} pickupBusyLotId={pickupBusyLotId} onRespondPickup={respondToPickupTime} /> : <RecyclerDashboard lots={visibleLots.filter(lot => ["Open", "Offer submitted"].includes(lot.status))} query={query} setQuery={setQuery} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} locationFilter={locationFilter} setLocationFilter={setLocationFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} categories={categories} locations={locations} myOffers={myOffers} currentRecyclerId={authSession?.user?.id} pickupAppointmentsByLot={pickupAppointmentsByLot} workflowEvents={viewData.workflowEvents || []} readOnly={Boolean(authSession)} onOffer={lot => { setOfferLot(lot); setOfferPrice(""); setOfferMessage(""); setOfferError(null); setConfirmOfferDiscard(false); }} />
                    : <AdminDashboard {...traceProps} workflowEvents={viewData.workflowEvents || []} traceabilityAvailable={!authSession || !connectedData?.ancillaryErrors?.includes("traceability")} lots={visibleLots} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} evidenceDrafts={evidenceDrafts} setEvidenceDrafts={setEvidenceDrafts} disputeDrafts={disputeDrafts} setDisputeDrafts={setDisputeDrafts} onTransition={transitionLot} onConnectedTransition={handleAdminTransition} busyLotId={workflowBusyLotId} pickupAppointmentsByLot={pickupAppointmentsByLot} canManage={Boolean(authSession && profile?.role === "admin")} readOnly={Boolean(authSession)} />}
          <footer className="footer"><span>© 2026 Scarap_Yukti · {authSession ? "Live Workspace" : "Browser Demo"}</span><span>{authSession ? "Online payments, transport dispatch, photo uploads, and statutory Form-6 certificates are handled externally." : "Local browser simulation only — no verified recycling service or external payment."}</span></footer>
        </div>
      </main>

      {notice && <div className={`toast ${noticeType}`} role={noticeType === "error" ? "alert" : "status"}>{noticeType === "error" ? <CircleHelp size={17} /> : <Check size={17} />}<span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button></div>}

      {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) requestCloseCreateModal(); }}><AccessibleDialog className="modal" labelledBy="create-lot-dialog-title" describedBy="create-lot-dialog-description" busy={createBusy} onClose={requestCloseCreateModal}><div className="modal-header"><div><span className="eyebrow">NEW RECORD</span><h2 id="create-lot-dialog-title">{role === "Seller" ? "Add e-waste listing" : "Add e-waste lot"}</h2><p id="create-lot-dialog-description">{authSession ? `This listing will be saved under your ${role} account.` : "Saved in this browser demo only. Switch to Recycler after saving to simulate receiving bids."}</p></div><button type="button" className="icon-btn" onClick={requestCloseCreateModal} aria-label="Close dialog"><X size={20} /></button></div>
        <DiscardChangesBanner
          visible={confirmCreateDiscard}
          onKeepEditing={() => setConfirmCreateDiscard(false)}
          onConfirmDiscard={closeCreateModalImmediate}
        />
        <form onSubmit={createLot} className="form-grid" noValidate>
          <LotFormFields
            values={form}
            onChange={handleFormFieldChange}
            fieldError={formError}
            disabled={createBusy}
            fieldRefs={createFieldRefs}
            autoFocusTitle
            idPrefix="create-lot"
          />
          <div className="modal-actions full"><button type="button" className="btn btn-light" onClick={requestCloseCreateModal} disabled={createBusy}>Cancel</button><button className="btn btn-primary" type="submit" disabled={createBusy}><Plus size={16} /> {createBusy ? "Saving…" : authSession ? (role === "Seller" ? "Create listing" : "Create lot") : (role === "Seller" ? "Save listing" : "Save lot")}</button></div>
        </form>
      </AccessibleDialog></div>}

      {offerLot && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) requestCloseOfferModal(); }}><AccessibleDialog className="modal modal-narrow" labelledBy="offer-dialog-title" describedBy="offer-dialog-description" busy={offerBusy} onClose={requestCloseOfferModal}><div className="modal-header"><div><span className="eyebrow">{authSession ? "PURCHASE OFFER" : "DEMO OFFER"}</span><h2 id="offer-dialog-title">Submit an Offer</h2><p id="offer-dialog-description">{offerLot.title} · {offerLot.id} · {formatWeightDisplay(offerLot.weight)}</p></div><button type="button" className="icon-btn" onClick={requestCloseOfferModal} aria-label="Close dialog"><X size={20} /></button></div>
        <DiscardChangesBanner
          visible={confirmOfferDiscard}
          onKeepEditing={() => setConfirmOfferDiscard(false)}
          onConfirmDiscard={closeOfferModalImmediate}
        />
        <form onSubmit={submitOffer} className="form-grid" noValidate>
          <div className={`form-field full ${offerError?.field === "price" ? "has-error" : ""}`}>
            <label htmlFor="offer-amount-input">Offer amount (₹ INR total for lot) <span className="req-mark">*</span></label>
            <input
              ref={offerPriceRef}
              id="offer-amount-input"
              data-dialog-initial-focus="true"
              type="number"
              min="0.01"
              max="1000000000"
              step="0.01"
              required
              disabled={offerBusy}
              value={offerPrice}
              aria-invalid={offerError?.field === "price"}
              aria-describedby={offerError?.field === "price" ? "offer-amount-error" : "offer-amount-hint"}
              onChange={e => { setOfferPrice(e.target.value); setOfferError(null); setConfirmOfferDiscard(false); }}
              placeholder={authSession ? "e.g. 24000" : "Enter a sample offer amount"}
            />
            <small id="offer-amount-hint" className="field-helper">One pending offer is allowed per recycler on each lot. If accepted, pickup timing is coordinated next.</small>
            {offerError?.field === "price" && <div id="offer-amount-error" className="field-inline-error" role="alert">{offerError.message}</div>}
          </div>
          <div className={`form-field full ${offerError?.field === "message" ? "has-error" : ""}`}>
            <label htmlFor="offer-message-input">Inspection &amp; pickup terms (optional)</label>
            <textarea
              ref={offerMessageRef}
              id="offer-message-input"
              rows="3"
              maxLength="500"
              disabled={offerBusy}
              value={offerMessage}
              aria-invalid={offerError?.field === "message"}
              aria-describedby={offerError?.field === "message" ? "offer-message-error" : "offer-message-hint"}
              onChange={e => { setOfferMessage(e.target.value); setOfferError(null); setConfirmOfferDiscard(false); }}
              placeholder="Note vehicle timing, inspection condition, or payment arrangement..."
            />
            <small id="offer-message-hint" className="field-helper">Visible to the listing owner alongside your offer.</small>
            {offerError?.field === "message" && <div id="offer-message-error" className="field-inline-error" role="alert">{offerError.message}</div>}
          </div>
          {offerError && !offerError.field && <div className="form-error full" role="alert">{offerError.message}</div>}
          <div className="form-note full"><ShieldCheck size={16} /><span>{authSession ? "Submitting sends your offer to the listing owner. Online payments, UPI settlement, and escrow are not handled inside this app." : "Saved locally in this browser demo only. No real money, transport, or contract commitment is made."}</span></div>
          <div className="modal-actions full"><button type="button" className="btn btn-light" onClick={requestCloseOfferModal} disabled={offerBusy}>Cancel</button><button className="btn btn-primary" type="submit" disabled={offerBusy}>{offerBusy ? "Submitting…" : authSession ? "Submit offer" : "Submit demo offer"}</button></div>
        </form>
      </AccessibleDialog></div>}

      {helpOpen && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setHelpOpen(false); }}>
          <AccessibleDialog className="modal modal-narrow" labelledBy="help-dialog-title" onClose={() => setHelpOpen(false)}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">WORKSPACE GUIDE</span>
                <h2 id="help-dialog-title">{role} Help &amp; Next Steps</h2>
                <p>{authSession ? "Live connected workspace guide" : "Interactive browser demo guide"}</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setHelpOpen(false)} aria-label="Close help dialog"><X size={18} /></button>
            </div>
            <div className="help-modal-body">
              <div className="help-step-box">
                <strong>What you can do as {role}:</strong>
                <p>
                  {role === "Seller"
                    ? "Post electronic scrap listings using estimated weight (kg or tonnes) and approximate pickup area, compare incoming recycler offers, and propose pickup timing after accepting a bid."
                    : role === "Collector"
                      ? "Browse sample seller pickups in Demo Mode, stage collection batches under Collection Work, and publish consolidated consignment lots for recycler bids."
                      : role === "Recycler"
                        ? "Filter open scrap lots, submit one offer per lot, confirm proposed pickup windows under My offers, and enter receiving weights once collected."
                        : "Monitor active listings, filter disputes or >10% weight discrepancies, place/clear review holds, and export workspace records to CSV."}
                </p>
              </div>
              <div className="help-step-box">
                <strong>Important current limitations:</strong>
                <ul>
                  <li>Lot photo uploads and online UPI/NEFT escrow payments are not integrated in this version.</li>
                  <li>Physical scale integration and Form-6 PDF certificates must be completed off-platform.</li>
                  {!authSession && <li>Demo changes are saved only inside this browser tab and reset anytime via Reset Demo.</li>}
                </ul>
              </div>
              <div className="modal-actions full">
                <button type="button" className="btn btn-primary" onClick={() => setHelpOpen(false)}>Got it</button>
              </div>
            </div>
          </AccessibleDialog>
        </div>
      )}

      {notificationsOpen && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setNotificationsOpen(false); }}>
          <AccessibleDialog className="modal modal-narrow" labelledBy="notifications-dialog-title" onClose={() => setNotificationsOpen(false)}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">ACTIVITY FEED</span>
                <h2 id="notifications-dialog-title">Workspace Notifications</h2>
                <p>{authSession ? "Recent recorded activity visible to your account" : "Recent actions in this browser demo"}</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={18} /></button>
            </div>
            <div className="notifications-modal-body">
              {viewData.activity && viewData.activity.length > 0 ? (
                <div className="notifications-feed-list">
                  {viewData.activity.slice(0, 8).map((item) => (
                    <div className="notification-feed-item" key={item.id}>
                      <strong>{item.text}</strong>
                      <span>{item.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No notifications yet"
                  detail="Activity from creating listings, submitting offers, and workflow transitions will appear here."
                  compact
                />
              )}
              <div className="modal-actions full">
                <button type="button" className="btn btn-light" onClick={() => { setNotificationsOpen(false); setSection("activity"); }}>View Full History</button>
                <button type="button" className="btn btn-primary" onClick={() => setNotificationsOpen(false)}>Close</button>
              </div>
            </div>
          </AccessibleDialog>
        </div>
      )}

      {editLotTarget && (
        <EditLotModal
          lot={editLotTarget}
          busy={editBusy}
          error={editError}
          onClose={() => { setEditLotTarget(null); setEditError(""); }}
          onSave={handleEditLot}
        />
      )}

          </div>
  );
}

function PasswordRecoveryGate({ password, setPassword, confirmPassword, setConfirmPassword, onSubmit, busy, message, messageType, onSignOut }) {
  return (
    <div className="auth-gate auth-login-gate">
      <section className="auth-login-card recovery-card" aria-labelledby="recovery-title">
        <div className="auth-login-heading">
          <span className="eyebrow"><ShieldCheck size={14} /> ACCOUNT RECOVERY</span>
          <h1 id="recovery-title">Choose a new password</h1>
          <p>Enter a secure password with at least 8 characters to update your Scarap_Yukti account.</p>
        </div>
        <form className="auth-form recovery-form" onSubmit={onSubmit}>
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="recovery-password">New password</label>
            <input
              id="recovery-password"
              className="auth-input"
              type="password"
              autoComplete="new-password"
              minLength="8"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </div>
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="recovery-confirm">Confirm new password</label>
            <input
              id="recovery-confirm"
              className="auth-input"
              type="password"
              autoComplete="new-password"
              minLength="8"
              required
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
            />
          </div>
          {message && <p className={`auth-message ${messageType}`} role={messageType === "error" ? "alert" : "status"}>{message}</p>}
          <div className="auth-form-actions">
            <button className="btn btn-primary w-full" type="submit" disabled={busy}>{busy ? "Updating…" : "Update Password"}</button>
            <button className="btn btn-light w-full" type="button" onClick={onSignOut} disabled={busy}>Sign Out</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DashboardOverview({ role, connected, onNavigate, onAdd }) {
  const content = role === "Seller"
    ? { title: "Your disposal workspace", detail: "Create listings for retired computers, servers, batteries, and electronics, compare buyer offers, and coordinate pickup times.", actions: [{ label: "Manage my listings", section: "lots", icon: <Package size={17} /> }, { label: "Price estimator", section: "pricing", icon: <Wallet size={17} /> }, { label: "Disposal history", section: "activity", icon: <ClipboardList size={17} /> }] }
    : role === "Collector"
      ? { title: "Collection & consolidation hub", detail: "Review available seller pickups, plan collection runs, and bundle collected materials into consignment lots for recycler offers.", actions: [{ label: "Consignment ledger", section: "lots", icon: <Package size={17} /> }, { label: "Rate calculator", section: "pricing", icon: <Wallet size={18} /> }, { label: "Ledger history", section: "activity", icon: <ClipboardList size={17} /> }] }
    : role === "Recycler"
      ? { title: "Find your next material lot", detail: "Browse open scrap lots by category and city, submit one offer per lot, and track owner decisions.", actions: [{ label: "Browse scrap requests", section: "lots", icon: <Search size={17} /> }, { label: "View my offers", section: "my-offers", icon: <Wallet size={17} /> }] }
      : { title: "Marketplace operations", detail: "Monitor active listings, review >10% weight discrepancies and dispute holds, and record compliance review decisions.", actions: [{ label: "Open marketplace requests", section: "lots", icon: <Package size={17} /> }, { label: "View history", section: "activity", icon: <ClipboardList size={17} /> }] };

  return <section className="panel dashboard-panel dashboard-overview" aria-labelledby="dashboard-overview-title">
    <div className="panel-heading"><div><h2 id="dashboard-overview-title">{content.title}</h2><p>{content.detail}</p></div><span className={connected ? "connected-label" : "demo-label"}>{connected ? "LIVE ACCOUNT" : "LOCAL DEMO"}</span></div>
    <div className="dashboard-shortcuts">{role === "Seller" && <button type="button" className="shortcut-card shortcut-primary" onClick={onAdd}><span className="shortcut-icon"><Plus size={18} /></span><span><strong>Create a disposal listing</strong><small>{connected ? "Publish an e-waste listing from your Seller account" : "Save a listing in this browser demo"}</small></span></button>}{role === "Collector" && <button type="button" className="shortcut-card shortcut-primary" onClick={onAdd}><span className="shortcut-icon"><Plus size={18} /></span><span><strong>Create consignment lot</strong><small>{connected ? "Publish a consignment lot from your Collector account" : "Save a lot in this browser demo"}</small></span></button>}{content.actions.map(action => <button type="button" className="shortcut-card" key={action.section} onClick={() => onNavigate(action.section)}><span className="shortcut-icon">{action.icon}</span><span><strong>{action.label}</strong><small>Open this section</small></span><ChevronDown className="shortcut-arrow" size={16} /></button>)}</div>
    <p className="dashboard-disclaimer">{connected ? "Permissions and visible records are set by your account type. Online payment settlement and physical weighing occur outside this app." : "Browser demo mode only. Switch roles in the top bar anytime; changes stay on this device."}</p>
  </section>;
}

function PricingWorkspace() {
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState(WEIGHT_UNITS.KG);
  const [rate, setRate] = useState("");
  const canonicalKg = toCanonicalKg(weight, unit);
  const total = canonicalKg * Number(rate);
  const hasEstimate = Number.isFinite(canonicalKg) && canonicalKg > 0 && Number(rate) > 0 && Number.isFinite(total);

  return <section className="pricing-workspace panel dashboard-panel" aria-labelledby="pricing-title">
    <div className="panel-heading"><div><h2 id="pricing-title">Weight × Rate Arithmetic Calculator</h2><p>Multiply an estimated weight by a rate per kg you provide yourself.</p></div><span className="demo-label warning">ARITHMETIC ONLY</span></div>
    <div className="pricing-layout">
      <div className="pricing-inputs">
        <div className="field-label-row">
          <label htmlFor="calc-weight-input">Estimated weight</label>
          <div className="unit-switch-group" role="group" aria-label="Calculator weight unit">
            <button type="button" className={`unit-pill ${unit === WEIGHT_UNITS.KG ? "active" : ""}`} onClick={() => setUnit(WEIGHT_UNITS.KG)}>kg</button>
            <button type="button" className={`unit-pill ${unit === WEIGHT_UNITS.MT ? "active" : ""}`} onClick={() => setUnit(WEIGHT_UNITS.MT)}>Tonnes (MT)</button>
          </div>
        </div>
        <input id="calc-weight-input" type="number" min="0.001" max="100000" step="0.1" inputMode="decimal" value={weight} onChange={event => setWeight(event.target.value)} placeholder={unit === WEIGHT_UNITS.MT ? "e.g. 1.5" : "e.g. 25"} />
        <label htmlFor="calc-rate-input">Your entered rate (₹/kg INR)</label>
        <input id="calc-rate-input" type="number" min="0.01" max="1000000000" step="0.01" inputMode="decimal" value={rate} onChange={event => setRate(event.target.value)} placeholder="Enter a rate supplied by a buyer or estimate" />
        <p className="field-helper">Simple multiplication only ({unit === WEIGHT_UNITS.MT ? "tonnes × 1,000 × your ₹/kg rate" : "kg × your ₹/kg rate"}). Scarap_Yukti does not supply live scrap market prices, price benchmarks, or binding quotes.</p>
      </div>
      <div className="pricing-result" aria-live="polite"><span>Arithmetic total</span><strong>{hasEstimate ? money(total) : money(0)}</strong><small>{hasEstimate ? `${canonicalKg.toLocaleString("en-IN")} kg × ${money(Number(rate))}/kg` : "Enter weight and your ₹/kg rate to calculate"}</small></div>
    </div>
  </section>;
}

function SettingsWorkspace({ session, profile, role, onSignOut, onReturnToSignIn, onUpdateDisplayName }) {
  const [displayNameDraft, setDisplayNameDraft] = useState(profile?.display_name || "");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setDisplayNameDraft(profile?.display_name || "");
  }, [profile?.display_name]);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!onUpdateDisplayName) return;
    setSavingName(true);
    try {
      await onUpdateDisplayName(displayNameDraft);
    } finally {
      setSavingName(false);
    }
  };

  return <section className="panel dashboard-panel settings-workspace" aria-labelledby="settings-title">
    <div className="panel-heading"><div><h2 id="settings-title">Account &amp; Display Preferences</h2><p>Manage your display preferences and review the account currently active.</p></div><span className={session ? "connected-label" : "demo-label"}>{session ? "LIVE ACCOUNT" : "LOCAL DEMO"}</span></div>
    <div className="settings-grid">
      <article><span>Account Holder</span><strong>{session ? profile?.display_name || session.user.email : "Demo Session"}</strong><small>{session?.user?.email || "Not signed in"}</small></article>
      <article><span>Account Type</span><strong>{role}</strong><small>{session ? "Assigned by workspace administration" : "Demo view only (switchable in top bar)"}</small></article>
      <article><span>Appearance</span><div className="settings-theme-wrap"><ThemeToggle /></div><small>Theme preference is saved in this browser</small></article>
    </div>

    {session && (
      <form className="settings-profile-form" onSubmit={handleSaveName}>
        <label htmlFor="settings-display-name">Display Name / Organization Name</label>
        <div className="settings-name-row">
          <input
            id="settings-display-name"
            type="text"
            maxLength={100}
            value={displayNameDraft}
            disabled={savingName}
            onChange={(e) => setDisplayNameDraft(e.target.value)}
            placeholder="e.g. Apex Electronics Disposal"
          />
          <button
            type="submit"
            className="btn btn-primary btn-small"
            disabled={savingName || displayNameDraft.trim() === (profile?.display_name || "").trim()}
          >
            {savingName ? "Saving…" : "Save Name"}
          </button>
        </div>
        <small className="field-helper">Updates your public display name visible to marketplace participants.</small>
      </form>
    )}

    <div className="settings-notice"><ShieldCheck size={17} /><span>Account types (Seller, Collector, Recycler, Admin) and license approvals cannot be edited here and require administrator review.</span></div>
    <div className="settings-actions">{session ? <button type="button" className="btn btn-light" onClick={onSignOut}>Sign out</button> : <button type="button" className="btn btn-light" onClick={onReturnToSignIn}>Exit demo &amp; Sign in</button>}</div>
  </section>;
}

function AuthPanel({
  configured,
  session,
  profile,
  mode,
  setMode,
  form,
  setForm,
  onSubmit,
  onForgotPassword,
  onSignOut,
  busy,
  message,
  messageType,
  rememberEmail,
  setRememberEmail
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section className={`auth-panel ${session ? "connected" : ""}`} aria-label="Account authentication">
      <div className="auth-panel-intro">
        <span className="eyebrow"><ShieldCheck size={14} /> ACCOUNT ACCESS</span>
        <strong>{session && profile ? `Signed in as ${profile.display_name || session.user.email}` : "Sign in to Scarap_Yukti"}</strong>
        <span>{session && profile ? `Account type: ${profile.role}. Assigned by your workspace profile.` : "Sign in to manage live listings and offers. Local demo data stays separate."}</span>
      </div>

      {session && profile ? (
        <div className="auth-panel-actions">
          <span className="auth-role-pill">{profile.role.toUpperCase()}</span>
          <button type="button" className="btn btn-light btn-small" onClick={onSignOut} disabled={busy}>
            {busy ? "Signing out…" : "Sign out"}
          </button>
          <p className="auth-demo-note">Your live listings, offers, pickup times, and activity are active based on your account permissions.</p>
        </div>
      ) : !configured ? (
        <div className="auth-config-note" role="status">
          <strong>Live account sign-in is not configured in this environment.</strong>
          <span>Use the Interactive Browser Demo buttons below to evaluate all four role workspaces locally.</span>
        </div>
      ) : (
        <form className="auth-form" onSubmit={onSubmit}>
          {/* Segmented Mode Switcher */}
          <div className="auth-mode-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              className={`auth-mode-tab ${mode === "signin" ? "active" : ""}`}
              onClick={() => setMode("signin")}
              disabled={busy}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={`auth-mode-tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => setMode("signup")}
              disabled={busy}
            >
              Register New Account
            </button>
          </div>

          {mode === "signup" && (
            <>
              <div className="auth-field auth-field-name">
                <label className="auth-field-label" htmlFor="auth-name-input">
                  Full Name or Organization <span className="auth-optional-tag">(Optional)</span>
                </label>
                <input
                  id="auth-name-input"
                  className="auth-input"
                  type="text"
                  maxLength="100"
                  autoComplete="name"
                  placeholder="e.g. Apex Recycling Pvt Ltd"
                  value={form.displayName}
                  onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))}
                />
              </div>

              <div className="auth-role-selection-block">
                <span className="auth-role-label">Choose Account Persona</span>
                <div className="auth-role-chips-group">
                  <button
                    type="button"
                    className={`auth-role-chip ${form.role === "seller" ? "active" : ""}`}
                    onClick={() => setForm(prev => ({ ...prev, role: "seller" }))}
                  >
                    <Package size={18} className="text-lime" />
                    <div className="auth-chip-text">
                      <strong>Seller</strong>
                      <small>Disposing scrap & electronic assets</small>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`auth-role-chip ${form.role === "collector" ? "active" : ""}`}
                    onClick={() => setForm(prev => ({ ...prev, role: "collector" }))}
                  >
                    <Truck size={18} className="text-lime" />
                    <div className="auth-chip-text">
                      <strong>Collector</strong>
                      <small>Aggregator & sorting facility</small>
                    </div>
                  </button>
                </div>

                {/* Retained native select for testing compatibility and fallback */}
                <select
                  value={form.role || "seller"}
                  onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                  style={{ display: "none" }}
                  aria-hidden="true"
                >
                  <option value="seller">Seller (Disposing scrap & electronic assets)</option>
                  <option value="collector">Collector (Aggregator & sorting facility)</option>
                </select>
              </div>
            </>
          )}

          <div className="auth-field auth-field-email">
            <label className="auth-field-label" htmlFor="auth-email-input">
              Email Address
            </label>
            <input
              id="auth-email-input"
              className="auth-input"
              type="email"
              autoComplete="email"
              required
              placeholder="name@organization.com"
              value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="auth-field auth-field-password">
            <div className="auth-field-header">
              <label className="auth-field-label" htmlFor="auth-password-input">
                Password
              </label>
              {mode === "signup" && (
                <span className="auth-field-hint">Min. 8 characters</span>
              )}
            </div>
            <div className="auth-password-field">
              <input
                id="auth-password-input"
                className="auth-input auth-password-input"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                placeholder="••••••••••••"
                value={form.password}
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={0}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === "signin" && (
            <div className="auth-options-row">
              <label className="auth-remember-row" htmlFor="auth-remember-check">
                <input
                  id="auth-remember-check"
                  type="checkbox"
                  checked={Boolean(rememberEmail)}
                  onChange={e => setRememberEmail && setRememberEmail(e.target.checked)}
                />
                <span>Remember email</span>
              </label>

              <button
                type="button"
                className="auth-forgot-link"
                onClick={onForgotPassword}
                disabled={busy}
              >
                Forgot password?
              </button>
            </div>
          )}

          <div className="auth-form-actions">
            <button className="btn btn-primary btn-hero w-full" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Create Marketplace Account" : "Sign In to Dashboard"}
            </button>
          </div>

          {message && (
            <p className={`auth-message ${messageType}`} role={messageType === "error" ? "alert" : "status"}>
              {message}
            </p>
          )}

          <p className="auth-demo-note">
            New accounts can register as a Seller or Collector. Recycler and Admin accounts are enabled separately during facility onboarding.
          </p>
        </form>
      )}

      {session && profile && message && (
        <p className={`auth-message ${messageType}`} role={messageType === "error" ? "alert" : "status"}>
          {message}
        </p>
      )}
    </section>
  );
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
    <div className="panel-heading"><div><h2>{connected ? "Marketplace history" : "Recent activity"}</h2><p>{connected ? "Read-only history of actions on lots visible to your account." : "Local demo actions recorded in this browser tab."}</p></div><Activity size={19} className="muted-icon" /></div>
    {connected && unavailableLabels.length > 0 && <div className="inline-hint history-read-warning" role="status"><span>Listings and offers loaded, but {unavailableLabels.join(" and ")} could not be fetched right now.</span><button type="button" className="btn btn-light btn-small" onClick={onRetry} disabled={retrying}>{retrying ? "Retrying…" : "Retry history"}</button></div>}
    <div className="history-columns">
      <div><h3>{connected ? "Activity history" : "Activity"}</h3>
        {activity.length ? <div className="activity-list">{activity.slice(0, 20).map((item, i) => <div className="activity-item" key={item.id}><div className={`activity-marker marker-${i % 3}`}><Check size={14} /></div><div className="activity-copy"><strong>{item.text}</strong><span>{item.time}{item.lotId ? ` · ${lotNames.get(item.lotId) || "Marketplace lot"}` : ""}</span></div></div>)}</div> : <EmptyState title={activityUnavailable ? "Activity history unavailable" : "No activity yet"} detail={activityUnavailable ? "Could not load activity history. Try refreshing." : connected ? "No activity entries are visible for your account yet." : "Actions in this local demo will appear here."} />}
      </div>
      {connected && <div><h3>Workflow events</h3>
        {workflowEvents.length ? <div className="activity-list">{workflowEvents.slice(0, 20).map((item, i) => <div className="activity-item" key={item.id}><div className={`activity-marker marker-${i % 3}`}><Package size={14} /></div><div className="activity-copy"><strong>{item.fromStatus ? `${statusLabel(item.fromStatus)} → ${statusLabel(item.toStatus)}` : statusLabel(item.toStatus)} · {item.eventType}</strong><span>{item.note || "No event note"}{item.lotId ? ` · ${lotNames.get(item.lotId) || "Marketplace lot"}` : ""} · {item.time}</span></div></div>)}</div> : <EmptyState title={workflowUnavailable ? "Workflow history unavailable" : "No workflow events yet"} detail={workflowUnavailable ? "Could not load workflow history. Try refreshing." : "No workflow changes are visible for your account yet."} />}
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

function SellerDashboard({ onWeight, onDispute, workflowEvents = [], traceabilityAvailable, lots, allLotCount, query, setQuery, statusFilter, setStatusFilter, onAdd, onEdit, onDecision, decisionBusyOfferId, pickupAppointmentsByLot, pickupCoordinationAvailable, pickupBusyLotId, onProposePickup, readOnly = false, role = "Seller" }) {
  return (
    <SellerWorkspaceView
      lots={lots}
      allLotCount={allLotCount}
      query={query}
      setQuery={setQuery}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      onAdd={onAdd}
      onEdit={onEdit}
      onDecision={onDecision}
      decisionBusyOfferId={decisionBusyOfferId}
      pickupAppointmentsByLot={pickupAppointmentsByLot}
      pickupCoordinationAvailable={pickupCoordinationAvailable}
      pickupBusyLotId={pickupBusyLotId}
      onProposePickup={onProposePickup}
      traceProps={{ onWeight, onDispute, workflowEvents }}
      traceabilityAvailable={traceabilityAvailable}
      readOnly={readOnly}
      role={role}
      LotTraceActions={LotTraceActions}
      PickupCoordination={PickupCoordination}
    />
  );
}

function CollectorDashboard({ onWeight, onDispute, workflowEvents = [], traceabilityAvailable, lots, allLotCount, query, setQuery, statusFilter, setStatusFilter, onAdd, onEdit, onDecision, decisionBusyOfferId, pickupAppointmentsByLot, pickupCoordinationAvailable, pickupBusyLotId, onProposePickup, readOnly = false, role = "Collector", availableSellerScrap = [], onClaimScrap = null, collectionWork = [] }) {
  return (
    <CollectorWorkspaceView
      lots={lots}
      allLotCount={allLotCount}
      query={query}
      setQuery={setQuery}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      onAdd={onAdd}
      onEdit={onEdit}
      onDecision={onDecision}
      decisionBusyOfferId={decisionBusyOfferId}
      pickupAppointmentsByLot={pickupAppointmentsByLot}
      pickupCoordinationAvailable={pickupCoordinationAvailable}
      pickupBusyLotId={pickupBusyLotId}
      onProposePickup={onProposePickup}
      traceProps={{ onWeight, onDispute, workflowEvents }}
      traceabilityAvailable={traceabilityAvailable}
      readOnly={readOnly}
      role={role}
      LotTraceActions={LotTraceActions}
      PickupCoordination={PickupCoordination}
      availableSellerScrap={availableSellerScrap}
      onClaimScrap={onClaimScrap}
      collectionWork={collectionWork}
    />
  );
}

function LegacyCollectorCardList({ onWeight, onDispute, traceabilityAvailable, lots, allLotCount, query, setQuery, onAdd, onDecision, decisionBusyOfferId, pickupAppointmentsByLot, pickupCoordinationAvailable, pickupBusyLotId, onProposePickup, readOnly = false }) {
  return <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>My e-waste lots</h2><p>{readOnly ? "Supabase lot and offer records. Accept/reject decisions are checked by the database; other workflow updates are not connected." : "Compare recycler offers, then accept or reject each pending offer."}</p></div><span className={readOnly ? "connected-label" : "demo-label"}>{readOnly ? "CONNECTED COLLECTOR" : "DEMO COLLECTOR"}</span></div>
    <div className="filters role-filters"><div className="search-box"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search my lots..." aria-label="Search my lots" /></div><span className="filters-note">Showing {lots.length} of {allLotCount} lots</span></div>
    {lots.length ? <div className="lot-card-list">{lots.map(lot => <article className="workflow-card" key={lot.id}>
      <LotHeading lot={lot} />
      <div className="lot-meta-grid"><span><strong>{lot.weight} kg</strong><small>Estimated weight</small></span><span><MapPin size={14} /> {lot.location}<small>Approximate pickup area</small></span><span><strong>{shortDate(lot.date)}</strong><small>Created</small></span></div>
      {lot.notes && <p className="lot-notes">{lot.notes}</p>}
      <div className="workflow-progress"><span>Pickup and recycling status</span><strong>{statusLabel(lot.status)}</strong><ProgressTrack status={lot.status} /></div>
      <LotTraceActions lot={lot} mode={readOnly ? "collector" : "info"} available={traceabilityAvailable} onWeight={onWeight} onDispute={onDispute} />
      {lot.status === "Pickup scheduled" && lot.offers.some(offer => offer.status === "accepted") && <PickupCoordination role="collector" lot={lot} appointment={pickupAppointmentsByLot.get(lot.id)} available={pickupCoordinationAvailable} busy={pickupBusyLotId === lot.id} connected={readOnly} onPropose={onProposePickup} />}
      {lot.status === "Recycling review" && lot.evidence && <div className="evidence-note"><ShieldCheck size={15} /><div><strong>{readOnly ? "Evidence/review note · not independently verified" : "Demo evidence submitted"}</strong><span>{lot.evidence}</span></div></div>}
      <div className="offers-heading"><strong>Offers received ({lot.offers.length})</strong><span>Compare amounts and terms before deciding</span></div>
      {lot.offers.length ? <div className="offer-grid">{lot.offers.slice().sort((a, b) => b.price - a.price).map(offer => <article className={`offer-card ${offer.status}`} key={offer.id}><div className="offer-card-top"><strong>{offer.recycler}</strong><OfferStatusPill status={offer.status} /></div><div className="offer-price">{money(offer.price)}</div><p>{offer.message || "No message provided."}</p>{offer.status === "pending" && lot.status === "Offer submitted" ? <div className="offer-actions"><button className="btn btn-light btn-small" disabled={Boolean(decisionBusyOfferId)} onClick={() => onDecision(lot.id, offer.id, "rejected")}>{decisionBusyOfferId === offer.id ? "Saving…" : "Reject"}</button><button className="btn btn-primary btn-small" disabled={Boolean(decisionBusyOfferId)} onClick={() => onDecision(lot.id, offer.id, "accepted")}>{decisionBusyOfferId === offer.id ? "Saving…" : "Accept offer"}</button></div> : null}</article>)}</div> : <EmptyState title="No offers yet" detail="Recycler offers will appear here for comparison." compact />}
    </article>)}</div> : <EmptyState title={query ? "No matching lots" : "No lots available"} detail={query ? "Try a different search." : readOnly ? "This account has no visible lots yet." : "Create a lot to start your demo workflow."} action={!query ? <button className="btn btn-primary" onClick={onAdd}><Plus size={16} /> {readOnly ? "Create Lot" : "Create first lot"}</button> : null} />}
  </section>;
}

function RecyclerDashboard(props) {
  return <RecyclerWorkspaceView {...props} />;
}

function LegacyRecyclerDashboard({ lots, query, setQuery, categoryFilter, setCategoryFilter, locationFilter, setLocationFilter, statusFilter, setStatusFilter, categories, locations, myOffers, currentRecyclerId, readOnly = false, onOffer }) {
  return <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Available lots</h2><p>{readOnly ? "Browse lots visible to your account and submit one offer per lot." : "Browse open lots and submit one offer per lot as the demo recycler."}</p></div><span className={readOnly ? "connected-label" : "demo-label"}>{readOnly ? "CONNECTED RECYCLER" : "DEMO RECYCLER"}</span></div>
    <div className="inline-hint"><ShieldCheck size={15} /> Lot locations and notes are listing details, not private contact fields. After an offer is accepted, the Collector may propose a time and the accepted Recycler can respond when the pickup-coordination migration is enabled.</div>
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

function RecyclerOffers({ offers, connected = false, traceabilityAvailable, pickupAppointmentsByLot, pickupCoordinationAvailable, pickupBusyLotId, onRespondPickup, onWeight, onDispute }) {
  return <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>My submitted offers</h2><p>Track offer decisions, confirm pickup times, and record receiving weight after collection.</p></div><span className={connected ? "connected-label" : "demo-label"}>{connected ? "LIVE RECYCLER" : "DEMO RECYCLER"}</span></div>
    {offers.length ? <div className="lot-card-list">{offers.map(offer => <article className="workflow-card compact-card" key={offer.id}><div className="offer-card-top"><div><strong>{offer.lot.title}</strong><small>{offer.lot.id} · {offer.lot.category} · {offer.lot.location} · {formatWeightDisplay(offer.lot.weight)}</small></div><OfferStatusPill status={offer.status} /></div><div className="submitted-offer-details"><span className="offer-price">{money(offer.price)}</span><span>Lot status <StatusPill status={offer.lot.status} /></span></div><p className="lot-notes">{offer.message || "No additional terms attached."}</p>{offer.status === "accepted" && <LotTraceActions lot={offer.lot} mode="recycler" available={traceabilityAvailable} onWeight={onWeight} onDispute={onDispute} />}{offer.status === "accepted" && offer.lot.status === "Pickup scheduled" && <PickupCoordination role="recycler" lot={offer.lot} appointment={pickupAppointmentsByLot.get(offer.lot.id)} available={pickupCoordinationAvailable} busy={pickupBusyLotId === offer.lot.id} connected={connected} onRespond={onRespondPickup} />}</article>)}</div> : <EmptyState title="No offers submitted" detail={connected ? "Submit an offer from an available lot to see it here." : "Browse available lots and submit a demo offer to see it here."} />}
  </section>;
}

function AdminDashboard(props) {
  return (
    <AdminWorkspaceView
      {...props}
      traceProps={{ onWeight: props.onWeight, onDispute: props.onDispute, workflowEvents: props.workflowEvents || [] }}
      LotTraceActions={LotTraceActions}
    />
  );
}

function LegacyAdminDashboard({ onWeight, onDispute, traceabilityAvailable, lots, query, setQuery, statusFilter, setStatusFilter, evidenceDrafts, setEvidenceDrafts, disputeDrafts, setDisputeDrafts, onTransition, onConnectedTransition, busyLotId, pickupAppointmentsByLot, canManage = false, readOnly = false }) {
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
      <LotTraceActions lot={lot} mode="info" available={traceabilityAvailable} onWeight={onWeight} onDispute={onDispute} />
      {pickupAppointmentsByLot.get(lot.id) && <div className="pickup-summary"><strong>Pickup appointment · {pickupAppointmentsByLot.get(lot.id).status.replaceAll("_", " ")}</strong><span>{new Date(pickupAppointmentsByLot.get(lot.id).scheduledAt).toLocaleString()} · coordination record only</span></div>}
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

function LotTraceActions({ lot, mode, available = true, onWeight, onDispute }) {
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (handler, value) => {
    setBusy(true);
    try {
      const saved = await handler?.(lot.id, value);
      if (saved !== false) {
        setWeight("");
        setNote("");
      }
    } finally {
      setBusy(false);
    }
  };
  const { canWeigh, canDispute, awaitingTraceability } = getTraceabilityActionState(lot, mode, available);
  const declared = Number(lot.weight);
  const actual = Number(lot.actualWeight);
  const computedDiff = lot.discrepancyPct != null && lot.discrepancyPct !== ""
    ? Number(lot.discrepancyPct)
    : (lot.actualWeight != null && Number.isFinite(declared) && declared > 0 && Number.isFinite(actual))
      ? Number((((actual - declared) / declared) * 100).toFixed(2))
      : null;
  const flagged = computedDiff != null && Math.abs(computedDiff) > 10;
  if (!lot.actualWeight && !canWeigh && !canDispute && !awaitingTraceability) return null;
  return <div className="trace-actions">
    {lot.actualWeight != null && <div className={`inline-hint ${flagged ? "warning" : ""}`}><ShieldCheck size={15} /> Receiving weight: <strong>{lot.actualWeight} kg</strong> vs declared {lot.weight} kg{computedDiff != null ? ` · difference ${computedDiff > 0 ? `+${computedDiff}` : computedDiff}%` : ""}{flagged ? " · flagged for Admin review" : ""}. Entered by the accepted Recycler (no automated scale connected).</div>}
    {awaitingTraceability && <p className="pickup-waiting" role="status">Receiving weight controls are temporarily unavailable. Refresh to check again.</p>}
    {canWeigh && <div className="evidence-entry"><label>Actual receiving weight (kg)<input type="number" min="0.1" max="100000" step="0.1" inputMode="decimal" value={weight} onChange={event => setWeight(event.target.value)} placeholder="e.g. 9.5" /></label><button type="button" className="btn btn-primary btn-small" disabled={busy || !weight} onClick={() => run(onWeight, weight)}>{busy ? "Saving…" : "Record receiving weight"}</button></div>}
    {canDispute && <div className="evidence-entry"><label>Flag a problem / dispute (10–500 characters)<textarea rows="2" minLength="10" maxLength="500" value={note} onChange={event => setNote(event.target.value)} placeholder="Describe weight mismatch or issue for Admin review" /></label><button type="button" className="btn btn-light btn-small" disabled={busy || note.trim().length < 10} onClick={() => run(onDispute, note)}>{busy ? "Saving…" : "Raise dispute"}</button></div>}
  </div>;
}

function PickupCoordination({ role, lot, appointment, available, busy, connected, onPropose, onRespond }) {
  const [timeValue, setTimeValue] = useState(() => {
    const suggested = new Date(Date.now() + 24 * 60 * 60 * 1000);
    suggested.setMinutes(0, 0, 0);
    return new Date(suggested.getTime() - suggested.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  const [pickupNote, setPickupNote] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [localError, setLocalError] = useState("");
  const [pendingDecision, setPendingDecision] = useState("");
  const submitProposal = async event => {
    event.preventDefault();
    const date = new Date(timeValue);
    if (Number.isNaN(date.getTime())) {
      setLocalError("Choose a valid pickup date and time.");
      return;
    }
    const result = await onPropose(lot.id, date.toISOString(), pickupNote);
    if (result) {
      setPickupNote("");
      setLocalError("");
    }
  };
  const submitResponse = async decision => {
    setPendingDecision(decision);
    const result = await onRespond(lot.id, decision, responseNote);
    if (result) {
      setResponseNote("");
      setLocalError("");
    }
    setPendingDecision("");
  };
  const dateLabel = appointment?.scheduledAt
    ? new Date(appointment.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "";
  const canPropose = !appointment || appointment.status === "reschedule_requested";
  const isOwner = role === "collector" || role === "seller" || role === "Collector" || role === "Seller";
  const submitReschedule = () => {
    const validation = validateRescheduleRequest(responseNote);
    if (!validation.ok) {
      setLocalError("Explain the requested change in 10 to 500 characters.");
      return;
    }
    setLocalError("");
    submitResponse("request_reschedule");
  };

  return <section className="pickup-coordination" aria-label="Pickup appointment coordination">
    <div className="pickup-copy"><strong>Pickup coordination</strong><span>{connected ? "An accepted offer does not itself confirm a pickup time." : "Local demo only; this is not a confirmed real-world pickup."}</span></div>
    {appointment && <div className={`pickup-summary ${appointment.status}`}><strong>{appointment.status === "confirmed" ? "Time confirmed by both accounts" : appointment.status === "reschedule_requested" ? "Recycler requested a different time" : "Awaiting Recycler response"}</strong><span>{dateLabel}</span>{appointment.proposedNote && <span>{(role === "seller" || role === "Seller") ? "Seller note: " : "Collector note: "}{appointment.proposedNote}</span>}{appointment.responseNote && <span>Recycler response: {appointment.responseNote}</span>}</div>}
    {connected && !available && <p className="pickup-waiting" role="status">Appointment data could not be loaded. Retry the marketplace refresh before taking a pickup action.</p>}
    {available && isOwner && canPropose && <form className="pickup-form" onSubmit={submitProposal}>
      <label>Propose a pickup date and time<input type="datetime-local" required value={timeValue} disabled={busy} onChange={event => { setTimeValue(event.target.value); setLocalError(""); }} /></label>
      <label>Coordination note (optional)<textarea rows="2" maxLength="500" disabled={busy} value={pickupNote} onChange={event => { setPickupNote(event.target.value); setLocalError(""); }} placeholder="Share a brief operational note" /></label>
      {localError && <span className="pickup-error" role="alert">{localError}</span>}
      <p>Keep notes operational. Do not enter private contact details or an exact home address.</p>
      <button className="btn btn-primary btn-small" type="submit" disabled={busy}>{busy ? "Saving…" : appointment ? "Propose new time" : "Propose pickup time"}</button>
    </form>}
    {available && role === "recycler" && appointment?.status === "proposed" && <div className="pickup-form">
      <label>Response note (optional for confirmation)<textarea rows="2" maxLength="500" disabled={busy} value={responseNote} onChange={event => { setResponseNote(event.target.value); setLocalError(""); }} placeholder="Optional coordination response" /></label>
      {localError && <span className="pickup-error" role="alert">{localError}</span>}
      <p>Confirm only if this proposed time works for you. Confirmation records agreement; it does not prove collection.</p>
      <div className="pickup-actions"><button className="btn btn-light btn-small" type="button" onClick={submitReschedule} disabled={busy}>{busy && pendingDecision === "request_reschedule" ? "Sending…" : "Request another time"}</button><button className="btn btn-primary btn-small" type="button" onClick={() => submitResponse("confirm")} disabled={busy}>{busy && pendingDecision === "confirm" ? "Saving…" : "Confirm time"}</button></div>
    </div>}
    {available && role === "recycler" && appointment?.status === "reschedule_requested" && <p className="pickup-waiting">Waiting for the lot owner to propose another time.</p>}
    {available && isOwner && appointment?.status === "proposed" && <p className="pickup-waiting">The proposal has been sent. The accepted Recycler must respond before a time is confirmed.</p>}
    {available && isOwner && appointment?.status === "confirmed" && <p className="pickup-waiting">The proposed time was confirmed. Mark the lot collected only after the handover actually happens.</p>}
    {available && !appointment && role === "recycler" && <p className="pickup-waiting">The lot owner has not proposed a pickup time yet.</p>}
    {!connected && <span className="pickup-demo-tag">LOCAL DEMO · SAVED IN THIS BROWSER</span>}
  </section>;
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
