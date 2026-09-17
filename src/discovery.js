import { supabase, cloudEnabled } from "./supabase";
import { dbAll, dbGet, dbPut } from "./localDb";
import { emptyApplication } from "./domain";
import { saveJob } from "./store";

const SETTINGS_ID = "job-discovery-status";
const queueLabel = { intern: "实习", hk: "香港秋招", mainland: "大陆岗位", radar: "新岗位雷达" };
const canonical = url => (url || "").replace(/[?#].*$/, "").replace(/\/$/, "");

export async function discoveryStatus() { return (await dbGet("settings", SETTINGS_ID)) || { id: SETTINGS_ID, unread: 0, lastSyncAt: "", jobsdbStatus: "未连接" }; }
export async function acknowledgeDiscovery() { const status = await discoveryStatus(); return dbPut("settings", { ...status, unread: 0 }); }

export async function refreshRecommendations(userId) {
  const status = await discoveryStatus();
  if (!cloudEnabled || !userId || !navigator.onLine) return status;
  const [{ data: listings, error }, { data: jobsdbRows }, localJobs] = await Promise.all([
    supabase.from("public_job_listings").select("*").eq("status", "active").in("qualification_status", ["eligible", "review"]).order("match_score", { ascending: false }).limit(200),
    supabase.from("portal_job_inbox").select("*").eq("user_id", userId).in("status", ["pending", "session_expired"]).order("captured_at", { ascending: false }).limit(100),
    dbAll("jobs")
  ]);
  if (error) throw error;
  const known = new Set(localJobs.filter(job => !job.deletedAt).map(job => canonical(job.url)).filter(Boolean));
  let imported = 0;
  for (const item of listings || []) {
    if (known.has(canonical(item.official_url || item.canonical_url))) continue;
    await saveJob(emptyApplication({ company: item.company, role: item.role, url: item.official_url || item.canonical_url, jd: item.jd, source: item.source, sourceUrl: item.canonical_url, location: item.location, workMode: item.work_mode || "onsite", employmentType: item.employment_type || "fulltime", deadline: item.deadline || "", matchScore: item.match_score || 0, eligibility: item.qualification_status || "review", eligibilityReason: item.qualification_reason || "", stage: "discovered", timeline: [{ at: new Date().toISOString(), type: "discovery", text: `云端采集：${queueLabel[item.queue_kind] || "新岗位雷达"}` }] }), userId);
    known.add(canonical(item.official_url || item.canonical_url)); imported += 1;
  }
  let jobsdbImported = 0; let jobsdbStatus = "未连接";
  for (const item of jobsdbRows || []) {
    if (item.status === "session_expired") { jobsdbStatus = `${item.portal||"招聘平台"} 需要重新登录`; continue; }
    jobsdbStatus = "已连接";
    if (known.has(canonical(item.canonical_url))) { await supabase.from("portal_job_inbox").update({ status: "imported" }).eq("id", item.id); continue; }
    const label={jobsdb:"JobsDB",offertoday:"OfferToday",ctgoodjobs:"CTgoodjobs",boss:"Boss 直聘"}[item.portal]||"招聘平台";
    await saveJob(emptyApplication({ company: item.company || "待确认公司", role: item.role, url: item.canonical_url, jd: item.jd, source: `${label} · Safari`, sourceUrl: item.source_page, location: item.location, matchScore: 55, eligibility: "review", eligibilityReason: `${label} 推荐岗位，需完成资格判断`, stage: "discovered", timeline: [{ at: new Date().toISOString(), type: item.portal||"portal", text: `Safari ${label} 收集` }] }), userId);
    await supabase.from("portal_job_inbox").update({ status: "imported" }).eq("id", item.id);
    known.add(canonical(item.canonical_url)); imported += 1; jobsdbImported += 1;
  }
  return dbPut("settings", { ...status, lastSyncAt: new Date().toISOString(), unread: (status.unread || 0) + imported, imported, jobsdbImported, jobsdbStatus, lastError: "" });
}
