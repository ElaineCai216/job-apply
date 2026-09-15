/* ============ views-interview.js — 从真实投递生成面试准备任务包 ============ */
(function () {
  "use strict";
  const Store = window.Store;
  window.Views = window.Views || {};

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function candidate(profile) {
    const p = profile || {}, identity = p.identity || {}, skills = p.skills || {};
    const allSkills = [].concat(skills.languages || [], skills.frameworks || [], skills.tools || [], skills.other || []);
    return [
      identity.full_name || identity.english_name ? `候选人：${identity.full_name || ""} ${identity.english_name || ""}`.trim() : "",
      p.summary ? `背景摘要：${p.summary}` : "",
      allSkills.length ? `技能：${allSkills.join("、")}` : "",
      ...(Array.isArray(p.experience) ? p.experience.slice(0, 4).map((x) => `${x.company || ""}｜${x.title || ""}：${(x.highlights || []).join("；")}`) : [])
    ].filter(Boolean).join("\n");
  }

  function taskPack(app, profile) {
    return `请为我准备一份针对性面经，输出中文。\n\n【目标岗位】\n公司：${app.company || "待确认"}\n岗位：${app.position || "待确认"}\n岗位链接：${app.url || ""}\n渠道：${app.ats || app.channel || ""}\nJD/备注：${app.jd || app.notes || app.note || "暂无，请先根据链接研究岗位"}\n\n【我的真实背景】\n${candidate(profile) || "网页中尚未填写个人经历；请先要求我补充，禁止编造。"}\n\n【必须完成】\n1. 搜索公开面经，优先小红书、牛客、Glassdoor、公司官网和同岗位讨论；列出来源链接与发布日期。\n2. 区分“公开面经高频题”和“基于该 JD 的推断题”，不要混写。\n3. 给出 12 道最可能的问题、追问链和答题框架。\n4. 从我的真实经历中挑 3 个最适合深挖的项目/经历；每个给出 5 层追问：目标、个人贡献、技术或业务决策、量化结果、复盘。\n5. 标记我目前缺少证据的点，禁止替我编数字或经历。\n6. 最后给出 45 分钟模拟面试流程和一页速记卡。`;
  }

  window.Views.renderInterview = function (root) {
    const data = Store.load();
    const apps = [...data.applications].sort((a, b) => String(b.applied_date || "").localeCompare(String(a.applied_date || "")));
    root.innerHTML = '<section class="section-head"><div><h2>面试准备中心</h2><p>从每条真实投递生成研究型任务包，再交给 Codex 搜公开面经并按你的经历改写。</p></div></section>' +
      (!apps.length ? '<div class="empty-state"><p>还没有投递记录。先从「岗位线索」转一条投递，或在「投递台账」新增。</p></div>' :
      '<div class="card"><div class="table-wrap"><table><thead><tr><th>公司 / 岗位</th><th>状态</th><th>针对性准备</th></tr></thead><tbody>' + apps.map((app) =>
        `<tr><td><strong>${esc(app.company || "未命名公司")}</strong><br><span class="muted">${esc(app.position || "待补职位")}</span></td><td>${esc(app.outcome || Store.stageMeta(app.stage).label)}</td><td><button class="btn btn-primary btn-sm interview-copy" data-id="${esc(app.id)}">复制定制面经任务包</button></td></tr>`
      ).join("") + '</tbody></table></div></div>');

    root.querySelectorAll(".interview-copy").forEach((button) => button.addEventListener("click", async () => {
      const app = data.applications.find((item) => item.id === button.dataset.id);
      if (!app) return;
      await navigator.clipboard.writeText(taskPack(app, data.profile));
      const old = button.textContent;
      button.textContent = "已复制，粘贴给 Codex";
      setTimeout(() => { button.textContent = old; }, 1800);
    }));
  };
})();
