import { cloudEnabled, supabase } from "./supabase";
import { dbAll, dbDelete, dbGet, dbPut } from "./localDb";
import { decryptJson, encryptJson } from "./vault";

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

export async function syncRecords(userId) {
  if (!cloudEnabled || !userId || !navigator.onLine) return;
  for (const queued of await dbAll("syncQueue")) {
    const store = queued.store || "jobs"; // legacy job queue entries
    if (!SYNC_STORES.includes(store)) continue;
    const local = await dbGet(store, queued.recordId);
    if (!local) { await dbDelete("syncQueue", queued.id); continue; }
    try {
      const encrypted = await encryptJson(local);
      const { error } = await supabase.from("encrypted_records").upsert({
        id: local.id, user_id: userId, record_type: typeFor(store), record_version: local.recordVersion,
        ciphertext: encrypted.ciphertext, iv: encrypted.iv, updated_at: local.updatedAt, deleted_at: local.deletedAt
      });
      if (!error) await dbDelete("syncQueue", queued.id);
    } catch { /* no recovery key or temporary network failure: leave queued */ }
  }
  const { data, error } = await supabase.from("encrypted_records").select("*");
  if (error) return;
  for (const row of data || []) {
    const store = storeFor(row.record_type);
    if (!store) continue;
    const local = await dbGet(store, row.id);
    if (local && local.recordVersion === row.record_version && local.updatedAt !== row.updated_at) {
      await dbPut("conflicts", { id: `${store}:${row.id}:${Date.now()}`, recordId: row.id, store, local, remote: row, createdAt: new Date().toISOString() });
      continue;
    }
    if (!local || row.record_version > (local.recordVersion || 0)) {
      try { await dbPut(store, await decryptJson(row)); } catch { /* other device still needs the recovery key */ }
    }
  }
}

export function subscribeRecords(userId, onChange) {
  const update = () => syncRecords(userId).then(onChange).catch(() => {});
  window.addEventListener("online", update);
  if (!cloudEnabled || !userId) return () => window.removeEventListener("online", update);
  const channel = supabase.channel(`apply-desk:${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "encrypted_records", filter: `user_id=eq.${userId}` }, update).subscribe();
  return () => { window.removeEventListener("online", update); supabase.removeChannel(channel); };
}
