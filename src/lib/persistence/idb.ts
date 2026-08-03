// IndexedDB wrapper for storing large analyses efficiently
// localStorage has ~5MB limit; IndexedDB handles GB-scale data

const DB_NAME = "genia:v1";
const DB_VERSION = 1;
const STORE_ANALYSES = "analyses";
const STORE_BLOBS = "blobs";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ANALYSES)) {
        const store = db.createObjectStore(STORE_ANALYSES, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("repo", ["owner", "repo"], { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

export async function idbPut<T extends object>(
  store: string,
  value: T,
): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGet<T>(store: string, key: string): Promise<T | null> {
  if (!isBrowser()) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDel(store: string, key: string): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
  if (!isBrowser()) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function idbClear(store: string): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Estimate size of an object in bytes (rough approximation)
export function estimateSize(obj: unknown): number {
  return new Blob([JSON.stringify(obj)]).size;
}

// Store analysis in IndexedDB (automatic for large analyses, optional for small ones)
export async function saveAnalysisToIdb(analysis: {
  id: string;
  owner: string;
  repo: string;
  branch: string;
  createdAt: number;
  nodes: unknown[];
  edges: unknown[];
  [key: string]: unknown;
}): Promise<void> {
  return idbPut(STORE_ANALYSES, analysis);
}

export async function loadAnalysisFromIdb(id: string) {
  return idbGet(STORE_ANALYSES, id);
}

export async function deleteAnalysisFromIdb(id: string): Promise<void> {
  return idbDel(STORE_ANALYSES, id);
}

export async function clearAllAnalysesFromIdb(): Promise<void> {
  return idbClear(STORE_ANALYSES);
}

// Check if an analysis is stored in IndexedDB
export async function hasAnalysisInIdb(id: string): Promise<boolean> {
  const result = await idbGet(STORE_ANALYSES, id);
  return result !== null;
}

// Get total size of all analyses in IndexedDB
export async function getIdbStorageStats(): Promise<{
  count: number;
  totalBytes: number;
}> {
  const analyses = await idbGetAll<{ id: string; createdAt: number }>(
    STORE_ANALYSES,
  );
  let totalBytes = 0;
  for (const a of analyses) {
    const full = await idbGet(STORE_ANALYSES, a.id);
    if (full) totalBytes += estimateSize(full);
  }
  return { count: analyses.length, totalBytes };
}

// Migrate a localStorage analysis to IndexedDB
export async function migrateAnalysisToIdb(id: string): Promise<boolean> {
  // This is called by history.ts when localStorage write fails due to quota
  const lsKey = `genia:v2:analysis:${id}`;
  if (!isBrowser()) return false;

  try {
    const raw = localStorage.getItem(lsKey);
    if (!raw) return false;
    const analysis = JSON.parse(raw);
    await saveAnalysisToIdb(analysis);
    return true;
  } catch {
    return false;
  }
}
