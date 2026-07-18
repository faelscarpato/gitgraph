import type { ProviderProfile, ProviderTestResult } from "./types";

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}

export async function testProvider(p: ProviderProfile): Promise<ProviderTestResult> {
  const started = performance.now();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (p.apiKey) headers.Authorization = `Bearer ${p.apiKey}`;

  // Try /models first (cheap, standard).
  try {
    const r = await fetch(joinUrl(p.baseUrl, "/models"), { headers, method: "GET" });
    const latency = Math.round(performance.now() - started);
    if (r.ok) {
      let detected: string | undefined;
      try {
        const data = await r.json();
        const first = data?.data?.[0]?.id ?? data?.models?.[0]?.id ?? data?.models?.[0];
        if (typeof first === "string") detected = first;
      } catch {
        // ignore JSON parse errors
      }
      return {
        ok: true,
        latencyMs: latency,
        status: r.status,
        modelDetected: detected ?? p.defaultModel,
        message: `Connected in ${latency}ms`,
      };
    }
    if (r.status === 401 || r.status === 403) {
      return {
        ok: false,
        latencyMs: latency,
        status: r.status,
        message: "Authentication failed. Check the API key.",
      };
    }
    // Fallback to chat.completions ping
  } catch (e) {
    // network / CORS - will try fallback
  }

  try {
    const r2 = await fetch(joinUrl(p.baseUrl, "/chat/completions"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: p.defaultModel ?? "gpt-3.5-turbo",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
    });
    const latency = Math.round(performance.now() - started);
    if (r2.ok) {
      return {
        ok: true,
        latencyMs: latency,
        status: r2.status,
        message: `Connected in ${latency}ms`,
        modelDetected: p.defaultModel,
      };
    }
    const text = await r2.text().catch(() => "");
    return {
      ok: false,
      latencyMs: latency,
      status: r2.status,
      message: text.slice(0, 140) || `HTTP ${r2.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      message: e instanceof Error ? e.message : "Network error (CORS or unreachable).",
    };
  }
}
