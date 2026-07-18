import type { Analysis, GraphNode } from "@/lib/graph-types";

interface Props {
  analysis: Analysis;
  selected: GraphNode | null;
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="border-b border-border py-3 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="tabular text-sm font-semibold text-foreground">{value}</span>
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function MetricsSidebar({ analysis, selected }: Props) {
  const m = analysis.metrics;
  return (
    <aside className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              analysis.status === "success"
                ? "bg-success"
                : analysis.status === "partial"
                  ? "bg-warning"
                  : "bg-destructive"
            }`}
          />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {analysis.status === "partial" ? "Partial analysis" : "Analysis complete"}
          </span>
        </div>
        <h2 className="mt-1 truncate font-mono text-sm font-semibold text-foreground">
          {analysis.owner}/{analysis.repo}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          branch <span className="font-mono text-foreground/80">{analysis.branch}</span>
        </p>
      </div>

      <div className="overflow-y-auto px-4">
        <section>
          <h3 className="mt-4 mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Overview
          </h3>
          <Stat label="Nodes" value={m.nodes} />
          <Stat label="Edges" value={m.edges} />
          <Stat label="Avg degree" value={m.avgDegree} hint="Mean connections per node" />
          <Stat label="Density" value={m.density} hint="Edge / potential-edge ratio" />
          <Stat label="Max complexity" value={m.maxComplexity} />
        </section>

        <section>
          <h3 className="mt-6 mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Composition
          </h3>
          <Stat label="Modules" value={m.modules} />
          <Stat label="Files" value={m.files} />
          <Stat label="Functions" value={m.functions} />
          <Stat label="Externals" value={m.externals} />
        </section>

        {m.warnings.length > 0 && (
          <section className="mt-6 rounded-md border border-warning/40 bg-warning/10 p-3">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-warning">
              Warnings
            </h3>
            <ul className="mt-1.5 space-y-1 text-xs text-foreground/80">
              {m.warnings.map((w, i) => (
                <li key={i}>· {w}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6 mb-4">
          <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Selected node
          </h3>
          {selected ? (
            <div className="rounded-md border border-border bg-surface-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-foreground">
                  {selected.label}
                </span>
                <span className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                  {selected.kind}
                </span>
              </div>
              {selected.path && (
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                  {selected.path}
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                    LOC
                  </span>
                  <span className="tabular font-semibold">{selected.loc ?? "—"}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                    Complexity
                  </span>
                  <span className="tabular font-semibold">{selected.complexity ?? "—"}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-surface-2/50 p-4 text-center text-xs text-muted-foreground">
              Click a node in the graph to inspect it.
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
