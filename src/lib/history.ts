import type { Analysis, AnalysisQuality } from "./graph-types";
import {
  KEYS,
  readJSON,
  writeJSON,
  remove,
  ensureMigrated,
} from "./persistence/store";
import {
  saveAnalysisToIdb,
  loadAnalysisFromIdb,
  deleteAnalysisFromIdb,
  migrateAnalysisToIdb,
  estimateSize,
} from "./persistence/idb";

const MAX = 25;
const LS_QUOTA_RE = /QuotaExceededError|NS_ERROR_DOM_QUOTA_REACHED/;

export interface HistoryEntry {
  id: string;
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  createdAt: number;
  status: Analysis["status"];
  quality?: AnalysisQuality;
  sourceUsed?: Analysis["sourceUsed"];
  nodeCount: number;
  edgeCount: number;
  storedInIdb?: boolean;
}

export function loadHistory(): HistoryEntry[] {
  ensureMigrated();
  return readJSON<HistoryEntry[]>(KEYS.history, []);
}

export function saveAnalysis(a: Analysis) {
  ensureMigrated();
  const entry: HistoryEntry = {
    id: a.id,
    repoUrl: a.repoUrl,
    owner: a.owner,
    repo: a.repo,
    branch: a.branch,
    createdAt: a.createdAt,
    status: a.status,
    quality: a.quality,
    sourceUsed: a.sourceUsed,
    nodeCount: a.nodes.length,
    edgeCount: a.edges.length,
  };
  const list = loadHistory().filter((e) => e.id !== a.id);
  list.unshift(entry);

  // Estimate size — use IndexedDB for large analyses (>500KB)
  const estimatedSize = estimateSize(a);
  const useIdb = estimatedSize > 512 * 1024 || a.nodes.length > 500;

  try {
    writeJSON(KEYS.history, list.slice(0, MAX));
  } catch (e) {
    if (LS_QUOTA_RE.test(String(e))) {
      // Trim history and retry
      writeJSON(KEYS.history, list.slice(0, 10));
    }
  }

  if (useIdb) {
    saveAnalysisToIdb({ ...a, _storedInIdb: true } as Parameters<
      typeof saveAnalysisToIdb
    >[0]).then(() => {
      entry.storedInIdb = true;
      // Update history with the idb flag
      const updated = loadHistory().map((e) => (e.id === a.id ? entry : e));
      writeJSON(KEYS.history, updated.slice(0, MAX));
    });
    // Also try localStorage but don't fail
    try {
      writeJSON(KEYS.analysis(a.id), a);
    } catch {
      // Expected for large analyses
    }
  } else {
    entry.storedInIdb = false;
    try {
      writeJSON(KEYS.analysis(a.id), a);
    } catch (e) {
      if (LS_QUOTA_RE.test(String(e))) {
        // Fallback: migrate to IndexedDB
        migrateAnalysisToIdb(a.id).then(() => {
          entry.storedInIdb = true;
          const updated = loadHistory().map((e) => (e.id === a.id ? entry : e));
          writeJSON(KEYS.history, updated.slice(0, MAX));
        });
      }
    }
  }
}

export function loadAnalysis(id: string): Analysis | null {
  ensureMigrated();
  // Try localStorage first for small analyses
  const lsResult = readJSON<Analysis | null>(KEYS.analysis(id), null);
  if (lsResult) return lsResult;
  // Fall back to IndexedDB for large analyses
  return loadAnalysisFromIdb(id) as Promise<Analysis | null>;
}

export function deleteAnalysis(id: string) {
  remove(KEYS.analysis(id));
  deleteAnalysisFromIdb(id);
  writeJSON(
    KEYS.history,
    loadHistory().filter((e) => e.id !== id),
  );
}

export function clearHistory() {
  loadHistory().forEach((e) => {
    remove(KEYS.analysis(e.id));
    deleteAnalysisFromIdb(e.id);
  });
  remove(KEYS.history);
}
