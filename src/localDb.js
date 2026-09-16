const DB_NAME = "apply-desk";
const STORES = ["jobs", "materials", "answers", "interviewPrep", "interviewSources", "interviewQuestions", "practiceSessions", "sourceInbox", "syncQueue", "settings", "conflicts"];
let opening;
export function openDb(){if(!opening)opening=new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{for(const n of STORES)if(!r.result.objectStoreNames.contains(n))r.result.createObjectStore(n,{keyPath:"id"})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return opening}
export async function dbAll(s){const d=await openDb();return new Promise((a,b)=>{const r=d.transaction(s).objectStore(s).getAll();r.onsuccess=()=>a(r.result||[]);r.onerror=()=>b(r.error)})}
export async function dbGet(s,id){const d=await openDb();return new Promise((a,b)=>{const r=d.transaction(s).objectStore(s).get(id);r.onsuccess=()=>a(r.result);r.onerror=()=>b(r.error)})}
export async function dbPut(s,v){const d=await openDb();return new Promise((a,b)=>{const r=d.transaction(s,"readwrite").objectStore(s).put(v);r.onsuccess=()=>a(v);r.onerror=()=>b(r.error)})}
export async function dbDelete(s,id){const d=await openDb();return new Promise((a,b)=>{const r=d.transaction(s,"readwrite").objectStore(s).delete(id);r.onsuccess=()=>a();r.onerror=()=>b(r.error)})}
