import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Code2,
  FileCode2,
  FileJson,
  FileText,
  FileType2,
  Image,
  Link2,
  Network,
  ScanText,
  Shapes,
  Share2,
  Sparkles,
  X,
} from "lucide-react";

import type { Analysis } from "@/lib/graph-types";
import {
  exportDot,
  exportGraphML,
  exportHtml,
  exportJson,
  exportMarkdown,
  exportMermaid,
  exportMermaidMindmap,
  exportPng,
  exportSvg,
  exportTxt,
} from "@/lib/export";
import { generateShareUrl } from "@/lib/share";

interface Props {
  analysis: Analysis;
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
  mindmapSvgRef?: React.MutableRefObject<SVGSVGElement | null>;
  compact?: boolean;
}

type ExportKey =
  | "json"
  | "txt"
  | "markdown"
  | "graphml"
  | "dot"
  | "mermaid"
  | "mindmap"
  | "svg"
  | "png"
  | "html"
  | "url";

type ExportOption = {
  key: ExportKey;
  label: string;
  hint: string;
  group: "visual" | "data" | "docs" | "share";
  icon: React.ReactNode;
  requiresGraph?: boolean;
  requiresMindmap?: boolean;
};

const OPTIONS: ExportOption[] = [
  {
    key: "svg",
    label: "SVG",
    hint: "Exporta o SVG limpo do visualizador de mindmap",
    group: "visual",
    icon: <Shapes className="h-4 w-4" />,
    requiresMindmap: true,
  },
  {
    key: "png",
    label: "PNG",
    hint: "Imagem rasterizada do graph atual",
    group: "visual",
    icon: <Image className="h-4 w-4" />,
    requiresGraph: true,
  },
  {
    key: "json",
    label: "JSON",
    hint: "Dados completos para IA e automação",
    group: "data",
    icon: <FileJson className="h-4 w-4" />,
  },
  {
    key: "graphml",
    label: "GraphML",
    hint: "Compatível com Gephi e yEd",
    group: "data",
    icon: <Network className="h-4 w-4" />,
  },
  {
    key: "dot",
    label: "DOT",
    hint: "Formato técnico para Graphviz",
    group: "data",
    icon: <Code2 className="h-4 w-4" />,
  },
  {
    key: "mermaid",
    label: "Mermaid",
    hint: "Flowchart leve para docs e prompts",
    group: "docs",
    icon: <FileCode2 className="h-4 w-4" />,
  },
  {
    key: "mindmap",
    label: "Mindmap",
    hint: "Mermaid mindmap para visão estrutural",
    group: "docs",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    key: "markdown",
    label: "Markdown",
    hint: "Relatório em .md para documentação",
    group: "docs",
    icon: <FileType2 className="h-4 w-4" />,
  },
  {
    key: "txt",
    label: "TXT",
    hint: "Resumo portátil para copiar em LLMs",
    group: "docs",
    icon: <ScanText className="h-4 w-4" />,
  },
  {
    key: "html",
    label: "HTML",
    hint: "Relatório visual estático e compartilhável",
    group: "docs",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: "url",
    label: "URL",
    hint: "Link rápido para compartilhamento",
    group: "share",
    icon: <Link2 className="h-4 w-4" />,
  },
];

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

