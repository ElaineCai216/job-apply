/* ============ views-profile.js — 我的简历：文件上传管理（IndexedDB） ============ */
(function () {
  "use strict";
  const UI = window.UI, Store = window.Store;

  const MAX_SIZE = 15 * 1024 * 1024; // 15MB
  let renderSeq = 0;

  function fmtSize(n) {
    if (n == null) return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }
  function labelOf(name) { return name.replace(/\.[^.]+$/, ""); }

  async function defaultResumeId() { return Store.load().settings.defaultResumeId || ""; }
  async function setDefaultId(id) {
    const d = Store.load();
    d.settings.defaultResumeId = id;
    Store.save(d);
  }

  async function uploadFile(file) {
    if (!file) return;
    if (file.size > MAX_SIZE) {
      UI.toast("「" + file.name + "」超过 15MB，未上传", "warn");
      return;
    }
    const record = {
      id: Store.uid(),
      name: file.name,
      label: labelOf(file.name),
      size: file.size,
      type: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      blob: file
    };
    await ResumeDB.put(record);
    const cur = await defaultResumeId();
    if (!cur) await setDefaultId(record.id);
    UI.toast("已上传「" + file.name + "」", "ok");
  }

  function resumeRowHtml(r, isDefault) {
    const date = UI.fmtDate(r.uploadedAt ? r.uploadedAt.slice(0, 10) : "");
    return '<div class="resume-row" data-id="' + r.id + '">' +
      UI.icon("file") +
      '<div class="resume-info">' +
      '<div class="resume-name">' + UI.esc(r.name) + (isDefault ? " " + UI.badge("默认", "resp-other") : "") + "</div>" +
      '<div class="resume-meta">' + fmtSize(r.size) + " · " + date + " 上传 · 版本标签 " +
      '<input class="inp inp-sm" data-act="rename" value="' + UI.esc(r.label || labelOf(r.name)) + '" placeholder="如：中文版 / 英文版">' +
      "</div></div>" +
      '<div class="resume-actions">' +
      (isDefault ? "" : '<button class="btn btn-ghost btn-sm" data-act="default">设为默认</button>') +
      '<button class="btn btn-ghost btn-sm" data-act="download">' + UI.icon("download") + "下载</button>" +
      '<button class="btn btn-danger btn-sm" data-act="delete">' + UI.icon("trash") + "删除</button>" +
      "</div></div>";
  }

  async function renderProfile(root) {
    const seq = ++renderSeq;
    let resumes = [];
    let idbError = false;
    try {
      resumes = await ResumeDB.all();
    } catch (e) {
      idbError = true;
    }
    if (seq !== renderSeq || document.getElementById("view") !== root) return;
    const defId = await defaultResumeId();
    if (seq !== renderSeq) return;
    const defExists = resumes.some((r) => r.id === defId);

    let html =
      '<div class="section-head" style="margin-bottom:16px">' +
      "<div><div class='section-title'>我的简历</div>" +
      "<div class='section-desc' style='margin-bottom:0'>上传你的简历文件即可，无需手动填写。建议把版本标签命名为「中文」「英文」：投香港/海外用英文、投大陆用中文。文件只存在你的浏览器里。</div></div>" +
      "</div>";

    html += '<div class="card" style="padding:18px;margin-bottom:18px">' +
      '<div class="dropzone" id="dropZone" tabindex="0" role="button" aria-label="上传简历文件">' +
      UI.icon("upload") +
      "<b>点击选择文件，或把简历拖到这里</b>" +
      "<p>支持 PDF / Word（.pdf .doc .docx），单个 ≤ 15MB。建议文件名带上版本，例如「张小明-简历-通用-v2.pdf」</p>" +
      '<input type="file" id="fileInput" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple hidden>' +
      "</div></div>";

    if (idbError) {
      html += '<div class="card" style="padding:14px 18px;margin-bottom:14px;border-color:var(--amber-soft);background:var(--amber-soft)"><strong style="font-size:13.5px">浏览器未开放本地文件存储</strong><span class="muted" style="font-size:12.5px;margin-left:8px">请使用 Chrome / Edge / Safari 并通过 http(s) 访问本站（例如 GitHub Pages 或 localhost），否则无法保存简历文件。</span></div>';
    }

    html += '<div class="section-head" style="margin-bottom:10px"><div class="section-title">已上传（' + resumes.length + "）</div></div>";
    if (resumes.length === 0) {
      html += UI.emptyState("file", "还没有上传简历", "上传第一份简历后，新增投递时会自动带上默认版本。");
    } else {
      html += '<div id="resumeList">' + resumes.map((r) => resumeRowHtml(r, r.id === defId)).join("") + "</div>";
    }
    if (!defExists && resumes.length) {
      html += '<p class="muted" style="font-size:12.5px;margin-top:8px">提示：还没有设置默认简历，请在列表中点「设为默认」。</p>';
    }

    root.innerHTML = html;

    const zone = root.querySelector("#dropZone");
    const input = root.querySelector("#fileInput");

    async function handleFiles(files) {
      for (const f of Array.from(files || [])) {
        try { await uploadFile(f); }
        catch (e) { UI.toast("上传「" + f.name + "」失败：浏览器存储不可用", "warn"); }
      }
      await renderProfile(root);
    }

    zone.addEventListener("click", () => input.click());
    zone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    ["dragenter", "dragover"].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.remove("drag"); }));
    zone.addEventListener("drop", (e) => { if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files); });
    input.addEventListener("change", () => { handleFiles(input.files); input.value = ""; });

    root.querySelectorAll(".resume-row").forEach((row) => {
      const id = row.dataset.id;
      row.querySelector('[data-act="default"]')?.addEventListener("click", async () => {
        await setDefaultId(id);
        UI.toast("已设为默认简历", "ok");
        await renderProfile(root);
      });
      row.querySelector('[data-act="download"]')?.addEventListener("click", async () => {
        const r = await ResumeDB.get(id);
        if (!r || !r.blob) { UI.toast("找不到文件内容", "warn"); return; }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(r.blob);
        a.download = r.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      });
      row.querySelector('[data-act="delete"]')?.addEventListener("click", async () => {
        const r = resumes.find((x) => x.id === id);
        const ok = await UI.confirmDialog({ title: "删除这份简历？", message: "「" + (r ? r.name : "") + "」将被删除，此操作不可恢复。", okText: "删除", danger: true });
        if (!ok) return;
        await ResumeDB.remove(id);
        const cur = await defaultResumeId();
        if (cur === id) await setDefaultId("");
        UI.toast("已删除", "ok");
        await renderProfile(root);
      });
      row.querySelector('[data-act="rename"]')?.addEventListener("change", async (e) => {
        const r = await ResumeDB.get(id);
        if (!r) return;
        r.label = e.target.value.trim() || labelOf(r.name);
        await ResumeDB.put(r);
        UI.toast("版本标签已更新", "ok");
      });
    });
  }

  window.Views = window.Views || {};
  window.Views.renderProfile = renderProfile;
})();
