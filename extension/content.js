/* 投递助手 · 内容脚本：抓取岗位信息 + 基础表单填充 */
(function () {
  "use strict";
  if (window.__applyDeskInjected) return;
  window.__applyDeskInjected = true;
  const D = window.JobDetect;

  const textOf = (el) => (el ? (el.innerText || el.textContent || "").trim() : "");
  function meta(name) {
    const el = document.querySelector('meta[property="' + name + '"]') || document.querySelector('meta[name="' + name + '"]');
    return el ? (el.getAttribute("content") || "").trim() : "";
  }
  function jsonLd() {
    const out = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        const j = JSON.parse(s.textContent);
        (Array.isArray(j) ? j : [j]).forEach((x) => out.push(x));
      } catch (e) {}
    });
    return out;
  }
  function jobPosting() {
    return jsonLd().find((j) => j && (j["@type"] === "JobPosting" || (Array.isArray(j["@type"]) && j["@type"].includes("JobPosting")))) || null;
  }
  function pickJD() {
    const sels = [
      '[class*="job-detail"]', '[class*="jobDetail"]', '[class*="job-description"]', '[class*="jobDescription"]',
      '[id*="job-detail"]', '[id*="jobDetail"]', '[class*="position-detail"]', '[class*="job_content"]',
      '[class*="job-content"]', "article", "main"
    ];
    let best = "";
    for (const sel of sels) {
      document.querySelectorAll(sel).forEach((el) => {
        const t = textOf(el);
        if (t.length > best.length && t.length > 200) best = t;
      });
      if (best.length > 400) break;
    }
    if (best.length < 200) best = textOf(document.body);
    return best.replace(/\n{3,}/g, "\n\n").slice(0, 20000);
  }
  function extract() {
    const url = location.href;
    const channel = D.detectChannel(url);
    const posting = jobPosting();
    const title = document.title || "";
    const h1 = textOf(document.querySelector("h1"));
    const position = (posting && posting.title) || h1 || D.guessPosition(title);
    let company = (posting && posting.hiringOrganization && posting.hiringOrganization.name) || "";
    if (!company) company = D.guessCompany(url, title) || "";
    if (!company) company = meta("og:site_name") || "";
    let locationText = "";
    if (posting && posting.jobLocation) {
      const loc = Array.isArray(posting.jobLocation) ? posting.jobLocation[0] : posting.jobLocation;
      if (loc && loc.address) locationText = [loc.address.addressLocality, loc.address.addressRegion, loc.address.addressCountry].filter(Boolean).join(", ");
    }
    return {
      company: company || "",
      position: position || "",
      channel,
      url,
      location: locationText,
      jd: pickJD(),
      pageTitle: title,
      createdAt: new Date().toISOString()
    };
  }

  const RULES = [
    { keys: ["full name", "fullname", "your name", "name", "姓名", "名字"], field: "name" },
    { keys: ["email", "e-mail", "邮箱", "邮件", "mail"], field: "email" },
    { keys: ["phone", "tel", "mobile", "电话", "手机", "联系方式"], field: "phone" },
    { keys: ["linkedin"], field: "linkedin" },
    { keys: ["github"], field: "github" },
    { keys: ["location", "city", "地区", "城市", "所在地"], field: "location" }
  ];
  function descriptors(el) {
    const parts = [el.getAttribute("name"), el.id, el.getAttribute("placeholder"), el.getAttribute("aria-label")];
    if (el.id) {
      try {
        const lb = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (lb) parts.push(textOf(lb));
      } catch (e) {}
    }
    const wrap = el.closest("label");
    if (wrap) parts.push(textOf(wrap));
    return parts.filter(Boolean).join(" ").toLowerCase();
  }
  function fill(profile) {
    let filled = 0;
    document.querySelectorAll("input, textarea").forEach((el) => {
      if (el.disabled || el.readOnly) return;
      const type = (el.type || "").toLowerCase();
      if (["hidden", "password", "file", "submit", "button", "checkbox", "radio", "search"].includes(type)) return;
      if (el.value && el.value.trim()) return;
      const d = descriptors(el);
      for (const rule of RULES) {
        const val = profile[rule.field];
        if (!val) continue;
        if (rule.keys.some((k) => d.includes(k))) {
          el.focus();
          el.value = val;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          el.blur();
          filled++;
          break;
        }
      }
    });
    return filled;
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return false;
    if (msg.type === "APPLYDESK_PING") { sendResponse({ ok: true }); return true; }
    if (msg.type === "APPLYDESK_EXTRACT") { sendResponse({ ok: true, lead: extract() }); return true; }
    if (msg.type === "APPLYDESK_FILL") { sendResponse({ ok: true, filled: fill(msg.profile || {}) }); return true; }
    return false;
  });
})();
