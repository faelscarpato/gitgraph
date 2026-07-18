import { KEYS, readJSON, writeJSON, ensureMigrated } from "@/lib/persistence/store";
import type { ProviderProfile } from "./types";

function nextId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function listProviders(): ProviderProfile[] {
  ensureMigrated();
  return readJSON<ProviderProfile[]>(KEYS.providers, []);
}

export function saveProvider(
  p: Omit<ProviderProfile, "id" | "createdAt"> & { id?: string },
): ProviderProfile {
  const list = listProviders();
  const existing = p.id ? list.find((x) => x.id === p.id) : undefined;
  const record: ProviderProfile = existing
    ? { ...existing, ...p, id: existing.id }
    : { ...p, id: nextId(), createdAt: Date.now() };
  const next = existing ? list.map((x) => (x.id === record.id ? record : x)) : [record, ...list];
  writeJSON(KEYS.providers, next);
  return record;
}

export function deleteProvider(id: string) {
  const next = listProviders().filter((p) => p.id !== id);
  writeJSON(KEYS.providers, next);
  if (getActiveProviderId() === id) setActiveProviderId(null);
}

export function getActiveProviderId(): string | null {
  ensureMigrated();
  return readJSON<string | null>(KEYS.activeProvider, null);
}

export function setActiveProviderId(id: string | null) {
  writeJSON(KEYS.activeProvider, id);
}

export function getActiveProvider(): ProviderProfile | null {
  const id = getActiveProviderId();
  if (!id) return null;
  return listProviders().find((p) => p.id === id) ?? null;
}

export function getGithubToken(): string | null {
  return readJSON<string | null>(KEYS.githubToken, null);
}

export function setGithubToken(t: string | null) {
  writeJSON(KEYS.githubToken, t);
}
