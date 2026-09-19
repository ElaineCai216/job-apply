import{dbGet,dbPut}from"./localDb";
import{Capacitor}from"@capacitor/core";
import{SecureStorage}from"@aparajita/capacitor-secure-storage";
const enc=new TextEncoder(),dec=new TextDecoder(),ID="vault-key";
const b64=b=>btoa(String.fromCharCode(...b)),unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const RECOVERY_ITERATIONS=310000;
async function readRaw(){return Capacitor.isNativePlatform()?await SecureStorage.get(ID):((await dbGet("settings",ID))?.rawKey||null)}
async function saveRaw(rawKey){if(Capacitor.isNativePlatform())await SecureStorage.set(ID,rawKey);else await dbPut("settings",{id:ID,rawKey})}
export async function hasVaultKey(){return Boolean(await readRaw())}
export async function createRecoveryKey(){const r=crypto.getRandomValues(new Uint8Array(32));await saveRaw(b64(r));return b64(r).replace(/(.{4})/g,"$1-").replace(/-$/,"")}
// A user may need to move an already-unlocked vault to a second personal device.
// This only reads the key held in that device's protected local storage; it never
// sends the key to Supabase or writes it to a file.
export async function revealRecoveryKey(){const raw=await readRaw();if(!raw)throw new Error("此设备尚未导入恢复密钥");return raw.replace(/(.{4})/g,"$1-").replace(/-$/,"")}
export async function importRecoveryKey(s){let r;try{r=unb64(s.replaceAll("-","").trim())}catch{throw new Error("恢复密钥格式不正确")}if(r.length!==32)throw new Error("恢复密钥格式不正确");await saveRaw(b64(r))}
async function phraseKey(phrase,salt,iterations=RECOVERY_ITERATIONS){if(typeof phrase!=="string"||phrase.length<12)throw new Error("恢复口令至少需要 12 位");const base=await crypto.subtle.importKey("raw",enc.encode(phrase),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
export async function wrapRecoveryKey(phrase){const raw=await readRaw();if(!raw)throw new Error("请先创建恢复密钥");const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),k=await phraseKey(phrase,salt),ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},k,unb64(raw));return{ciphertext:b64(new Uint8Array(ciphertext)),iv:b64(iv),salt:b64(salt),iterations:RECOVERY_ITERATIONS}}
export async function recoverWithPhrase(kit,phrase){try{const k=await phraseKey(phrase,unb64(kit.salt),kit.iterations||RECOVERY_ITERATIONS),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(kit.iv)},k,unb64(kit.ciphertext)),raw=b64(new Uint8Array(plain));if(unb64(raw).length!==32)throw new Error("invalid");await saveRaw(raw)}catch(error){if(error.message?.includes("至少"))throw error;throw new Error("恢复口令不正确或恢复包已损坏")}}
async function key(){const raw=await readRaw();if(!raw)throw new Error("请先创建或导入恢复密钥");return crypto.subtle.importKey("raw",unb64(raw),"AES-GCM",false,["encrypt","decrypt"])}
export async function encryptJson(v){const iv=crypto.getRandomValues(new Uint8Array(12)),c=await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(),enc.encode(JSON.stringify(v)));return{ciphertext:b64(new Uint8Array(c)),iv:b64(iv),algorithm:"AES-256-GCM"}}
export async function decryptJson(v){const p=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(v.iv)},await key(),unb64(v.ciphertext));return JSON.parse(dec.decode(p))}
export async function vaultFingerprint(){const raw=await readRaw();if(!raw)return"";const d=await crypto.subtle.digest("SHA-256",unb64(raw));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,12)}
export async function encryptBytes(bytes){const iv=crypto.getRandomValues(new Uint8Array(12)),c=await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(),bytes);return{bytes:new Uint8Array(c),iv:b64(iv),algorithm:"AES-256-GCM"}}
export async function decryptBytes(bytes,iv){const p=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(iv)},await key(),bytes);return new Uint8Array(p)}
export async function exportEncryptedBackup(data){return JSON.stringify({format:"apply-desk-backup",version:1,createdAt:new Date().toISOString(),payload:await encryptJson(data)})}
