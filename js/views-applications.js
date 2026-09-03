/* ============ views-applications.js — 投递台账 + 回音状态 + 确认门流程 ============ */
(function () {
  "use strict";
  const UI = window.UI, Store = window.Store;

  const filters = { q: "", stage: "", ats: "" };

  /* 从投递链接识别渠道与公司名（仅 URL 启发式，供预填参考） */
  function detectFromUrl(url) {
    const raw = (url || "").trim();
    if (/^mailto:/i.test(raw)) return { ats: "邮箱投递", company: "" };
    let host = "", path = "";
    try { const u = new URL(raw); host = u.hostname.replace(/^www\./, ""); path = u.pathname; } catch (e) { return null; }
    if (!host) return null;
    const human = (slug) => (slug || "").split(/[-_]/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").trim();
    const seg0 = path.split("/").filter(Boolean)[0] || "";
    const parts = host.split(".");
    const sub = parts[0] || "";
    const careerSub = ["careers", "career", "jobs", "job", "talent", "join", "joinus", "apply", "recruiting", "recruit", "hiring", "hr", "ats", "work", "boards"];
    if (host === "boards.greenhouse.io")      return { ats: "Greenhouse", company: human(seg0) };
    if (host === "jobs.lever.co")             return { ats: "Lever", company: human(seg0) };
    if (host === "jobs.ashbyhq.com")          return { ats: "Ashby", company: human(seg0) };
    if (host.endsWith("myworkdayjobs.com")) {
      const idx = path.split("/").indexOf("company");
      return { ats: "Workday", company: human(idx >= 0 ? path.split("/")[idx + 1] : "") };
    }
    if (host.includes("successfactors") || host.includes("sapsf")) return { ats: "SAP SuccessFactors", company: human(sub) };
    if (host.includes("linkedin.com"))        return { ats: "LinkedIn", company: "" };
    if (host.includes("jobsdb.com"))          return { ats: "JobsDB", company: "" };
    if (host.includes("jijis.org.hk"))        return { ats: "JIJIS", company: "" };
    if (host.includes("zhipin.com") || host.includes("lagou.com") || host.includes("zhaopin.com") || host.includes("51job.com") || host.includes("liepin.com")) return { ats: "国内平台", company: "" };
    if (host.includes("indeed.com"))          return { ats: "其他", company: "" };
    if (careerSub.includes(sub))              return { ats: "公司官网", company: human(parts[1] || sub) };
    if (sub)                                  return { ats: "公司官网", company: human(sub) };
    return { ats: "公司官网", company: "" };
  }


  function stageBadge(app) {
    const m = Store.stageMeta(app.stage);
    return UI.badge(m.label, "stage-" + app.stage);
  }

  /* 回音列：明确展示“有没有回音” */
  function responseBadge(app) {
    if (app.outcome) {
      const cls = { "Offer": "resp-offer", "面试": "resp-interview", "未通过": "resp-rejected", "已撤回": "resp-withdrawn" }[app.outcome] || "resp-other";
      return UI.badge("有回音 · " + app.outcome, cls);
    }
    if (app.stage === "submitted" || app.stage === "following") return UI.badge("暂无回音", "none");
    return '<span class="faint">—</span>';
  }

  function outcomeOptionText(o) { return o || "暂无回音"; }

  async function resumeLabels() {
    try {
      const list = await window.ResumeDB.all();
      return list.map((r) => (r.label || r.name.replace(/\.[^.]+$/, ""))).filter(Boolean);
    } catch (e) { return []; }
  }

  function appFormHtml(app, resumeLabelsList, defaultVersion) {
    const a = app || { stage: "todo", ats: "其他" };
    const stageOpts = Store.STAGES.map((s) => '<option value="' + s.key + '"' + (a.stage === s.key ? " selected" : "") + ">" + s.label + "</option>").join("");
    const atsOpts = Store.ATSS.map((x) => '<option' + (a.ats === x ? " selected" : "") + ">" + UI.esc(x) + "</option>").join("");
    const outcomeOpts = Store.OUTCOMES.map((o) => '<option value="' + UI.esc(o) + '"' + (a.outcome === o ? " selected" : "") + ">" + UI.esc(outcomeOptionText(o)) + "</option>").join("");
    const dlOpts = resumeLabelsList.map((l) => '<option value="' + UI.esc(l) + '"></option>').join("");
    const rv = (app ? app.resume_version : "") || (app ? "" : (defaultVersion || ""));
    return (
      '<div class="grid2">' +
      fld("公司", '<input class="inp" data-k="company" value="' + UI.esc(a.company || "") + '" placeholder="例如：Stripe">', "可留空，粘贴链接会自动识别；留空则显示链接域名") +
      fld("职位", '<input class="inp" data-k="position" value="' + UI.esc(a.position || "") + '" placeholder="例如：Software Engineer">', "可留空") +
      fld("投递链接", '<input class="inp" data-k="url" value="' + UI.esc(a.url || "") + '" placeholder="https://… 粘贴后自动识别渠道/公司">') +
      fld("渠道 / ATS", '<select class="inp" data-k="ats">' + atsOpts + "</select>") +
      fld("内推码", '<input class="inp" data-k="referral_code" value="' + UI.esc(a.referral_code || "") + '" placeholder="选填">') +
      fld("简历版本", '<input class="inp" data-k="resume_version" value="' + UI.esc(rv) + '" list="dlResumeVersions" placeholder="选一份上传的简历或手动输入">' +
        '<datalist id="dlResumeVersions">' + dlOpts + "</datalist>") +
      fld("阶段", '<select class="inp" data-k="stage">' + stageOpts + "</select>") +
      fld("回音 / 结果", '<select class="inp" data-k="outcome">' + outcomeOpts + "</select>") +
      fld("投递日期", '<input type="date" class="inp" data-k="applied_date" value="' + UI.esc(a.applied_date || "") + '">') +
      fld("跟进日期", '<input type="date" class="inp" data-k="follow_up_date" value="' + UI.esc(a.follow_up_date || "") + '">') +
      "</div>" +
      '<div class="fld" style="margin-top:14px"><span class="fld-label">备注</span><textarea class="inp" data-k="notes" placeholder="记录进展、联系人、下一步…">' + UI.esc(a.notes || "") + "</textarea></div>"
    );
  }

  function fld(label, inputHtml, hint) {
    return '<label class="fld"><span class="fld-label">' + label + (hint ? "<em>" + hint + "</em>" : "") + "</span>" + inputHtml + "</label>";
  }

  /* ---------- 新增 / 编辑 ---------- */
  async function openAppForm(id) {
    const data = Store.load();
    const app = id ? data.applications.find((a) => a.id === id) : null;
    if (id && !app) return;
    const labels = await resumeLabels();
    const defId = data.settings.defaultResumeId;
    let defLabel = "";
    if (defId) {
      try { const r = await window.ResumeDB.get(defId); if (r) defLabel = r.label || r.name.replace(/\.[^.]+$/, ""); } catch (e) {}
    }
    const body = document.createElement("div");
    body.innerHTML = appFormHtml(app, labels, defLabel);

    /* 粘贴链接 → 自动预填渠道与公司 */
    (function autoDetect() {
      const urlInp = body.querySelector('[data-k="url"]');
      if (!urlInp) return;
      let timer = null;
      urlInp.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const det = detectFromUrl(urlInp.value);
          if (!det) return;
          const comp = body.querySelector('[data-k="company"]');
          const ats = body.querySelector('[data-k="ats"]');
          if (det.company && comp && !comp.value.trim()) comp.value = det.company;
          if (det.ats && ats) {
            const ok = Array.from(ats.options).some((o) => o.value === det.ats);
            if (ok) ats.value = det.ats;
          }
        }, 220);
      });
    })();
    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary";
    saveBtn.textContent = id ? "保存修改" : "添加投递";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-ghost";
    cancelBtn.textContent = "取消";
    const foot = document.createElement("div");
    foot.style.display = "flex"; foot.style.gap = "10px";
    foot.append(cancelBtn, saveBtn);
    const inst = UI.modal({ title: id ? "编辑投递" : "新增投递", body, foot, wide: true });

    saveBtn.addEventListener("click", () => {
      const vals = {};
      body.querySelectorAll("[data-k]").forEach((el) => { vals[el.dataset.k] = el.value; });
      if (!vals.company.trim() && !vals.position.trim() && !vals.url.trim()) {
        UI.toast("请至少填写公司 / 职位 / 投递链接中的一项", "warn");
        return;
      }
      if (id) {
        Object.assign(app, vals);
        if (app.stage === "submitted" && !app.applied_date) app.applied_date = Store.todayISO();
        UI.toast("已保存修改", "ok");
      } else {
        const na = { id: Store.uid(), flow: Store.emptyFlow(), ...vals };
        if (na.stage === "submitted") na.applied_date = na.applied_date || Store.todayISO();
        data.applications.unshift(na);
        UI.toast("已添加投递", "ok");
      }
      Store.save(data);
      inst.close();
      window.Views.renderApplications(document.getElementById("view"));
    });
    cancelBtn.addEventListener("click", () => inst.close());
  }

  /* ---------- 详情 + 确认门流程 ---------- */
  const AppDetail = {
    async open(id) {
      const data = Store.load();
      const app = data.applications.find((a) => a.id === id);
      if (!app) return;
      const body = document.createElement("div");

      const hero = document.createElement("div");
      hero.className = "detail-hero";
      const stageOpts = Store.STAGES.map((s) => '<option value="' + s.key + '"' + (app.stage === s.key ? " selected" : "") + ">" + s.label + "</option>").join("");
      hero.innerHTML =
        "<div><h3>" + UI.esc(app.company || UI.fallbackCompany(app.url)) + (app.position ? " · " + UI.esc(app.position) : "") + "</h3>" +
        '<div class="sub">' + (app.ats ? UI.esc(app.ats) : "未填渠道") + (app.resume_version ? " · " + UI.esc(app.resume_version) : "") + "</div></div>" +
        '<select class="inp" id="dStage" style="width:auto">' + stageOpts + "</select>";
      body.append(hero);

      const kv = document.createElement("div");
      kv.className = "kv-grid";
      const row = (k, v) => "<div class='kv'><div class='k'>" + k + "</div><div class='v'>" + (v || "<span class='faint'>—</span>") + "</div></div>";
      const linkCell = app.url
        ? '<a class="cell-link" href="' + UI.esc(app.url) + '" target="_blank" rel="noopener">打开链接 ' + UI.icon("external") + "</a>"
        : "<span class='faint'>—</span>";
      kv.innerHTML =
        row("投递日期", UI.fmtDate(app.applied_date)) +
        row("渠道", app.ats ? UI.esc(app.ats) : "") +
        row("回音", responseBadge(app)) +
        row("跟进日期", UI.fmtDate(app.follow_up_date)) +
        row("内推码", app.referral_code ? UI.badge(app.referral_code, "outline") : "") +
        row("链接", linkCell) +
        row("简历版本", app.resume_version || "");
      body.append(kv);

      const flowTitle = document.createElement("div");
      flowTitle.className = "section-title";
      flowTitle.style.marginTop = "18px";
      flowTitle.textContent = "投递流程（确认门）";
      body.append(flowTitle);
      const flowDesc = document.createElement("div");
      flowDesc.className = "section-desc";
      flowDesc.textContent = "填写 → 预览 → 确认 → 提交，每一步都留痕。勾选即表示该步已完成。";
      body.append(flowDesc);

      const flowBox = document.createElement("div");
      flowBox.className = "flow";
      Store.FLOW_STEPS.forEach((s, i) => {
        const f = app.flow && app.flow[s.key] ? app.flow[s.key] : { done: false, date: "", note: "" };
        const rowEl = document.createElement("div");
        rowEl.className = "flow-step" + (f.done ? " done" : "");
        rowEl.innerHTML =
          '<span class="fnum">' + (i + 1) + "</span>" +
          '<div class="fmain"><strong>' + s.label + "</strong><span>" + s.desc + "</span>" +
          '<div class="finp"><input type="date" class="inp" data-step="' + s.key + '" data-k="date" value="' + UI.esc(f.date || "") + '"' + (f.done ? "" : " disabled") + ">" +
          '<input class="inp" data-step="' + s.key + '" data-k="note" value="' + UI.esc(f.note || "") + '" placeholder="备注（选填）" style="flex:1">' +
          '<label class="chk" style="flex:none;padding-top:2px"><input type="checkbox" data-step="' + s.key + '" data-k="done"' + (f.done ? " checked" : "") + "> 完成</label></div></div>";
        flowBox.append(rowEl);
      });
      body.append(flowBox);

      const noteFld = document.createElement("div");
      noteFld.className = "fld";
      noteFld.style.marginTop = "12px";
      noteFld.innerHTML = '<span class="fld-label">备注</span><textarea class="inp" id="dNotes">' + UI.esc(app.notes || "") + "</textarea>";
      body.append(noteFld);

      const saveBtn = document.createElement("button");
      saveBtn.className = "btn btn-primary";
      saveBtn.textContent = "保存";
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-danger";
      delBtn.textContent = "删除";
      const foot = document.createElement("div");
      foot.style.display = "flex"; foot.style.gap = "10px";
      foot.append(delBtn, saveBtn);
      const inst = UI.modal({ title: "投递详情", body, foot, wide: true });

      flowBox.addEventListener("change", (e) => {
        const t = e.target;
        if (t.dataset.k === "done") {
          const stepKey = t.dataset.step;
          const f = app.flow[stepKey];
          f.done = t.checked;
          if (f.done && !f.date) f.date = Store.todayISO();
          const rowEl = t.closest(".flow-step");
          rowEl.classList.toggle("done", f.done);
          const dateInp = rowEl.querySelector('input[data-k="date"]');
          dateInp.disabled = !f.done;
          if (f.done) dateInp.value = f.date;
        }
      });

      saveBtn.addEventListener("click", async () => {
        app.stage = body.querySelector("#dStage").value;
        app.notes = body.querySelector("#dNotes").value;
        body.querySelectorAll("[data-step]").forEach((el) => {
          const f = app.flow[el.dataset.step];
          if (el.dataset.k === "done") f.done = el.checked;
          if (el.dataset.k === "date") f.date = el.value;
          if (el.dataset.k === "note") f.note = el.value;
        });
        if (app.stage === "submitted" && !app.applied_date) app.applied_date = Store.todayISO();
        Store.save(data);
        UI.toast("已保存", "ok");
        inst.close();
        window.Views.renderApplications(document.getElementById("view"));
        window.Views.renderDashboard(document.getElementById("view"));
      });
      delBtn.addEventListener("click", async () => {
        const ok = await UI.confirmDialog({ title: "删除这条投递？", message: "「" + app.company + " · " + app.position + "」将被删除，此操作不可撤销。", okText: "删除", danger: true });
        if (!ok) return;
        data.applications = data.applications.filter((a) => a.id !== id);
        Store.save(data);
        UI.toast("已删除", "ok");
        inst.close();
        window.Views.renderApplications(document.getElementById("view"));
        window.Views.renderDashboard(document.getElementById("view"));
      });
    }
  };

  /* ---------- 台账列表 ---------- */
  function renderApplications(root) {
    const data = Store.load();
    const apps = data.applications.filter((a) => {
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (!(a.company + " " + a.position + " " + (a.ats || "") + " " + (a.referral_code || "")).toLowerCase().includes(q)) return false;
      }
      if (filters.stage && a.stage !== filters.stage) return false;
      if (filters.ats && a.ats !== filters.ats) return false;
      return true;
    });

    /* 按投递日期倒序（无日期的排后面） */
    apps.sort((x, y) => {
      const dx = x.applied_date || "", dy = y.applied_date || "";
      if (dy < dx) return -1;
      if (dy > dx) return 1;
      return 0;
    });

    const stageOpts = '<option value="">全部阶段</option>' + Store.STAGES.map((s) => '<option value="' + s.key + '"' + (filters.stage === s.key ? " selected" : "") + ">" + s.label + "</option>").join("");
    const atsOpts = '<option value="">全部渠道</option>' + Store.ATSS.map((x) => '<option' + (filters.ats === x ? " selected" : "") + ">" + UI.esc(x) + "</option>").join("");

    let html =
      '<div class="toolbar">' +
      '<div class="search-box grow">' + UI.icon("search") + '<input class="inp" id="fQ" placeholder="搜索公司 / 职位 / 内推码…" value="' + UI.esc(filters.q) + '"></div>' +
      '<select class="inp" id="fStage" style="width:auto">' + stageOpts + "</select>" +
      '<select class="inp" id="fAts" style="width:auto">' + atsOpts + "</select>" +
      '<button class="btn btn-primary" id="btnAdd">' + UI.icon("plus") + "新增投递</button>" +
      "</div>";

    if (apps.length === 0) {
      html += UI.emptyState("inbox", data.applications.length === 0 ? "还没有投递记录" : "没有符合筛选的记录",
        data.applications.length === 0 ? "点右上角「新增投递」开始记录你的求职之旅。" : "换个关键词或清空筛选试试。",
        data.applications.length === 0 ? '<button class="btn btn-primary" id="btnAddEmpty">' + UI.icon("plus") + "新增投递</button>" : "");
    } else {
      html += '<div class="table-wrap"><table class="data"><thead><tr>' +
        "<th>公司 / 职位</th><th>投递日期</th><th>渠道</th><th>回音</th><th>阶段</th><th>内推</th><th>跟进</th><th></th>" +
        "</tr></thead><tbody>";
      apps.forEach((a) => {
        const attention = Store.needsAttention(a, data.settings);
        html += "<tr>" +
          '<td><div class="td-company">' + UI.esc(a.company || UI.fallbackCompany(a.url)) + "</div><div class='td-position'>" + (a.position ? UI.esc(a.position) : '<span class="faint">未填写职位</span>') + "</div></td>" +
          "<td>" + UI.fmtDate(a.applied_date) + "</td>" +
          "<td>" + (a.ats ? UI.esc(a.ats) : '<span class="faint">—</span>') + "</td>" +
          "<td>" + responseBadge(a) + "</td>" +
          "<td>" + stageBadge(a) + (attention ? " " + UI.badge("需跟进", "outline") : "") + "</td>" +
          "<td>" + (a.referral_code ? '<span class="cell-link" style="font-weight:600">' + UI.esc(a.referral_code) + "</span>" : '<span class="faint">—</span>') + "</td>" +
          "<td>" + (a.follow_up_date ? UI.fmtShort(a.follow_up_date) : '<span class="faint">—</span>') + "</td>" +
          '<td><div class="td-actions">' +
          '<button class="icon-btn" data-act="detail" data-id="' + a.id + '" title="查看流程">' + UI.icon("send") + "</button>" +
          '<button class="icon-btn" data-act="edit" data-id="' + a.id + '" title="编辑">' + UI.icon("edit") + "</button>" +
          '<button class="icon-btn danger" data-act="del" data-id="' + a.id + '" title="删除">' + UI.icon("trash") + "</button>" +
          "</div></td></tr>";
      });
      html += "</tbody></table></div>";
    }

    root.innerHTML = html;

    root.querySelector("#fQ").addEventListener("input", (e) => { filters.q = e.target.value; renderApplications(root); });
    root.querySelector("#fStage").addEventListener("change", (e) => { filters.stage = e.target.value; renderApplications(root); });
    root.querySelector("#fAts").addEventListener("change", (e) => { filters.ats = e.target.value; renderApplications(root); });
    root.querySelector("#btnAdd").addEventListener("click", () => openAppForm());
    const bEmpty = root.querySelector("#btnAddEmpty");
    if (bEmpty) bEmpty.addEventListener("click", () => openAppForm());

    root.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const act = btn.dataset.act, id = btn.dataset.id;
        if (act === "detail") { window.AppDetail.open(id); }
        else if (act === "edit") { openAppForm(id); }
        else if (act === "del") {
          const app = data.applications.find((a) => a.id === id);
          if (!app) return;
          const ok = await UI.confirmDialog({ title: "删除这条投递？", message: "「" + app.company + " · " + app.position + "」将被删除，此操作不可撤销。", okText: "删除", danger: true });
          if (!ok) return;
          data.applications = data.applications.filter((a) => a.id !== id);
          Store.save(data);
          UI.toast("已删除", "ok");
          renderApplications(root);
        }
      });
    });
  }

  window.Views = window.Views || {};
  window.Views.renderApplications = renderApplications;
  window.Views.openAppForm = openAppForm;
  window.AppDetail = AppDetail;
})();
