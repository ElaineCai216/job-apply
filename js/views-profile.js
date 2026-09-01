/* ============ views-profile.js — 简历档案编辑 ============ */
(function () {
  "use strict";
  const UI = window.UI, Store = window.Store;

  let draft = null;
  const emptyExp = () => ({ id: Store.uid(), company: "", title: "", location: "", start: "", end: "", current: false, highlights: [] });
  const emptyEdu = () => ({ id: Store.uid(), institution: "", degree: "", field: "", start: "", end: "", gpa: "" });
  const emptyLang = () => ({ id: Store.uid(), language: "", level: "" });

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  const fld = (label, inputHtml, hint) => '<label class="fld"><span class="fld-label">' + label + (hint ? "<em>" + hint + "</em>" : "") + "</span>" + inputHtml + "</label>";

  function expRow(x, i) {
    return '<div class="row-card" data-i="' + i + '">' +
      '<div class="row-grid">' +
      fld("公司", '<input class="inp" data-row="experience" data-k="company" value="' + UI.esc(x.company) + '">') +
      fld("职位", '<input class="inp" data-row="experience" data-k="title" value="' + UI.esc(x.title) + '">') +
      fld("地点", '<input class="inp" data-row="experience" data-k="location" value="' + UI.esc(x.location) + '">') +
      '<div class="grid2">' +
      fld("开始", '<input class="inp" data-row="experience" data-k="start" value="' + UI.esc(x.start) + '" placeholder="2023-03">') +
      fld("结束", '<input class="inp" data-row="experience" data-k="end" value="' + UI.esc(x.end) + '" placeholder="留空表示至今">') +
      "</div>" +
      fld("成就 / 职责（每行一条）", '<textarea class="inp" data-row="experience" data-k="highlights" placeholder="每行一条，例如：&#10;负责交易网关，QPS 8k">' + UI.esc((x.highlights || []).join("\n")) + "</textarea>") +
      "</div>" +
      '<div class="row-actions"><label class="chk"><input type="checkbox" data-row="experience" data-k="current" data-i="' + i + '"' + (x.current ? " checked" : "") + "> 在职</label>" +
      '<button class="btn btn-ghost btn-sm" data-act="del-exp" data-i="' + i + '">' + UI.icon("trash") + "删除</button></div>" +
      "</div>";
  }

  function eduRow(x, i) {
    return '<div class="row-card" data-i="' + i + '">' +
      '<div class="row-grid">' +
      fld("学校", '<input class="inp" data-row="education" data-k="institution" value="' + UI.esc(x.institution) + '">') +
      fld("学位", '<input class="inp" data-row="education" data-k="degree" value="' + UI.esc(x.degree) + '" placeholder="本科 / 硕士">') +
      fld("专业", '<input class="inp" data-row="education" data-k="field" value="' + UI.esc(x.field) + '">') +
      '<div class="grid3">' +
      fld("开始", '<input class="inp" data-row="education" data-k="start" value="' + UI.esc(x.start) + '">') +
      fld("结束", '<input class="inp" data-row="education" data-k="end" value="' + UI.esc(x.end) + '">') +
      fld("GPA", '<input class="inp" data-row="education" data-k="gpa" value="' + UI.esc(x.gpa) + '">') +
      "</div>" +
      "</div>" +
      '<div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="del-edu" data-i="' + i + '">' + UI.icon("trash") + "删除</button></div>" +
      "</div>";
  }

  function langRow(x, i) {
    return '<div class="row-card" data-i="' + i + '">' +
      '<div class="row-grid">' +
      fld("语言", '<input class="inp" data-row="languages" data-k="language" value="' + UI.esc(x.language) + '" placeholder="中文">') +
      fld("水平", '<input class="inp" data-row="languages" data-k="level" value="' + UI.esc(x.level) + '" placeholder="母语 / 流利">') +
      "</div>" +
      '<div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="del-lang" data-i="' + i + '">' + UI.icon("trash") + "删除</button></div>" +
      "</div>";
  }

  function refRow(r, i) {
    return '<div class="row-card" data-i="' + i + '">' +
      '<div class="row-grid">' +
      fld("公司", '<input class="inp" data-row="refcodes" data-k="company" value="' + UI.esc(r.company) + '">') +
      fld("内推码", '<input class="inp" data-row="refcodes" data-k="code" value="' + UI.esc(r.code) + '">') +
      "</div>" +
      '<div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="del-ref" data-i="' + i + '">' + UI.icon("trash") + "删除</button></div>" +
      "</div>";
  }

  function renderProfile(root) {
    if (!draft) {
      const p = clone(Store.load().profile);
      draft = {
        ...p,
        refCodes: Object.entries(p.referral_codes || {}).map(([company, code]) => ({ company, code }))
      };
    }
    const d = draft;
    const id = d.identity, v = d.visa, rf = d.resume_files;
    const skills = d.skills || {};
    const skillInput = (key, label, hint) => fld(label, '<input class="inp" data-skill="' + key + '" value="' + UI.esc((skills[key] || []).join(", ")) + '" placeholder="' + hint + '">');
    const refCodes = d.refCodes.length ? d.refCodes : [{ company: "", code: "" }];

    let html =
      '<div class="section-head" style="margin-bottom:16px">' +
      "<div><div class='section-title'>简历档案</div><div class='section-desc' style='margin-bottom:0'>填一次，投递时自动复用。所有数据只存在你的浏览器里。</div></div>" +
      '<div class="btn-row"><button class="btn btn-ghost btn-sm" id="btnExport">' + UI.icon("download") + "导出档案</button>" +
      '<button class="btn btn-primary" id="btnSave">' + UI.icon("check") + "保存档案</button></div>" +
      "</div>";

    html += '<div class="card" style="padding:20px;margin-bottom:18px">' +
      '<div class="section-title" style="margin-bottom:14px">基本信息</div>' +
      '<div class="grid2">' +
      fld("姓名", '<input class="inp" data-k="identity.full_name" value="' + UI.esc(id.full_name) + '">') +
      fld("英文名", '<input class="inp" data-k="identity.english_name" value="' + UI.esc(id.english_name) + '">') +
      fld("电话", '<input class="inp" data-k="identity.phone" value="' + UI.esc(id.phone) + '" placeholder="+852 …">') +
      fld("邮箱", '<input class="inp" data-k="identity.email" value="' + UI.esc(id.email) + '">') +
      fld("所在地", '<input class="inp" data-k="identity.location" value="' + UI.esc(id.location) + '">') +
      fld("LinkedIn", '<input class="inp" data-k="identity.linkedin" value="' + UI.esc(id.linkedin) + '">') +
      fld("GitHub", '<input class="inp" data-k="identity.github" value="' + UI.esc(id.github) + '">') +
      fld("作品集 / 个人站", '<input class="inp" data-k="identity.portfolio" value="' + UI.esc(id.portfolio) + '">') +
      "</div>" +
      '<div class="fld" style="margin-top:14px"><span class="fld-label">个人简介（用于 Cover Letter / Why this company）</span>' +
      '<textarea class="inp" data-k="summary">' + UI.esc(d.summary) + "</textarea></div>" +
      '<div class="grid2" style="margin-top:14px">' +
      fld("工作授权状态", '<input class="inp" data-k="visa.work_authorization" value="' + UI.esc(v.work_authorization) + '">') +
      fld("工签支持备注", '<input class="inp" data-k="visa.note" value="' + UI.esc(v.note) + '" placeholder="选填">') +
      "</div>" +
      '<label class="chk" style="margin-top:14px"><input type="checkbox" data-k="visa.requires_sponsorship"' + (v.requires_sponsorship ? " checked" : "") + "> 需要雇主提供工签支持</label>" +
      "</div>";

    html += '<div class="card" style="padding:20px;margin-bottom:18px">' +
      '<div class="section-head" style="margin-bottom:12px"><div><div class="section-title">工作经历</div><div class="section-desc" style="margin-bottom:0">按时间倒序</div></div>' +
      '<button class="btn btn-ghost btn-sm" data-act="add-exp">' + UI.icon("plus") + "添加经历</button></div>" +
      (d.experience.map(expRow).join("") || '<div class="muted" style="font-size:13px">暂无经历，点右上角添加。</div>') +
      "</div>";

    html += '<div class="card" style="padding:20px;margin-bottom:18px">' +
      '<div class="section-head" style="margin-bottom:12px"><div><div class="section-title">教育经历</div></div>' +
      '<button class="btn btn-ghost btn-sm" data-act="add-edu">' + UI.icon("plus") + "添加教育</button></div>" +
      (d.education.map(eduRow).join("") || '<div class="muted" style="font-size:13px">暂无教育经历。</div>') +
      "</div>";

    html += '<div class="card" style="padding:20px;margin-bottom:18px">' +
      '<div class="section-title" style="margin-bottom:14px">技能（逗号分隔）</div>' +
      '<div class="skills-grid">' +
      skillInput("languages", "编程语言", "Python, Go, TypeScript") +
      skillInput("frameworks", "框架", "React, FastAPI") +
      skillInput("tools", "工具", "Docker, AWS") +
      skillInput("other", "其他", "英语六级, 产品思维") +
      "</div></div>";

    html += '<div class="card" style="padding:20px;margin-bottom:18px">' +
      '<div class="section-head" style="margin-bottom:12px"><div><div class="section-title">语言能力</div></div>' +
      '<button class="btn btn-ghost btn-sm" data-act="add-lang">' + UI.icon("plus") + "添加语言</button></div>" +
      (d.languages.map(langRow).join("") || '<div class="muted" style="font-size:13px">暂无语言。</div>') +
      "</div>";

    html += '<div class="card" style="padding:20px;margin-bottom:18px">' +
      '<div class="section-head" style="margin-bottom:12px"><div><div class="section-title">内推码</div><div class="section-desc" style="margin-bottom:0">按公司记录，投递时自动带入</div></div>' +
      '<button class="btn btn-ghost btn-sm" data-act="add-ref">' + UI.icon("plus") + "添加内推码</button></div>" +
      refCodes.map(refRow).join("") +
      "</div>";

    html += '<div class="card" style="padding:20px">' +
      '<div class="section-title" style="margin-bottom:14px">简历文件路径（放在 profile/resume/ 下）</div>' +
      '<div class="grid3">' +
      fld("默认简历", '<input class="inp" data-k="resume_files.default" value="' + UI.esc(rf.default) + '">') +
      fld("中文版", '<input class="inp" data-k="resume_files.zh" value="' + UI.esc(rf.zh) + '">') +
      fld("英文版", '<input class="inp" data-k="resume_files.en" value="' + UI.esc(rf.en) + '">') +
      "</div></div>";

    root.innerHTML = html;

    /* 输入 → 更新 draft */
    root.addEventListener("input", (e) => {
      const t = e.target;
      const set = (obj, path, val) => { const ks = path.split("."); let o = obj; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = val; };
      if (t.dataset.row) {
        const row = t.closest(".row-card");
        const i = row ? +row.dataset.i : -1;
        if (t.dataset.row === "refcodes") {
          if (d.refCodes[i]) d.refCodes[i][t.dataset.k] = t.value;
        } else {
          const arr = draft[t.dataset.row];
          if (arr && arr[i]) {
            if (t.dataset.k === "highlights") arr[i].highlights = t.value.split("\n").map((s) => s.trim()).filter(Boolean);
            else arr[i][t.dataset.k] = t.value;
          }
        }
      } else if (t.dataset.skill) {
        draft.skills[t.dataset.skill] = t.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
      } else if (t.dataset.k) {
        set(draft, t.dataset.k, t.type === "checkbox" ? t.checked : t.value);
      }
    });

    /* 结构操作 */
    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === "add-exp") { draft.experience.push(emptyExp()); renderProfile(root); }
      else if (act === "add-edu") { draft.education.push(emptyEdu()); renderProfile(root); }
      else if (act === "add-lang") { draft.languages.push(emptyLang()); renderProfile(root); }
      else if (act === "add-ref") { draft.refCodes.push({ company: "", code: "" }); renderProfile(root); }
      else if (act === "del-exp") { draft.experience.splice(+btn.dataset.i, 1); renderProfile(root); }
      else if (act === "del-edu") { draft.education.splice(+btn.dataset.i, 1); renderProfile(root); }
      else if (act === "del-lang") { draft.languages.splice(+btn.dataset.i, 1); renderProfile(root); }
      else if (act === "del-ref") { draft.refCodes.splice(+btn.dataset.i, 1); renderProfile(root); }
    });

    root.querySelector("#btnSave").addEventListener("click", () => {
      const data = Store.load();
      data.profile = {
        ...draft,
        referral_codes: draft.refCodes.reduce((o, r) => { if (r.company.trim()) o[r.company.trim()] = r.code.trim(); return o; }, {})
      };
      delete data.profile.refCodes;
      Store.save(data);
      UI.toast("档案已保存", "ok");
      draft = null;
      renderProfile(root);
    });

    root.querySelector("#btnExport").addEventListener("click", () => {
      const data = Store.load();
      const blob = new Blob([JSON.stringify(data.profile, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "profile.json";
      a.click();
      URL.revokeObjectURL(a.href);
      UI.toast("档案已导出", "ok");
    });
  }

  window.Views = window.Views || {};
  window.Views.renderProfile = renderProfile;
})();
