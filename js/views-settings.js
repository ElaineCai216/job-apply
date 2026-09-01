/* ============ views-settings.js — 设置：外观 / 提醒 / 数据 ============ */
(function () {
  "use strict";
  const UI = window.UI, Store = window.Store;

  function settingRow(label, desc, ctrlHtml) {
    return '<div class="setting-row"><div><div class="s-label">' + label + '</div><div class="s-desc">' + desc + "</div></div>" +
      '<div class="s-ctrl">' + ctrlHtml + "</div></div>";
  }

  function renderSettings(root) {
    const d = Store.load();
    const s = d.settings;

    let html =
      '<div class="section-head" style="margin-bottom:16px"><div><div class="section-title">设置</div>' +
      '<div class="section-desc" style="margin-bottom:0">外观、提醒阈值与数据管理</div></div></div>';

    html += '<div class="card" style="padding:6px 22px;margin-bottom:18px">' +
      '<div class="section-title" style="margin:16px 0 2px">外观</div>' +
      settingRow("深色模式", "适合夜间使用，减少亮光刺激",
        '<label class="switch"><input type="checkbox" id="sDark"' + (s.dark ? " checked" : "") + '><span class="track"></span></label>') +
      "</div>";

    html += '<div class="card" style="padding:6px 22px;margin-bottom:18px">' +
      '<div class="section-title" style="margin:16px 0 2px">跟进提醒</div>' +
      settingRow("无回应提醒阈值", "投递后超过该天数仍无结果，自动标记「需跟进」",
        '<input type="number" class="inp" id="sDays" min="1" max="90" value="' + (s.noResponseDays || 7) + '" style="width:90px"> 天') +
      "</div>";

    html += '<div class="card" style="padding:6px 22px;margin-bottom:18px">' +
      '<div class="section-title" style="margin:16px 0 2px">数据</div>' +
      settingRow("导出备份", "把全部数据下载为 JSON 文件，可随时导入恢复",
        '<button class="btn btn-ghost btn-sm" id="sExport">' + UI.icon("download") + "导出 JSON</button>") +
      settingRow("导入备份", "从 JSON 文件恢复数据（会覆盖当前数据）",
        '<button class="btn btn-ghost btn-sm" id="sImport">' + UI.icon("upload") + "导入 JSON</button>") +
      '<input type="file" id="sFile" accept=".json,application/json" style="display:none">' +
      settingRow("载入示例数据", "用几份示例投递填充看板，方便体验",
        '<button class="btn btn-ghost btn-sm" id="sSample">' + UI.icon("refresh") + "载入示例</button>") +
      settingRow("清空全部数据", "删除浏览器里的所有投递与档案（不可恢复，请先导出）",
        '<button class="btn btn-danger btn-sm" id="sClear">' + UI.icon("trash") + "清空数据</button>") +
      "</div>";

    html += '<div class="card" style="padding:18px 22px">' +
      '<div class="section-title" style="margin-bottom:6px">关于</div>' +
      '<p class="muted" style="font-size:13.5px">投递台 · Apply Desk — 个人求职申请管理工具。纯静态、零依赖，数据只存本地浏览器，不上传任何服务器。' +
      "请定期导出备份。</p></div>";

    root.innerHTML = html;

    root.querySelector("#sDark").addEventListener("change", (e) => {
      const data = Store.load();
      data.settings.dark = e.target.checked;
      Store.save(data);
      document.documentElement.classList.toggle("dark", e.target.checked);
      UI.toast(e.target.checked ? "已开启深色模式" : "已关闭深色模式", "ok");
    });
    root.querySelector("#sDays").addEventListener("change", (e) => {
      const v = Math.max(1, Math.min(90, parseInt(e.target.value, 10) || 7));
      const data = Store.load();
      data.settings.noResponseDays = v;
      Store.save(data);
      e.target.value = v;
      UI.toast("提醒阈值已更新为 " + v + " 天", "ok");
    });
    root.querySelector("#sExport").addEventListener("click", () => {
      const data = Store.load();
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "applydesk-backup-" + stamp + ".json";
      a.click();
      URL.revokeObjectURL(a.href);
      UI.toast("备份已导出", "ok");
    });
    root.querySelector("#sImport").addEventListener("click", () => root.querySelector("#sFile").click());
    root.querySelector("#sFile").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!parsed || !Array.isArray(parsed.applications) || !parsed.profile || !parsed.settings) {
            throw new Error("结构不对");
          }
          const ok = await UI.confirmDialog({ title: "导入备份？", message: "导入会覆盖当前所有数据，确定继续吗？", okText: "导入" });
          if (!ok) { e.target.value = ""; return; }
          parsed.settings = { ...Store.load().settings, ...parsed.settings };
          Store.save(parsed);
          UI.toast("导入成功", "ok");
          location.hash = "#/dashboard";
          location.reload();
        } catch (err) {
          UI.toast("导入失败：不是有效的备份文件", "warn");
          e.target.value = "";
        }
      };
      reader.readAsText(file);
    });
    root.querySelector("#sSample").addEventListener("click", async () => {
      const ok = await UI.confirmDialog({ title: "载入示例数据？", message: "示例数据会覆盖当前数据，确定继续吗？", okText: "载入" });
      if (!ok) return;
      Store.loadSample();
      UI.toast("已载入示例数据", "ok");
      location.hash = "#/dashboard";
      location.reload();
    });
    root.querySelector("#sClear").addEventListener("click", async () => {
      const ok = await UI.confirmDialog({ title: "清空全部数据？", message: "所有投递与档案将被删除且不可恢复。建议先导出备份。确定继续吗？", okText: "清空", danger: true });
      if (!ok) return;
      Store.reset();
      UI.toast("数据已清空", "ok");
      location.hash = "#/dashboard";
      location.reload();
    });
  }

  window.Views = window.Views || {};
  window.Views.renderSettings = renderSettings;
})();
