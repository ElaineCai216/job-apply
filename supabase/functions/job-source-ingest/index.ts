import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const encoder = new TextEncoder();
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,x-apply-desk-device", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const clean = (value: unknown, length: number) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, length);
const canonical = (value: string) => value.replace(/[?#].*$/, "").replace(/\/$/, "");
const portals = new Set(["jobsdb", "offertoday", "ctgoodjobs", "boss"]);
async function digest(value: string) { const data = await crypto.subtle.digest("SHA-256", encoder.encode(value)); return [...new Uint8Array(data)].map(byte => byte.toString(16).padStart(2, "0")).join(""); }

async function userFromBearer(request: Request, supabase: ReturnType<typeof createClient>) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: allowed } = await supabase.from("allowed_users").select("email").eq("email", (user.email || "").toLowerCase()).maybeSingle();
  return allowed ? user : null;
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const payload = await request.json().catch(() => ({}));
  if (payload.mode === "inspect-sync-space") {
    const user = await userFromBearer(request, supabase);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    const [{ count: recordCount }, { count: fileCount }] = await Promise.all([
      supabase.from("encrypted_records").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("encrypted_files").select("id", { count: "exact", head: true }).eq("user_id", user.id)
    ]);
    return Response.json({ encryptedRecords: recordCount || 0, encryptedFiles: fileCount || 0 }, { headers: cors });
  }
  if (payload.mode === "enroll") {
    const user = await userFromBearer(request, supabase);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const portal = portals.has(payload.portal) ? payload.portal : "jobsdb";
    const { data, error } = await supabase.from("collector_devices").insert({ user_id: user.id, portal, name: clean(payload.name, 80) || "Safari on Mac", token_hash: await digest(token) }).select("id,expires_at,portal").single();
    if (error) return Response.json({ error: `Unable to enroll ${portal}: ${error.code || "database_error"}` }, { status: 500, headers: cors });
    return Response.json({ deviceId: data.id, token, endpoint: `${url}/functions/v1/job-source-ingest`, expiresAt: data.expires_at }, { headers: cors });
  }
  const rawToken = request.headers.get("X-Apply-Desk-Device") || "";
  if (!rawToken) return Response.json({ error: "Missing collector token" }, { status: 401, headers: cors });
  const { data: device } = await supabase.from("collector_devices").select("id,user_id,portal").eq("token_hash", await digest(rawToken)).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!device) return Response.json({ error: "Collector token expired" }, { status: 401, headers: cors });
  if (payload.mode === "session-expired") {
    await supabase.from("portal_job_inbox").insert({ user_id: device.user_id, portal: device.portal, canonical_url: `${device.portal}-session:${new Date().toISOString()}`, role: "登录状态待处理", source_page: clean(payload.sourcePage, 500), status: "session_expired" });
    await supabase.from("collector_devices").update({ last_used_at: new Date().toISOString() }).eq("id", device.id);
    return Response.json({ ok: true }, { headers: cors });
  }
  const jobs = Array.isArray(payload.jobs) ? payload.jobs.slice(0, 100) : [];
  const rows = jobs.map((job: Record<string, unknown>) => ({ user_id: device.user_id, portal: device.portal, canonical_url: canonical(clean(job.url, 1800)), company: clean(job.company, 240), role: clean(job.role, 300), location: clean(job.location, 240), jd: clean(job.jd, 30000), source_page: clean(job.sourcePage, 1800), status: "pending" })).filter((job: { canonical_url: string; role: string }) => /^https:\/\//.test(job.canonical_url) && Boolean(job.role));
  if (rows.length) await supabase.from("portal_job_inbox").upsert(rows, { onConflict: "user_id,portal,canonical_url", ignoreDuplicates: true });
  await supabase.from("collector_devices").update({ last_used_at: new Date().toISOString() }).eq("id", device.id);
  return Response.json({ ok: true, accepted: rows.length }, { headers: cors });
});
