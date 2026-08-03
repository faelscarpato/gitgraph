import { useMemo, useState } from "react";
import { parseRepoUrl } from "@/lib/analyzer";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  onSubmit: (v: {
    repoUrl: string;
    branch?: string;
    apiKey?: string;
    maxFiles?: number;
    maxBytesPerFile?: number;
  }) => void;
  disabled?: boolean;
  placeholder?: string;
}

const DEFAULT_MAX_FILES = 300;
const DEFAULT_MAX_BYTES = 200_000;

export function RepoForm({
  onSubmit,
  disabled,
  placeholder = "https://github.com/facebook/react",
}: Props) {
  const [repoUrl, setRepoUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [maxFiles, setMaxFiles] = useState(DEFAULT_MAX_FILES);
  const [maxBytesPerFile, setMaxBytesPerFile] = useState(DEFAULT_MAX_BYTES);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const parsed = useMemo(() => parseRepoUrl(repoUrl.trim()), [repoUrl]);

  const urlError =
    touched && repoUrl.trim() && !parsed
      ? "Insira uma URL válida de repositório público."
      : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!parsed || disabled) return;

    onSubmit({
      repoUrl: repoUrl.trim(),
      maxFiles,
      maxBytesPerFile,
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
    if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor="repo-url" className="sr-only">
            Repository URL
          </Label>
          <Input
            id="repo-url"
            type="url"
            required
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            className="focus-ring h-12 w-full rounded-xl border border-input bg-surface px-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {urlError && (
            <p className="mt-2 text-xs text-destructive">{urlError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || !repoUrl.trim()}
          className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {disabled ? "Analisando..." : "Iniciar análise"}
          <span aria-hidden>→</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? "Ocultar" : "Mostrar"} opções avançadas
        <span
          className="inline-block transition-transform"
          style={{
            transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>

      {showAdvanced && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
          <div className="space-y-2">
            <Label
              htmlFor="max-files"
              className="text-xs font-medium text-muted-foreground"
            >
              Máximo de arquivos analisados
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="max-files"
                type="number"
                min="50"
                max="2000"
                step="50"
                value={maxFiles}
                onChange={(e) =>
                  setMaxFiles(
                    Math.max(
                      50,
                      Math.min(
                        2000,
                        parseInt(e.target.value) || DEFAULT_MAX_FILES,
                      ),
                    ),
                  )
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground font-mono">
                (padrão: {DEFAULT_MAX_FILES})
              </span>
            </div>
            <Slider
              value={[maxFiles]}
              onValueChange={([v]) => setMaxFiles(v)}
              min={50}
              max={2000}
              step={50}
              className="w-full"
              aria-label="Maximum files to analyze"
            />
            <p className="text-xs text-muted-foreground">
              Repositórios grandes podem ter milhares de arquivos. Aumentar este
              limite melhora a cobertura mas aumenta o tempo de análise.
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="max-bytes"
              className="text-xs font-medium text-muted-foreground"
            >
              Tamanho máximo por arquivo
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="max-bytes"
                type="number"
                min="50000"
                max="1000000"
                step="50000"
                value={maxBytesPerFile}
                onChange={(e) =>
                  setMaxBytesPerFile(
                    Math.max(
                      50000,
                      Math.min(
                        1000000,
                        parseInt(e.target.value) || DEFAULT_MAX_BYTES,
                      ),
                    ),
                  )
                }
                className="w-28"
              />
              <span className="text-sm text-muted-foreground font-mono">
                (padrão: {formatBytes(DEFAULT_MAX_BYTES)})
              </span>
            </div>
            <Slider
              value={[maxBytesPerFile]}
              onValueChange={([v]) => setMaxBytesPerFile(v)}
              min={50000}
              max={1000000}
              step={50000}
              className="w-full"
              aria-label="Maximum bytes per file"
            />
            <p className="text-xs text-muted-foreground">
              Arquivos maiores que este limite são ignorados. Aumentar permite
              analisar arquivos grandes mas consome mais memória.
            </p>
          </div>
        </div>
      )}
    </form>
  );
}
