import { useState } from "react";
import type { Analysis } from "@/lib/graph-types";

type Tab = "insights" | "architecture";

interface Props {
  analysis: Analysis;
  onFocus?: (id: string) => void;
}

export function InsightPanel({ analysis, onFocus }: Props) {
  const m = analysis.metrics;
  const [tab, setTab] = useState<Tab>("insights");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-md border border-border bg-surface-2 p-0.5">
        <TabBtn active={tab === "insights"} onClick={() => setTab("insights")}>
          Insights
        </TabBtn>
        <TabBtn
          active={tab === "architecture"}
          onClick={() => setTab("architecture")}
        >
          Architecture
        </TabBtn>
      </div>

      {tab === "insights" ? (
        <InsightsContent analysis={analysis} onFocus={onFocus} />
      ) : (
        <ArchitectureContent analysis={analysis} onFocus={onFocus} />
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function InsightsContent({ analysis, onFocus }: Props) {
  const m = analysis.metrics;
  return (
    <div className="space-y-4">
      <Group label="Top by connections">
        {(m.topByDegree ?? []).length === 0 ? (
          <Empty />
        ) : (
          m.topByDegree!.map((n) => (
            <Row
              key={n.id}
              onClick={() => onFocus?.(n.id)}
              label={n.label}
              value={n.degree}
              unit="edges"
            />
          ))
        )}
      </Group>

      <Group label="Complexity hotspots">
        {(m.hotspots ?? []).length === 0 ? (
          <Empty />
        ) : (
          m.hotspots!.map((n) => (
            <Row
              key={n.id}
              onClick={() => onFocus?.(n.id)}
              label={n.label}
              value={n.complexity}
              unit="cx"
            />
          ))
        )}
      </Group>

      {m.languages && Object.keys(m.languages).length > 0 && (
        <Group label="Languages">
          {Object.entries(m.languages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([lang, n]) => (
              <Row key={lang} label={lang} value={n} unit="files" />
            ))}
        </Group>
      )}
    </div>
  );
}

function ArchitectureContent({ analysis, onFocus }: Props) {
  const m = analysis.metrics;
  const moduleMetrics = m.moduleMetrics ?? [];
  const cycles = m.cycles ?? [];
  const godModules = m.godModules ?? [];

  return (
    <div className="space-y-4">
      {godModules.length > 0 && (
        <section>
          <h3 className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            God Modules
          </h3>
          <div className="space-y-1">
            {godModules.map((mod) => (
              <div
                key={mod}
                className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs"
              >
                <span className="text-red-500">⚠</span>
                <span className="font-mono text-foreground/85">{mod}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {cycles.length > 0 && (
        <section>
          <h3 className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Cyclic Dependencies ({cycles.length})
          </h3>
          <div className="space-y-1">
            {cycles.slice(0, 5).map((cycle, i) => (
              <details
                key={i}
                className="rounded-md border border-amber-500/30 bg-amber-500/5"
              >
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-500/10">
                  {cycle.moduleLabels.join(" → ")}
                </summary>
                <div className="border-t border-amber-500/20 px-3 py-2">
                  {cycle.nodes.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onFocus?.(id)}
                      className="focus-ring block w-full truncate text-left text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </details>
            ))}
            {cycles.length > 5 && (
              <p className="px-3 text-[11px] text-muted-foreground">
                +{cycles.length - 5} more cycles
              </p>
            )}
          </div>
        </section>
      )}

      {moduleMetrics.length > 0 && (
        <section>
          <h3 className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Module Metrics
          </h3>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-medium">Module</th>
                  <th className="px-2 py-1.5 text-right font-medium">Ca</th>
                  <th className="px-2 py-1.5 text-right font-medium">Ce</th>
                  <th className="px-2 py-1.5 text-right font-medium">I</th>
                  <th className="px-2 py-1.5 text-right font-medium">A</th>
                  <th className="px-2 py-1.5 text-right font-medium">D</th>
                  <th className="px-2 py-1.5 text-right font-medium">Cpx</th>
                </tr>
              </thead>
              <tbody>
                {moduleMetrics.map((mod) => (
                  <tr
                    key={mod.module}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="flex items-center gap-1 px-2 py-1.5 text-left font-mono text-foreground/85">
                      {mod.isGodModule && (
                        <span title="God Module" className="text-red-500">
                          ⚠
                        </span>
                      )}
                      <span className="truncate">{mod.module}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {mod.afferentCoupling}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {mod.efferentCoupling}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {mod.instability.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {mod.abstractness.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {mod.distance.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {mod.totalComplexity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-1 text-[10px] text-muted-foreground">
            Ca=Afferent · Ce=Efferent · I=Instability · A=Abstractness ·
            D=Distance
          </p>
        </section>
      )}

      {moduleMetrics.length === 0 && cycles.length === 0 && <Empty />}
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </h3>
      <div className="divide-y divide-border rounded-md border border-border bg-surface-2">
        {children}
      </div>
    </section>
  );
}
function Row({
  label,
  value,
  unit,
  onClick,
}: {
  label: string;
  value: number;
  unit: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="focus-ring flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span className="truncate font-mono text-foreground/85">{label}</span>
      <span className="tabular font-semibold text-foreground">
        {value}{" "}
        <span className="font-normal text-[10px] uppercase tracking-widest text-muted-foreground">
          {unit}
        </span>
      </span>
    </button>
  );
}
function Empty() {
  return (
    <div className="px-3 py-3 text-center text-[11px] text-muted-foreground">
      No data
    </div>
  );
}
