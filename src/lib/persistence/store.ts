// Versioned localStorage wrapper. Migrates v1 keys on first run.

export const SCHEMA_VERSION = 2;
const NS = "genia:v2";

const V1_HISTORY = "genia.history.v1";
const V1_ANALYSIS_PREFIX = "genia.analysis.";

export const KEYS = {
  history: `${NS}:history`,
  analysis: (id: string) => `${NS}:analysis:${id}`,
  providers: `${NS}:providers`,
  activeProvider: `${NS}:providers:active`,
  githubToken: `${NS}:github:token`,
  prefs: `${NS}:prefs`,
  version: `${NS}:version`,
} as const;

function isBrowser() {
  return typeof window !== "undefined";
}

export function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail - localStorage might be full or unavailable
  }
}

export function remove(key: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}

let migrated = false;
export function ensureMigrated() {
  if (migrated || !isBrowser()) return;
  migrated = true;
  const current = window.localStorage.getItem(KEYS.version);
  if (current === String(SCHEMA_VERSION)) return;
  // Migrate v1 → v2
  try {
    const legacy = window.localStorage.getItem(V1_HISTORY);
    if (legacy) {
      const list = JSON.parse(legacy);
      window.localStorage.setItem(KEYS.history, JSON.stringify(list));
      for (const entry of list) {
        const a = window.localStorage.getItem(V1_ANALYSIS_PREFIX + entry.id);
        if (a) window.localStorage.setItem(KEYS.analysis(entry.id), a);
      }
    }
  } catch {
    // Silently fail migration
  }
  window.localStorage.setItem(KEYS.version, String(SCHEMA_VERSION));
}
