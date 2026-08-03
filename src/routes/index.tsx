import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileCode2,
  GitCompare,
  Github,
  LayoutGrid,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";

import { RepoForm } from "@/components/RepoForm";
import { MetricsSidebar } from "@/components/MetricsSidebar";
import { InsightPanel } from "@/components/InsightPanel";
import { SemanticSearchPanel } from "@/components/SemanticSearchPanel";
import { ExportMenu } from "@/components/ExportMenu";
import { AIChatPanel } from "@/components/AIChatPanel";
import { runAnalysis } from "@/lib/analyzer";
import type { Analysis, GraphNode, NodeKind } from "@/lib/graph-types";
import type { ProgressEvent } from "@/lib/analysis/types";
import {
  clearHistory,
  deleteAnalysis,
  loadAnalysis,
  loadHistory,
  saveAnalysis,
  type HistoryEntry,
} from "@/lib/history";
import { getGithubToken } from "@/lib/providers/registry";

const GraphViewer = lazy(async () => {
  const mod = await import("@/components/GraphViewer");
  return { default: mod.GraphViewer };
});

const MindmapViewer = lazy(async () => {
  const mod = await import("@/components/MindmapViewer");
  return { default: mod.MindmapViewer };
});

export const Route = createFileRoute("/")({
  component: Index,
});

type View = "form" | "loading" | "results" | "error";
type ResultDisplayMode = "cards" | "graph" | "mindmap" | "chat";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

