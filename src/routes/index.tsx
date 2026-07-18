import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { RepoForm } from "@/components/RepoForm";
import { GraphViewer } from "@/components/GraphViewer";
import { MetricsSidebar } from "@/components/MetricsSidebar";
import { HistoryPanel } from "@/components/HistoryPanel";
import { ExportMenu } from "@/components/ExportMenu";
import { InsightPanel } from "@/components/InsightPanel";
import { SemanticSearchPanel } from "@/components/SemanticSearchPanel";
import { runAnalysis } from "@/lib/analyzer";
import type { Analysis, GraphNode, NodeKind } from "@/lib/graph-types";
import type { ProgressEvent } from "@/lib/analysis/types";
import {
  clearHistory,
  deleteAnalysis,
  loadAnalysis,
  loadHistory,
  saveAnalysis,
  type HistoryEntry,
} from "@/lib/history";
import { getGithubToken } from "@/lib/providers/registry";

export const Route = createFileRoute("/")({
  component: Index,
});

type View = "form" | "loading" | "graph" | "error";

function Index() {
  const [view, setView] = useState<View>("form");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [progress, setProgress] = useState<ProgressEvent>({ pct: 0, label: "" });
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [filter, setFilter] = useState<NodeKind | "all">("all");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const doRun = async (v: { repoUrl: string; branch?: string; apiKey?: string }) => {
    setView("loading");
    setError(null);
    setProgress({ pct: 0, label: "Starting" });
    try {
      const { analysis: result } = await runAnalysis({
        repoUrl: v.repoUrl,
        branch: v.branch,
        githubToken: getGithubToken() ?? undefined,
        onProgress: (p) => setProgress(p),
      });
      saveAnalysis(result);
      setAnalysis(result);
      setHistory(loadHistory());
      setSelected(null);
      setFilter("all");
      setView("graph");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
      setView("error");
    }
  };

  const openHistory = (id: string) => {
    const a = loadAnalysis(id);
    if (a) {
      setAnalysis(a);
      setSelected(null);
      setFilter("all");
      setView("graph");
      setDrawerOpen(false);
    }
  };
  const removeHistory = (id: string) => {
    deleteAnalysis(id);
    setHistory(loadHistory());
    if (analysis?.id === id) {
      setAnalysis(null);
      setView("form");
    }
  };
  const resetToForm = () => {
    setView("form");
    setAnalysis(null);
    setSelected(null);
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <AppHeader
        onOpenDrawer={() => setDrawerOpen(true)}
        analysis={analysis}
        svgRef={svgRef}
        onNew={resetToForm}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block">
          <HistoryPanel
            entries={history}
            activeId={analysis?.id}
            onOpen={openHistory}
            onDelete={removeHistory}
            onClear={() => {
              clearHistory();
              setHistory([]);
              resetToForm();
            }}
            onNew={resetToForm}
          />
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden">
          {view === "form" && <FormView onSubmit={doRun} hasHistory={history.length > 0} />}
          {view === "loading" && <LoadingView progress={progress} />}
          {view === "error" && (
            <ErrorView message={error ?? "Something went wrong."} onRetry={resetToForm} />
          )}
          {view === "graph" && analysis && (
            <GraphView
              analysis={analysis}
              selected={selected}
              onSelect={setSelected}
              filter={filter}
              onFilter={setFilter}
              svgRef={svgRef}
            />
          )}
        </main>

        {view === "graph" && analysis && (
          <aside className="hidden w-80 shrink-0 border-l border-border bg-surface xl:flex xl:flex-col">
            <div className="flex-1 overflow-y-auto">
              <MetricsSidebar analysis={analysis} selected={selected} />
              <div className="border-t border-border px-4 py-4">
                <InsightPanel
                  analysis={analysis}
                  onFocus={(id) => {
                    const n = analysis.nodes.find((x) => x.id === id);
                    if (n) setSelected(n);
                  }}
                />
              </div>
            </div>
          </aside>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute left-0 top-0 h-full w-72 border-r border-border bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <HistoryPanel
              entries={history}
              activeId={analysis?.id}
              onOpen={openHistory}
              onDelete={removeHistory}
              onClear={() => {
                clearHistory();
                setHistory([]);
                resetToForm();
                setDrawerOpen(false);
              }}
              onNew={() => {
                resetToForm();
                setDrawerOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Header ---------- */

function AppHeader({
  onOpenDrawer,
  analysis,
  svgRef,
  onNew,
}: {
  onOpenDrawer: () => void;
  analysis: Analysis | null;
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
  onNew: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenDrawer}
          aria-label="Open history"
          className="focus-ring -ml-1 rounded p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <button onClick={onNew} className="focus-ring flex items-center gap-2 rounded">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="6" cy="6" r="2.5" />
              <circle cx="18" cy="6" r="2.5" />
              <circle cx="12" cy="18" r="2.5" />
              <path d="M8 7.5l3 8M16 7.5l-3 8" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold tracking-tight text-foreground">GenIA</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Analyzer
            </span>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {analysis && (
          <span className="hidden items-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1 font-mono text-[10px] text-muted-foreground sm:inline-flex">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                analysis.quality === "full"
                  ? "bg-success"
                  : analysis.quality === "partial"
                    ? "bg-warning"
                    : "bg-destructive"
              }`}
            />
            {analysis.quality} · {analysis.sourceUsed}
          </span>
        )}
        <Link
          to="/diff"
          className="focus-ring rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground hover:bg-muted"
        >
          Compare
        </Link>
        <Link
          to="/settings"
          className="focus-ring rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground hover:bg-muted"
        >
          Settings
        </Link>
        {analysis && <ExportMenu analysis={analysis} svgRef={svgRef} />}
      </div>
    </header>
  );
}

/* ---------- Views ---------- */

function FormView({
  onSubmit,
  hasHistory,
}: {
  onSubmit: (v: { repoUrl: string; branch?: string; apiKey?: string }) => void;
  hasHistory: boolean;
}) {
  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
            Code intelligence · v2
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Turn any repository into a <span className="text-primary">knowledge graph</span>.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Paste a public GitHub URL. GenIA fetches the tree, parses real imports, and renders a
            graph you can investigate — no server, no signup.
          </p>
        </div>

        <div className="surface-panel p-6 shadow-sm">
          <RepoForm onSubmit={onSubmit} />
        </div>

        <div className="mt-8 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <FeatureCell
            title="Real analysis"
            body="GitHub tree + import parsing for JS/TS, Python, Go. Falls back gracefully."
          />
          <FeatureCell
            title="BYO provider"
            body="Any OpenAI-compatible endpoint. Local agents on localhost supported."
          />
          <FeatureCell
            title="Portable"
            body="Export JSON, GraphML, PNG or standalone HTML — quality metadata included."
          />
        </div>

        {!hasHistory && (
          <p className="mt-6 text-center text-xs text-muted-foreground/70">
            First time here?{" "}
            <Link to="/settings" className="text-primary underline-offset-2 hover:underline">
              Configure a provider
            </Link>{" "}
            or just paste a repo and go.
          </p>
        )}
      </div>
    </div>
  );
}

function FeatureCell({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-primary" />
        <span className="text-[10px] font-medium uppercase tracking-widest text-foreground">
          {title}
        </span>
      </div>
      <p className="leading-relaxed">{body}</p>
    </div>
  );
}

const STEPS = [
  { label: "Resolve branch", threshold: 15 },
  { label: "Fetch tree", threshold: 30 },
  { label: "Fetch & parse sources", threshold: 82 },
  { label: "Build graph", threshold: 90 },
  { label: "Compute metrics", threshold: 99 },
];

function LoadingView({ progress }: { progress: ProgressEvent }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
          Analyzing {progress.sourceId ? `· ${progress.sourceId}` : ""}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
          {progress.label || "Working…"}
        </h2>
        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>progress</span>
          <span className="tabular">{progress.pct}%</span>
        </div>

        <div className="mt-8 space-y-2">
          {STEPS.map((s) => {
            const done = progress.pct >= s.threshold;
            const active = !done && progress.pct >= (STEPS[STEPS.indexOf(s) - 1]?.threshold ?? 0);
            return (
              <div key={s.label} className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    done ? "bg-success" : active ? "bg-primary animate-pulse" : "bg-muted"
                  }`}
                />
                <span className={done || active ? "text-foreground" : "text-muted-foreground"}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-destructive">
          Analysis failed
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{message}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Check the repository URL is public and reachable. GitHub allows 60 anonymous requests/hour
          — add a token in Settings to raise it.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={onRetry}
            className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Start over
          </button>
          <Link
            to="/settings"
            className="focus-ring rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Open Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

function GraphView({
  analysis,
  selected,
  onSelect,
  filter,
  onFilter,
  svgRef,
}: {
  analysis: Analysis;
  selected: GraphNode | null;
  onSelect: (n: GraphNode | null) => void;
  filter: NodeKind | "all";
  onFilter: (f: NodeKind | "all") => void;
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
}) {
  const [search, setSearch] = useState("");
  const [showSemanticSearch, setShowSemanticSearch] = useState(false);

  const KINDS: Array<{ key: NodeKind | "all"; label: string }> = useMemo(
    () => [
      { key: "all", label: "All" },
      { key: "module", label: "Modules" },
      { key: "file", label: "Files" },
      { key: "function", label: "Functions" },
      { key: "external", label: "Externals" },
      { key: "config", label: "Config" },
    ],
    [],
  );

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return analysis.nodes
      .filter((n) => n.label.toLowerCase().includes(q) || n.path?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [search, analysis.nodes]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {KINDS.map((k) => (
            <button
              key={k.key}
              onClick={() => onFilter(k.key)}
              className={`focus-ring shrink-0 rounded px-2.5 py-1 text-xs font-medium transition ${
                filter === k.key
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search nodes…"
              className="focus-ring w-52 rounded-md border border-input bg-surface px-3 py-1 font-mono text-xs text-foreground placeholder:text-muted-foreground/60"
            />
            {matches.length > 0 && (
              <ul className="absolute right-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                {matches.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => {
                        onSelect(n);
                        setSearch("");
                      }}
                      className="focus-ring flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted"
                    >
                      <span className="truncate">{n.label}</span>
                      <span className="rounded border border-border px-1 font-mono text-[10px] uppercase text-muted-foreground">
                        {n.kind}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => setShowSemanticSearch(!showSemanticSearch)}
            className="focus-ring rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            AI Search
          </button>
        </div>
      </div>
      {showSemanticSearch && (
        <div className="border-b border-border bg-surface px-3 py-2">
          <SemanticSearchPanel
            analysis={analysis}
            onSelect={(node) => {
              onSelect(node);
              setShowSemanticSearch(false);
            }}
          />
        </div>
      )}
      <div className="flex-1 p-3">
        <GraphViewer
          analysis={analysis}
          onSelect={onSelect}
          selectedId={selected?.id ?? null}
          filterKind={filter}
          svgRef={svgRef}
        />
      </div>
      <div className="max-h-[35vh] shrink-0 overflow-y-auto border-t border-border bg-surface xl:hidden">
        <MetricsSidebar analysis={analysis} selected={selected} />
        <div className="border-t border-border px-4 py-4">
          <InsightPanel
            analysis={analysis}
            onFocus={(id) => {
              const n = analysis.nodes.find((x) => x.id === id);
              if (n) onSelect(n);
            }}
          />
        </div>
      </div>
    </div>
  );
}
