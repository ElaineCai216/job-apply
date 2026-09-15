import React from "react";
import { cloudEnabled, allowedEmail, supabase } from "./supabase";
import { canMarkReady, emptyApplication, evaluateEligibility, materialGaps, STAGE_LABELS } from "./domain";
import { importLegacy, loadJobs, previewLegacy, receiveExtensionCapture, removeJob, saveJob, subscribeJobs } from "./store";
import { Badge, Drawer, Header, Icons, JobTable, NAV, Shell } from "./components";
import { dbAll } from "./localDb";
import { createRecoveryKey, exportEncryptedBackup, hasVaultKey, importRecoveryKey } from "./vault";
import CareerDocs from "./CareerDocs";

function Login({ onDemo }) {
  const [email,setEmail]=React.useState(allowedEmail); const [sent,setSent]=React.useState(false); const [error,setError]=React.useState("");
  const submit=async(e)=>{e.preventDefault();setError("");if(allowedEmail&&email.toLowerCase()!==allowedEmail){setError("此工作台仅允许已配置的邮箱访问");return;}const {error:err}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});if(err)setError(err.message);else setSent(true)};
  return <div className="login"><div className="login-card"><div className="login-mark">AD</div><p className="eyebrow">PRIVATE CAREER OPERATIONS</p><h1>你的个人求职指挥中心</h1><p>岗位、逐岗材料、投递审核与面试准备，只对你开放。</p>{sent?<div className="success"><strong>登录链接已发送</strong><span>请检查邮箱并在当前设备打开。</span></div>:<form onSubmit={submit}><label><span>登录邮箱</span><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>{error&&<p className="error">{error}</p>}<button className="primary" type="submit">发送魔法链接</button></form>}<button className="demo-link" onClick={onDemo}>先使用本机预览</button></div></div>;
}