function Index() {
  const [view, setView] = useState<View>("form");
  const isMobile = useIsMobile();
  const [displayMode, setDisplayMode] = useState<ResultDisplayMode>("cards");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [progress, setProgress] = useState<ProgressEvent>({
    pct: 0,
    label: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [filter, setFilter] = useState<NodeKind | "all">("all");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [llmsOpen, setLlmsOpen] = useState(false);
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const mindmapSvgRef = useRef<SVGSVGElement | null>(null);
  const [firstRunOpen, setFirstRunOpen] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
    const hasSeenFirstRun = localStorage.getItem("genia:first-run");
    if (!hasSeenFirstRun) {
      setFirstRunOpen(true);
    }
  }, []);

  const markFirstRunSeen = () => {
    localStorage.setItem("genia:first-run", "true");
    setFirstRunOpen(false);
  };

  const handleFirstRunToken = () => {
    markFirstRunSeen();
    setShowTokenModal(true);
  };

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const recentHistory = useMemo(() => history.slice(0, 3), [history]);

  const doRun = async (v: {
    repoUrl: string;
    branch?: string;
    apiKey?: string;
    maxFiles?: number;
    maxBytesPerFile?: number;
  }) => {
    setView("loading");
    setDisplayMode("cards");
    setError(null);
    setProgress({ pct: 0, label: "Iniciando análise" });

    try {
      const { analysis: result } = await runAnalysis({
        repoUrl: v.repoUrl,
        branch: v.branch,
        githubToken: getGithubToken() ?? undefined,
        maxFiles: v.maxFiles,
        maxBytesPerFile: v.maxBytesPerFile,
        onProgress: (p) => setProgress(p),
      });

      saveAnalysis(result);
      setAnalysis(result);
      setHistory(loadHistory());
      setSelected(null);
      setFilter("all");
      setView("results");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Falha ao analisar o repositório.",
      );
      setView("error");
    }
  };

  const openHistoryItem = async (id: string) => {
    const loaded = await Promise.resolve(loadAnalysis(id));
    if (loaded) {
      setAnalysis(loaded as Analysis);
      setSelected(null);
      setFilter("all");
      setDisplayMode("cards");
      setView("results");
      setSidebarOpen(false);
      setHistoryOpen(false);
    }
  };

  const removeHistory = (id: string) => {
    deleteAnalysis(id);
    const next = loadHistory();
    setHistory(next);

    if (analysis?.id === id) {
      setAnalysis(null);
      setSelected(null);
      setView("form");
      setDisplayMode("cards");
    }
  };

  const resetToForm = () => {
    setView("form");
    setAnalysis(null);
    setSelected(null);
    setDisplayMode("cards");
  };

  const goToNewAnalysis = () => {
    setSidebarOpen(false);
    resetToForm();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAbout={() => setAboutOpen(true)}
        onOpenLLMs={() => setLlmsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        onNewAnalysis={goToNewAnalysis}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground hover:bg-muted"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Workflow className="h-4 w-4" />
            </div>
            <div className="text-sm font-semibold tracking-tight">Gitgraph</div>
          </div>

          {view === "results" ? (
            <button
              onClick={goToNewAnalysis}
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground hover:bg-muted"
              aria-label="Nova análise"
              title="Nova análise"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>

        {view === "form" && (
          <HomeView
            onSubmit={doRun}
            recentHistory={recentHistory}
            onOpenHistoryItem={openHistoryItem}
            onOpenAllHistory={() => setHistoryOpen(true)}
          />
        )}

        {view === "loading" && <LoadingView progress={progress} />}

        {view === "error" && (
          <ErrorView
            message={error ?? "Algo deu errado durante a análise."}
            onRetry={resetToForm}
          />
        )}

        {view === "results" && analysis && (
          <ResultsView
            analysis={analysis}
            selected={selected}
            onSelect={setSelected}
            filter={filter}
            onFilter={setFilter}
            graphSvgRef={graphSvgRef}
            mindmapSvgRef={mindmapSvgRef}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
          />
        )}
      </main>

      <HistoryModal
        open={historyOpen}
        entries={history}
        activeId={analysis?.id}
        onClose={() => setHistoryOpen(false)}
        onOpen={openHistoryItem}
        onDelete={removeHistory}
        onClear={() => {
          clearHistory();
          setHistory([]);
          resetToForm();
          setHistoryOpen(false);
        }}
      />

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <LLMsModal open={llmsOpen} onClose={() => setLlmsOpen(false)} />
      <FirstRunModal
        open={firstRunOpen}
        onClose={markFirstRunSeen}
        onSetupToken={handleFirstRunToken}
      />
      <TokenOnboardingModal
        open={showTokenModal}
        onClose={() => setShowTokenModal(false)}
      />
    </div>
  );
}

function AppSidebar({
  open,
  onClose,
  onOpenAbout,
  onOpenLLMs,
  onOpenHistory,
  onNewAnalysis,
}: {
  open: boolean;
  onClose: () => void;
  onOpenAbout: () => void;
  onOpenLLMs: () => void;
  onOpenHistory: () => void;
  onNewAnalysis: () => void;
}) {
  const [desktopExpanded, setDesktopExpanded] = useState(false);

  return (
    <>
      <aside
        onMouseEnter={() => setDesktopExpanded(true)}
        onMouseLeave={() => setDesktopExpanded(false)}
        className={`hidden h-screen shrink-0 border-r border-border bg-surface transition-all duration-200 lg:flex lg:flex-col lg:justify-between lg:py-4 ${
          desktopExpanded ? "lg:w-[240px]" : "lg:w-[88px]"
        }`}
      >
        <div className="flex w-full flex-col gap-3 px-3">
          <div
            className={`flex items-center ${desktopExpanded ? "gap-3 px-1" : "justify-center"}`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Workflow className="h-5 w-5" />
            </div>
            {desktopExpanded && (
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  Gitgraph
                </p>
                <p className="text-xs text-muted-foreground">
                  Analyzer platform
                </p>
              </div>
            )}
          </div>

          <SidebarDesktopButton
            expanded={desktopExpanded}
            icon={<Search className="h-4 w-4" />}
            label="Nova análise"
            onClick={onNewAnalysis}
          />
          <SidebarDesktopButton
            expanded={desktopExpanded}
            icon={<Clock3 className="h-4 w-4" />}
            label="Histórico"
            onClick={onOpenHistory}
          />
          <SidebarDesktopButton
            expanded={desktopExpanded}
            icon={<BookOpen className="h-4 w-4" />}
            label="Sobre a ferramenta"
            onClick={onOpenAbout}
          />
          <SidebarDesktopButton
            expanded={desktopExpanded}
            icon={<Sparkles className="h-4 w-4" />}
            label="LLMs"
            onClick={onOpenLLMs}
          />

          <SidebarDesktopLink
            expanded={desktopExpanded}
            to="/settings"
            icon={<Settings className="h-4 w-4" />}
            label="Configurações"
          />
          <SidebarDesktopLink
            expanded={desktopExpanded}
            to="/diff"
            icon={<GitCompare className="h-4 w-4" />}
            label="Comparação"
          />
        </div>

        <div className="px-3">
          <a
            href="https://github.com/faelscarpato/gitgraph.git"
            target="_blank"
            rel="noopener noreferrer"
            className={`focus-ring inline-flex w-full items-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
              desktopExpanded
                ? "gap-3 px-4 py-3 justify-start"
                : "h-11 w-11 justify-center mx-auto"
            }`}
            aria-label="Abrir repositório original no GitHub"
            title="Repositório no GitHub"
          >
            <Github className="h-4 w-4 shrink-0" />
            {desktopExpanded && (
              <span className="text-sm font-medium">Repositório</span>
            )}
          </a>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={onClose} />
          <div className="absolute left-0 top-0 flex h-full w-[280px] flex-col justify-between border-r border-border bg-surface p-4 shadow-2xl">
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Workflow className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">
                      Gitgraph
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Analyzer platform
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-muted"
                  aria-label="Fechar menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <SidebarAction
                  icon={<Search className="h-4 w-4" />}
                  label="Nova análise"
                  onClick={() => {
                    onNewAnalysis();
                    onClose();
                  }}
                />
                <SidebarAction
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Histórico"
                  onClick={() => {
                    onOpenHistory();
                    onClose();
                  }}
                />
                <SidebarAction
                  icon={<BookOpen className="h-4 w-4" />}
                  label="Sobre a Ferramenta"
                  onClick={() => {
                    onOpenAbout();
                    onClose();
                  }}
                />
                <SidebarAction
                  icon={<Sparkles className="h-4 w-4" />}
                  label="LLMs"
                  onClick={() => {
                    onOpenLLMs();
                    onClose();
                  }}
                />
                <SidebarLink
                  to="/settings"
                  icon={<Settings className="h-4 w-4" />}
                  label="Configurações"
                />
                <SidebarLink
                  to="/diff"
                  icon={<GitCompare className="h-4 w-4" />}
                  label="Comparação"
                />
              </div>
            </div>

            <a
              href="https://github.com/faelscarpato/gitgraph.git"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground hover:bg-muted"
            >
              <Github className="h-4 w-4" />
              Repositório original
            </a>
          </div>
        </div>
      )}
    </>
  );
}

function SidebarDesktopButton({
  expanded,
  icon,
  label,
  onClick,
}: {
  expanded: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`focus-ring inline-flex items-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
        expanded
          ? "w-full justify-start gap-3 px-4 py-3"
          : "mx-auto h-11 w-11 justify-center"
      }`}
      aria-label={label}
      title={label}
    >
      <span className="shrink-0">{icon}</span>
      {expanded && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}

function SidebarDesktopLink({
  expanded,
  to,
  icon,
  label,
}: {
  expanded: boolean;
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={`focus-ring inline-flex items-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
        expanded
          ? "w-full justify-start gap-3 px-4 py-3"
          : "mx-auto h-11 w-11 justify-center"
      }`}
      aria-label={label}
      title={label}
    >
      <span className="shrink-0">{icon}</span>
      {expanded && <span className="text-sm font-medium">{label}</span>}
    </Link>
  );
}

function SidebarAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="focus-ring inline-flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted"
    >
      {icon}
      {label}
    </button>
  );
}

function SidebarLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="focus-ring inline-flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted"
    >
      {icon}
      {label}
    </Link>
  );
}

function HomeView({
  onSubmit,
  recentHistory,
  onOpenHistoryItem,
  onOpenAllHistory,
}: {
  onSubmit: (v: { repoUrl: string; branch?: string; apiKey?: string }) => void;
  recentHistory: HistoryEntry[];
  onOpenHistoryItem: (id: string) => void;
  onOpenAllHistory: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-6">
        <div className="flex h-full w-full max-w-5xl flex-col justify-center">
          <div className="mx-auto w-full max-w-3xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
              Open repository intelligence
            </p>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Transforme qualquer repositório em uma estrutura analisável.
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Cole a URL do projeto e gere uma visão estruturada do sistema, com
              foco em arquitetura, dependências, exportações e reutilização em
              ferramentas de IA.
            </p>

            <div className="mt-8 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-5">
              <RepoForm onSubmit={onSubmit} />
            </div>
          </div>

          <div className="mx-auto mt-8 w-full max-w-3xl rounded-3xl border border-border bg-surface/70 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Últimas análises
                </h2>
                <p className="text-xs text-muted-foreground">
                  Acesso rápido aos 3 resultados mais recentes.
                </p>
              </div>

              <button
                onClick={onOpenAllHistory}
                className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                Ver todos
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma análise salva ainda. Sua primeira análise aparecerá
                  aqui.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {recentHistory.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => onOpenHistoryItem(entry.id)}
                    className="focus-ring flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-foreground">
                        {entry.owner}/{entry.repo}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.branch} · {entry.nodeCount} nós ·{" "}
                        {entry.edgeCount} conexões
                      </p>
                    </div>

                    <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                      abrir
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingView({ progress }: { progress: ProgressEvent }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
          Análise em andamento
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {progress.label || "Processando repositório..."}
        </h2>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress.pct}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>progress</span>
          <span>{progress.pct}%</span>
        </div>
      </div>
    </div>
  );
}

