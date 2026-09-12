/* 投递助手 · 弹窗逻辑（识别投递方式 + 生成邮件草稿 + 填表 + 线索管理） */
(function () {
  "use strict";
  const D = window.JobDetect;
  const $ = (id) => document.getElementById(id);
  let current = null;

  const store = {
    async get(key, def) { const o = await chrome.storage.local.get(key); return o[key] === undefined ? def : o[key]; },
    async set(key, val) { await chrome.storage.local.set({ [key]: val }); }
  };
  const status = (msg) => { $("status").textContent = msg; };
  const activeTab = async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

  function initChannels(value) {
    const sel = $("fChannel");
    sel.innerHTML = "";
    D.CHANNELS.forEach((c) => {
      const o = document.createElement("option");
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
    sel.value = value || "其他";
  }

  const METHOD_CLASS = { "邮件投递": "m-mail", "官网表单": "m-form", "平台内投递": "m-platform", "需人工确认": "m-unknown" };

  async function extractCurrent() {
    initChannels();
    try {
      const tab = await activeTab();
      const res = await chrome.tabs.sendMessage(tab.id, { type: "APPLYDESK_EXTRACT" });
      if (!res || !res.ok) throw new Error("fail");
      current = res.lead;
    } catch (e) {
      const tab = await activeTab().catch(() => null);
      const url = tab ? tab.url : "";
      current = { company: "", position: "", channel: D.detectChannel(url), url, location: "", jd: "", pageTitle: "", createdAt: new Date().toISOString(), applyMethod: "需人工确认", applyEmail: "" };
    }
    renderCurrent();
  }

  function renderCurrent() {
    if (!current) return;
    $("fCompany").value = current.company || "";
    $("fPosition").value = current.position || "";
    $("fUrl").value = current.url || "";
    $("fChannel").value = current.channel || "其他";
    $("fEmail").value = current.applyEmail || "";
    const method = current.applyMethod || "需人工确认";
    const v = $("verdict");
    v.className = "verdict " + (METHOD_CLASS[method] || "m-unknown");
    v.textContent = "投递方式：" + method + (current.applyEmail ? "（" + current.applyEmail + "）" : (current.applyHint ? "（" + current.applyHint + "）" : ""));
  }

  const collectCurrent = () => Object.assign({}, current, {
    company: $("fCompany").value.trim(),
    position: $("fPosition").value.trim(),
    channel: $("fChannel").value,
    url: $("fUrl").value.trim(),
    applyEmail: $("fEmail").value.trim()
  });

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  async function copyText(text, okMsg) {
    try { await navigator.clipboard.writeText(text); status(okMsg); }
    catch (e) { status("复制失败，请手动选中复制"); }
  }

  async function renderLeads() {
    const leads = await store.get("leads", []);
    $("count").textContent = leads.length;
    $("leadCount").textContent = leads.length;
    const ul = $("leads");
    ul.innerHTML = "";
    if (!leads.length) { ul.innerHTML = '<li class="empty">还没有保存的线索</li>'; return; }
    leads.forEach((l, i) => {
      const li = document.createElement("li");
      const info = document.createElement("div");
      info.className = "lead-i";
      info.innerHTML = '<div class="lead-c">' + escapeHtml(l.company || "（待确认公司）") + " · " + escapeHtml(l.position || "（待确认职位）") + "</div>" +
        '<div class="lead-m">' + escapeHtml(l.channel || "") + (l.applyMethod ? " · " + escapeHtml(l.applyMethod) : "") + "</div>";
      const openBtn = document.createElement("button");
      openBtn.className = "icon-btn"; openBtn.textContent = "打开";
      openBtn.addEventListener("click", () => { if (l.url) chrome.tabs.create({ url: l.url }); });
      const copyBtn = document.createElement("button");
      copyBtn.className = "icon-btn"; copyBtn.textContent = "任务包";
      copyBtn.addEventListener("click", () => copyText(D.buildTaskPack(l), "已复制任务包"));
      const delBtn = document.createElement("button");
      delBtn.className = "icon-btn"; delBtn.textContent = "删除";
      delBtn.addEventListener("click", async () => {
        const arr = await store.get("leads", []); arr.splice(i, 1);
        await store.set("leads", arr); renderLeads();
      });
      li.append(info, openBtn, copyBtn, delBtn);
      ul.appendChild(li);
    });
  }

  function collectProfile() {
    return {
      name: $("pName").value.trim(), wechat: $("pWechat").value.trim(),
      school: $("pSchool").value.trim(), degree: $("pDegree").value.trim(),
      gradYear: $("pGradYear").value.trim(), location: $("pLocation").value.trim(),
      phoneCN: $("pPhoneCN").value.trim(), phoneHK: $("pPhoneHK").value.trim(),
      emailHKU: $("pEmailHKU").value.trim(), email163: $("pEmail163").value.trim(),
      bullets: $("pBullets").value.split("\n").map((x) => x.trim()).filter(Boolean)
    };
  }
  async function loadProfile() {
    const p = await store.get("profile", {});
    const set = (id, v) => { $(id).value = v || ""; };
    set("pName", p.name); set("pWechat", p.wechat); set("pSchool", p.school); set("pDegree", p.degree);
    set("pGradYear", p.gradYear); set("pLocation", p.location);
    set("pPhoneCN", p.phoneCN); set("pPhoneHK", p.phoneHK);
    set("pEmailHKU", p.emailHKU); set("pEmail163", p.email163);
    $("pBullets").value = (p.bullets || []).join("\n");
    return p;
  }

  /* ---- 事件 ---- */
  $("btnExtract").addEventListener("click", extractCurrent);

  $("btnDraft").addEventListener("click", async () => {
    const profile = await store.get("profile", {});
    const lead = collectCurrent();
    const draft = D.buildEmailDraft(lead, profile);
    $("dSubject").value = draft.subject;
    $("dBody").value = draft.body;
    $("draftPanel").style.display = "block";
    const to = lead.applyEmail || "";
    $("btnMailto").href = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(draft.subject) + "&body=" + encodeURIComponent(draft.body);
    if (!profile.name) status("提示：先在下方「我的资料」里填一次信息，邮件会自动带上");
  });

  $("btnCopyDraft").addEventListener("click", () => copyText("主题：" + $("dSubject").value + "\n\n" + $("dBody").value, "邮件草稿已复制"));
  $("btnCloseDraft").addEventListener("click", () => { $("draftPanel").style.display = "none"; });

  $("btnFill").addEventListener("click", async () => {
    try {
      const tab = await activeTab();
      const p = await store.get("profile", {});
      const profile = {
        name: p.name, email: p.email163 || p.emailHKU, phone: p.phoneCN || p.phoneHK, location: p.location,
        linkedin: "", github: ""
      };
      if (!Object.values(profile).some(Boolean)) { status("请先在下方填写「我的资料」"); return; }
      const res = await chrome.tabs.sendMessage(tab.id, { type: "APPLYDESK_FILL", profile });
      status(res && res.ok ? ("已填入 " + res.filled + " 个字段，请检查后提交") : "填表失败");
    } catch (e) { status("当前页面不支持填表"); }
  });

  $("btnSave").addEventListener("click", async () => {
    const lead = collectCurrent();
    if (!lead.company && !lead.position && !lead.url) { status("至少要有公司 / 职位 / 链接"); return; }
    lead.id = Date.now().toString(36);
    lead.savedAt = new Date().toISOString();
    const leads = await store.get("leads", []);
    leads.unshift(lead);
    await store.set("leads", leads.slice(0, 300));
    status("已保存到线索列表");
    renderLeads();
  });

  $("btnCopy").addEventListener("click", () => copyText(D.buildTaskPack(collectCurrent()), "任务包已复制，粘贴给 Codex"));

  $("btnSaveProfile").addEventListener("click", async () => {
    await store.set("profile", collectProfile());
    status("资料已保存，以后写邮件会自动带上");
  });

  $("btnExport").addEventListener("click", async () => {
    const leads = await store.get("leads", []);
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), leads }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    if (chrome.downloads) chrome.downloads.download({ url, filename: "applydesk-leads.json" });
    else window.open(url);
    status("已导出 " + leads.length + " 条线索");
  });

  $("btnClear").addEventListener("click", async () => {
    if (!confirm("清空所有线索？不可恢复。")) return;
    await store.set("leads", []);
    status("已清空");
    renderLeads();
  });

  (async function init() {
    await loadProfile();
    await renderLeads();
    await extractCurrent();
  })();
})();
