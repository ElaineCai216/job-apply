/* 投递助手 · 平台识别与任务包生成（纯函数，可在 Node 中测试） */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.JobDetect = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const CHANNELS = ["公司官网", "Workday", "SAP SuccessFactors", "Greenhouse", "Lever", "Ashby", "JobsDB", "JIJIS", "LinkedIn", "BOSS直聘", "国内平台", "邮箱投递", "小红书", "共享文档", "其他"];

  function hostOf(url) {
    if (!url) return "";
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  }

  function detectChannel(url) {
    const raw = (url || "").trim();
    if (/^mailto:/i.test(raw)) return "邮箱投递";
    const host = hostOf(raw);
    if (!host) return "其他";
    if (host.includes("xiaohongshu.com") || host.includes("xhslink.com")) return "小红书";
    if (["docs.qq.com", "docs.google.com", "feishu.cn", "larksuite.com", "notion.so", "notion.site", "shimo.im", "yuque.com"].some((d) => host.includes(d))) return "共享文档";
    if (host.includes("jobsdb.com")) return "JobsDB";
    if (host.includes("jijis.org.hk")) return "JIJIS";
    if (host.includes("successfactors") || host.includes("sapsf")) return "SAP SuccessFactors";
    if (host.includes("myworkdayjobs.com") || host.includes("workday")) return "Workday";
    if (host.includes("greenhouse.io")) return "Greenhouse";
    if (host.includes("lever.co")) return "Lever";
    if (host.includes("ashbyhq.com")) return "Ashby";
    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("zhipin.com")) return "BOSS直聘";
    if (["lagou.com", "zhaopin.com", "51job.com", "liepin.com"].some((d) => host.includes(d))) return "国内平台";
    if (["indeed.com", "glassdoor.com", "monster.com"].some((d) => host.includes(d))) return "其他";
    return "公司官网";
  }

  function human(slug) {
    return (slug || "").split(/[-_]/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").trim();
  }

  function guessCompany(url, title) {
    const host = hostOf(url);
    if (!host) return "";
    let path = "";
    try { path = new URL(url).pathname; } catch (e) {}
    const parts = host.split(".");
    const sub = parts[0] || "";
    const segs = path.split("/").filter(Boolean);
    if (host.includes("greenhouse.io")) return human(segs[0]);
    if (host.includes("lever.co")) return human(segs[0]);
    if (host.includes("ashbyhq.com")) return human(segs[0]);
    if (host.includes("myworkdayjobs.com")) {
      const i = segs.indexOf("company");
      if (i >= 0) return human(segs[i + 1]);
      return human(sub.split("-")[0]);
    }
    if (host.includes("successfactors") || host.includes("sapsf")) return human(sub);
    const careerSub = ["careers", "career", "jobs", "job", "talent", "join", "joinus", "apply", "recruiting", "recruit", "hiring", "hr", "ats", "work", "boards"];
    if (careerSub.includes(sub)) return human(parts[1] || sub);
    const platforms = ["jobsdb.com", "jijis.org.hk", "linkedin.com", "zhipin.com", "lagou.com", "zhaopin.com", "51job.com", "liepin.com", "xiaohongshu.com", "xhslink.com", "docs.qq.com", "docs.google.com", "feishu.cn", "larksuite.com", "notion.so", "notion.site", "shimo.im", "yuque.com", "indeed.com"];
    if (platforms.some((d) => host.includes(d))) {
      // 平台页：尝试从标题里找公司名（「职位 - 公司」）
      const t = (title || "").replace(/\s*[-|｜·–]\s*(招聘|jobs?|careers?|linkedin|jobsdb|jijis).*$/i, "").trim();
      const m = t.match(/(.+?)\s*[-|｜·–]\s*(.+)$/);
      if (m) {
        const cand = [m[1].trim(), m[2].trim()].filter((x) => x && x.length <= 40 && !/工程师|经理|专员|实习|开发|设计|运营|销售|顾问|助理|analyst|engineer|manager/i.test(x));
        if (cand.length) return cand[0];
      }
      return "";
    }
    return human(sub);
  }

  function guessPosition(title) {
    let t = (title || "").trim();
    if (!t) return "";
    t = t.replace(/\s*[-|｜·–]\s*(招聘|人才招聘|社会招聘|校园招聘|jobs?|careers?|job search|linkedin|jobsdb|jijis|官网|官方网站).*$/i, "");
    const m = t.match(/^(.+?)\s*[-|｜·–]\s*[^-|｜·–]{2,30}$/);
    if (m && m[1].length <= 60) return m[1].trim();
    return t.length <= 60 ? t : "";
  }

  function buildTaskPack(lead) {
    const lines = [
      "# 岗位任务包（投递助手抓取）",
      "",
      "- 公司：" + (lead.company || "（待确认）"),
      "- 职位：" + (lead.position || "（待确认）"),
      "- 渠道：" + (lead.channel || ""),
      "- 链接：" + (lead.url || ""),
      "- 抓取时间：" + (lead.createdAt || new Date().toISOString()),
      "",
      "## JD 正文",
      "",
      (lead.jd || "（未抓取到正文，请粘贴 JD）"),
      "",
      "## 请 Codex 做的事",
      "",
      "1. 按此 JD 优化我的简历：中文版 + 英文版各一份，只调侧重不改事实",
      "2. 生成投递邮件正文（按岗位语言，主题 + 正文）",
      "3. 给出匹配度分析与投递建议"
    ];
    return lines.join("\n");
  }


  /* 从文本中提取投递邮箱（过滤无效地址） */
  function extractEmail(text) {
    const found = String(text || "").match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
    const bad = /(example\.com|noreply|no-reply|support@|service@|privacy@|\.png|\.jpg|\.jpeg|\.gif)/i;
    return found.find((x) => !bad.test(x)) || "";
  }

  /* 判断投递方式：邮件投递 / 官网表单 / 平台内投递 / 需人工确认 */
  function detectApplyMethod(url, text, hasForm) {
    const raw = (url || "").trim();
    const mailto = /^mailto:([^?]+)/i.exec(raw);
    if (mailto) return { method: "邮件投递", email: mailto[1].trim(), hint: "页面提供 mailto 邮箱" };
    const email = extractEmail(text);
    if (email) return { method: "邮件投递", email, hint: "JD 正文中出现投递邮箱" };
    const host = hostOf(raw);
    const platform = ["jobsdb.com", "jijis.org.hk", "linkedin.com", "zhipin.com", "lagou.com", "zhaopin.com", "51job.com", "liepin.com"].some((d) => host.includes(d));
    if (platform) return { method: "平台内投递", email: "", hint: "在招聘平台内完成申请" };
    if (hasForm) return { method: "官网表单", email: "", hint: "页面存在申请表单，可自动填写" };
    return { method: "需人工确认", email: "", hint: "未检测到邮箱或表单" };
  }

  /* 生成投递邮件草稿（主题 + 正文），字段来自扩展里保存的"我的资料" */
  function buildEmailDraft(lead, profile) {
    const p = profile || {};
    const name = p.name || "〔姓名〕";
    const school = p.school || "香港大学";
    const degree = p.degree || "数学与统计双专业";
    const grad = p.gradYear || "2027年7月";
    const company = lead.company || "贵司";
    const position = lead.position || "该岗位";
    const subject = "应聘" + position + "｜" + name + "｜" + school + "｜" + grad + "毕业";
    const bullets = (p.bullets || []).filter(Boolean);
    const bulletBlock = bullets.length
      ? bullets.map((b, i) => (i + 1) + ". " + b).join("\n")
      : "1. 〔请填写与岗位最相关的第1条经历〕\n2. 〔第2条〕\n3. 〔第3条〕";
    const body = [
      "老师您好：",
      "",
      "我是" + name + "，" + school + degree + "学生（" + grad + "毕业），想申请" + company + "的「" + position + "」。",
      "",
      "我具备以下相关经历与能力：",
      "",
      bulletBlock,
      "",
      "我对该岗位有浓厚兴趣，简历见附件，期待有机会进一步沟通。",
      "",
      name,
      p.wechat ? "微信：" + p.wechat : "",
      [p.phoneCN, p.phoneHK].filter(Boolean).join(" / "),
      [p.emailHKU, p.email163].filter(Boolean).join(" | ")
    ].filter((line) => line !== "").join("\n");
    return { subject, body };
  }

  return { CHANNELS, hostOf, detectChannel, guessCompany, guessPosition, buildTaskPack, extractEmail, detectApplyMethod, buildEmailDraft };
});
