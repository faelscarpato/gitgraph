import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Expand, Minimize2 } from "lucide-react";
import type {
  Analysis,
  GraphEdge,
  GraphNode,
  NodeKind,
} from "@/lib/graph-types";

interface Props {
  analysis: Analysis;
  onSelect?: (node: GraphNode | null) => void;
  selectedId?: string | null;
  filterKind?: NodeKind | "all";
  svgRef?: React.MutableRefObject<SVGSVGElement | null>;
}

type SimNode = GraphNode & d3.SimulationNodeDatum;
type SimLink = {
  source: SimNode;
  target: SimNode;
  kind: GraphEdge["kind"];
  weight: number;
};

const KIND_COLOR: Record<NodeKind, string> = {
  module: "var(--color-node-module)",
  file: "var(--color-node-file)",
  function: "var(--color-node-function)",
  external: "var(--color-node-external)",
  config: "var(--color-node-config)",
};

const KIND_RADIUS: Record<NodeKind, number> = {
  module: 12,
  file: 6,
  function: 4,
  external: 8,
  config: 7,
};

export function GraphViewer({
  analysis,
  onSelect,
  selectedId,
  filterKind = "all",
  svgRef,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const internalSvg = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dims, setDims] = useState({ w: 1200, h: 760 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const nodeElementsRef = useRef<SVGGElement[]>([]);

  // Memoized nodes & links — MUST come before useEffects that depend on them
  const { nodes, links } = useMemo(() => {
    const nodes: SimNode[] = analysis.nodes
      .filter((n) => filterKind === "all" || n.kind === filterKind)
      .map((n) => ({ ...n }));
    const ids = new Set(nodes.map((n) => n.id));
    const map = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = analysis.edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({
        source: map.get(e.source)!,
        target: map.get(e.target)!,
        kind: e.kind,
        weight: e.weight,
      }));
    return { nodes, links };
  }, [analysis, filterKind]);

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    links.forEach((l) => {
      if (!m.has(l.source.id)) m.set(l.source.id, new Set());
      if (!m.has(l.target.id)) m.set(l.target.id, new Set());
      m.get(l.source.id)!.add(l.target.id);
      m.get(l.target.id)!.add(l.source.id);
    });
    return m;
  }, [links]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setDims({ w: Math.max(360, cr.width), h: Math.max(560, cr.height) });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      if (
        e.target !== containerRef.current &&
        !(containerRef.current as HTMLElement).contains(e.target as Node)
      )
        return;
      if (nodes.length === 0) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev === null ? 0 : (prev + 1) % nodes.length,
        );
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev === null
            ? nodes.length - 1
            : (prev - 1 + nodes.length) % nodes.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIndex !== null) {
          onSelect?.(nodes[focusedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setFocusedIndex(null);
        onSelect?.(null);
      }
    };
    const container = containerRef.current;
    container?.setAttribute("tabindex", "0");
    container?.addEventListener("keydown", handleKeyDown);
    return () => {
      container?.removeEventListener("keydown", handleKeyDown);
    };
  }, [nodes, focusedIndex, onSelect]);

  // Fullscreen change
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Update node refs after render (will be filled in D3 creation)
  useEffect(() => {
    // We'll fill refs via callback refs on each <g> element
  }, [nodes]);

  const focusNodeAt = (index: number) => {
    if (index < 0) index = nodes.length - 1;
    if (index >= nodes.length) index = 0;
    setFocusedIndex(index);
    const nodeGroup = nodeElementsRef.current[index];
    if (nodeGroup) {
      nodeGroup.focus?.();
      // Optionally scroll into view
      const rect = nodeGroup.getBoundingClientRect();
      const container = containerRef.current;
      if (container) {
        const cRect = container.getBoundingClientRect();
        // Scroll logic can be added here if needed
      }
    }
  };

  useEffect(() => {
    const svg = internalSvg.current;
    if (!svg) return;
    if (svgRef) svgRef.current = svg;

    const sel = d3.select(svg);
    sel.selectAll("*").remove();

    const defs = sel.append("defs");
    const pattern = defs
      .append("pattern")
      .attr("id", "gridpat")
      .attr("width", 32)
      .attr("height", 32)
      .attr("patternUnits", "userSpaceOnUse");

    pattern
      .append("path")
      .attr("d", "M 32 0 L 0 0 0 32")
      .attr("fill", "none")
      .attr("stroke", "var(--color-graph-grid)")
      .attr("stroke-width", 0.6)
      .attr("opacity", 0.4);

    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 14)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", "var(--color-edge)");

    sel
      .append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "url(#gridpat)");

    const g = sel.append("g");
    gRef.current = g.node();

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on("zoom", (e) => g.attr("transform", e.transform.toString()));
    zoomRef.current = zoom;
    sel.call(zoom as never);

    const link = g
      .append("g")
      .attr("stroke-linecap", "round")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "var(--color-edge)")
      .attr("stroke-opacity", 0.55)
      .attr("stroke-width", (d) => Math.max(0.8, Math.min(2.5, d.weight * 0.9)))
      .attr("stroke-dasharray", (d) => (d.kind === "config" ? "3 3" : null))
      .attr("marker-end", "url(#arrow)");

    const node = g
      .append("g")
      .selectAll<SVGGElement, { node: SimNode; index: number }>("g")
      .data(nodes.map((n, i) => ({ node: n, index: i })))
      .join("g")
      .attr("cursor", "pointer")
      .attr("tabindex", -1) // make focusable via JS
      .each(function (d, i, nodes) {
        // Store the DOM element
        nodeElementsRef.current[d.index] = this as SVGGElement;
      })
      .call(
        d3
          .drag<SVGGElement, { node: SimNode; index: number }>()
          .on("start", (e, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.node.fx = d.node.x;
            d.node.fy = d.node.y;
          })
          .on("drag", (e, d) => {
            d.node.fx = e.x;
            d.node.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) sim.alphaTarget(0);
            d.node.fx = null;
            d.node.fy = null;
          }),
      );

    node
      .append("circle")
      .attr("r", (d) => KIND_RADIUS[d.node.kind])
      .attr("fill", (d) => KIND_COLOR[d.node.kind])
      .attr("stroke", (d) =>
        d.index === focusedIndex
          ? "var(--color-ring)"
          : d.node.id === selectedId
            ? "#ffffff"
            : "rgba(255,255,255,0.15)",
      )
      .attr("stroke-width", (d) =>
        d.index === focusedIndex || d.node.id === selectedId ? 2.5 : 1,
      );

    node
      .append("text")
      .text((d) => d.node.label)
      .attr("x", (d) => KIND_RADIUS[d.node.kind] + 4)
      .attr("y", 3)
      .attr("fill", "rgba(230,240,255,0.85)")
      .attr("font-size", 10)
      .attr("font-family", "Inter, sans-serif")
      .attr("paint-order", "stroke")
      .attr("stroke", "rgba(13,20,36,0.85)")
      .attr("stroke-width", 3);

    node.on("click", (_, d) => onSelect?.(d.node));
    node.on("mouseenter", (_, d) => {
      const neighbors = adjacency.get(d.node.id) ?? new Set();
      node.attr("opacity", (n) =>
        n.node.id === d.node.id || neighbors.has(n.node.id) ? 1 : 0.18,
      );
      link
        .attr("stroke-opacity", (l) =>
          l.source.id === d.node.id || l.target.id === d.node.id ? 0.95 : 0.08,
        )
        .attr("stroke", (l) =>
          l.source.id === d.node.id || l.target.id === d.node.id
            ? "var(--color-edge-strong)"
            : "var(--color-edge)",
        );
    });
    node.on("mouseleave", () => {
      node.attr("opacity", 1);
      link.attr("stroke-opacity", 0.55).attr("stroke", "var(--color-edge)");
    });

    const sim = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => (l.source.kind === "module" ? 60 : 45))
          .strength(0.35),
      )
      .force("charge", d3.forceManyBody().strength(-140))
      .force("center", d3.forceCenter(dims.w / 2, dims.h / 2))
      .force(
        "collide",
        d3.forceCollide<SimNode>().radius((d) => KIND_RADIUS[d.kind] + 6),
      )
      .on("tick", () => {
        link
          .attr("x1", (d) => (d.source as SimNode).x!)
          .attr("y1", (d) => (d.source as SimNode).y!)
          .attr("x2", (d) => (d.target as SimNode).x!)
          .attr("y2", (d) => (d.target as SimNode).y!);
        node.attr("transform", (d) => `translate(${d.node.x},${d.node.y})`);
      });

    return () => sim.stop();
  }, [nodes, links, dims.w, dims.h, adjacency, onSelect, svgRef]);

  useEffect(() => {
    const g = gRef.current;
    if (!g) return;
    d3.select(g)
      .selectAll<SVGGElement, SimNode>("g > g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .attr("stroke", (d) =>
        d.id === selectedId ? "#ffffff" : "rgba(255,255,255,0.15)",
      )
      .attr("stroke-width", (d) => (d.id === selectedId ? 2.5 : 1));
  }, [selectedId]);

  const zoomBy = (k: number) => {
    if (!internalSvg.current || !zoomRef.current) return;
    d3.select(internalSvg.current)
      .transition()
      .duration(200)
      .call(zoomRef.current.scaleBy, k);
  };

  const reset = () => {
    if (!internalSvg.current || !zoomRef.current) return;
    d3.select(internalSvg.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.transform, d3.zoomIdentity);
  };

  const toggleFullscreen = async () => {
    if (!hostRef.current) return;
    if (!document.fullscreenElement) {
      await hostRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  // Focus outline effect
  useEffect(() => {
    nodeElementsRef.current.forEach((el, i) => {
      if (!el) return;
      if (i === focusedIndex) {
        el.classList.add("focus-visible");
        // Optionally scroll into view
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      } else {
        el.classList.remove("focus-visible");
      }
    });
  }, [focusedIndex, nodeElementsRef.current]);

  return (
    <div
      ref={hostRef}
      className="relative h-full w-full overflow-hidden rounded-lg bg-[var(--color-graph-bg)]"
    >
      <div ref={containerRef} className="h-full w-full touch-none">
        <svg
          ref={internalSvg}
          width={dims.w}
          height={dims.h}
          className="block h-full w-full"
        />
      </div>

      <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-md border border-white/10 bg-black/40 p-1 backdrop-blur-sm">
        <button
          onClick={toggleFullscreen}
          className="focus-ring rounded px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          aria-label={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Expand className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          onClick={() => zoomBy(1.3)}
          className="focus-ring rounded px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => zoomBy(0.77)}
          className="focus-ring rounded px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={reset}
          className="focus-ring rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/70 hover:bg-white/10"
          aria-label="Reset view"
        >
          Fit
        </button>
      </div>

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-md border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-sm">
        {(Object.keys(KIND_COLOR) as NodeKind[]).map((k) => (
          <div
            key={k}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/70"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: KIND_COLOR[k] }}
            />
            {k}
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 right-3 rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-[10px] text-white/60 backdrop-blur-sm">
        {nodes.length} nodes · {links.length} edges
      </div>
    </div>
  );
}
