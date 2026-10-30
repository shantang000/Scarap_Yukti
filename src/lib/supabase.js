import { createClient } from "@supabase/supabase-js";

const environment = import.meta.env || {};
const supabaseUrl = environment.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const hasSupabaseConfig = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  !supabaseUrl.includes("your-project-id") &&
  !supabasePublishableKey.includes("replace_me")
);

export const REMEMBERED_ACCOUNTS_KEY = "scarap-yukti-remembered-accounts-v1";
export const ACTIVE_ACCOUNT_KEY = "scarap-yukti-active-account-v1";
export const LEGACY_ACCOUNT_ID = "legacy";

function browserStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readStoredAccounts() {
  const storage = browserStorage();
  if (!storage) return [];
  try {
    const value = JSON.parse(storage.getItem(REMEMBERED_ACCOUNTS_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(item =>
      item &&
      typeof item.id === "string" &&
      typeof item.email === "string" &&
      item.email.includes("@")
    ).slice(0, 8);
  } catch {
    return [];
  }
}

function createBrowserClient(storageKey) {
  if (!hasSupabaseConfig) return null;
  const auth = {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  };
  if (storageKey) auth.storageKey = storageKey;
  return createClient(supabaseUrl, supabasePublishableKey, { auth });
}

const defaultClient = createBrowserClient();
const accountClients = new Map();
let activeAccountId = browserStorage()?.getItem(ACTIVE_ACCOUNT_KEY) || LEGACY_ACCOUNT_ID;

function getClientForAccount(accountId) {
  if (!hasSupabaseConfig) return null;
  if (!accountId || accountId === LEGACY_ACCOUNT_ID) return defaultClient;
  if (!accountClients.has(accountId)) {
    accountClients.set(accountId, createBrowserClient(`scarap-yukti-auth-${accountId}`));
  }
  return accountClients.get(accountId);
}

let activeClient = getClientForAccount(activeAccountId);
export let supabase = activeClient;

if (activeClient) activeClient.auth.startAutoRefresh();

export function getActiveSupabaseClient() {
  return activeClient;
}

export function getActiveAccountId() {
  return activeAccountId || LEGACY_ACCOUNT_ID;
}

export function activateSupabaseAccount(accountId = LEGACY_ACCOUNT_ID) {
  if (!hasSupabaseConfig) return null;
  const nextId = accountId || LEGACY_ACCOUNT_ID;
  const nextClient = getClientForAccount(nextId);
  if (!nextClient) return null;
  if (activeClient && activeClient !== nextClient) activeClient.auth.stopAutoRefresh();
  activeAccountId = nextId;
  activeClient = nextClient;
  supabase = nextClient;
  const storage = browserStorage();
  try {
    storage?.setItem(ACTIVE_ACCOUNT_KEY, nextId);
  } catch {
    // Auth still works for this tab when persistent storage is unavailable.
  }
  nextClient.auth.startAutoRefresh();
  return nextClient;
}

export function prepareSupabaseAccount(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Enter the account email first.");
  const existing = readStoredAccounts().find(item => item.email.toLowerCase() === normalizedEmail);
  const accountId = existing?.id || (globalThis.crypto?.randomUUID?.() ?? `account-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const client = activateSupabaseAccount(accountId);
  if (!client) throw new Error("Supabase is not configured.");
  return { accountId, client, existing };
}

export function getRememberedSupabaseAccounts() {
  return readStoredAccounts();
}

export function rememberSupabaseAccount({ id, email, displayName = "", role = "" }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!id || !normalizedEmail) return readStoredAccounts();
  const accounts = readStoredAccounts().filter(item => item.id !== id && item.email.toLowerCase() !== normalizedEmail);
  accounts.unshift({
    id,
    email: normalizedEmail,
    displayName: String(displayName || "").slice(0, 100),
    role: ["collector", "recycler", "admin"].includes(role) ? role : "",
    lastUsedAt: new Date().toISOString()
  });
  const next = accounts.slice(0, 8);
  try {
    browserStorage()?.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(next));
    browserStorage()?.setItem(ACTIVE_ACCOUNT_KEY, id);
  } catch {
    // The active session remains usable if device storage is unavailable.
  }
  return next;
}

export async function forgetSupabaseAccount(accountId) {
  const client = getClientForAccount(accountId);
  if (client) {
    try {
      await client.auth.signOut({ scope: "local" });
    } finally {
      client.auth.stopAutoRefresh();
    }
  }
  accountClients.delete(accountId);
  const storage = browserStorage();
  try {
    storage?.removeItem(`scarap-yukti-auth-${accountId}`);
    const remaining = readStoredAccounts().filter(item => item.id !== accountId);
    storage?.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(remaining));
  } catch {
    // Do not block account switching if browser storage is unavailable.
  }
  if (activeAccountId === accountId) activateSupabaseAccount(LEGACY_ACCOUNT_ID);
  return readStoredAccounts();
}
