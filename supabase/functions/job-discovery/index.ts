import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Source = { id: string; name: string; provider: "greenhouse" | "lever"; board_slug: string; preferred_region: string };
type Listing = { canonical_url: string; company: string; role: string; location: string; work_mode: string; employment_type: string; published_at: string | null; jd: string; source: string; official_url: string; qualification_status: "eligible" | "review" | "excluded"; qualification_reason: string; queue_kind: "intern" | "hk" | "mainland" | "radar"; match_score: number; status: "active" };

const positive = /data analyst|business analyst|business intelligence|\bbi\b|operations analyst|risk analyst|quant|investment research|equity research|financial data|regtech|保险.{0,6}(运营|后台|数据)|insurance.{0,6}(operations|data|risk)/i;
const negative = /insurance.{0,10}(sales|agent|advisor)|保险.{0,10}(销售|代理|顾问)|recruit(er|ment)|talent acquisition|human resources/i;
const mainland = /shanghai|shenzhen|beijing|guangzhou|hangzhou|上海|深圳|北京|广州|杭州|china|中国|大陆/i;
const hongKong = /hong kong|香港|\bhk\b/i;
const internship = /intern|internship|实习/i;
const remote = /remote|远程/i;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };

const clean = (value = "") => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const canonical = (url: string) => url.replace(/[?#].*$/, "").replace(/\/$/, "");

function classify(input: Omit<Listing, "qualification_status" | "qualification_reason" | "queue_kind" | "match_score" | "status">): Listing {
  const text = `${input.company} ${input.role} ${input.location} ${input.jd}`;
  const lower = text.toLowerCase();
  const isIntern = internship.test(text);
  const isHK = hongKong.test(text);
  const isMainland = mainland.test(text) && !isHK;
  const isRemote = remote.test(text);
  const fullTime = /full[ -]?time|全职/.test(lower);
  let qualification_status: Listing["qualification_status"] = "eligible";
  let qualification_reason = "符合岗位方向与基础地区规则";
  if (negative.test(text) || !positive.test(text)) { qualification_status = "excluded"; qualification_reason = negative.test(text) ? "排除销售或招聘型岗位" : "岗位方向不在当前目标内"; }
  else if (fullTime && /start.{0,24}(2026|immediately)|立即入职|即刻入职/i.test(text)) { qualification_status = "excluded"; qualification_reason = "要求毕业前立即全职入职"; }
  else if (isIntern && !isRemote && isHK && !/(3|4|三|四).{0,8}(day|天|days)/i.test(text)) { qualification_status = "review"; qualification_reason = "需确认线下实习每周 3–4 天是否可行"; }
  else if (!isIntern && !isHK && !isMainland) { qualification_status = "review"; qualification_reason = "地点或工作许可信息待确认"; }
  const queue_kind: Listing["queue_kind"] = qualification_status !== "eligible" ? "radar" : isIntern ? "intern" : isHK ? "hk" : isMainland ? "mainland" : "radar";
  const score = Math.min(100, 45 + (isIntern ? 15 : 10) + (isHK || isMainland ? 15 : 0) + (/(sql|python|statistics|power bi|tableau)/i.test(text) ? 15 : 0) + (/(finance|risk|investment|quant)/i.test(text) ? 10 : 0));
  return { ...input, qualification_status, qualification_reason, queue_kind, match_score: score, status: "active" };
}

async function fetchSource(source: Source): Promise<Listing[]> {
  const endpoint = source.provider === "lever"
    ? `https://api.lever.co/v0/postings/${encodeURIComponent(source.board_slug)}?mode=json`
    : `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.board_slug)}/jobs?content=true`;
  const response = await fetch(endpoint, { headers: { Accept: "application/json", "User-Agent": "ApplyDeskDiscovery/3.1" } });
  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
  const data = await response.json();
  const rows = source.provider === "lever" ? data : data.jobs || [];
  return rows.map((row: Record<string, unknown>) => {
    const url = String(row.hostedUrl || row.applyUrl || row.absolute_url || "");
    const location = source.provider === "lever" ? String((row.categories as Record<string, string> | undefined)?.location || "") : String((row.location as Record<string, string> | undefined)?.name || "");
    const jd = clean(String(row.descriptionPlain || row.description || row.content || ""));
    return classify({ canonical_url: canonical(url), company: source.name, role: clean(String(row.text || row.title || "")), location, work_mode: remote.test(`${location} ${jd}`) ? "remote" : "onsite", employment_type: internship.test(`${row.text || ""} ${jd}`) ? "internship" : "fulltime", published_at: String(row.createdAt || row.updatedAt || row.updated_at || "") || null, jd, source: `${source.name} official careers`, official_url: url });
  }).filter((item: Listing) => Boolean(item.canonical_url && item.role));
}

async function authorized(request: Request, supabase: ReturnType<typeof createClient>) {
  const header = request.headers.get("Authorization") || "";
  if (header === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) return true;
  const cronToken = request.headers.get("X-Apply-Desk-Cron") || "";
  if (cronToken && cronToken === Deno.env.get("JOB_DISCOVERY_CRON_TOKEN")) return true;
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return false;
  const { data } = await supabase.from("allowed_users").select("email").eq("email", (user.email || "").toLowerCase()).maybeSingle();
  return Boolean(data);
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  if (!(await authorized(request, supabase))) return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  const run = await supabase.from("discovery_runs").insert({ trigger: "schedule" }).select("id").single();
  if (run.error || !run.data) return Response.json({ error: "Unable to create discovery run" }, { status: 500, headers: cors });
  const errors: string[] = []; let seen = 0; let added = 0;
  const { data: sources, error: sourceError } = await supabase.from("public_job_sources").select("id,name,provider,board_slug,preferred_region").eq("enabled", true);
  if (sourceError) errors.push("Unable to load source catalogue");
  for (const source of (sources || []) as Source[]) {
    try {
      const listings = await fetchSource(source); seen += listings.length;
      const active = await supabase.from("public_job_listings").select("canonical_url").eq("source_id", source.id).eq("status", "active");
      const currentUrls = new Set(listings.map(item => item.canonical_url));
      for (const listing of listings) {
        const { data: existing } = await supabase.from("public_job_listings").select("id,official_url").eq("canonical_url", listing.canonical_url).maybeSingle();
        const { error } = await supabase.from("public_job_listings").upsert({ ...listing, source_id: source.id, official_url: existing?.official_url || listing.official_url, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "canonical_url" });
        if (error) errors.push(`${source.name}: save failed`); else if (!existing) added += 1;
      }
      const missing = (active.data || []).map(row => row.canonical_url).filter(url => !currentUrls.has(url));
      if (missing.length) await supabase.from("public_job_listings").update({ status: "closed", updated_at: new Date().toISOString() }).in("canonical_url", missing);
    } catch (error) { errors.push(error instanceof Error ? error.message : `${source.name}: unknown failure`); }
  }
  await supabase.from("discovery_runs").update({ finished_at: new Date().toISOString(), sources_checked: (sources || []).length, listings_seen: seen, listings_added: added, errors }).eq("id", run.data.id);
  return Response.json({ added, seen, errors }, { headers: cors });
});
