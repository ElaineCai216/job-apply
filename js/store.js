/* ============ store.js — 数据模型 + localStorage 持久化 ============ */
(function () {
  "use strict";

  const KEY = "jobApplyData.v1";
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
        full_name: "张小明", english_name: "Xiaoming Zhang",
        phone: "+852 1234 5678", email: "zhangxm@example.com",
        location: "香港", linkedin: "https://www.linkedin.com/in/xmzhang",
        github: "https://github.com/xmzhang", portfolio: ""
      },
      visa: { work_authorization: "香港永久居民", requires_sponsorship: false, note: "" },
      summary: "3 年后端工程师，擅长 Python / Go 与高并发服务，期望在金融科技或 SaaS 方向长期发展。",
      experience: [
        { id: uid(), company: "示例科技", title: "后端工程师", location: "深圳", start: "2023-03", end: "", current: true,
          highlights: ["负责交易网关服务，峰值 QPS 8k", "推动服务容器化，发布效率提升 40%"] },
        { id: uid(), company: "示例网络", title: "后端开发（实习）", location: "广州", start: "2022-06", end: "2022-12", current: false,
          highlights: ["参与用户中心微服务改造"] }
      ],
      education: [
        { id: uid(), institution: "示例大学", degree: "本科", field: "计算机科学与技术", start: "2018-09", end: "2022-06", gpa: "3.6/4.0" }
      ],
      skills: { languages: ["Python", "Go", "TypeScript"], frameworks: ["FastAPI", "React"], tools: ["Docker", "K8s", "AWS"], other: [] },
      languages: [
        { id: uid(), language: "中文", level: "母语" },
        { id: uid(), language: "英语", level: "流利（CET-6）" }
      ],
      referral_codes: {},
      resume_files: { default: "resume/张小明-简历-通用.pdf", zh: "", en: "" }
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

  function defaultData() {
    return {
      version: 1,
      profile: seedProfile(),
      applications: [],
      settings: { dark: false, noResponseDays: 7, defaultResumeId: "" }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) { const d = defaultData(); save(d); return d; }
      const d = JSON.parse(raw);
      return {
        ...defaultData(),
        ...d,
        settings: { ...defaultData().settings, ...(d.settings || {}) }
      };
    } catch (e) {
      return defaultData();
    }
  }

  function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

  function reset() { const d = defaultData(); save(d); return d; }
  function loadSample() { const d = defaultData(); d.applications = seedApplications(); save(d); return d; }

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

  window.Store = {
    KEY, DAY, uid, STAGES, OUTCOMES, ATSS, FLOW_STEPS,
    emptyFlow, load, save, reset, loadSample,
    todayISO, daysSince, needsAttention, stageMeta
  };
})();
