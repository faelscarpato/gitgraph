import { useState, useMemo } from "react";
import type { Analysis, GraphNode } from "@/lib/graph-types";
import { semanticSearch, generateNodeExplanation } from "@/lib/analysis/semantic";
import { useQuery } from "@tanstack/react-query";

export interface SemanticSearchResult {
  node: GraphNode;
  score: number;
  explanation?: string;
}

interface Props {
  analysis: Analysis;
  onSelect: (node: GraphNode) => void;
}

export function SemanticSearchPanel({ analysis, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await semanticSearch(analysis, query, undefined, 10);

      // Add explanations to top results
      const resultsWithExplanations = await Promise.all(
        results.slice(0, 3).map(async (result) => {
          const explanation = await generateNodeExplanation(result.node, analysis);
          return { ...result, explanation };
        }),
      );

      setSearchResults([...resultsWithExplanations, ...results.slice(3)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by meaning..."
          className="focus-ring flex-1 rounded-md border border-input bg-surface px-3 py-2 text-sm"
          disabled={isSearching}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <br />
          <span className="text-xs text-foreground/70">
            Note: Semantic search requires an AI provider configured in Settings.
          </span>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Found {searchResults.length} results</p>
          <div className="divide-y divide-border rounded-md border border-border bg-surface-2">
            {searchResults.map((result, index) => (
              <button
                key={`${result.node.id}-${index}`}
                onClick={() => onSelect(result.node)}
                className="focus-ring w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          result.node.kind === "module"
                            ? "bg-node-module"
                            : result.node.kind === "file"
                              ? "bg-node-file"
                              : result.node.kind === "function"
                                ? "bg-node-function"
                                : result.node.kind === "external"
                                  ? "bg-node-external"
                                  : "bg-node-config"
                        }`}
                      />
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {result.node.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {result.node.kind}
                      </span>
                    </div>
                    {result.node.path && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {result.node.path}
                      </p>
                    )}
                    {result.explanation && (
                      <p className="mt-1 text-xs text-foreground/70 line-clamp-2">
                        {result.explanation}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {(result.score * 100).toFixed(0)}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {searchResults.length === 0 && query.trim() && !isSearching && !error && (
        <div className="rounded-md border border-border bg-surface-2 p-4 text-center text-sm text-muted-foreground">
          No results found. Try a different query.
        </div>
      )}
    </div>
  );
}
