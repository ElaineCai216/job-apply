/* ============ views-dashboard.js — 总览：统计 + 看板 + 提醒 ============ */
(function () {
  "use strict";
  const UI = window.UI, Store = window.Store;

  function statCard(label, num, accent) {
    return '<div class="stat" data-accent="' + (accent || "") + '"><div class="num">' + num + '</div><div class="lbl">' + label + "</div></div>";
  }

  function kcard(app) {
    const days = Store.daysSince(app.applied_date);
    const m = Store.stageMeta(app.stage);
    let badges = "";
    if (app.referral_code) badges += UI.badge("内推", "outline");
    if (app.outcome) badges += UI.badge(app.outcome, app.outcome === "Offer" ? "outcome-offer" : "");
    const follow = app.follow_up_date ? '<span class="badge outline" title="跟进日期">' + UI.esc("跟进 " + UI.fmtShort(app.follow_up_date)) + "</span>" : "";
    const daysTxt = days !== null && app.stage !== "todo" && app.stage !== "review" ? (days === 0 ? "今天投" : "已投 " + days + " 天") : "";
    return '<div class="kcard" draggable="true" data-id="' + app.id + '" data-stage="' + app.stage + '">' +
      '<div class="kcard-top"><span class="kcard-days">' + daysTxt + "</span>" + (app.referral_code ? '<span style="color:var(--accent);font-size:11.5px;font-weight:600">内推</span>' : "") + "</div>" +
      '<div class="kcard-company">' + UI.esc(app.company) + '</div>' +
      '<div class="kcard-position">' + UI.esc(app.position) + "</div>" +
      '<div class="kcard-meta">' + UI.esc(app.ats || "") + (app.resume_version ? " · " + UI.esc(app.resume_version) : "") + "</div>" +
      '<div class="kcard-foot">' + follow + badges + "</div>" +
      "</div>";
  }

  function renderDashboard(root) {
    const d = Store.load();
    const apps = d.applications;
    const attention = apps.filter((a) => Store.needsAttention(a, d.settings));

    const stats = {
      total: apps.length,
      review: apps.filter((a) => a.stage === "review").length,
      submitted: apps.filter((a) => a.stage === "submitted").length,
      interviews: apps.filter((a) => a.outcome === "面试" || a.outcome === "Offer").length,
      offers: apps.filter((a) => a.outcome === "Offer").length
    };

    let html = '<div class="stats">' +
      statCard("全部投递", stats.total, "") +
      statCard("待确认", stats.review, "accent") +
      statCard("已投递", stats.submitted, "blue") +
      statCard("面试 / 回应", stats.interviews, "teal") +
      statCard("Offer", stats.offers, "green") +
      "</div>";

    if (attention.length) {
      html += '<div class="card" style="padding:14px 18px;margin-bottom:20px;border-color:var(--amber-soft);background:var(--amber-soft)">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
        UI.icon("bell") +
        '<strong style="font-size:14px">有 ' + attention.length + ' 份投递需要跟进</strong>' +
        '<span class="muted" style="font-size:12.5px">' + attention.slice(0, 3).map((a) => UI.esc(a.company + " · " + a.position)).join("、") + (attention.length > 3 ? " 等" : "") + "</span>" +
        '<a href="#/applications" style="margin-left:auto;font-size:13px;font-weight:600">去处理 →</a>' +
        "</div></div>";
    }

    /* 看板 */
    const groups = {};
    Store.STAGES.forEach((s) => { groups[s.key] = apps.filter((a) => a.stage === s.key); });
    html += '<div class="section-head" style="margin-bottom:12px">' +
      '<div><div class="section-title">投递看板</div><div class="section-desc" style="margin-bottom:0">拖动卡片可调整阶段</div></div>' +
      '<button class="btn btn-ghost btn-sm" id="btnAddQuick">' + UI.icon("plus") + "新增投递</button>" +
      "</div>";

    html += '<div class="kanban" id="kanban">';
    Store.STAGES.forEach((s) => {
      const cards = groups[s.key];
      html += '<div class="kcol" data-stage="' + s.key + '">' +
        '<div class="kcol-head"><span class="kcol-dot" style="--col:' + s.color + '"></span><span class="kcol-title">' + s.label + '</span><span class="kcol-count">' + cards.length + "</span></div>" +
        cards.map(kcard).join("") +
        "</div>";
    });
    html += "</div>";

    if (apps.length === 0) {
      html = '<div class="stats">' +
        statCard("全部投递", 0, "") + statCard("待确认", 0, "accent") + statCard("已投递", 0, "blue") +
        statCard("面试 / 回应", 0, "teal") + statCard("Offer", 0, "green") + "</div>" +
        UI.emptyState("inbox", "还没有投递记录", "添加第一份投递，或先到「简历档案」完善你的信息。",
          '<a class="btn btn-primary" href="#/applications">' + UI.icon("plus") + "添加投递</a>");
    }

    root.innerHTML = html;

    /* 拖拽 */
    const kanban = root.querySelector("#kanban");
    if (kanban) {
      kanban.addEventListener("dragstart", (e) => {
        const card = e.target.closest(".kcard");
        if (!card) return;
        card.classList.add("is-dragging");
        e.dataTransfer.setData("text/plain", card.dataset.id);
        e.dataTransfer.effectAllowed = "move";
      });
      kanban.addEventListener("dragend", (e) => {
        const card = e.target.closest(".kcard");
        if (card) card.classList.remove("is-dragging");
        kanban.querySelectorAll(".kcol.is-over").forEach((c) => c.classList.remove("is-over"));
      });
      kanban.querySelectorAll(".kcol").forEach((col) => {
        col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("is-over"); });
        col.addEventListener("dragleave", () => col.classList.remove("is-over"));
        col.addEventListener("drop", (e) => {
          e.preventDefault();
          col.classList.remove("is-over");
          const id = e.dataTransfer.getData("text/plain");
          const stage = col.dataset.stage;
          if (!id || !stage) return;
          const data = Store.load();
          const app = data.applications.find((a) => a.id === id);
          if (app && app.stage !== stage) {
            app.stage = stage;
            if (stage === "submitted" && !app.applied_date) app.applied_date = Store.todayISO();
            Store.save(data);
            UI.toast("已移动到「" + Store.stageMeta(stage).label + "」", "ok");
            renderDashboard(root);
          }
        });
      });
      /* 点卡片 → 打开详情 */
      kanban.addEventListener("click", (e) => {
        const card = e.target.closest(".kcard");
        if (card) window.AppDetail.open(card.dataset.id);
      });
    }

    const btn = root.querySelector("#btnAddQuick");
    if (btn) btn.addEventListener("click", () => { window.Views.openAppForm(); });
  }

  window.Views = window.Views || {};
  window.Views.renderDashboard = renderDashboard;
})();
