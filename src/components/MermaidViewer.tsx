"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ChevronDown,
} from "lucide-react";

// Type declaration for mermaid
interface MermaidAPI {
  initialize: (config: MermaidConfig) => void;
  render: (id: string, text: string) => Promise<{ svg: string }>;
}

interface MermaidConfig {
  startOnLoad: boolean;
  theme: string;
  themeVariables: Record<string, string>;
}

declare global {
  interface Window {
    mermaid?: MermaidAPI;
  }
}

interface Props {
  content: string;
  className?: string;
}

export function MermaidViewer({ content, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = "";
    setRendered(false);
    setError(null);

    // Check if mermaid is available
    if (typeof window !== "undefined" && window.mermaid) {
      try {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#1e2a44",
            primaryTextColor: "#e6ecf5",
            primaryBorderColor: "#3b5998",
            lineColor: "#4a6fa5",
            secondaryColor: "#111a2e",
            tertiaryColor: "#0d1424",
          },
        });

        window.mermaid
          .render("mermaid-diagram", content)
          .then(({ svg }: { svg: string }) => {
            if (containerRef.current) {
              containerRef.current.innerHTML = svg;
              setRendered(true);
            }
          })
          .catch((err: Error) => {
            setError(err.message);
          });
      } catch (err) {
        setError("Failed to initialize mermaid");
      }
    } else {
      // Load mermaid dynamically
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
      script.onload = () => {
        if (window.mermaid && containerRef.current) {
          window.mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            themeVariables: {
              primaryColor: "#1e2a44",
              primaryTextColor: "#e6ecf5",
              primaryBorderColor: "#3b5998",
              lineColor: "#4a6fa5",
              secondaryColor: "#111a2e",
              tertiaryColor: "#0d1424",
            },
          });

          window.mermaid
            .render("mermaid-diagram", content)
            .then(({ svg }: { svg: string }) => {
              if (containerRef.current) {
                containerRef.current.innerHTML = svg;
                setRendered(true);
              }
            })
            .catch((err: Error) => {
              setError(err.message);
            });
        }
      };
      script.onerror = () => setError("Failed to load mermaid library");
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup if needed
    };
  }, [content]);

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const downloadContent = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.mmd";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        "relative border border-border bg-surface rounded-lg overflow-hidden",
        fullscreen && "fixed inset-0 z-50 h-screen w-screen bg-background",
        className,
      )}
      style={
        fullscreen
          ? { height: "100vh", width: "100vw" }
          : { minHeight: "400px" }
      }
    >
      {/* Toolbar */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={copyContent}
          className="gap-1"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-success" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copiar
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={downloadContent}
          className="gap-1"
        >
          <Download className="h-3 w-3" />
          Baixar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFullscreen(!fullscreen)}
        >
          {fullscreen ? (
            <Minimize2 className="h-3 w-3" />
          ) : (
            <Maximize2 className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 h-full overflow-auto">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive text-sm">
            <p className="font-medium mb-1">Erro ao renderizar diagrama</p>
            <pre className="font-mono text-xs overflow-auto max-h-64">
              {error}
            </pre>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs underline">
                Ver código fonte
              </summary>
              <pre className="mt-2 font-mono text-[10px] overflow-auto max-h-64">
                {content}
              </pre>
            </details>
          </div>
        )}

        {!error && !rendered && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm">Renderizando diagrama...</span>
            </div>
          </div>
        )}

        {!error && rendered && containerRef.current && (
          <div ref={containerRef} className="w-full min-h-[400px]" />
        )}

        {!error && !rendered && !containerRef.current && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <span className="text-sm">Preparando visualização...</span>
          </div>
        )}
      </div>

      {/* Source code toggle */}
      <details className="border-t border-border bg-surface/50">
        <summary className="p-3 cursor-pointer flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <span>Ver código Mermaid</span>
          <ChevronDown className="h-4 w-4" />
        </summary>
        <pre className="p-4 font-mono text-[10px] text-foreground/80 overflow-auto max-h-96 bg-background border-t border-border">
          {content}
        </pre>
      </details>
    </div>
  );
}