export default function App() {
  const [session,setSession]=React.useState(null),[demo,setDemo]=React.useState(!cloudEnabled),[page,setPage]=React.useState("command");
  const [jobs,setJobs]=React.useState([]),[selected,setSelected]=React.useState(null),[loading,setLoading]=React.useState(true),[query,setQuery]=React.useState("");
  const userId=session?.user?.id;
  const refresh=React.useCallback(async()=>{setLoading(true);try{setJobs(await loadJobs(userId));}finally{setLoading(false)}},[userId]);

  React.useEffect(()=>{if(!cloudEnabled)return;supabase.auth.getSession().then(({data})=>setSession(data.session));const {data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>data.subscription.unsubscribe()},[]);
  React.useEffect(()=>{if(!cloudEnabled||session||demo)refresh()},[session,demo,refresh]);
  React.useEffect(()=>subscribeJobs(userId,refresh),[userId,refresh]);
  React.useEffect(()=>receiveExtensionCapture(async job=>{await saveJob(job,userId);refresh()}),[userId,refresh]);
  if(cloudEnabled&&!session&&!demo)return <Login onDemo={()=>setDemo(true)}/>;

  const persist=async(job)=>{const eligibility=evaluateEligibility(job);let next={...job,eligibility:eligibility.value,eligibilityReason:eligibility.reason};if(next.stage==="ready"&&!canMarkReady(next)){next={...next,stage:"review"};}next=await saveJob(next,userId);setSelected(next);await refresh()};
  const erase=async(id)=>{if(!confirm("删除这条岗位记录？"))return;await removeJob(id,userId);setSelected(null);refresh()};
  const add=()=>setSelected(emptyApplication());
  const filtered=jobs.filter(j=>`${j.company} ${j.role} ${j.source}`.toLowerCase().includes(query.toLowerCase()));
  const titles=Object.fromEntries(NAV.map(([id,label])=>[id,label]));

  return <Shell page={page} setPage={setPage} cloud={cloudEnabled&&Boolean(session)} email={session?.user?.email} onLogout={session?()=>supabase.auth.signOut():null}>
    {page==="command"?<Command jobs={jobs} onSelect={setSelected} add={add}/>
      :page==="jobs"?<Jobs jobs={filtered} query={query} setQuery={setQuery} onSelect={setSelected} add={add}/>
      :page==="materials"?<Materials jobs={jobs} onSelect={setSelected}/>
      :page==="interview"?<Interview jobs={jobs} onSelect={setSelected}/>
      :page==="docs"?<><Header title="求职文档" subtitle="原有 Markdown 已恢复到工作台，可阅读与下载。"/><div className="page"><CareerDocs/></div></>
      :<Settings userId={userId} onImported={refresh}/>}
    {loading&&<div className="loading" aria-live="polite">同步中…</div>}
    {selected&&<Drawer job={selected} onClose={()=>setSelected(null)} onSave={persist} onDelete={erase}/>} 
  </Shell>;
}

function Command({jobs,onSelect,add}) {
  const today=jobs.filter(j=>j.stage!=="closed").slice(0,10);const complete=jobs.filter(j=>materialGaps(j).length===0).length;const ready=jobs.filter(j=>j.stage==="ready").length;const submitted=jobs.filter(j=>["submitted","followup","interview"].includes(j.stage)).length;const replies=jobs.filter(j=>j.outcome||j.stage==="interview").length;const rate=submitted?Math.round(replies/submitted*100):0;
  const radar=jobs.filter(j=>j.stage==="discovered").slice(0,5);const alerts=jobs.filter(j=>materialGaps(j).length||j.stage==="interview"||j.followupAt).slice(0,6);
  return <><Header title="求职指挥中心" subtitle="今天只处理高匹配岗位；材料批量审核，最终投递逐份确认。" action={<button className="primary" onClick={add}>＋ 添加岗位</button>}/><div className="page"><div className="metrics">{[["今日队列",`${today.length}/10`],["材料完成率",jobs.length?`${Math.round(complete/jobs.length*100)}%`:"0%"],["待最终确认",ready],["已投递",submitted],["回复率",`${rate}%`],["面试",jobs.filter(j=>j.stage==="interview").length]].map(([l,v])=><div className="metric" key={l}><span>{l}</span><strong>{v}</strong></div>)}</div><section className="panel primary-panel"><div className="panel-head"><div><p className="eyebrow">DAILY QUEUE</p><h2>今日十份投递队列</h2></div><Badge tone="blue">批量审核材料</Badge></div><JobTable jobs={today} onSelect={onSelect} empty="今天还没有合格岗位"/></section><div className="dashboard-grid"><section className="panel"><div className="panel-head"><h2>新岗位雷达</h2><Badge>{radar.length} 个待筛选</Badge></div><div className="compact-list">{radar.length?radar.map(j=><button key={j.id} onClick={()=>onSelect(j)}><div><strong>{j.company||"待补公司"}</strong><span>{j.role||"待补岗位"} · {j.source}</span></div><span className="score">{j.matchScore||0}</span></button>):<Empty text="扩展抓取或新增岗位后会出现在这里"/>}</div></section><section className="panel"><div className="panel-head"><h2>投递漏斗</h2><Badge>全周期</Badge></div><div className="funnel">{["discovered","materials","review","ready","submitted","interview"].map(s=><div key={s}><span>{STAGE_LABELS[s]}</span><i style={{width:`${Math.max(8,jobs.filter(j=>j.stage===s).length/(jobs.length||1)*100)}%`}}/><strong>{jobs.filter(j=>j.stage===s).length}</strong></div>)}</div></section><section className="panel"><div className="panel-head"><h2>待办预警</h2><Icons.AlertTriangle/></div><div className="alerts">{alerts.length?alerts.map(j=><button key={j.id} onClick={()=>onSelect(j)}><span className={`alert-dot ${j.stage==="interview"?"green":"amber"}`}/><div><strong>{j.company} · {j.role}</strong><small>{j.stage==="interview"?"准备面试":materialGaps(j).join("、")||"需要跟进"}</small></div></button>):<Empty text="当前没有阻塞项"/>}</div></section></div></div></>;
}

function Jobs({jobs,query,setQuery,onSelect,add}){return <><Header title="全部岗位" subtitle="一个记录贯穿发现、材料、投递、跟进和面试。" action={<button className="primary" onClick={add}>＋ 添加岗位</button>}/><div className="page"><div className="toolbar"><div className="search"><Icons.Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索公司、岗位或来源"/></div><Badge>{jobs.length} 条记录</Badge></div><JobTable jobs={jobs} onSelect={onSelect}/></div></>}
function Materials({jobs,onSelect}){const list=jobs.filter(j=>!["discovered","closed"].includes(j.stage));return <><Header title="材料库" subtitle="先批量审阅内容，再逐份进入最终投递确认。"/><div className="page"><div className="review-strip"><strong>{list.filter(j=>materialGaps(j).length===0).length}</strong><span>份材料齐备</span><i/><strong>{list.filter(j=>materialGaps(j).length>0).length}</strong><span>份仍有缺口</span></div><JobTable jobs={list} onSelect={onSelect} empty="筛选岗位后，在这里生成和审核材料"/></div></>}
function Interview({jobs,onSelect}){const list=jobs.filter(j=>j.stage==="interview"||j.outcome==="面试");return <><Header title="面试准备" subtitle="公开面经与 JD 推断题分开记录，所有答案只使用真实经历。"/><div className="page"><JobTable jobs={list} onSelect={onSelect} empty="收到面试后，定制面经和深挖题会集中在这里"/></div></>}

function Settings({userId,onImported}){const legacy=previewLegacy();const[message,setMessage]=React.useState(""),[keyInput,setKeyInput]=React.useState(""),[keyReady,setKeyReady]=React.useState(false);React.useEffect(()=>{hasVaultKey().then(setKeyReady)},[]);const migrate=async()=>{const n=await importLegacy(userId);setMessage(`已导入 ${n} 条，旧数据仍保留在本机`);onImported()};const createKey=async()=>{const k=await createRecoveryKey();setKeyReady(true);setMessage(`恢复密钥（仅显示一次，请立即保存）：${k}`)};const importKey=async()=>{try{await importRecoveryKey(keyInput);setKeyReady(true);setMessage("恢复密钥已导入此设备")}catch(e){setMessage(e.message)}};const backup=async()=>{try{const content=await exportEncryptedBackup({jobs:await dbAll("jobs"),materials:await dbAll("materials"),answers:await dbAll("answers"),interviewPrep:await dbAll("interviewPrep"),sourceInbox:await dbAll("sourceInbox")}),url=URL.createObjectURL(new Blob([content],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download=`apply-desk-${new Date().toISOString().slice(0,10)}.encrypted.json`;a.click();URL.revokeObjectURL(url)}catch(e){setMessage(e.message)}};return <><Header title="设置" subtitle="私有云、加密备份、旧版迁移和扩展连接。"/><div className="page settings-grid"><section className="panel"><p className="eyebrow">VAULT</p><h2>端到端加密</h2><p>当前：{keyReady?"此设备已解锁":"尚未创建恢复密钥"}。密钥不会上传服务器。</p>{!keyReady&&<button className="secondary" onClick={createKey}>创建恢复密钥</button>}<input className="settings-input" value={keyInput} onChange={e=>setKeyInput(e.target.value)} placeholder="在新设备粘贴恢复密钥"/><button className="secondary" onClick={importKey}>导入密钥</button><button className="secondary" disabled={!keyReady} onClick={backup}>导出加密备份</button>{message&&<p className="success-text break-word">{message}</p>}</section><section className="panel"><p className="eyebrow">CLOUD</p><h2>Supabase 私有同步</h2><p>当前：{cloudEnabled?"环境已配置":"本机预览模式"}。离线数据先存 IndexedDB，联网后上传密文。</p></section><section className="panel"><p className="eyebrow">MIGRATION</p><h2>旧版数据迁移</h2><p>检测到 {legacy.length} 条可迁移记录。导入成功前不会删除旧数据。</p><button className="secondary" disabled={!legacy.length} onClick={migrate}><Icons.UploadCloud/>预览并导入</button></section><section className="panel"><p className="eyebrow">EXTENSION</p><h2>浏览器网页伴侣</h2><p>负责抓取 JD、同步岗位和辅助填表；没有最终提交接口。</p></section></div></>}
function Empty({text}){return <div className="inline-empty"><Icons.Inbox/><span>{text}</span></div>}
