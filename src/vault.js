import{dbGet,dbPut}from"./localDb";
import{Capacitor}from"@capacitor/core";
import{SecureStorage}from"@aparajita/capacitor-secure-storage";
const enc=new TextEncoder(),dec=new TextDecoder(),ID="vault-key";
const b64=b=>btoa(String.fromCharCode(...b)),unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function readRaw(){return Capacitor.isNativePlatform()?await SecureStorage.get(ID):((await dbGet("settings",ID))?.rawKey||null)}
async function saveRaw(rawKey){if(Capacitor.isNativePlatform())await SecureStorage.set(ID,rawKey);else await dbPut("settings",{id:ID,rawKey})}
export async function hasVaultKey(){return Boolean(await readRaw())}
export async function createRecoveryKey(){const r=crypto.getRandomValues(new Uint8Array(32));await saveRaw(b64(r));return b64(r).replace(/(.{4})/g,"$1-").replace(/-$/,"")}
export async function importRecoveryKey(s){let r;try{r=unb64(s.replaceAll("-","").trim())}catch{throw new Error("恢复密钥格式不正确")}if(r.length!==32)throw new Error("恢复密钥格式不正确");await saveRaw(b64(r))}
async function key(){const raw=await readRaw();if(!raw)throw new Error("请先创建或导入恢复密钥");return crypto.subtle.importKey("raw",unb64(raw),"AES-GCM",false,["encrypt","decrypt"])}
export async function encryptJson(v){const iv=crypto.getRandomValues(new Uint8Array(12)),c=await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(),enc.encode(JSON.stringify(v)));return{ciphertext:b64(new Uint8Array(c)),iv:b64(iv),algorithm:"AES-256-GCM"}}
export async function decryptJson(v){const p=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(v.iv)},await key(),unb64(v.ciphertext));return JSON.parse(dec.decode(p))}
export async function vaultFingerprint(){const raw=await readRaw();if(!raw)return"";const d=await crypto.subtle.digest("SHA-256",unb64(raw));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,12)}
export async function encryptBytes(bytes){const iv=crypto.getRandomValues(new Uint8Array(12)),c=await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(),bytes);return{bytes:new Uint8Array(c),iv:b64(iv),algorithm:"AES-256-GCM"}}
export async function decryptBytes(bytes,iv){const p=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(iv)},await key(),bytes);return new Uint8Array(p)}
export async function exportEncryptedBackup(data){return JSON.stringify({format:"apply-desk-backup",version:1,createdAt:new Date().toISOString(),payload:await encryptJson(data)})}
