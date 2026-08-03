"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  loadHistory,
  loadAnalysis,
  deleteAnalysis,
  clearHistory,
  type HistoryEntry,
} from "@/lib/history";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeId?: string;
  onOpen?: (id: string) => void;
  onClose?: () => void;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}m atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return `${Math.floor(s / 86400)}d atrás`;
}

export function HistoryModal({
  open,
  onOpenChange,
  activeId,
  onOpen,
  onClose,
}: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState("");

  const filtered = entries.filter((e) =>
    `${e.owner}/${e.repo} ${e.branch}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const handleOpen = (id: string) => {
    onOpen?.(id);
    onOpenChange(false);
    onClose?.();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteAnalysis(id);
    setEntries(loadHistory());
  };

  const handleClear = () => {
    clearHistory();
    setEntries([]);
  };

  // Load history when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setEntries(loadHistory());
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Histórico de análises</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </DialogTitle>
          <DialogDescription>
            {entries.length} análise{entries.length !== 1 ? "s" : ""} salva
            {entries.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="border-t border-border pt-4">
          {entries.length > 0 && (
            <div className="mb-4">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar histórico…"
                className="focus-ring w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60"
              />
            </div>
          )}

          <ScrollArea className="h-[60vh] pr-2">
            {entries.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma análise realizada ainda.
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma análise corresponde ao filtro.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((entry) => {
                  const isActive = entry.id === activeId;
                  return (
                    <li
                      key={entry.id}
                      className={cn(isActive && "bg-primary/5")}
                    >
                      <button
                        onClick={() => handleOpen(entry.id)}
                        className={cn(
                          "w-full flex items-start gap-3 px-2 py-3 text-left transition-colors hover:bg-muted/50",
                          isActive && "bg-primary/10",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full mt-1.5 flex-shrink-0",
                            entry.status === "success"
                              ? "bg-success"
                              : entry.status === "partial"
                                ? "bg-warning"
                                : "bg-destructive",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="truncate font-mono text-sm font-medium text-foreground">
                              {entry.owner}/{entry.repo}
                            </span>
                            {isActive && (
                              <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] uppercase text-primary">
                                Ativa
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="font-mono">{entry.branch}</span>
                            <span>·</span>
                            <span className="tabular">
                              {entry.nodeCount}n / {entry.edgeCount}e
                            </span>
                            <span>·</span>
                            <span>{timeAgo(entry.createdAt)}</span>
                            {entry.quality && (
                              <>
                                <span>·</span>
                                <span
                                  className={cn(
                                    "rounded px-1 py-0.5 font-mono text-[10px] uppercase",
                                    entry.quality === "full"
                                      ? "bg-success/20 text-success"
                                      : entry.quality === "partial"
                                        ? "bg-warning/20 text-warning"
                                        : "bg-destructive/20 text-destructive",
                                  )}
                                >
                                  {entry.quality}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDelete(entry.id, e)}
                          aria-label="Excluir"
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {entries.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                >
                  Limpar todo o histórico
                </Button>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
