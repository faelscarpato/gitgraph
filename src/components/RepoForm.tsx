import { useState } from "react";
import { parseRepoUrl } from "@/lib/analyzer";

interface Props {
  onSubmit: (v: { repoUrl: string; branch?: string; apiKey?: string }) => void;
  disabled?: boolean;
}

export function RepoForm({ onSubmit, disabled }: Props) {
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [touched, setTouched] = useState(false);

  const parsed = parseRepoUrl(repoUrl);
  const urlError =
    touched && repoUrl && !parsed
      ? "Enter a valid GitHub URL (https://github.com/owner/repo)."
      : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!parsed) return;
    onSubmit({
      repoUrl: repoUrl.trim(),
      branch: branch.trim() || undefined,
      apiKey: apiKey.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="repo"
          className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          Repository URL
        </label>
        <input
          id="repo"
          type="url"
          required
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="https://github.com/facebook/react"
          disabled={disabled}
          className="focus-ring w-full rounded-md border border-input bg-surface px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 disabled:opacity-50"
        />
        {urlError && <p className="text-xs text-destructive">{urlError}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="branch"
            className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Branch <span className="text-muted-foreground/60 normal-case">— optional</span>
          </label>
          <input
            id="branch"
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            disabled={disabled}
            className="focus-ring w-full rounded-md border border-input bg-surface px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 disabled:opacity-50"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="key"
            className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            AI API key <span className="text-muted-foreground/60 normal-case">— optional</span>
          </label>
          <input
            id="key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-…"
            disabled={disabled}
            autoComplete="off"
            className="focus-ring w-full rounded-md border border-input bg-surface px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 disabled:opacity-50"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || !repoUrl}
        className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto"
      >
        {disabled ? "Analyzing…" : "Analyze repository"}
        <span aria-hidden>→</span>
      </button>

      <p className="text-xs text-muted-foreground">
        Your key stays in your browser. No data is stored on our servers.
      </p>
    </form>
  );
}
