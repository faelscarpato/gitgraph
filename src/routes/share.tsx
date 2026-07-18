import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { extractShareInfoFromUrl, decodeAnalysisFromUrl } from "@/lib/share";
import { runAnalysis } from "@/lib/analyzer";
import { saveAnalysis, loadHistory } from "@/lib/history";
import type { Analysis, HistoryEntry } from "@/lib/graph-types";

export const Route = createFileRoute("/share")({
  component: SharePage,
});

function SharePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error" | "success" | "not-found">("loading");
  const [error, setError] = useState<string>("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    // Check URL hash for share data
    const hash = window.location.hash.slice(1); // Remove #
    if (!hash) {
      setStatus("not-found");
      return;
    }

    // Try to extract share info
    const shareInfo = extractShareInfoFromUrl(window.location.href);
    if (!shareInfo) {
      setStatus("not-found");
      return;
    }

    // Try to decode from URL
    const decoded = decodeAnalysisFromUrl(hash);
    if (decoded) {
      // Save and redirect to view
      saveAnalysis(decoded);
      setHistory(loadHistory());
      setAnalysis(decoded);
      setStatus("success");

      // Redirect to home with the analysis loaded
      setTimeout(() => {
        navigate({ to: "/", replace: true });
      }, 2000);
      return;
    }

    // If no decoded data, try to fetch from GitHub
    setStatus("loading");
    const repoUrl = `https://github.com/${shareInfo.owner}/${shareInfo.repo}`;

    runAnalysis({
      repoUrl,
      branch: shareInfo.branch,
      onProgress: (p) => {
        console.log("Progress:", p);
      },
    })
      .then(({ analysis: result }) => {
        saveAnalysis(result);
        setAnalysis(result);
        setStatus("success");
        setHistory(loadHistory());

        // Redirect to home with the analysis loaded
        setTimeout(() => {
          navigate({ to: "/", replace: true });
        }, 2000);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load analysis");
        setStatus("error");
      });
  }, [navigate]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-primary">
            Loading shared analysis
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Loading...</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Fetching analysis data from GitHub...
          </p>
        </div>
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Share not found
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            No share data found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The share URL doesn't contain valid analysis data.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Return to analyzer
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-destructive">Error</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Failed to load analysis
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Return to analyzer
          </Link>
        </div>
      </div>
    );
  }

  // Success - redirecting
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-success">Analysis loaded</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Redirecting...
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {analysis && (
            <span>
              {analysis.owner}/{analysis.repo} @ {analysis.branch}
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {analysis?.nodes.length} nodes · {analysis?.edges.length} edges
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          Go to analyzer
        </Link>
      </div>
    </div>
  );
}
