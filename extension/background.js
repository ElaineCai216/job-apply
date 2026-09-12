/* 投递助手 · 后台：右键菜单抓取 + 图标角标 */
const MENU_ID = "applydesk-capture";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_ID, title: "用投递助手抓取本页岗位", contexts: ["page"] });
  refreshBadge();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab || !tab.id) return;
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "APPLYDESK_EXTRACT" });
    if (res && res.ok && res.lead) await saveLead(res.lead);
  } catch (e) {}
});

async function getLeads() {
  const { leads = [] } = await chrome.storage.local.get("leads");
  return leads;
}
async function saveLead(lead) {
  const leads = await getLeads();
  leads.unshift(lead);
  await chrome.storage.local.set({ leads: leads.slice(0, 300) });
  refreshBadge(leads.length);
}
async function refreshBadge(count) {
  const n = typeof count === "number" ? count : (await getLeads()).length;
  try {
    await chrome.action.setBadgeText({ text: n ? String(n) : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#b3382c" });
  } catch (e) {}
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.leads) refreshBadge((changes.leads.newValue || []).length);
});
