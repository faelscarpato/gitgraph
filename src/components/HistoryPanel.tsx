import { useState } from "react";
import type { HistoryEntry } from "@/lib/history";

interface Props {
  entries: HistoryEntry[];
  activeId?: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onNew: () => void;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function HistoryPanel({ entries, activeId, onOpen, onDelete, onClear, onNew }: Props) {
  const [query, setQuery] = useState("");
  const filtered = entries.filter((e) =>
    `${e.owner}/${e.repo} ${e.branch}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          History
        </h2>
        <button
          onClick={onNew}
          className="focus-ring rounded border border-border bg-surface px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground hover:bg-muted"
        >
          + New
        </button>
      </div>

      {entries.length > 0 && (
        <div className="border-b border-border px-4 py-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            className="focus-ring w-full rounded border border-input bg-surface px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-muted-foreground">
              No analyses yet. Run your first one to build a local history.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">No matches.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((e) => {
              const active = e.id === activeId;
              return (
                <li key={e.id} className={active ? "bg-primary-soft" : ""}>
                  <div className="group flex items-start gap-2 px-4 py-3">
                    <button onClick={() => onOpen(e.id)} className="focus-ring flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            e.status === "success"
                              ? "bg-success"
                              : e.status === "partial"
                                ? "bg-warning"
                                : "bg-destructive"
                          }`}
                        />
                        <span className="truncate font-mono text-xs font-semibold text-foreground">
                          {e.owner}/{e.repo}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">{e.branch}</span>
                        <span>·</span>
                        <span className="tabular">
                          {e.nodeCount}n / {e.edgeCount}e
                        </span>
                        <span>·</span>
                        <span>{timeAgo(e.createdAt)}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => onDelete(e.id)}
                      aria-label="Delete"
                      className="focus-ring rounded px-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {entries.length > 0 && (
        <div className="border-t border-border p-3">
          <button
            onClick={onClear}
            className="focus-ring w-full rounded border border-border bg-surface px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted"
          >
            Clear history
          </button>
        </div>
      )}
    </div>
  );
}
