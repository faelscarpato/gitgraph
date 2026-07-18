import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

interface BaseProps {
  kind: "info" | "warn" | "error" | "muted";
  eyebrow: string;
  title: string;
  body?: string;
  children?: ReactNode;
}

const ACCENT: Record<BaseProps["kind"], string> = {
  info: "text-primary",
  warn: "text-warning",
  error: "text-destructive",
  muted: "text-muted-foreground",
};

export function StateBlock({ kind, eyebrow, title, body, children }: BaseProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <p className={`font-mono text-[10px] uppercase tracking-[0.25em] ${ACCENT[kind]}`}>
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
        {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ onNew, hasHistory }: { onNew?: () => void; hasHistory: boolean }) {
  return (
    <StateBlock
      kind="muted"
      eyebrow={hasHistory ? "Ready" : "Welcome"}
      title={
        hasHistory
          ? "Pick a previous analysis or start a new one"
          : "Turn any GitHub repository into a knowledge graph"
      }
      body="Paste a URL, pick a branch, and GenIA fetches the tree, parses imports, and builds an interactive graph — no server storage."
    >
      {onNew && (
        <button
          onClick={onNew}
          className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Start an analysis
        </button>
      )}
      <Link
        to="/settings"
        className="focus-ring rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        Configure AI provider
      </Link>
    </StateBlock>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <StateBlock
      kind="error"
      eyebrow="Analysis failed"
      title={message}
      body="Check the repository URL, GitHub rate limit, or network. You can also add a GitHub token in Settings to raise the limit."
    >
      <button
        onClick={onRetry}
        className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Try again
      </button>
      <Link
        to="/settings"
        className="focus-ring rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        Open Settings
      </Link>
    </StateBlock>
  );
}

export function ConfigMissingState() {
  return (
    <StateBlock
      kind="warn"
      eyebrow="Configuration"
      title="No AI provider configured"
      body="Analysis runs without an AI provider. Add one to enrich the graph with model-generated context."
    >
      <Link
        to="/settings"
        className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Open Settings
      </Link>
    </StateBlock>
  );
}
