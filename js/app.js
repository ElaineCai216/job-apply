/* ============ app.js — 应用入口：侧栏 / 路由 / 主题 / 提醒条 ============ */
(function () {
  "use strict";
  const UI = window.UI, Store = window.Store;

  const NAV = [
    { hash: "#/dashboard",     key: "dashboard",     label: "总览",     icon: "grid",     title: "总览",     sub: "你的求职全局视图" },
    { hash: "#/applications",  key: "applications",  label: "投递台账", icon: "briefcase", title: "投递台账", sub: "记录每份投递的完整流程" },
    { hash: "#/profile",       key: "profile",       label: "简历档案", icon: "user",      title: "简历档案", sub: "结构化保存你的求职信息" },
    { hash: "#/settings",      key: "settings",      label: "设置",     icon: "settings",  title: "设置",     sub: "外观、提醒与数据管理" }
  ];

  function renderShell() {
    const sidebar = document.getElementById("sidebar");
    sidebar.innerHTML =
      '<div class="brand"><span class="brand-seal">投</span>' +
      '<div class="brand-text"><strong>投递台</strong><small>Apply Desk</small></div></div>' +
      '<nav class="nav">' + NAV.map((n) =>
        '<a class="nav-item" href="' + n.hash + '" data-key="' + n.key + '">' + UI.icon(n.icon) + "<span>" + n.label + "</span></a>"
      ).join("") + "</nav>" +
      '<div class="sidebar-foot"><button class="btn btn-ghost btn-sm" id="themeToggle">' +
      UI.icon(document.documentElement.classList.contains("dark") ? "sun" : "moon") + '<span id="themeLabel">' +
      (document.documentElement.classList.contains("dark") ? "日间模式" : "夜间模式") + "</span></button>" +
      '<p class="foot-note">数据保存在本地浏览器<br>请定期在「设置」里导出备份</p></div>';

    document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  }

  function toggleTheme() {
    const data = Store.load();
    data.settings.dark = !data.settings.dark;
    Store.save(data);
    applyTheme(data.settings.dark);
    const btn = document.getElementById("themeToggle");
    btn.innerHTML = UI.icon(data.settings.dark ? "sun" : "moon") + '<span>' + (data.settings.dark ? "日间模式" : "夜间模式") + "</span>";
  }
  function applyTheme(dark) {
    document.documentElement.classList.toggle("dark", dark);
  }

  function renderReminderBar() {
    const topbar = document.getElementById("topbar");
    const old = topbar.querySelector(".reminder-bar");
    if (old) old.remove();
    const d = Store.load();
    const attention = d.applications.filter((a) => Store.needsAttention(a, d.settings));
    if (!attention.length) return;
    const bar = document.createElement("div");
    bar.className = "reminder-bar";
    bar.innerHTML = UI.icon("bell") +
      "<span>有 <strong>" + attention.length + "</strong> 份投递需要跟进</span>" +
      '<a href="#/dashboard">去处理 →</a>';
    topbar.appendChild(bar);
  }

  function route() {
    const hash = location.hash || "#/dashboard";
    const item = NAV.find((n) => n.hash === hash) || NAV[0];
    const view = document.getElementById("view");
    const topbar = document.getElementById("topbar");

    const titleEl = document.createElement("div");
    titleEl.innerHTML = "<h1>" + item.title + "</h1><div class='topbar-sub'>" + item.sub + "</div>";
    topbar.replaceChildren(titleEl);
    renderReminderBar();

    document.querySelectorAll(".nav-item").forEach((a) => {
      a.classList.toggle("is-active", a.dataset.key === item.key);
    });

    if (item.key === "dashboard") window.Views.renderDashboard(view);
    else if (item.key === "applications") window.Views.renderApplications(view);
    else if (item.key === "profile") window.Views.renderProfile(view);
    else if (item.key === "settings") window.Views.renderSettings(view);
    window.scrollTo(0, 0);
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(Store.load().settings.dark);
    renderShell();
    route();
    window.addEventListener("hashchange", route);
  });
})();
