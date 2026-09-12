/* 投递助手 · 弹窗逻辑 */
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

  async function extractCurrent() {
    initChannels();
    try {
      const tab = await activeTab();
      const res = await chrome.tabs.sendMessage(tab.id, { type: "APPLYDESK_EXTRACT" });
      if (!res || !res.ok) throw new Error("fail");
      current = res.lead;
      status("已读取：" + ((current.position || current.pageTitle || "").slice(0, 36) || "当前页面"));
    } catch (e) {
      const tab = await activeTab().catch(() => null);
      const url = tab ? tab.url : "";
      current = { company: "", position: "", channel: D.detectChannel(url), url, location: "", jd: "", pageTitle: "", createdAt: new Date().toISOString() };
      status("此页面无法自动读取内容，可手动填写后保存。");
    }
    renderCurrent();
  }

  function renderCurrent() {
    if (!current) return;
    $("fCompany").value = current.company || "";
    $("fPosition").value = current.position || "";
    $("fUrl").value = current.url || "";
    $("fChannel").value = current.channel || "其他";
    $("fStatus").value = current.jd ? ("已抓 JD " + current.jd.length + " 字") : "无 JD 正文";
  }

  const collectCurrent = () => Object.assign({}, current, {
    company: $("fCompany").value.trim(),
    position: $("fPosition").value.trim(),
    channel: $("fChannel").value,
    url: $("fUrl").value.trim()
  });

  async function renderLeads() {
    const leads = await store.get("leads", []);
    $("count").textContent = leads.length;
    $("leadCount").textContent = leads.length;
    const ul = $("leads");
    ul.innerHTML = "";
    if (!leads.length) {
      ul.innerHTML = '<li class="empty">还没有保存的线索</li>';
      return;
    }
    leads.forEach((l, i) => {
      const li = document.createElement("li");
      const info = document.createElement("div");
      info.className = "lead-i";
      info.innerHTML = '<div class="lead-c">' + escapeHtml(l.company || "（待确认公司）") + " · " + escapeHtml(l.position || "（待确认职位）") + "</div>" +
        '<div class="lead-m">' + escapeHtml(l.channel || "") + (l.jd ? " · JD " + l.jd.length + " 字" : "") + "</div>";
      const openBtn = document.createElement("button");
      openBtn.className = "icon-btn"; openBtn.textContent = "打开"; openBtn.title = "打开原链接";
      openBtn.addEventListener("click", () => { if (l.url) chrome.tabs.create({ url: l.url }); });
      const copyBtn = document.createElement("button");
      copyBtn.className = "icon-btn"; copyBtn.textContent = "复制"; copyBtn.title = "复制任务包";
      copyBtn.addEventListener("click", () => copyText(D.buildTaskPack(l), "已复制任务包"));
      const delBtn = document.createElement("button");
      delBtn.className = "icon-btn"; delBtn.textContent = "删除";
      delBtn.addEventListener("click", async () => {
        const arr = await store.get("leads", []);
        arr.splice(i, 1);
        await store.set("leads", arr);
        renderLeads();
      });
      li.append(info, openBtn, copyBtn, delBtn);
      ul.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function copyText(text, okMsg) {
    try { await navigator.clipboard.writeText(text); status(okMsg); }
    catch (e) { status("复制失败，请重试"); }
  }

  function collectProfile() {
    return {
      name: $("pName").value.trim(), email: $("pEmail").value.trim(), phone: $("pPhone").value.trim(),
      location: $("pLocation").value.trim(), linkedin: $("pLinkedin").value.trim(), github: $("pGithub").value.trim()
    };
  }
  async function loadProfile() {
    const p = await store.get("profile", {});
    $("pName").value = p.name || ""; $("pEmail").value = p.email || ""; $("pPhone").value = p.phone || "";
    $("pLocation").value = p.location || ""; $("pLinkedin").value = p.linkedin || ""; $("pGithub").value = p.github || "";
  }

  /* ---- 事件 ---- */
  $("btnExtract").addEventListener("click", extractCurrent);

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

  $("btnCopy").addEventListener("click", () => copyText(D.buildTaskPack(collectCurrent()), "任务包已复制，粘贴给 Codex 即可"));

  $("btnFill").addEventListener("click", async () => {
    try {
      const tab = await activeTab();
      const profile = await store.get("profile", {});
      if (!Object.values(profile).some(Boolean)) { status("请先在下方填写自动填表资料"); return; }
      const res = await chrome.tabs.sendMessage(tab.id, { type: "APPLYDESK_FILL", profile });
      status(res && res.ok ? ("已填入 " + res.filled + " 个字段，请检查后再提交") : "填表失败");
    } catch (e) { status("当前页面不支持填表"); }
  });

  $("btnSaveProfile").addEventListener("click", async () => {
    await store.set("profile", collectProfile());
    status("资料已保存");
  });

  $("btnExport").addEventListener("click", async () => {
    const leads = await store.get("leads", []);
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), leads }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    chrome.downloads ? chrome.downloads.download({ url, filename: "applydesk-leads.json" }) : window.open(url);
    status("已导出 " + leads.length + " 条线索");
  });

  $("btnClear").addEventListener("click", async () => {
    if (!confirm("清空所有线索？此操作不可恢复。")) return;
    await store.set("leads", []);
    status("已清空线索");
    renderLeads();
  });

  /* ---- 初始化 ---- */
  (async function init() {
    await loadProfile();
    await renderLeads();
    await extractCurrent();
  })();
})();
