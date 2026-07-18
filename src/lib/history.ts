import type { Analysis, AnalysisQuality } from "./graph-types";
import { KEYS, readJSON, writeJSON, remove, ensureMigrated } from "./persistence/store";

const MAX = 25;

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
  writeJSON(KEYS.history, list.slice(0, MAX));
  writeJSON(KEYS.analysis(a.id), a);
}

export function loadAnalysis(id: string): Analysis | null {
  ensureMigrated();
  return readJSON<Analysis | null>(KEYS.analysis(id), null);
}

export function deleteAnalysis(id: string) {
  remove(KEYS.analysis(id));
  writeJSON(
    KEYS.history,
    loadHistory().filter((e) => e.id !== id),
  );
}

export function clearHistory() {
  loadHistory().forEach((e) => remove(KEYS.analysis(e.id)));
  remove(KEYS.history);
}
