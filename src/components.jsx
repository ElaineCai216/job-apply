import React from "react";
import { AlertTriangle, ArrowRight, BookOpenText, BriefcaseBusiness, Check, Clock3, ExternalLink, FileText, Inbox, LayoutDashboard, LogOut, Search, Settings, Sparkles, UploadCloud, X } from "lucide-react";
import { materialGaps, STAGE_LABELS } from "./domain";

export const NAV = [
  ["command", "指挥中心", LayoutDashboard], ["jobs", "全部岗位", BriefcaseBusiness],
  ["materials", "材料库", FileText], ["interview", "面试", Sparkles], ["docs", "求职文档", BookOpenText], ["settings", "设置", Settings]
];

export function Shell({ page, setPage, children, cloud, email, onLogout }) {
  return <div className="shell"><aside className="rail"><div className="brand"><span>AD</span><div><strong>Apply Desk</strong><small>PERSONAL OPS</small></div></div><nav>{NAV.map(([id,label,Icon]) => <button key={id} className={page===id?"active":""} onClick={()=>setPage(id)}><Icon aria-hidden="true"/><span>{label}</span></button>)}</nav><div className="rail-foot"><span className={`sync-dot ${cloud?"online":"local"}`}/><div><strong>{cloud?"私有云已连接":"本机预览"}</strong><small>{email || "配置 Supabase 后跨设备同步"}</small></div>{onLogout&&<button className="icon" aria-label="退出登录" onClick={onLogout}><LogOut/></button>}</div></aside><main>{children}</main></div>;
}

export function Header({ title, subtitle, action }) { return <header className="header"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</header>; }

export function Badge({ tone="neutral", children }) { return <span className={`badge ${tone}`}>{children}</span>; }

export function JobTable({ jobs, onSelect, empty="暂无岗位" }) {
  const rows=jobs.map(job=>({job,gaps:materialGaps(job)}));
  return <div className="table-card"><table><thead><tr><th>公司 / 岗位</th><th>匹配</th><th>材料</th><th>内推</th><th>状态</th><th>下一步</th></tr></thead><tbody>{rows.length?rows.map(({job,gaps})=><tr key={job.id} onClick={()=>onSelect(job)} tabIndex="0" onKeyDown={e=>e.key==="Enter"&&onSelect(job)}><td><strong>{job.company||"待补公司"}</strong><small>{job.role||"待补岗位"} · {job.location||"地点待确认"}</small></td><td><span className="score">{job.matchScore||0}</span></td><td>{gaps.length?<Badge tone="warn">缺 {gaps.length} 项</Badge>:<Badge tone="good"><Check/>齐备</Badge>}</td><td>{job.referralCode?<Badge tone="violet">已记录</Badge>:job.referralSource?<Badge tone="danger">缺码</Badge>:<span className="muted">无</span>}</td><td><Badge tone="blue">{STAGE_LABELS[job.stage]||job.stage}</Badge></td><td><button className="text-action">查看 <ArrowRight/></button></td></tr>):<tr><td colSpan="6" className="empty">{empty}</td></tr>}</tbody></table><div className="mobile-jobs">{rows.length?rows.map(({job,gaps})=><button key={job.id} onClick={()=>onSelect(job)}><div><strong>{job.company||"待补公司"}</strong><small>{job.role||"待补岗位"} · {job.location||"地点待确认"}</small></div><span className="score">{job.matchScore||0}</span>{gaps.length?<Badge tone="warn">缺 {gaps.length} 项</Badge>:<Badge tone="good">齐备</Badge>}<Badge tone="blue">{STAGE_LABELS[job.stage]}</Badge></button>):<div className="inline-empty">{empty}</div>}</div></div>;
}

export function Drawer({ job, onClose, onSave, onDelete }) {
  const [draft,setDraft]=React.useState(job); React.useEffect(()=>setDraft(job),[job]); if(!job)return null;
  const activeDraft=draft||job; const set=(key,value)=>setDraft(x=>({...x||job,[key]:value})); const gaps=materialGaps(activeDraft);
  const exportDoc=async(type)=>{const docs=await import("./documents");if(type==="docx")await docs.downloadDocx(activeDraft);else docs.downloadPdf(activeDraft)};
  return <div className="drawer-scrim" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><aside className="drawer" role="dialog" aria-modal="true" aria-label="岗位详情"><div className="drawer-head"><div><Badge tone={gaps.length?"warn":"good"}>{gaps.length?`缺 ${gaps.length} 项材料`:"材料齐备"}</Badge><h2>{draft.company||"新岗位"}</h2><p>{draft.role||"补充岗位名称"}</p></div><button className="icon" aria-label="关闭" onClick={onClose}><X/></button></div><div className="drawer-body"><section><h3>岗位与筛选</h3><div className="form-grid"><Field label="公司" value={draft.company} onChange={v=>set("company",v)}/><Field label="岗位" value={draft.role} onChange={v=>set("role",v)}/><Field label="链接" value={draft.url} onChange={v=>set("url",v)}/><Field label="匹配分" type="number" value={draft.matchScore} onChange={v=>set("matchScore",Number(v))}/><Field label="地点" value={draft.location} onChange={v=>set("location",v)}/><Select label="阶段" value={draft.stage} onChange={v=>set("stage",v)} options={Object.entries(STAGE_LABELS)}/></div><Area label="原始 JD" value={draft.jd} onChange={v=>set("jd",v)}/></section><section><h3>逐岗材料</h3><Field label="定制简历文件名" value={draft.resumeFile} onChange={v=>set("resumeFile",v)}/><Area label="简历微调说明" value={draft.resumeTailoring} onChange={v=>set("resumeTailoring",v)}/><Area label="Personal Statement" value={draft.personalStatement} onChange={v=>set("personalStatement",v)}/><Area label="待核实证据（每行一项）" value={(draft.evidenceGaps||[]).join("\n")} onChange={v=>set("evidenceGaps",v.split("\n").filter(Boolean))}/><div className="doc-actions"><button onClick={()=>exportDoc("docx")}><FileText/>DOCX</button><button onClick={()=>exportDoc("pdf")}><FileText/>PDF</button></div></section><section><h3>内推与投递</h3><div className="form-grid"><Field label="内推码" value={draft.referralCode} onChange={v=>set("referralCode",v)}/><Field label="内推来源" value={draft.referralSource} onChange={v=>set("referralSource",v)}/><Field label="收件邮箱" value={draft.emailTo} onChange={v=>set("emailTo",v)}/><Field label="邮件主题" value={draft.emailSubject} onChange={v=>set("emailSubject",v)}/></div><Area label="定制邮件正文" value={draft.emailBody} onChange={v=>set("emailBody",v)}/><Area label="投递注意点" value={draft.applicationNotes} onChange={v=>set("applicationNotes",v)}/>{gaps.length>0&&<div className="gate"><AlertTriangle/>提交门禁：{gaps.join("、")}</div>}</section></div><footer><button className="danger-link" onClick={()=>onDelete(job.id)}>删除</button><div><button className="secondary" onClick={onClose}>取消</button><button className="primary" onClick={()=>onSave(draft)}>保存更改</button></div></footer></aside></div>;
}

function Field({label,value="",onChange,type="text"}){return <label><span>{label}</span><input type={type} value={value??""} onChange={e=>onChange(e.target.value)}/></label>}
function Area({label,value="",onChange}){return <label className="wide"><span>{label}</span><textarea value={value??""} onChange={e=>onChange(e.target.value)}/></label>}
function Select({label,value,onChange,options}){return <label><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}

export const Icons={AlertTriangle,Clock3,ExternalLink,Inbox,Search,UploadCloud};
