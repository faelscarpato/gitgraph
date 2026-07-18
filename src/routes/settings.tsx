import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  deleteProvider,
  getActiveProviderId,
  listProviders,
  saveProvider,
  setActiveProviderId,
  getGithubToken,
  setGithubToken,
} from "@/lib/providers/registry";
import { testProvider } from "@/lib/providers/client";
import { probeLocalAgents, type LocalAgentProbe } from "@/lib/providers/local-agents";
import type { ProviderProfile, ProviderTestResult } from "@/lib/providers/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — GenIA Analyzer" },
      {
        name: "description",
        content:
          "Configure AI providers, local agents and the GitHub token GenIA Analyzer uses for repository analysis.",
      },
      { property: "og:title", content: "Settings — GenIA Analyzer" },
      {
        property: "og:description",
        content: "Configure AI providers and local agents for GenIA Analyzer.",
      },
    ],
  }),
  component: SettingsPage,
});

const EMPTY_FORM = {
  id: undefined as string | undefined,
  name: "",
  baseUrl: "",
  apiKey: "",
  defaultModel: "",
  kind: "openai-compatible" as ProviderProfile["kind"],
};

function SettingsPage() {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [test, setTest] = useState<ProviderTestResult | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [probes, setProbes] = useState<LocalAgentProbe[] | null>(null);
  const [probing, setProbing] = useState(false);
  const [ghToken, setGhTokenState] = useState("");

  useEffect(() => {
    setProviders(listProviders());
    setActiveId(getActiveProviderId());
    setGhTokenState(getGithubToken() ?? "");
  }, []);

  const reload = () => setProviders(listProviders());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.baseUrl.trim()) return;
    const saved = saveProvider({
      id: form.id,
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
      apiKey: form.apiKey.trim() || undefined,
      defaultModel: form.defaultModel.trim() || undefined,
      kind: form.kind,
    });
    setForm(EMPTY_FORM);
    setTest(null);
    reload();
    if (!activeId) {
      setActiveProviderId(saved.id);
      setActiveId(saved.id);
    }
  };

  const edit = (p: ProviderProfile) => {
    setForm({
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl,
      apiKey: p.apiKey ?? "",
      defaultModel: p.defaultModel ?? "",
      kind: p.kind,
    });
    setTest(null);
  };

  const runTest = async (p: ProviderProfile) => {
    setTesting(p.id);
    const r = await testProvider(p);
    setTest(r);
    setTesting(null);
  };

  const runProbe = async () => {
    setProbing(true);
    try {
      setProbes(await probeLocalAgents());
    } finally {
      setProbing(false);
    }
  };

  const importProbe = (probe: LocalAgentProbe) => {
    setForm({
      id: undefined,
      name: probe.name,
      baseUrl: probe.baseUrl,
      apiKey: "",
      defaultModel: probe.models?.[0] ?? "",
      kind: "local-agent",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="focus-ring flex items-baseline gap-2">
            <span className="font-semibold tracking-tight">GenIA</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Analyzer · settings
            </span>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to analyzer
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-10">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Providers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure any OpenAI-compatible endpoint. Multiple profiles are supported — one is
            active at a time. Values are stored only in this browser.
          </p>
        </section>

        {/* Form */}
        <section className="surface-panel p-5">
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {form.id ? "Edit profile" : "New profile"}
          </h2>
          <form onSubmit={submit} className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="OpenAI, Groq, local Ollama…"
                className={inputCls}
              />
            </Field>
            <Field label="Kind">
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kind: e.target.value as ProviderProfile["kind"],
                  })
                }
                className={inputCls}
              >
                <option value="openai-compatible">OpenAI-compatible (remote)</option>
                <option value="local-agent">Local agent (localhost)</option>
              </select>
            </Field>
            <Field label="Base URL" full>
              <input
                required
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className={inputCls}
              />
            </Field>
            <Field label="API Key">
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                autoComplete="off"
                placeholder="sk-…"
                className={inputCls}
              />
            </Field>
            <Field label="Default model — optional">
              <input
                value={form.defaultModel}
                onChange={(e) => setForm({ ...form, defaultModel: e.target.value })}
                placeholder="gpt-4o-mini"
                className={inputCls}
              />
            </Field>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {form.id ? "Save changes" : "Add profile"}
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(EMPTY_FORM);
                    setTest(null);
                  }}
                  className="focus-ring rounded-md border border-border bg-surface px-4 py-2 text-sm text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* List */}
        <section>
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Saved profiles ({providers.length})
          </h2>
          {providers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No profiles yet. Add one above.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {providers.map((p) => {
                const active = p.id === activeId;
                return (
                  <li
                    key={p.id}
                    className={`surface-panel p-4 ${active ? "ring-1 ring-primary" : ""}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{p.name}</span>
                          <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                            {p.kind}
                          </span>
                          {active && (
                            <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] uppercase text-primary">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                          {p.baseUrl}
                        </p>
                        {p.defaultModel && (
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            model: {p.defaultModel}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => runTest(p)}
                          disabled={testing === p.id}
                          className="focus-ring rounded border border-border bg-surface px-2 py-1 text-[11px] hover:bg-muted disabled:opacity-50"
                        >
                          {testing === p.id ? "Testing…" : "Test"}
                        </button>
                        {!active && (
                          <button
                            onClick={() => {
                              setActiveProviderId(p.id);
                              setActiveId(p.id);
                            }}
                            className="focus-ring rounded border border-border bg-surface px-2 py-1 text-[11px] hover:bg-muted"
                          >
                            Set active
                          </button>
                        )}
                        <button
                          onClick={() => edit(p)}
                          className="focus-ring rounded border border-border bg-surface px-2 py-1 text-[11px] hover:bg-muted"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            deleteProvider(p.id);
                            reload();
                            setActiveId(getActiveProviderId());
                          }}
                          className="focus-ring rounded border border-border bg-surface px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {test && form.id === undefined && testing === null && (
                      <TestBadge result={test} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {test && (
            <div className="mt-3">
              <TestBadge result={test} />
            </div>
          )}
        </section>

        {/* Local agents */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Local agents
            </h2>
            <button
              onClick={runProbe}
              disabled={probing}
              className="focus-ring rounded border border-border bg-surface px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              {probing ? "Probing…" : "Probe localhost"}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Detects OpenAI-compatible servers on well-known localhost ports (Ollama, LM Studio,
            opencode, Claude Code, codex, gemini, hermes). Detection requires the agent to expose an
            HTTP endpoint; some CLIs do not — nothing to import in that case.
          </p>
          {probes && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {probes.map((p) => (
                <li
                  key={p.baseUrl}
                  className={`surface-panel p-3 text-xs ${p.detected ? "" : "opacity-60"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${p.detected ? "bg-success" : "bg-muted"}`}
                    />
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                    {p.baseUrl}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {p.detected
                      ? `Detected · ${p.latencyMs}ms${p.models?.length ? ` · ${p.models.length} models` : ""}`
                      : "Not detected"}
                  </p>
                  {p.detected && (
                    <button
                      onClick={() => importProbe(p)}
                      className="focus-ring mt-2 rounded border border-border bg-surface px-2 py-1 text-[11px] hover:bg-muted"
                    >
                      Import as profile
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* GitHub token */}
        <section className="surface-panel p-5">
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            GitHub token — optional
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Anonymous requests to GitHub are limited to 60/hour. Adding a fine-grained personal
            token raises this to 5000/hour. Public-repo read is enough — no write scopes needed.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="password"
              value={ghToken}
              onChange={(e) => setGhTokenState(e.target.value)}
              placeholder="ghp_… or github_pat_…"
              autoComplete="off"
              className={inputCls + " flex-1 min-w-[240px]"}
            />
            <button
              onClick={() => setGithubToken(ghToken.trim() || null)}
              className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Save token
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

const inputCls =
  "focus-ring w-full rounded-md border border-input bg-surface px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/60";

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <label className="block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function TestBadge({ result }: { result: ProviderTestResult }) {
  return (
    <div
      className={`rounded-md border px-3 py-2 text-xs ${result.ok ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
    >
      <span className="font-mono">{result.ok ? "✓" : "✕"}</span> {result.message}
      {result.modelDetected && (
        <span className="ml-2 font-mono text-foreground/70">· model: {result.modelDetected}</span>
      )}
    </div>
  );
}
