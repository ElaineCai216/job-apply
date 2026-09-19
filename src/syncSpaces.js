import { cloudEnabled, supabase } from "./supabase";
import { dbGet, dbPut } from "./localDb";
import { createRecoveryKey, recoverWithPhrase, wrapRecoveryKey } from "./vault";

const ACTIVE_SPACE_ID = "active-sync-space";

export async function activeSyncSpace(userId) {
  const cached = await dbGet("settings", ACTIVE_SPACE_ID);
  if (!cloudEnabled || !navigator.onLine || !userId) return cached?.spaceId || null;
  const { data, error } = await supabase.from("sync_spaces").select("*").eq("user_id", userId).eq("active", true).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  await dbPut("settings", { id: ACTIVE_SPACE_ID, spaceId: data.id, updatedAt: new Date().toISOString() });
  return data.id;
}

export async function inspectSyncSpaces(userId) {
  if (!cloudEnabled || !userId) return { active: null, legacyCount: 0 };
  const { data, error } = await supabase.from("sync_spaces").select("id,active,recovery_ciphertext,created_at").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  const active = (data || []).find(space => space.active) || null;
  return { active, legacyCount: (data || []).filter(space => !space.active).length };
}

export async function createRecoverableSyncSpace(userId, phrase) {
  if (!cloudEnabled || !userId) throw new Error("需要联网并登录后才能建立同步空间");
  if (phrase.trim().length < 12) throw new Error("恢复口令至少需要 12 位");
  const recoveryKey = await createRecoveryKey();
  const kit = await wrapRecoveryKey(phrase);
  const id = crypto.randomUUID();
  const { error: deactivate } = await supabase.from("sync_spaces").update({ active: false }).eq("user_id", userId).eq("active", true);
  if (deactivate) throw deactivate;
  const { error } = await supabase.from("sync_spaces").insert({
    id, user_id: userId, active: true,
    recovery_ciphertext: kit.ciphertext, recovery_iv: kit.iv,
    recovery_salt: kit.salt, recovery_iterations: kit.iterations
  });
  if (error) throw error;
  await dbPut("settings", { id: ACTIVE_SPACE_ID, spaceId: id, updatedAt: new Date().toISOString() });
  return { id, recoveryKey };
}

export async function unlockActiveSyncSpace(userId, phrase) {
  const { active } = await inspectSyncSpaces(userId);
  if (!active?.recovery_ciphertext) throw new Error("云端没有可恢复的同步空间");
  await recoverWithPhrase({ ciphertext: active.recovery_ciphertext, iv: active.recovery_iv, salt: active.recovery_salt, iterations: active.recovery_iterations }, phrase);
  await dbPut("settings", { id: ACTIVE_SPACE_ID, spaceId: active.id, updatedAt: new Date().toISOString() });
  return active.id;
}
