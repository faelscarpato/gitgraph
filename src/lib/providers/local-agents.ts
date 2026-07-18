// Probes common local-agent ports for an OpenAI-compatible surface.
// Non-blocking: any failure is treated as "not detected".

export interface LocalAgentProbe {
  name: string;
  baseUrl: string;
  detected: boolean;
  latencyMs?: number;
  models?: string[];
}

const KNOWN: Array<{ name: string; baseUrl: string }> = [
  { name: "Ollama", baseUrl: "http://localhost:11434/v1" },
  { name: "LM Studio", baseUrl: "http://localhost:1234/v1" },
  { name: "opencode", baseUrl: "http://localhost:4096/v1" },
  { name: "Claude Code", baseUrl: "http://localhost:7777/v1" },
  { name: "codex", baseUrl: "http://localhost:8787/v1" },
  { name: "gemini-cli", baseUrl: "http://localhost:8000/v1" },
  { name: "hermes", baseUrl: "http://localhost:5000/v1" },
];

async function probe(
  base: string,
  timeoutMs = 1500,
): Promise<{ ok: boolean; ms: number; models?: string[] }> {
  const started = performance.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(base.replace(/\/+$/, "") + "/models", { signal: ctrl.signal });
    const ms = Math.round(performance.now() - started);
    if (!r.ok) return { ok: false, ms };
    let models: string[] | undefined;
    try {
      const data = await r.json();
      const arr = data?.data ?? data?.models ?? [];
      models = arr
        .slice(0, 3)
        .map((m: unknown) => (typeof m === "string" ? m : (m as { id?: string })?.id))
        .filter(Boolean);
    } catch {
      // ignore JSON parse errors
    }
    return { ok: true, ms, models };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - started) };
  } finally {
    clearTimeout(t);
  }
}

export async function probeLocalAgents(): Promise<LocalAgentProbe[]> {
  const results = await Promise.all(
    KNOWN.map(async (a) => {
      const p = await probe(a.baseUrl);
      return {
        name: a.name,
        baseUrl: a.baseUrl,
        detected: p.ok,
        latencyMs: p.ms,
        models: p.models,
      };
    }),
  );
  return results;
}
