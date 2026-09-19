import { cloudEnabled, supabase } from "./supabase";
import { dbAll, dbDelete, dbGet, dbPut } from "./localDb";
import { decryptJson, encryptJson, hasVaultKey, vaultFingerprint } from "./vault";
import { activeSyncSpace } from "./syncSpaces";
import { withTimeout } from "./async";

export const SYNC_STORES = ["jobs", "materials", "answers", "interviewPrep", "interviewSources", "interviewQuestions", "practiceSessions", "interviewNotes", "sourceInbox"];
const typeFor = store => store.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
const storeFor = type => SYNC_STORES.find(store => typeFor(store) === type);

export async function saveRecord(store, value, userId) {
  const previous = await dbGet(store, value.id);
  const next = { ...value, recordVersion: (previous?.recordVersion || 0) + 1, updatedAt: new Date().toISOString(), deletedAt: value.deletedAt || null };
  await dbPut(store, next);
  await dbPut("syncQueue", { id: crypto.randomUUID(), store, recordId: next.id, recordVersion: next.recordVersion, operation: "upsert", createdAt: next.updatedAt });
  if (cloudEnabled && userId && navigator.onLine) syncRecords(userId).catch(() => {});
  return next;
}

const HEALTH_ID="sync-health";
async function health(patch={}){const old=await dbGet("settings",HEALTH_ID)||{id:HEALTH_ID};const next={...old,...patch,updatedAt:new Date().toISOString()};await dbPut("settings",next);return next}
export async function getSyncHealth(){const h=await dbGet("settings",HEALTH_ID)||{id:HEALTH_ID},all=await dbAll("conflicts"),unique=new Set(all.map(x=>`${x.store}:${x.recordId}:${x.remote?.record_version||""}:${x.remote?.updated_at||""}`));return{...h,keyReady:await hasVaultKey(),keyFingerprint:await vaultFingerprint(),queued:(await dbAll("syncQueue")).length,conflicts:unique.size,online:navigator.onLine}}
async function pullRemote(userId,spaceId){const {data,error}=await supabase.from("encrypted_records").select("*").eq("user_id",userId).eq("sync_space_id",spaceId);if(error)throw error;let pulled=0;for(const row of data||[]){const store=storeFor(row.record_type);if(!store)continue;const local=await dbGet(store,row.id);if(local&&local.recordVersion===row.record_version&&local.updatedAt!==row.updated_at){const conflictId=`${store}:${row.id}:${row.record_version}:${row.updated_at}`;if(!await dbGet("conflicts",conflictId))await dbPut("conflicts",{id:conflictId,recordId:row.id,store,local,remote:row,createdAt:new Date().toISOString()});continue}if(!local||row.record_version>(local.recordVersion||0)){try{await dbPut(store,await decryptJson(row));pulled++}catch{await health({lastError:"此设备无法解锁当前同步空间",lastPullAt:new Date().toISOString()})}}}await health({lastPullAt:new Date().toISOString()});return pulled}
export async function syncRecords(userId) {
  if (!cloudEnabled || !userId || !navigator.onLine) return getSyncHealth();
  if(!await hasVaultKey()){await health({lastError:"同步暂停：请导入已有恢复密钥。系统不会创建或覆盖同步空间。"});return getSyncHealth()}
  let spaceId;try{spaceId=await withTimeout(activeSyncSpace(userId),"同步空间校验");if(!spaceId){await health({lastError:"尚未建立可用的同步空间"});return getSyncHealth()}await withTimeout(pullRemote(userId,spaceId),"下载同步") }catch(e){await health({lastError:`下载同步失败：${e.message||"请稍后重试"}`});return getSyncHealth()}
  for (const queued of await dbAll("syncQueue")) {
    const store = queued.store || "jobs"; // legacy job queue entries
    if (!SYNC_STORES.includes(store)) continue;
    const local = await dbGet(store, queued.recordId);
    if (!local) { await dbDelete("syncQueue", queued.id); continue; }
    try {
      const encrypted = await encryptJson(local);
      const { error } = await supabase.from("encrypted_records").upsert({
        id: local.id, user_id: userId, sync_space_id:spaceId, record_type: typeFor(store), record_version: local.recordVersion,
        ciphertext: encrypted.ciphertext, iv: encrypted.iv, updated_at: local.updatedAt, deleted_at: local.deletedAt
      });
      if (!error) await dbDelete("syncQueue", queued.id);
    } catch (e) { await health({lastError:`上传同步失败：${e.message||"请稍后重试"}`}); }
  }
  await health({lastUploadAt:new Date().toISOString(),lastError:""});return getSyncHealth();
}

export function subscribeRecords(userId, onChange) {
  const update = () => syncRecords(userId).then(onChange).catch(() => {});
  window.addEventListener("online", update);
  if (!cloudEnabled || !userId) return () => window.removeEventListener("online", update);
  const channel = supabase.channel(`apply-desk:${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "encrypted_records", filter: `user_id=eq.${userId}` }, update).subscribe();
  return () => { window.removeEventListener("online", update); supabase.removeChannel(channel); };
}
