import { cloudEnabled, supabase } from "./supabase";
import { emptyApplication, normalizeLegacy } from "./domain";

const CACHE_KEY = "applyDesk.v2.jobs";
const LEGACY_KEY = "jobApplyData.v1";

export function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; } catch { return []; }
}

function saveCache(items) { localStorage.setItem(CACHE_KEY, JSON.stringify(items)); }

function fromRow(row) { return { ...row.data, id: row.id, updatedAt: row.updated_at }; }

export async function loadJobs(userId) {
  if (!cloudEnabled || !userId) return loadCache();
  const { data, error } = await supabase.from("applications").select("id,data,updated_at").order("updated_at", { ascending: false });
  if (error) throw error;
  const items = data.map(fromRow); saveCache(items); return items;
}

export async function saveJob(job, userId) {
  const next = { ...job, updatedAt: new Date().toISOString() };
  const local = loadCache();
  saveCache([next, ...local.filter((x) => x.id !== next.id)]);
  if (cloudEnabled && userId) {
    const { error } = await supabase.from("applications").upsert({ id: next.id, user_id: userId, data: next, updated_at: next.updatedAt });
    if (error) throw error;
  }
  return next;
}

export async function removeJob(id, userId) {
  saveCache(loadCache().filter((x) => x.id !== id));
  if (cloudEnabled && userId) {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) throw error;
  }
}

export function previewLegacy() {
  try { return normalizeLegacy(JSON.parse(localStorage.getItem(LEGACY_KEY) || "{}")); } catch { return []; }
}

export async function importLegacy(userId) {
  const legacy = previewLegacy();
  const current = await loadJobs(userId);
  const existing = new Set(current.map((x) => x.url?.replace(/[?#].*$/, "")).filter(Boolean));
  const additions = legacy.filter((x) => !x.url || !existing.has(x.url.replace(/[?#].*$/, "")));
  for (const job of additions) await saveJob(job, userId);
  return additions.length;
}

export function subscribeJobs(userId, onChange) {
  if (!cloudEnabled || !userId) return () => {};
  const channel = supabase.channel(`jobs:${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "applications", filter: `user_id=eq.${userId}` }, onChange).subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function receiveExtensionCapture(onCapture) {
  const handler = (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (event.data?.type !== "APPLYDESK_CAPTURE_JOB") return;
    const lead = event.data.payload || {};
    onCapture(emptyApplication({ company: lead.company || "", role: lead.position || "", url: lead.url || "", jd: lead.jd || "", source: lead.channel || "浏览器扩展", emailTo: lead.applyEmail || "", applyMethod: lead.applyMethod === "邮件投递" ? "email" : "form" }));
  };
  window.addEventListener("message", handler);
  window.postMessage({ type: "APPLYDESK_V2_READY", source: "applydesk-web" }, location.origin);
  return () => window.removeEventListener("message", handler);
}