function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const isRateLimit = /rate limit|403/i.test(message);
  const isNotFound = /not found|404/i.test(message);
  const isPrivate = /private|401|unauthorized/i.test(message);
  const isNetwork = /network|fetch failed|connection/i.test(message);

  const getActionableMessage = () => {
    if (isRateLimit) {
      return {
        title: "Limite de requisições do GitHub excedido",
        description:
          "O GitHub permite apenas 60 requisições/hora sem autenticação. Adicione um Personal Access Token em Configurações para aumentar para 5.000/hora.",
        actionLabel: "Adicionar token",
        actionHref: "/settings",
      };
    }
    if (isNotFound) {
      return {
        title: "Repositório não encontrado",
        description:
          "Verifique se a URL está correta e se o repositório é público. Repositórios privados não são suportados.",
        actionLabel: "Tentar outra URL",
        actionHref: null,
      };
    }
    if (isPrivate) {
      return {
        title: "Repositório privado ou sem permissão",
        description:
          "O repositório é privado ou o token não tem permissão de leitura. Apenas repositórios públicos são suportados.",
        actionLabel: "Verificar token",
        actionHref: "/settings",
      };
    }
    if (isNetwork) {
      return {
        title: "Erro de conexão",
        description:
          "Não foi possível conectar ao GitHub. Verifique sua conexão com a internet e tente novamente.",
        actionLabel: "Tentar novamente",
        actionHref: null,
      };
    }
    return {
      title: "Falha na análise",
      description: message,
      actionLabel: "Tentar novamente",
      actionHref: null,
    };
  };

  const { title, description, actionLabel, actionHref } =
    getActionableMessage();

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-destructive">
          Analysis failed
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>

        <p className="mt-3 text-sm text-muted-foreground">{description}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={onRetry}
            className="focus-ring rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {actionLabel}
          </button>

          {actionHref && (
            <Link
              to={actionHref}
              className="focus-ring rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              {actionHref === "/settings"
                ? "Configurar token"
                : "Abrir configurações"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultsView({
  analysis,
  selected,
  onSelect,
  filter,
  onFilter,
  graphSvgRef,
  mindmapSvgRef,
  displayMode,
  onDisplayModeChange,
}: {
  analysis: Analysis;
  selected: GraphNode | null;
  onSelect: (n: GraphNode | null) => void;
  filter: NodeKind | "all";
  onFilter: (f: NodeKind | "all") => void;
  graphSvgRef: React.MutableRefObject<SVGSVGElement | null>;
  mindmapSvgRef: React.MutableRefObject<SVGSVGElement | null>;
  displayMode: ResultDisplayMode;
  onDisplayModeChange: (mode: ResultDisplayMode) => void;
}) {
  const isMobile = useIsMobile();

  const hasTruncationWarning = analysis.limitations?.some(
    (l) =>
      l.includes("truncated") || l.includes("cap") || l.includes("Analisado"),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-border bg-surface px-4 py-3">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {analysis.owner}/{analysis.repo}
            </h1>

            <p className="mt-1 truncate text-xs text-muted-foreground">
              Branch {analysis.branch} · {analysis.nodes.length} nós ·{" "}
              {analysis.edges.length} arestas
            </p>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <ViewerMenu
              value={displayMode}
              onChange={onDisplayModeChange}
              compact={isMobile}
            />

            <ExportMenu
              analysis={analysis}
              svgRef={graphSvgRef}
              mindmapSvgRef={mindmapSvgRef}
              compact={isMobile}
            />
          </div>
        </div>
      </div>

      {hasTruncationWarning && (
        <div className="border-b border-warning/30 bg-warning/5 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-warning">
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>
              Análise parcial:{" "}
              {analysis.limitations?.find(
                (l) =>
                  l.includes("truncated") ||
                  l.includes("cap") ||
                  l.includes("Analisado"),
              )}
            </span>
          </div>
        </div>
      )}

      {displayMode === "cards" ? (
        <ResultsCards
          analysis={analysis}
          onOpenGraph={() => onDisplayModeChange("graph")}
          onOpenMindmap={() => onDisplayModeChange("mindmap")}
          graphSvgRef={graphSvgRef}
          mindmapSvgRef={mindmapSvgRef}
        />
      ) : displayMode === "graph" ? (
        <GraphWorkspace
          analysis={analysis}
          selected={selected}
          onSelect={onSelect}
          filter={filter}
          onFilter={onFilter}
          svgRef={graphSvgRef}
        />
      ) : displayMode === "chat" ? (
        <AIChatPanel analysis={analysis} />
      ) : (
        <MindmapWorkspace
          analysis={analysis}
          selected={selected}
          onSelect={onSelect}
          svgRef={mindmapSvgRef}
        />
      )}
    </div>
  );
}

function ViewerMenu({
  value,
  onChange,
  compact = false,
}: {
  value: ResultDisplayMode;
  onChange: (mode: ResultDisplayMode) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const currentLabel =
    value === "graph"
      ? "Graph"
      : value === "mindmap"
        ? "Mindmap"
        : value === "chat"
          ? "Chat"
          : "Cards";

  const options: Array<{
    key: ResultDisplayMode;
    label: string;
    icon: React.ReactNode;
  }> = [
    { key: "graph", label: "Graph", icon: <Workflow className="h-4 w-4" /> },
    {
      key: "mindmap",
      label: "Mindmap",
      icon: <Sparkles className="h-4 w-4" />,
    },
    { key: "cards", label: "Cards", icon: <LayoutGrid className="h-4 w-4" /> },
    {
      key: "chat",
      label: "AI Chat",
      icon: <MessageCircle className="h-4 w-4" />,
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-background text-foreground hover:bg-muted ${
          compact
            ? "h-10 px-3 text-xs font-medium"
            : "h-10 px-3 text-sm font-medium"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-muted-foreground">Viewer</span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-foreground">
          {currentLabel}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-20 cursor-default"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-[calc(100%+8px)] z-30 min-w-[220px] overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
            {options.map((option) => {
              const active = value === option.key;

              return (
                <button
                  key={option.key}
                  onClick={() => {
                    onChange(option.key);
                    setOpen(false);
                  }}
                  className={`focus-ring flex w-full items-center justify-between gap-3 border-b border-border px-3 py-3 text-left last:border-b-0 ${
                    active
                      ? "bg-primary/5 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {option.icon}
                    <span className="text-sm font-medium">{option.label}</span>
                  </span>

                  {active && (
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      ativo
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ResultsCards({
  analysis,
  onOpenGraph,
  onOpenMindmap,
  graphSvgRef,
  mindmapSvgRef,
}: {
  analysis: Analysis;
  onOpenGraph: () => void;
  onOpenMindmap: () => void;
  graphSvgRef: React.MutableRefObject<SVGSVGElement | null>;
  mindmapSvgRef: React.MutableRefObject<SVGSVGElement | null>;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-5 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Visualizadores
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              onClick={onOpenGraph}
              className="focus-ring rounded-3xl border border-border bg-surface p-5 text-left transition-colors hover:bg-muted"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-primary">
                <Workflow className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Graph Viewer
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Visualização relacional completa com zoom, filtros, seleção e
                modo tela cheia.
              </p>
              <span className="mt-5 inline-flex rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground">
                Abrir graph
              </span>
            </button>

            <button
              onClick={onOpenMindmap}
              className="focus-ring rounded-3xl border border-border bg-surface p-5 text-left transition-colors hover:bg-muted"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Mindmap Viewer
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Navegação estrutural em árvore com expansão progressiva ao
                clicar nos nós.
              </p>
              <span className="mt-5 inline-flex rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground">
                Abrir mindmap
              </span>
            </button>
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Exportações
            </h2>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Exporte o resultado em formatos técnicos, documentação,
              visualização e compartilhamento.
            </p>

            <div className="flex justify-start">
              <ExportMenu
                analysis={analysis}
                svgRef={graphSvgRef}
                mindmapSvgRef={mindmapSvgRef}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <MetricCard
              title="Cobertura da análise"
              value={analysis.quality}
              body={`Fonte usada: ${analysis.sourceUsed}`}
            />
            <MetricCard
              title="Escala estrutural"
              value={`${analysis.nodes.length} nós`}
              body={`${analysis.edges.length} relações mapeadas`}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  body,
}: {
  title: string;
  value: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function GraphWorkspace({
  analysis,
  selected,
  onSelect,
  filter,
  onFilter,
  svgRef,
}: {
  analysis: Analysis;
  selected: GraphNode | null;
  onSelect: (n: GraphNode | null) => void;
  filter: NodeKind | "all";
  onFilter: (f: NodeKind | "all") => void;
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
}) {
  const [search, setSearch] = useState("");
  const [showSemanticSearch, setShowSemanticSearch] = useState(false);

  const kinds: Array<{ key: NodeKind | "all"; label: string }> = useMemo(
    () => [
      { key: "all", label: "Todos" },
      { key: "module", label: "Módulos" },
      { key: "file", label: "Arquivos" },
      { key: "function", label: "Funções" },
      { key: "external", label: "Externos" },
      { key: "config", label: "Config" },
    ],
    [],
  );

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return analysis.nodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.path?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [search, analysis.nodes]);

  return (
    <div className="grid min-h-0 flex-1 xl:grid-cols-[1fr_320px]">
      <div className="min-h-0 border-r border-border">
        <div className="border-b border-border bg-surface px-3 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {kinds.map((kind) => (
                <button
                  key={kind.key}
                  onClick={() => onFilter(kind.key)}
                  className={`focus-ring rounded-xl px-3 py-2 text-xs font-medium ${
                    filter === kind.key
                      ? "bg-primary/10 text-primary"
                      : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {kind.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar função, arquivo ou nó..."
                  className="focus-ring h-10 w-full rounded-xl border border-input bg-background px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 sm:w-72"
                />
                {matches.length > 0 && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-xl sm:w-80">
                    {matches.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => {
                          onSelect(node);
                          setSearch("");
                        }}
                        className="focus-ring flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">
                            {node.label}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {node.path ?? "Sem caminho"}
                          </p>
                        </div>

                        <span className="rounded-full border border-border px-2 py-1 text-[10px] uppercase text-muted-foreground">
                          {node.kind}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowSemanticSearch((v) => !v)}
                className="focus-ring inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted"
              >
                AI Search
              </button>
            </div>
          </div>
        </div>

        {showSemanticSearch && (
          <div className="border-b border-border bg-surface px-3 py-3">
            <SemanticSearchPanel
              analysis={analysis}
              onSelect={(node) => {
                onSelect(node);
                setShowSemanticSearch(false);
              }}
            />
          </div>
        )}

        <div className="h-[calc(100vh-190px)] p-3">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center rounded-3xl border border-border bg-surface text-sm text-muted-foreground">
                Carregando visualização do grafo...
              </div>
            }
          >
            <GraphViewer
              analysis={analysis}
              onSelect={onSelect}
              selectedId={selected?.id ?? null}
              filterKind={filter}
              svgRef={svgRef}
            />
          </Suspense>
        </div>
      </div>

      <aside className="hidden min-h-0 overflow-y-auto bg-surface xl:block">
        <MetricsSidebar analysis={analysis} selected={selected} />
        <div className="border-t border-border px-4 py-4">
          <InsightPanel
            analysis={analysis}
            onFocus={(id) => {
              const node = analysis.nodes.find((item) => item.id === id);
              if (node) onSelect(node);
            }}
          />
        </div>
      </aside>
    </div>
  );
}

function MindmapWorkspace({
  analysis,
  selected,
  onSelect,
  svgRef,
}: {
  analysis: Analysis;
  selected: GraphNode | null;
  onSelect: (n: GraphNode | null) => void;
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
}) {
  return (
    <div className="grid min-h-0 flex-1 xl:grid-cols-[1fr_320px]">
      <div className="min-h-0 border-r border-border p-3">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center rounded-3xl border border-border bg-surface text-sm text-muted-foreground">
              Carregando visualização do mindmap...
            </div>
          }
        >
          <div className="h-[calc(100vh-190px)]">
            <MindmapViewer
              analysis={analysis}
              onSelect={onSelect}
              selectedId={selected?.id ?? null}
              svgRef={svgRef}
            />
          </div>
        </Suspense>
      </div>

      <aside className="hidden min-h-0 overflow-y-auto bg-surface xl:block">
        <MetricsSidebar analysis={analysis} selected={selected} />
        <div className="border-t border-border px-4 py-4">
          <InsightPanel
            analysis={analysis}
            onFocus={(id) => {
              const node = analysis.nodes.find((item) => item.id === id);
              if (node) onSelect(node);
            }}
          />
        </div>
      </aside>
    </div>
  );
}

function ModalShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface hover:bg-muted"
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(88vh-72px)] overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function HistoryModal({
  open,
  entries,
  activeId,
  onClose,
  onOpen,
  onDelete,
  onClear,
}: {
  open: boolean;
  entries: HistoryEntry[];
  activeId?: string;
  onClose: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter((e) =>
      `${e.owner}/${e.repo} ${e.branch}`.toLowerCase().includes(q),
    );
  }, [entries, query]);

  return (
    <ModalShell open={open} title="Histórico de análises" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar por repositório ou branch..."
            className="focus-ring h-11 w-full rounded-2xl border border-input bg-surface px-4 text-sm text-foreground placeholder:text-muted-foreground/60"
          />

          {entries.length > 0 && (
            <button
              onClick={onClear}
              className="focus-ring inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface px-4 text-sm text-muted-foreground hover:bg-muted"
            >
              Limpar histórico
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum resultado encontrado.
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((entry) => {
              const active = entry.id === activeId;
              return (
                <div
                  key={entry.id}
                  className={`rounded-2xl border px-4 py-4 ${
                    active
                      ? "border-primary/20 bg-primary/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={() => onOpen(entry.id)}
                      className="focus-ring min-w-0 flex-1 text-left"
                    >
                      <p className="truncate font-mono text-sm font-semibold text-foreground">
                        {entry.owner}/{entry.repo}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.branch} · {entry.nodeCount} nós ·{" "}
                        {entry.edgeCount} arestas
                      </p>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpen(entry.id)}
                        className="focus-ring rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="focus-ring rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/5"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalShell open={open} title="Sobre a Ferramenta" onClose={onClose}>
      <div className="space-y-5 text-sm leading-7 text-muted-foreground">
        <section>
          <h3 className="text-sm font-semibold text-foreground">
            Como funciona
          </h3>
          <p className="mt-2">
            O Gitgraph recebe uma URL de repositório, coleta a estrutura do
            projeto, interpreta relações entre arquivos, funções e módulos, e
            transforma isso em um conjunto de saídas úteis para leitura humana e
            uso por agentes de IA.
          </p>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">
            O que ele entrega
          </h3>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Visualização em grafo para inspeção estrutural.</li>
            <li>Formatos de exportação para documentação e automação.</li>
            <li>
              Arquivos adequados para reduzir contexto e economizar tokens em
              LLMs.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Exportações</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>JSON: ideal para agentes e pipelines automatizados.</li>
            <li>Mermaid: ótimo para markdown, docs e IDEs.</li>
            <li>GraphML e DOT: interoperabilidade com ferramentas técnicas.</li>
            <li>HTML: relatório compartilhável.</li>
            <li>PNG/SVG: visual rápido para apresentação.</li>
          </ul>
        </section>
      </div>
    </ModalShell>
  );
}

function LLMsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const skillUrl =
    "https://github.com/faelscarpato/gitgraph/tree/b590805768d39b956fb01275bf22e544fc72bee6/public/knowledge/gitgraph-analyzer";

  return (
    <ModalShell open={open} title="LLMs e Agents" onClose={onClose}>
      <div className="space-y-5 text-sm leading-7 text-muted-foreground">
        <section>
          <h3 className="text-sm font-semibold text-foreground">
            Uso com LLMs
          </h3>
          <p className="mt-2">
            A ideia é exportar a estrutura do projeto em formatos menores e mais
            objetivos, reduzindo releitura desnecessária do código bruto e
            economizando tokens.
          </p>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Skill base</h3>
          <div className="mt-2 rounded-2xl border border-border bg-surface p-4">
            <p className="break-all font-mono text-xs text-foreground">
              {skillUrl}
            </p>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">
            Ferramentas alvo
          </h3>
          <p className="mt-2">
            Copilot, OpenCode, Claude Code, Claude, GPT, Codex, Gemini, Gemini
            CLI, CodeClaw, Hermes e outras integrações CLI/IDE.
          </p>
        </section>
      </div>
    </ModalShell>
  );
}

function FirstRunModal({
  open,
  onClose,
  onSetupToken,
}: {
  open: boolean;
  onClose: () => void;
  onSetupToken: () => void;
}) {
  if (!open) return null;

  return (
    <ModalShell
      open={open}
      title="Bem-vindo ao GenIA Analyzer"
      onClose={onClose}
    >
      <div className="space-y-6 text-sm leading-7 text-muted-foreground">
        <section>
          <h3 className="text-sm font-semibold text-foreground">
            Analise qualquer repositório GitHub em segundos
          </h3>
          <p className="mt-2">
            Cole a URL de um repositório público e gere um grafo de conhecimento
            interativo com módulos, dependências, complexidade e métricas
            arquiteturais.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-mono">
              Dica importante
            </span>
            GitHub Token
          </h3>
          <p className="mt-3 text-muted-foreground">
            Sem token, o GitHub limita a <strong>60 requisições/hora</strong>.
            Com um Personal Access Token (apenas escopo{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">
              public_repo
            </code>
            ), o limite sobe para <strong>5.000/hora</strong> — essencial para
            repositórios maiores.
          </p>
        </section>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onSetupToken}
            className="flex-1 focus-ring rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Configurar token agora
          </button>
          <button
            onClick={onClose}
            className="flex-1 focus-ring rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Depois
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function TokenOnboardingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [token, setToken] = useState("");

  if (!open) return null;

  const saveToken = () => {
    if (token.trim()) {
      localStorage.setItem("genia:v2:github:token", token.trim());
    }
    onClose();
  };

  return (
    <ModalShell open={open} title="Configurar GitHub Token" onClose={onClose}>
      <div className="space-y-5 text-sm leading-7 text-muted-foreground">
        <section>
          <h3 className="text-sm font-semibold text-foreground">
            Como criar um Personal Access Token
          </h3>
          <ol className="mt-3 list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              Acesse{" "}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                github.com/settings/tokens
              </a>
            </li>
            <li>
              Clique em <strong>Generate new token (classic)</strong>
            </li>
            <li>Dê um nome (ex: "GenIA Analyzer")</li>
            <li>
              Em <strong>Select scopes</strong>, marque apenas{" "}
              <code className="font-mono text-xs bg-muted px-1 rounded">
                public_repo
              </code>
            </li>
            <li>
              Clique em <strong>Generate token</strong> e{" "}
              <strong>copie o token</strong> (começa com{" "}
              <code className="font-mono">ghp_</code>)
            </li>
            <li>Cole abaixo e salve</li>
          </ol>
        </section>

        <div className="space-y-3">
          <label className="block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Personal Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_..."
            autoComplete="off"
            className="focus-ring h-11 w-full rounded-xl border border-input bg-surface px-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/60"
            onKeyDown={(e) => e.key === "Enter" && saveToken()}
          />
          <p className="text-xs text-muted-foreground">
            O token fica salvo apenas neste navegador (localStorage). Não é
            enviado a nenhum servidor.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={saveToken}
            className="flex-1 focus-ring rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Salvar e fechar
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
