import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { Analysis, GraphEdge, GraphNode, NodeKind } from "@/lib/graph-types";

interface Props {
  analysis: Analysis;
  onSelect?: (node: GraphNode | null) => void;
  selectedId?: string | null;
  filterKind?: NodeKind | "all";
  svgRef?: React.MutableRefObject<SVGSVGElement | null>;
}

type SimNode = GraphNode & d3.SimulationNodeDatum;
type SimLink = { source: SimNode; target: SimNode; kind: GraphEdge["kind"]; weight: number };

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

export function GraphViewer({ analysis, onSelect, selectedId, filterKind = "all", svgRef }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const internalSvg = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setDims({ w: Math.max(320, cr.width), h: Math.max(320, cr.height) });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

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

  // Adjacency for hover highlight
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

  useEffect(() => {
    const svg = internalSvg.current;
    if (!svg) return;
    if (svgRef) svgRef.current = svg;
    const sel = d3.select(svg);
    sel.selectAll("*").remove();

    // grid pattern
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
    // arrow
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

    sel.append("rect").attr("width", "100%").attr("height", "100%").attr("fill", "url(#gridpat)");

    const g = sel.append("g");
    gRef.current = g.node();

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on("zoom", (e) => g.attr("transform", e.transform.toString()));
    zoomRef.current = zoom;
    sel.call(zoom);

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
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (e, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    node
      .append("circle")
      .attr("r", (d) => KIND_RADIUS[d.kind])
      .attr("fill", (d) => KIND_COLOR[d.kind])
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("stroke-width", 1);

    node
      .append("text")
      .text((d) => d.label)
      .attr("x", (d) => KIND_RADIUS[d.kind] + 4)
      .attr("y", 3)
      .attr("fill", "rgba(230,240,255,0.85)")
      .attr("font-size", 10)
      .attr("font-family", "Inter, sans-serif")
      .attr("paint-order", "stroke")
      .attr("stroke", "rgba(13,20,36,0.85)")
      .attr("stroke-width", 3);

    node.on("click", (_, d) => onSelect?.(d));
    node.on("mouseenter", (_, d) => {
      const neighbors = adjacency.get(d.id) ?? new Set();
      node.attr("opacity", (n) => (n.id === d.id || neighbors.has(n.id) ? 1 : 0.18));
      link
        .attr("stroke-opacity", (l) => (l.source.id === d.id || l.target.id === d.id ? 0.95 : 0.08))
        .attr("stroke", (l) =>
          l.source.id === d.id || l.target.id === d.id
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
        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
      });

    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, dims.w, dims.h]);

  // Highlight selected
  useEffect(() => {
    const g = gRef.current;
    if (!g) return;
    d3.select(g)
      .selectAll<SVGGElement, SimNode>("g > g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .attr("stroke", (d) => (d.id === selectedId ? "#ffffff" : "rgba(255,255,255,0.15)"))
      .attr("stroke-width", (d) => (d.id === selectedId ? 2.5 : 1));
  }, [selectedId]);

  const zoomBy = (k: number) => {
    if (!internalSvg.current || !zoomRef.current) return;
    d3.select(internalSvg.current).transition().duration(200).call(zoomRef.current.scaleBy, k);
  };
  const reset = () => {
    if (!internalSvg.current || !zoomRef.current) return;
    d3.select(internalSvg.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-lg bg-[var(--color-graph-bg)]"
    >
      <svg ref={internalSvg} width={dims.w} height={dims.h} className="block" />
      {/* Controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-md border border-white/10 bg-black/40 p-1 backdrop-blur-sm">
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
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-md border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-sm">
        {(Object.keys(KIND_COLOR) as NodeKind[]).map((k) => (
          <div
            key={k}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/70"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />
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
