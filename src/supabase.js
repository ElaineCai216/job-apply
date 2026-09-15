import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const allowedEmail = (import.meta.env.VITE_ALLOWED_EMAIL || "").trim().toLowerCase();
export const cloudEnabled = Boolean(url && key && !url.includes("YOUR_PROJECT"));
export const supabase = cloudEnabled ? createClient(url, key, {
  auth: { persistSession: true, detectSessionInUrl: true },
  realtime: { params: { eventsPerSecond: 4 } }
}) : null;
