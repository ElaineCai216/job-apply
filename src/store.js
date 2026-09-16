import{cloudEnabled}from"./supabase";import{dbAll,dbGet}from"./localDb";import{emptyApplication,normalizeLegacy}from"./domain";import{saveRecord,syncRecords,subscribeRecords}from"./records";
const LEGACY="jobApplyData.v1",CACHE="applyDesk.v2.jobs";
export async function loadJobs(userId){if(cloudEnabled&&userId&&navigator.onLine)syncRecords(userId).catch(()=>{});return(await dbAll("jobs")).filter(x=>!x.deletedAt).sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||""))}
export async function saveJob(job,userId){return saveRecord("jobs",job,userId)}
export async function removeJob(id,userId){const old=await dbGet("jobs",id)||{id};return saveRecord("jobs",{...old,deletedAt:new Date().toISOString()},userId)}
export function previewLegacy(){const all=[];for(const k of[LEGACY,CACHE])try{all.push(...normalizeLegacy(JSON.parse(localStorage.getItem(k)||"{}")))}catch{/* legacy preview */}return[...new Map(all.map(x=>[x.url||x.id,x])).values()]}
export async function importLegacy(userId){const have=new Set((await dbAll("jobs")).map(x=>x.url?.replace(/[?#].*$/,"")).filter(Boolean)),add=previewLegacy().filter(x=>!x.url||!have.has(x.url.replace(/[?#].*$/,"")));for(const j of add)await saveJob(j,userId);return add.length}
export const syncJobs=syncRecords;
export const subscribeJobs=subscribeRecords;
export function receiveExtensionCapture(onCapture){const h=e=>{if(e.source===window&&e.origin===location.origin&&e.data?.type==="APPLYDESK_CAPTURE_JOB"){const l=e.data.payload||{};onCapture(emptyApplication({company:l.company||"",role:l.position||"",url:l.url||"",jd:l.jd||"",source:l.channel||"浏览器扩展",emailTo:l.applyEmail||"",applyMethod:l.applyMethod==="邮件投递"?"email":"form"}))}};window.addEventListener("message",h);return()=>window.removeEventListener("message",h)}
