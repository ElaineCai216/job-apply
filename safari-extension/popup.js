const status = document.querySelector("#status");
const pairing = document.querySelector("#pairing");
async function activeTab(){const[t]=await browser.tabs.query({active:true,currentWindow:true});return t}
async function scan(){const tab=await activeTab();if(!tab?.id||!tab.url?.includes("jobsdb.com")){status.textContent="请先在 Safari 打开一个 JobsDB 岗位页";return}const result=await browser.tabs.sendMessage(tab.id,{type:"APPLY_DESK_SCAN_CURRENT"});status.textContent=result?.ok?`已收集 ${result.count||0} 个岗位`:(result?.message||"未找到可收集岗位")}
document.querySelector("#connect").addEventListener("click",async()=>{try{const data=JSON.parse(pairing.value.trim());if(!/^https:\/\/.*\.supabase\.co\/functions\/v1\/job-source-ingest$/.test(data.endpoint)||!data.token)throw new Error();await browser.storage.local.set({applyDeskPairing:data});status.textContent="已连接；正在扫描当前页";await scan()}catch{status.textContent="配对码格式不正确，请从 Apply Desk 设置重新生成"}});
document.querySelector("#scan").addEventListener("click",scan);browser.storage.local.get("applyDeskPairing").then(({applyDeskPairing})=>{if(applyDeskPairing)status.textContent="已连接 Safari JobsDB"});
