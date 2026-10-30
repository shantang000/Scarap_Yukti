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

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;
