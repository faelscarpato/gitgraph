import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { loadHistory, loadAnalysis, type HistoryEntry } from "@/lib/history";
import { computeAnalysisDiff, formatDiffSummary } from "@/lib/analysis/diff";
import type { Analysis } from "@/lib/graph-types";

export const Route = createFileRoute("/diff")({
  component: DiffPage,
});

function DiffPage() {
  const [baseId, setBaseId] = useState<string | null>(null);
  const [headId, setHeadId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load history on mount
  useState(() => {
    setHistory(loadHistory());
  }, []);

  const baseAnalysis = useMemo(() => {
    if (!baseId) return null;
    return loadAnalysis(baseId);
  }, [baseId]);

  const headAnalysis = useMemo(() => {
    if (!headId) return null;
    return loadAnalysis(headId);
  }, [headId]);

  const diff = useMemo(() => {
    if (!baseAnalysis || !headAnalysis) return null;
    return computeAnalysisDiff(baseAnalysis, headAnalysis);
  }, [baseAnalysis, headAnalysis]);

  const canCompare = baseAnalysis && headAnalysis && baseId !== headId;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="focus-ring flex items-baseline gap-2">
            <span className="font-semibold tracking-tight">GenIA</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Analyzer · diff
            </span>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to analyzer
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Compare Analyses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select two analyses to compare and see what changed between them.
          </p>
        </div>

        {/* Selection */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="surface-panel p-5">
            <h2 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Base (Original)
            </h2>
            <AnalysisSelector
              entries={history}
              selectedId={baseId}
              onSelect={setBaseId}
              disabledIds={headId ? [headId] : []}
            />
            {baseAnalysis && (
              <div className="mt-3 text-xs text-muted-foreground">
                {baseAnalysis.owner}/{baseAnalysis.repo} @ {baseAnalysis.branch}
                <br />
                {baseAnalysis.nodes.length} nodes · {baseAnalysis.edges.length} edges
              </div>
            )}
          </div>

          <div className="surface-panel p-5">
            <h2 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Head (Updated)
            </h2>
            <AnalysisSelector
              entries={history}
              selectedId={headId}
              onSelect={setHeadId}
              disabledIds={baseId ? [baseId] : []}
            />
            {headAnalysis && (
              <div className="mt-3 text-xs text-muted-foreground">
                {headAnalysis.owner}/{headAnalysis.repo} @ {headAnalysis.branch}
                <br />
                {headAnalysis.nodes.length} nodes · {headAnalysis.edges.length} edges
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {canCompare && diff && (
          <div className="mt-8 surface-panel p-5">
            <h2 className="text-lg font-semibold tracking-tight">Diff Summary</h2>
            <p className="mt-1 text-sm text-muted-foreground">{formatDiffSummary(diff)}</p>

            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Nodes Added" value={diff.summary.nodesAdded} color="success" />
              <StatCard
                title="Nodes Deleted"
                value={diff.summary.nodesDeleted}
                color="destructive"
              />
              <StatCard title="Nodes Modified" value={diff.summary.nodesModified} color="warning" />
              <StatCard title="Edges Added" value={diff.summary.edgesAdded} color="success" />
              <StatCard
                title="Edges Deleted"
                value={diff.summary.edgesDeleted}
                color="destructive"
              />
              <StatCard title="LOC Added" value={diff.summary.locAdded} color="success" />
              <StatCard title="LOC Removed" value={diff.summary.locRemoved} color="destructive" />
              <StatCard
                title="Complexity ↑"
                value={diff.summary.complexityIncreased}
                color="warning"
              />
              <StatCard
                title="Complexity ↓"
                value={diff.summary.complexityDecreased}
                color="success"
              />
            </div>

            {/* Detailed changes */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold tracking-tight">Detailed Changes</h3>

              {diff.addedNodes.length > 0 && (
                <section className="mt-4">
                  <h4 className="text-[10px] font-medium uppercase tracking-widest text-success">
                    Added Nodes ({diff.addedNodes.length})
                  </h4>
                  <NodeList nodes={diff.addedNodes} className="mt-2" />
                </section>
              )}

              {diff.deletedNodes.length > 0 && (
                <section className="mt-4">
                  <h4 className="text-[10px] font-medium uppercase tracking-widest text-destructive">
                    Deleted Nodes ({diff.deletedNodes.length})
                  </h4>
                  <NodeList nodes={diff.deletedNodes} className="mt-2" />
                </section>
              )}

              {diff.modifiedNodes.length > 0 && (
                <section className="mt-4">
                  <h4 className="text-[10px] font-medium uppercase tracking-widest text-warning">
                    Modified Nodes ({diff.modifiedNodes.length})
                  </h4>
                  <div className="mt-2 space-y-2">
                    {diff.modifiedNodes.map(({ node, changes }) => (
                      <div
                        key={node.id}
                        className="rounded-md border border-border bg-surface-2 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full bg-warning`} />
                          <span className="font-mono text-sm">{node.label}</span>
                          <span className="text-[10px] text-muted-foreground">{node.kind}</span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {changes.loc && (
                            <span>
                              LOC: {changes.loc.base} → {changes.loc.head}
                              {changes.loc.head > changes.loc.base ? " (↑)" : " (↓)"}
                            </span>
                          )}
                          {changes.complexity && (
                            <span className="ml-4">
                              Complexity: {changes.complexity.base} → {changes.complexity.head}
                              {changes.complexity.head > changes.complexity.base ? " (↑)" : " (↓)"}
                            </span>
                          )}
                          {changes.language && (
                            <span className="ml-4">
                              Language: {changes.language.base ?? "unknown"} →{" "}
                              {changes.language.head ?? "unknown"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {diff.addedEdges.length > 0 && (
                <section className="mt-4">
                  <h4 className="text-[10px] font-medium uppercase tracking-widest text-success">
                    Added Edges ({diff.addedEdges.length})
                  </h4>
                  <EdgeList edges={diff.addedEdges} className="mt-2" />
                </section>
              )}

              {diff.deletedEdges.length > 0 && (
                <section className="mt-4">
                  <h4 className="text-[10px] font-medium uppercase tracking-widest text-destructive">
                    Deleted Edges ({diff.deletedEdges.length})
                  </h4>
                  <EdgeList edges={diff.deletedEdges} className="mt-2" />
                </section>
              )}
            </div>
          </div>
        )}

        {!canCompare && baseId && headId && baseId === headId && (
          <div className="mt-8 text-center text-warning">
            Please select two different analyses to compare.
          </div>
        )}

        {!canCompare && (!baseId || !headId) && (
          <div className="mt-8 text-center text-muted-foreground">
            Select a base and head analysis to compare.
          </div>
        )}
      </main>
    </div>
  );
}

// Helper components
function AnalysisSelector({
  entries,
  selectedId,
  onSelect,
  disabledIds,
}: {
  entries: HistoryEntry[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabledIds?: string[];
}) {
  return (
    <div className="mt-3">
      <select
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="focus-ring w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
      >
        <option value="">Select an analysis...</option>
        {entries.map((entry) => (
          <option key={entry.id} value={entry.id} disabled={disabledIds?.includes(entry.id)}>
            {entry.owner}/{entry.repo} @ {entry.branch} ({entry.nodeCount}n, {entry.edgeCount}e)
          </option>
        ))}
      </select>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: "success" | "destructive" | "warning";
}) {
  const colorClasses = {
    success: "text-success border-success/40 bg-success/10",
    destructive: "text-destructive border-destructive/40 bg-destructive/10",
    warning: "text-warning border-warning/40 bg-warning/10",
  };

  return (
    <div className={`rounded-md border p-3 text-center ${colorClasses[color]}`}>
      <div className="text-xs font-medium uppercase tracking-widest text-foreground/70">
        {title}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function NodeList({
  nodes,
  className,
}: {
  nodes: Array<{ id: string; label: string; kind: string; path?: string }>;
  className?: string;
}) {
  return (
    <div className={className}>
      {nodes.slice(0, 10).map((node) => (
        <div key={node.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="font-mono">{node.label}</span>
          <span className="text-muted-foreground">{node.kind}</span>
          {node.path && <span className="text-muted-foreground/70 truncate">{node.path}</span>}
        </div>
      ))}
      {nodes.length > 10 && (
        <div className="px-3 py-1.5 text-xs text-muted-foreground">
          +{nodes.length - 10} more...
        </div>
      )}
    </div>
  );
}

function EdgeList({
  edges,
  className,
}: {
  edges: Array<{ source: string; target: string; kind: string }>;
  className?: string;
}) {
  return (
    <div className={className}>
      {edges.slice(0, 10).map((edge, index) => (
        <div
          key={`${edge.source}->${edge.target}`}
          className="flex items-center gap-2 px-3 py-1.5 text-xs"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="font-mono">{edge.source.split(":").pop() || edge.source}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-mono">{edge.target.split(":").pop() || edge.target}</span>
          <span className="text-muted-foreground">{edge.kind}</span>
        </div>
      ))}
      {edges.length > 10 && (
        <div className="px-3 py-1.5 text-xs text-muted-foreground">
          +{edges.length - 10} more...
        </div>
      )}
    </div>
  );
}
