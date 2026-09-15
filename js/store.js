/* ============ store.js — 数据模型 + localStorage 持久化 ============ */
(function () {
  "use strict";

  const KEY = "jobApplyData.v1";
  const SYNC_SOURCE = "applydesk-web";
  const DAY = 86400000;

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const STAGES = [
    { key: "todo",      label: "待投递", color: "var(--amber)"  },
    { key: "review",    label: "待确认", color: "var(--accent)"  },
    { key: "submitted", label: "已投递", color: "var(--blue)"    },
    { key: "following", label: "跟进中", color: "var(--teal)"    },
    { key: "closed",    label: "已结束", color: "var(--gray)"    }
  ];
  const OUTCOMES = ["", "面试", "Offer", "未通过", "已撤回", "已回音（其他）"];
  const PIPELINE_STATUSES = [
    { key: "new",       label: "待筛选",   cls: "pipe-new" },
    { key: "selected",  label: "已选中",   cls: "pipe-selected" },
    { key: "prepared",  label: "材料已备", cls: "pipe-prepared" },
    { key: "converted", label: "已转投递", cls: "pipe-converted" },
    { key: "dropped",   label: "放弃",     cls: "pipe-dropped" }
  ];
  const APPLY_METHODS = ["表单投递", "邮件投递"];
  const ATSS = ["公司官网", "Workday", "SAP SuccessFactors", "Greenhouse", "Lever", "Ashby", "JobsDB", "JIJIS", "LinkedIn", "邮箱投递", "国内平台", "其他"];

  const FLOW_STEPS = [
    { key: "fill",    label: "填写", desc: "表单已填写完成" },
    { key: "preview", label: "预览", desc: "已截图展示给你" },
    { key: "confirm", label: "确认", desc: "你确认后提交"   },
    { key: "submit",  label: "提交", desc: "已最终提交"     }
  ];

  const emptyFlow = () => ({
    fill:    { done: false, date: "", note: "" },
    preview: { done: false, date: "", note: "" },
    confirm: { done: false, date: "", note: "" },
    submit:  { done: false, date: "", note: "" }
  });

  function seedProfile() {
    return {
      identity: {
        full_name: "", english_name: "", phone: "", email: "",
        location: "", linkedin: "", github: "", portfolio: ""
      },
      visa: { work_authorization: "", requires_sponsorship: false, note: "" },
      summary: "", experience: [], education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      languages: [],
      referral_codes: {},
      resume_files: { default: "", zh: "", en: "" }
    };
  }

  function seedApplications() {
    const A = (extra) => ({ id: uid(), flow: emptyFlow(), ...extra });
    return [
      A({
        company: "示例量化", position: "后端工程师",
        url: "https://boards.greenhouse.io/example/jobs/1", ats: "Greenhouse",
        referral_code: "XM2026", resume_version: "通用版",
        stage: "submitted", applied_date: "2026-08-20", follow_up_date: "",
        outcome: "", notes: "通过内推投递，等 HR 联系。",
        flow: {
          fill:    { done: true, date: "2026-08-20", note: "" },
          preview: { done: true, date: "2026-08-20", note: "截图已确认" },
          confirm: { done: true, date: "2026-08-20", note: "已确认" },
          submit:  { done: true, date: "2026-08-20", note: "" }
        }
      }),
      A({
        company: "示例跳动", position: "前端工程师（远程）",
        url: "https://www.zhipin.com/job_detail/example", ats: "国内平台",
        referral_code: "", resume_version: "中文版",
        stage: "review", applied_date: "", follow_up_date: "",
        outcome: "", notes: "表单已填完，等你确认后提交。",
        flow: {
          fill:    { done: true,  date: "2026-09-01", note: "" },
          preview: { done: true,  date: "2026-09-01", note: "已预览" },
          confirm: { done: false, date: "", note: "" },
          submit:  { done: false, date: "", note: "" }
        }
      }),
      A({
        company: "Stripe", position: "Software Engineer",
        url: "https://jobs.lever.co/stripe/example", ats: "Lever",
        referral_code: "", resume_version: "英文版",
        stage: "following", applied_date: "2026-08-10", follow_up_date: "2026-09-03",
        outcome: "", notes: "已投 3 周，计划 9/3 跟进。",
        flow: {
          fill:    { done: true, date: "2026-08-10", note: "" },
          preview: { done: true, date: "2026-08-10", note: "" },
          confirm: { done: true, date: "2026-08-10", note: "" },
          submit:  { done: true, date: "2026-08-10", note: "" }
        }
      }),
      A({
        company: "示例设计工作室", position: "全栈开发",
        url: "mailto:hr@example.studio", ats: "邮箱投递",
        referral_code: "", resume_version: "通用版",
        stage: "todo", applied_date: "", follow_up_date: "",
        outcome: "", notes: "需要先起草邮件正文给你确认。",
        flow: emptyFlow()
      })
    ];
  }

  function seedPipeline() {
    const P = (extra) => ({ id: uid(), status: "new", source: "示例", createdAt: todayISO(), ...extra });
    return [
      P({ company: "汇丰银行", position: "Data Analyst Intern", url: "https://www.hsbc.com/careers", channel: "公司官网", location: "香港", matchScore: 88, deadline: "2026-10-15", note: "数学统计背景匹配，建议英文简历" }),
      P({ company: "中金公司", position: "数据分析实习生", url: "https://www.cicc.com/careers", channel: "公司官网", location: "香港 / 深圳", matchScore: 85, deadline: "2026-10-08", note: "交银国际实习经历高度相关", status: "selected" }),
      P({ company: "某远程初创", position: "Business Analyst (Remote)", url: "https://hk.jobsdb.com/job/example", channel: "JobsDB", location: "远程", matchScore: 78, deadline: "", note: "可远程，注意时区" })
    ];
  }

  function defaultData() {
    return {
      version: 1,
      profile: seedProfile(),
      applications: [],
      pipeline: [],
      settings: { dark: false, noResponseDays: 7, defaultResumeId: "", dailyGoal: 3 }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) { const d = defaultData(); save(d); return d; }
      const d = JSON.parse(raw);
      const base = defaultData();
      return {
        ...base,
        ...d,
        applications: Array.isArray(d.applications) ? d.applications : [],
        pipeline: Array.isArray(d.pipeline) ? d.pipeline : [],
        settings: { ...base.settings, ...(d.settings || {}) }
      };
    } catch (e) {
      return defaultData();
    }
  }

  function stamp(d) {
    d.sync = { ...(d.sync || {}), updatedAt: new Date().toISOString(), source: SYNC_SOURCE };
    return d;
  }

  function publish(d) {
    window.postMessage({ type: "APPLYDESK_WEB_STATE", source: SYNC_SOURCE, data: d }, location.origin);
  }

  function save(d) {
    stamp(d);
    localStorage.setItem(KEY, JSON.stringify(d));
    publish(d);
  }

  function reset() { const d = defaultData(); save(d); return d; }
  function loadSample() {
    const d = defaultData();
    d.applications = seedApplications();
    d.pipeline = seedPipeline();
    save(d);
    return d;
  }

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function daysSince(iso) {
    if (!iso) return null;
    const t = new Date(iso + "T00:00:00").getTime();
    if (isNaN(t)) return null;
    return Math.floor((new Date(todayISO() + "T00:00:00").getTime() - t) / DAY);
  }

  /* 需要跟进的投递：已投递/跟进中、无结果，且过了提醒阈值或到了跟进日期 */
  function needsAttention(app, settings) {
    if (!app || (app.stage !== "submitted" && app.stage !== "following")) return false;
    if (app.outcome) return false;
    if (app.follow_up_date && app.follow_up_date <= todayISO()) return true;
    const d = daysSince(app.applied_date);
    return d !== null && d >= (settings.noResponseDays || 7);
  }

  const stageMeta = (k) => STAGES.find((s) => s.key === k) || STAGES[0];

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const msg = event.data;
    if (!msg || msg.type !== "APPLYDESK_EXTENSION_STATE" || msg.source !== "applydesk-extension") return;
    const incoming = msg.data;
    if (!incoming || typeof incoming !== "object") return;
    const current = load();
    const incomingAt = Date.parse(incoming.sync && incoming.sync.updatedAt || "") || 0;
    const currentAt = Date.parse(current.sync && current.sync.updatedAt || "") || 0;
    if (incomingAt <= currentAt) return;
    localStorage.setItem(KEY, JSON.stringify(incoming));
    window.dispatchEvent(new CustomEvent("applydesk:data-changed", { detail: { source: "extension" } }));
  });

  window.addEventListener("DOMContentLoaded", () => publish(load()));

  window.Store = {
    KEY, DAY, uid, STAGES, OUTCOMES, ATSS, FLOW_STEPS, PIPELINE_STATUSES, APPLY_METHODS,
    emptyFlow, load, save, reset, loadSample,
    todayISO, daysSince, needsAttention, stageMeta
  };
})();
