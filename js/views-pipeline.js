/* ============ views-pipeline.js — 岗位线索池 ============ */
(function () {
  "use strict";
  const UI = window.UI, Store = window.Store;
  const filters = { q: "", status: "" };

  const statusMeta = (k) => Store.PIPELINE_STATUSES.find((s) => s.key === k) || Store.PIPELINE_STATUSES[0];

  function scoreBadge(score) {
    const n = parseInt(score, 10);
    if (!n) return '<span class="faint">—</span>';
    const cls = n >= 85 ? "resp-offer" : n >= 75 ? "resp-interview" : "none";
    return UI.badge(n + " 分", cls);
  }

  function normalizeLead(l) {
    return {
      id: Store.uid(),
      company: l.company || "",
      position: l.position || "",
      url: l.url || "",
      channel: l.channel || l.ats || "",
      location: l.location || "",
      matchScore: l.matchScore || "",
      deadline: l.deadline || "",
      source: l.source || "扩展导入",
      status: "new",
      note: l.note || "",
      jd: (l.jd || "").slice(0, 20000),
      createdAt: l.createdAt || Store.todayISO()
    };
  }

  function leadFormHtml(lead) {
    const l = lead || {};
    const channelOpts = Store.ATSS.map((x) => '<option' + (l.channel === x ? " selected" : "") + ">" + UI.esc(x) + "</option>").join("");
    const statusOpts = Store.PIPELINE_STATUSES.map((s) => '<option value="' + s.key + '"' + (l.status === s.key ? " selected" : "") + ">" + s.label + "</option>").join("");
    return '<div class="grid2">' +
      fld("公司", '<input class="inp" data-k="company" value="' + UI.esc(l.company || "") + '" placeholder="粘贴链接可自动识别">') +
      fld("职位", '<input class="inp" data-k="position" value="' + UI.esc(l.position || "") + '" placeholder="例如：Data Analyst Intern">') +
      fld("岗位链接", '<input class="inp" data-k="url" value="' + UI.esc(l.url || "") + '" placeholder="https://… 粘贴后自动识别渠道/公司">') +
      fld("渠道", '<select class="inp" data-k="channel">' + channelOpts + "</select>") +
      fld("地点", '<input class="inp" data-k="location" value="' + UI.esc(l.location || "") + '" placeholder="香港 / 远程">') +
      fld("匹配度（0-100）", '<input class="inp" data-k="matchScore" value="' + UI.esc(l.matchScore || "") + '" placeholder="例如：85">') +
      fld("截止日期", '<input type="date" class="inp" data-k="deadline" value="' + UI.esc(l.deadline || "") + '">') +
      fld("状态", '<select class="inp" data-k="status">' + statusOpts + "</select>") +
      "</div>" +
      '<div class="fld" style="margin-top:14px"><span class="fld-label">备注</span><textarea class="inp" data-k="note" placeholder="为什么适合、需要哪版简历、内推人…">' + UI.esc(l.note || "") + "</textarea></div>";
  }

  function fld(label, inputHtml, hint) {
    return '<label class="fld"><span class="fld-label">' + label + (hint ? "<em>" + hint + "</em>" : "") + "</span>" + inputHtml + "</label>";
  }

  function openLeadForm(id, preset) {
    const data = Store.load();
    const lead = id ? data.pipeline.find((x) => x.id === id) : (preset || null);
    const body = document.createElement("div");
    body.innerHTML = leadFormHtml(lead);
    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary";
    saveBtn.textContent = id ? "保存修改" : "添加线索";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-ghost";
    cancelBtn.textContent = "取消";
    const foot = document.createElement("div");
    foot.style.display = "flex"; foot.style.gap = "10px";
    foot.append(cancelBtn, saveBtn);
    const inst = UI.modal({ title: id ? "编辑线索" : "新增线索", body, foot, wide: true });

    /* 粘贴链接自动识别 */
    const urlInp = body.querySelector('[data-k="url"]');
    let timer = null;
    urlInp.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const det = UI.detectFromUrl(urlInp.value);
        if (!det) return;
        const comp = body.querySelector('[data-k="company"]');
        const ch = body.querySelector('[data-k="channel"]');
        if (det.company && comp && !comp.value.trim()) comp.value = det.company;
        if (det.ats && ch && Array.from(ch.options).some((o) => o.value === det.ats)) ch.value = det.ats;
      }, 220);
    });

    saveBtn.addEventListener("click", () => {
      const vals = {};
      body.querySelectorAll("[data-k]").forEach((el) => { vals[el.dataset.k] = el.value; });
      if (!vals.company.trim() && !vals.position.trim() && !vals.url.trim()) {
        UI.toast("请至少填写公司 / 职位 / 链接中的一项", "warn");
        return;
      }
      if (id) {
        Object.assign(lead, vals);
        UI.toast("已保存修改", "ok");
      } else {
        data.pipeline.unshift(Object.assign({ id: Store.uid(), source: "手动添加", createdAt: Store.todayISO(), jd: "" }, vals));
        UI.toast("已添加线索", "ok");
      }
      Store.save(data);
      inst.close();
      renderPipeline(document.getElementById("view"));
    });
    cancelBtn.addEventListener("click", () => inst.close());
  }

  function importLeads(root) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const list = Array.isArray(parsed) ? parsed : (parsed.leads || []);
          if (!list.length) throw new Error("empty");
          const data = Store.load();
          const existing = new Set((data.pipeline || []).map((x) => x.url).filter(Boolean));
          let added = 0, skipped = 0;
          list.forEach((raw) => {
            const lead = normalizeLead(raw);
            if (lead.url && existing.has(lead.url)) { skipped++; return; }
            if (lead.url) existing.add(lead.url);
            data.pipeline.unshift(lead);
            added++;
          });
          Store.save(data);
          UI.toast("导入 " + added + " 条线索" + (skipped ? "，跳过重复 " + skipped + " 条" : ""), "ok");
          renderPipeline(root);
        } catch (e) {
          UI.toast("导入失败：请选择浏览器扩展导出的 JSON 文件", "warn");
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function convertToApplication(root, id) {
    const data = Store.load();
    const lead = data.pipeline.find((x) => x.id === id);
    if (!lead) return;
    const app = {
      id: Store.uid(),
      company: lead.company || "",
      position: lead.position || "",
      url: lead.url || "",
      ats: lead.channel || "",
      referral_code: "",
      resume_version: "",
      resume_version_zh: "",
      resume_version_en: "",
      resume_custom_file: "",
      apply_method: "",
      stage: "todo",
      outcome: "",
      applied_date: "",
      follow_up_date: "",
      notes: lead.note ? "线索备注：" + lead.note : "",
      flow: Store.emptyFlow()
    };
    data.applications.unshift(app);
    lead.status = "converted";
    Store.save(data);
    UI.toast("已转为投递记录，可在「投递台账」查看", "ok");
    renderPipeline(root);
  }

  function renderPipeline(root) {
    const data = Store.load();
    const leads = (data.pipeline || []).filter((l) => {
      if (filters.status && l.status !== filters.status) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (!((l.company || "") + " " + (l.position || "") + " " + (l.channel || "") + " " + (l.note || "")).toLowerCase().includes(q)) return false;
      }
      return true;
    });
    const pending = (data.pipeline || []).filter((l) => l.status === "new" || l.status === "selected").length;

    const statusOpts = '<option value="">全部状态</option>' + Store.PIPELINE_STATUSES.map((s) =>
      '<option value="' + s.key + '"' + (filters.status === s.key ? " selected" : "") + ">" + s.label + "</option>").join("");

    let html = '<div class="toolbar">' +
      '<div class="search-box grow">' + UI.icon("search") + '<input class="inp" id="pQ" placeholder="搜索公司 / 职位 / 备注…" value="' + UI.esc(filters.q) + '"></div>' +
      '<select class="inp" id="pStatus" style="width:auto">' + statusOpts + "</select>" +
      '<button class="btn btn-ghost" id="pImport">' + UI.icon("upload") + "导入扩展 JSON</button>" +
      '<button class="btn btn-primary" id="pAdd">' + UI.icon("plus") + "新增线索</button>" +
      "</div>";

    html += '<div class="stats" style="margin-bottom:16px">' +
      statCard("线索总数", (data.pipeline || []).length, "") +
      statCard("待处理", pending, "accent") +
      statCard("已转投递", (data.pipeline || []).filter((l) => l.status === "converted").length, "blue") +
      "</div>";

    if (leads.length === 0) {
      html += UI.emptyState("inbox", (data.pipeline || []).length === 0 ? "还没有岗位线索" : "没有符合筛选的线索",
        (data.pipeline || []).length === 0 ? "点「导入扩展 JSON」把浏览器扩展抓到的岗位导进来，或直接「新增线索」。" : "换个关键词或清空筛选试试。",
        '<button class="btn btn-primary" id="pAddEmpty">' + UI.icon("plus") + "新增线索</button>");
    } else {
      html += '<div class="table-wrap"><table class="data"><thead><tr>' +
        "<th>公司 / 职位</th><th>渠道</th><th>地点</th><th>匹配度</th><th>截止</th><th>状态</th><th>来源</th><th></th>" +
        "</tr></thead><tbody>";
      leads.forEach((l) => {
        const m = statusMeta(l.status);
        const overdue = l.deadline && l.deadline < Store.todayISO();
        html += "<tr>" +
          '<td><div class="td-company">' + UI.esc(l.company || UI.fallbackCompany(l.url)) + "</div><div class='td-position'>" + (l.position ? UI.esc(l.position) : '<span class="faint">未填写职位</span>') + "</div></td>" +
          "<td>" + (l.channel ? UI.esc(l.channel) : '<span class="faint">—</span>') + "</td>" +
          "<td>" + (l.location ? UI.esc(l.location) : '<span class="faint">—</span>') + "</td>" +
          "<td>" + scoreBadge(l.matchScore) + "</td>" +
          "<td>" + (l.deadline ? (overdue ? UI.badge(l.deadline, "resp-rejected") : UI.esc(l.deadline)) : '<span class="faint">—</span>') + "</td>" +
          "<td>" + UI.badge(m.label, m.cls) + "</td>" +
          "<td>" + UI.esc(l.source || "—") + "</td>" +
          '<td><div class="td-actions">' +
          (l.url ? '<button class="icon-btn" data-act="open" data-id="' + l.id + '" title="打开链接">' + UI.icon("external") + "</button>" : "") +
          '<button class="icon-btn" data-act="edit" data-id="' + l.id + '" title="编辑">' + UI.icon("edit") + "</button>" +
          (l.status !== "converted" ? '<button class="icon-btn" data-act="convert" data-id="' + l.id + '" title="转为投递记录">' + UI.icon("check") + "</button>" : "") +
          '<button class="icon-btn danger" data-act="del" data-id="' + l.id + '" title="删除">' + UI.icon("trash") + "</button>" +
          "</div></td></tr>";
      });
      html += "</tbody></table></div>";
    }

    root.innerHTML = html;

    root.querySelector("#pQ").addEventListener("input", (e) => { filters.q = e.target.value; renderPipeline(root); });
    root.querySelector("#pStatus").addEventListener("change", (e) => { filters.status = e.target.value; renderPipeline(root); });
    root.querySelector("#pImport").addEventListener("click", () => importLeads(root));
    root.querySelector("#pAdd").addEventListener("click", () => openLeadForm());
    const bEmpty = root.querySelector("#pAddEmpty");
    if (bEmpty) bEmpty.addEventListener("click", () => openLeadForm());

    root.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const act = btn.dataset.act, id = btn.dataset.id;
        const lead = (data.pipeline || []).find((x) => x.id === id);
        if (!lead) return;
        if (act === "open") { window.open(lead.url, "_blank", "noopener"); }
        else if (act === "edit") { openLeadForm(id); }
        else if (act === "convert") { convertToApplication(root, id); }
        else if (act === "del") {
          const ok = await UI.confirmDialog({ title: "删除这条线索？", message: "「" + (lead.company || lead.url) + "」将从线索池移除。", okText: "删除", danger: true });
          if (!ok) return;
          const d = Store.load();
          d.pipeline = (d.pipeline || []).filter((x) => x.id !== id);
          Store.save(d);
          UI.toast("已删除", "ok");
          renderPipeline(root);
        }
      });
    });
  }

  function statCard(label, num, accent) {
    return '<div class="stat" data-accent="' + (accent || "") + '"><div class="num">' + num + '</div><div class="lbl">' + label + "</div></div>";
  }

  window.Views = window.Views || {};
  window.Views.renderPipeline = renderPipeline;
})();
