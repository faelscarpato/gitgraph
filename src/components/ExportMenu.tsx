import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Analysis } from "@/lib/graph-types";
import { exportGraphML, exportHtml, exportJson, exportPng } from "@/lib/export";
import { generateShareUrl } from "@/lib/share";

interface Props {
  analysis: Analysis;
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
}

const OPTIONS = [
  { key: "json", label: "JSON", hint: "Full data for AI agents" },
  { key: "graphml", label: "GraphML", hint: "For Gephi / yEd" },
  { key: "png", label: "PNG", hint: "Screenshot of graph" },
  { key: "html", label: "HTML", hint: "Shareable static report" },
  { key: "url", label: "URL", hint: "Shareable link" },
] as const;

export function ExportMenu({ analysis, svgRef }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handle = (key: (typeof OPTIONS)[number]["key"]) => {
    if (key === "json") exportJson(analysis);
    else if (key === "graphml") exportGraphML(analysis);
    else if (key === "png") exportPng(svgRef.current, analysis);
    else if (key === "html") exportHtml(analysis);
    else if (key === "url") {
      const url = generateShareUrl(analysis, window.location.origin);
      setShareUrl(url);
      // Copy to clipboard
      navigator.clipboard.writeText(url).then(() => {
        setLast("url");
      });
    }
    setOpen(false);
    setTimeout(() => setLast(null), 2000);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
      >
        Export
        <span aria-hidden className="text-muted-foreground">
          ↓
        </span>
      </button>
      {last && (
        <span className="absolute -bottom-6 right-0 whitespace-nowrap text-[10px] uppercase tracking-widest text-success">
          {last === "url" ? "URL copied" : `${last} exported`}
        </span>
      )}
      {shareUrl && last === "url" && (
        <div className="absolute -bottom-12 right-0 w-64 rounded-md border border-border bg-popover p-2 text-[10px] shadow-lg">
          <div className="truncate font-mono">{shareUrl}</div>
        </div>
      )}
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => handle(o.key as (typeof OPTIONS)[number]["key"])}
              className="focus-ring flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <div>
                <div className="font-medium text-foreground">{o.label}</div>
                <div className="text-[11px] text-muted-foreground">{o.hint}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
