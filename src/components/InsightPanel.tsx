import type { Analysis } from "@/lib/graph-types";

interface Props {
  analysis: Analysis;
  onFocus?: (id: string) => void;
}

export function InsightPanel({ analysis, onFocus }: Props) {
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

function Group({ label, children }: { label: string; children: React.ReactNode }) {
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
  return <div className="px-3 py-3 text-center text-[11px] text-muted-foreground">No data</div>;
}