export function ExportMenu({
  analysis,
  svgRef,
  mindmapSvgRef,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [lastExport, setLastExport] = useState<ExportKey | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const grouped = useMemo(() => {
    return {
      visual: OPTIONS.filter((item) => item.group === "visual"),
      data: OPTIONS.filter((item) => item.group === "data"),
      docs: OPTIONS.filter((item) => item.group === "docs"),
      share: OPTIONS.filter((item) => item.group === "share"),
    };
  }, []);

  const flashSuccess = (key: ExportKey) => {
    setLastExport(key);
    window.setTimeout(() => setLastExport(null), 2200);
  };

  const handleExport = async (key: ExportKey) => {
    try {
      if (key === "json") exportJson(analysis);
      else if (key === "txt") exportTxt(analysis);
      else if (key === "markdown") exportMarkdown(analysis);
      else if (key === "graphml") exportGraphML(analysis);
      else if (key === "dot") exportDot(analysis);
      else if (key === "mermaid") exportMermaid(analysis);
      else if (key === "mindmap") exportMermaidMindmap(analysis);
      else if (key === "svg")
        exportSvg(mindmapSvgRef?.current ?? null, analysis, "mindmap");
      else if (key === "png") exportPng(svgRef.current, analysis);
      else if (key === "html") exportHtml(analysis);
      else if (key === "url") {
        const url = generateShareUrl(analysis, window.location.origin);
        setShareUrl(url);
        await navigator.clipboard.writeText(url);
      }

      flashSuccess(key);
      setOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative ">
      <button
        onClick={() => setOpen((current) => !current)}
        className={`focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-background text-foreground hover:bg-muted ${
          compact
            ? "h-10 px-3 text-xs font-medium"
            : "h-10 px-3 text-sm font-medium"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Share2 className="h-4 w-4" />
        {!compact && <span>Exportar</span>}
        {compact && <span>Export</span>}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {lastExport && !open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30">
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-medium text-emerald-400 shadow-lg">
            <Check className="h-3.5 w-3.5" />
            {lastExport === "url"
              ? "URL copiada"
              : `${labelFor(lastExport)} exportado`}
          </div>
        </div>
      )}

      {shareUrl && lastExport === "url" && !open && !isMobile && (
        <div className="absolute right-0 top-[calc(100%+48px)] z-30 w-80 rounded-2xl border border-border bg-popover p-3 shadow-2xl">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Link compartilhável
          </p>
          <p className="break-all font-mono text-[11px] text-foreground">
            {shareUrl}
          </p>
        </div>
      )}

      {open &&
        (isMobile ? (
          <div className="fixed inset-0 z-[50] md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 max-h-[52vh] rounded-t-[28px] border-t border-border bg-popover shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <div>
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    Exportações
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Escolha um formato para exportar
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background hover:bg-muted"
                  aria-label="Fechar exportações"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[calc(82vh-76px)] overflow-y-auto p-4 pb-8">
                <ExportGroup
                  title="Visualização"
                  items={grouped.visual}
                  onSelect={handleExport}
                  graphAvailable={!!svgRef.current}
                  mindmapAvailable={!!mindmapSvgRef?.current}
                />
                <ExportGroup
                  title="Dados técnicos"
                  items={grouped.data}
                  onSelect={handleExport}
                  graphAvailable={!!svgRef.current}
                  mindmapAvailable={!!mindmapSvgRef?.current}
                />
                <ExportGroup
                  title="Docs e LLMs"
                  items={grouped.docs}
                  onSelect={handleExport}
                  graphAvailable={!!svgRef.current}
                  mindmapAvailable={!!mindmapSvgRef?.current}
                />
                <ExportGroup
                  title="Compartilhamento"
                  items={grouped.share}
                  onSelect={handleExport}
                  graphAvailable={!!svgRef.current}
                  mindmapAvailable={!!mindmapSvgRef?.current}
                />
                {shareUrl && lastExport === "url" && (
                  <div className="mt-4 rounded-2xl border border-border bg-background p-3">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                      Link compartilhável
                    </p>
                    <p className="break-all font-mono text-[11px] text-foreground">
                      {shareUrl}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[360px] overflow-hidden rounded-3xl border border-border bg-popover shadow-2xl">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Exportações do projeto
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Exporte para documentação, visualização, automação ou uso com
                LLMs.
              </p>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-3">
              <ExportGroup
                title="Visualização"
                items={grouped.visual}
                onSelect={handleExport}
                graphAvailable={!!svgRef.current}
                mindmapAvailable={!!mindmapSvgRef?.current}
              />
              <ExportGroup
                title="Dados técnicos"
                items={grouped.data}
                onSelect={handleExport}
                graphAvailable={!!svgRef.current}
                mindmapAvailable={!!mindmapSvgRef?.current}
              />
              <ExportGroup
                title="Docs e LLMs"
                items={grouped.docs}
                onSelect={handleExport}
                graphAvailable={!!svgRef.current}
                mindmapAvailable={!!mindmapSvgRef?.current}
              />
              <ExportGroup
                title="Compartilhamento"
                items={grouped.share}
                onSelect={handleExport}
                graphAvailable={!!svgRef.current}
                mindmapAvailable={!!mindmapSvgRef?.current}
              />
            </div>
          </div>
        ))}
    </div>
  );
}

function ExportGroup({
  title,
  items,
  onSelect,
  graphAvailable,
  mindmapAvailable,
}: {
  title: string;
  items: ExportOption[];
  onSelect: (key: ExportKey) => void;
  graphAvailable: boolean;
  mindmapAvailable: boolean;
}) {
  return (
    <section className="mb-4 last:mb-0">
      <div className="mb-2 px-1">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
      </div>

      <div className="grid gap-2">
        {items.map((item) => {
          const disabled =
            (item.requiresGraph && !graphAvailable) ||
            (item.requiresMindmap && !mindmapAvailable);

          return (
            <button
              key={item.key}
              onClick={() => !disabled && onSelect(item.key)}
              disabled={disabled}
              className={`focus-ring flex items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                disabled
                  ? "cursor-not-allowed border-border bg-background/40 opacity-50"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-primary">
                {item.icon}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    {item.label}
                  </p>
                  {item.requiresGraph && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Graph
                    </span>
                  )}
                  {item.requiresMindmap && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Mindmap
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.hint}
                </p>

                {disabled && (
                  <p className="mt-2 text-[11px] text-amber-400">
                    {item.requiresMindmap
                      ? "Abra o visualizador de mindmap antes de exportar este SVG."
                      : "Abra a visualização do graph antes de exportar este formato."}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function labelFor(key: ExportKey): string {
  switch (key) {
    case "json":
      return "JSON";
    case "txt":
      return "TXT";
    case "markdown":
      return "Markdown";
    case "graphml":
      return "GraphML";
    case "dot":
      return "DOT";
    case "mermaid":
      return "Mermaid";
    case "mindmap":
      return "Mindmap";
    case "svg":
      return "SVG";
    case "png":
      return "PNG";
    case "html":
      return "HTML";
    case "url":
      return "URL";
    default:
      return "Arquivo";
  }
}
