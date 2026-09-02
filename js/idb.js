/* ============ idb.js — IndexedDB 简历文件存储 ============ */
(function () {
  "use strict";
  const DB_NAME = "applydesk";
  const STORE = "resumes";

  function openDB() {
    return new Promise((resolve, reject) => {
      const rq = indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      };
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    });
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function all() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const rq = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      rq.onsuccess = () => resolve(rq.result || []);
      rq.onerror = () => reject(rq.error);
    });
  }

  async function get(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const rq = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    });
  }

  async function put(record) {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    await txDone(tx);
    return record;
  }

  async function remove(id) {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
  }

  async function clear() {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    await txDone(tx);
  }

  window.ResumeDB = { all, get, put, remove, clear };
})();
