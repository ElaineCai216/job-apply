export const STAGES = ["discovered", "screened", "materials", "review", "form", "ready", "submitted", "followup", "interview", "closed"];

export const STAGE_LABELS = {
  discovered: "新发现", screened: "已筛选", materials: "生成材料", review: "待审核",
  form: "填写中", ready: "待确认", submitted: "已投递", followup: "跟进中",
  interview: "面试", closed: "已结束"
};

export const emptyApplication = (patch = {}) => ({
  id: crypto.randomUUID(), company: "", role: "", url: "", jd: "", source: "手动",
  sourceUrl: "", capturedAt: new Date().toISOString(), location: "香港", workMode: "onsite",
  employmentType: "internship", attendance: "每周 3–4 天", earliestStart: "", deadline: "",
  matchScore: 0, matchReasons: [], risks: [], eligibility: "review", stage: "discovered",
  reviewStatus: "pending", applyMethod: "form", referralCode: "", referralSource: "",
  referralPlacement: "", resumeVersion: "", resumeFile: "", resumeTailoring: "",
  personalStatement: "", language: "auto", emailTo: "", emailSubject: "", emailBody: "",
  attachments: [], applicationNotes: "", evidenceGaps: [], formAnswers: [], timeline: [],
  appliedAt: "", followupAt: "", outcome: "", updatedAt: new Date().toISOString(), ...patch
});

export function materialGaps(job) {
  const gaps = [];
  if (!job.resumeFile || !job.resumeTailoring) gaps.push("定制简历");
  if (!job.personalStatement) gaps.push("Personal Statement");
  if (job.referralSource && !job.referralCode) gaps.push("内推码");
  if (job.applyMethod === "email" && (!job.emailTo || !job.emailSubject || !job.emailBody)) gaps.push("完整邮件稿");
  if ((job.evidenceGaps || []).length) gaps.push("待核实证据");
  return gaps;
}

export function canMarkReady(job) { return materialGaps(job).length === 0; }

export function evaluateEligibility(job, now = new Date()) {
  const text = `${job.company} ${job.role} ${job.jd}`.toLowerCase();
  if (/保险.{0,8}(销售|代理|顾问)|insurance.{0,8}(sales|agent)/i.test(text)) return { value: "excluded", reason: "排除保险销售" };
  if (/(招聘|recruiter|talent acquisition)/i.test(text)) return { value: "excluded", reason: "排除招聘型人事" };
  const graduation = new Date("2027-05-01T00:00:00+08:00");
  if (now < graduation && job.employmentType === "fulltime" && (!job.earliestStart || new Date(job.earliestStart) < graduation)) return { value: "excluded", reason: "全职入职时间早于 2027 年 5 月" };
  if (job.employmentType === "internship" && job.workMode !== "remote" && job.attendance && !/(3|4|三|四)/.test(job.attendance)) return { value: "review", reason: "需确认每周可线下 3–4 天" };
  return { value: "eligible", reason: "符合当前筛选边界" };
}

export function normalizeLegacy(raw) {
  const applications = raw?.applications || [];
  const pipeline = raw?.pipeline || [];
  const seen = new Set();
  return [...applications, ...pipeline].map((item) => emptyApplication({
    id: item.id || crypto.randomUUID(), company: item.company || "", role: item.position || "",
    url: item.url || "", jd: item.jd || item.notes || item.note || "", source: item.ats || item.channel || item.source || "旧版",
    sourceUrl: item.referral_source || "", deadline: item.deadline || "", matchScore: Number(item.matchScore || 0),
    stage: ({ todo: "screened", review: "ready", submitted: "submitted", following: "followup", closed: "closed", new: "discovered", selected: "screened", prepared: "materials", converted: "review", dropped: "closed" })[item.stage || item.status] || "discovered",
    referralCode: item.referral_code || "", referralSource: item.referral_source || "",
    resumeVersion: item.resume_version_zh || item.resume_version_en || item.resume_version || "",
    resumeFile: item.resume_custom_file || "", resumeTailoring: item.resume_tailoring || "",
    personalStatement: item.personal_statement || "", emailTo: item.apply_email || item.applyEmail || "",
    emailSubject: item.email_subject || "", emailBody: item.email_body || "", applicationNotes: item.application_notes || "",
    appliedAt: item.applied_date || "", followupAt: item.follow_up_date || "", outcome: item.outcome || ""
  })).filter((item) => {
    const key = item.url ? item.url.replace(/[?#].*$/, "") : `${item.company}|${item.role}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
