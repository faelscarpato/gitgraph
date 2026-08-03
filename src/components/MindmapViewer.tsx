import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Expand, Minimize2 } from "lucide-react";
import type { Analysis, GraphNode } from "@/lib/graph-types";

interface Props {
  analysis: Analysis;
  onSelect?: (node: GraphNode | null) => void;
  selectedId?: string | null;
  svgRef?: React.MutableRefObject<SVGSVGElement | null>;
}

type MindNode = {
  id: string;
  label: string;
  kind: GraphNode["kind"] | "root";
  ref?: GraphNode;
  children?: MindNode[];
};

const KIND_COLORS: Record<string, string> = {
  root: "#E8EEF8",
  module: "#6EA8FE",
  file: "#7ADAA5",
  function: "#FFB86B",
  external: "#C792EA",
  config: "#F4D35E",
};

export function MindmapViewer({
  analysis,
  onSelect,
  selectedId,
  svgRef,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const internalSvgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dims, setDims] = useState({ w: 1200, h: 760 });
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect;
        setDims({
          w: Math.max(360, rect.width),
          h: Math.max(560, rect.height),
        });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const treeData = useMemo<MindNode>(() => {
    const nodeMap = new Map(analysis.nodes.map((n) => [n.id, n]));
    const outgoing = new Map<string, string[]>();

    for (const edge of analysis.edges) {
      if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
      outgoing.get(edge.source)!.push(edge.target);
    }

    const modules = analysis.nodes.filter((n) => n.kind === "module");
    const files = analysis.nodes.filter((n) => n.kind === "file");
    const roots = modules.length
      ? modules
      : files.length
        ? files
        : analysis.nodes.slice(0, 12);

    const visited = new Set<string>();

    const buildBranch = (id: string, depth: number): MindNode | null => {
      const ref = nodeMap.get(id);
      if (!ref) return null;

      if (visited.has(id) && depth > 1) {
        return {
          id,
          label: ref.label,
          kind: ref.kind,
          ref,
          children: [],
        };
      }

      visited.add(id);

      const childrenIds = (outgoing.get(id) ?? []).slice(
        0,
        depth === 0 ? 16 : depth === 1 ? 12 : 8,
      );
      const children = childrenIds
        .map((childId) => buildBranch(childId, depth + 1))
        .filter(Boolean) as MindNode[];

      return {
        id,
        label: ref.label,
        kind: ref.kind,
        ref,
        children,
      };
    };

    return {
      id: "root",
      label: `${analysis.owner}/${analysis.repo}`,
      kind: "root",
      children: roots
        .map((node) => buildBranch(node.id, 0))
        .filter(Boolean) as MindNode[],
    };
  }, [analysis]);

  const fit = () => {
    if (!internalSvgRef.current || !zoomRef.current || !gRef.current) return;

    const svg = d3.select(internalSvgRef.current);
    const g = d3.select(gRef.current);
    const bounds = (g.node() as SVGGElement).getBBox();

    if (!bounds.width || !bounds.height) return;

    const fullWidth = dims.w;
    const fullHeight = dims.h;
    const scale = Math.min(
      1.1,
      0.92 / Math.max(bounds.width / fullWidth, bounds.height / fullHeight),
    );

    const tx = fullWidth / 2 - scale * (bounds.x + bounds.width / 2);
    const ty = fullHeight / 2 - scale * (bounds.y + bounds.height / 2);

    svg
      .transition()
      .duration(280)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale),
      );
  };

  useEffect(() => {
    const svgEl = internalSvgRef.current;
    if (!svgEl) return;
    if (svgRef) svgRef.current = svgEl;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    svg
      .attr("viewBox", `0 0 ${dims.w} ${dims.h}`)
      .attr("width", dims.w)
      .attr("height", dims.h);

    svg
      .append("rect")
      .attr("width", dims.w)
      .attr("height", dims.h)
      .attr("fill", "#0B1220");

    const canvas = svg.append("g");
    gRef.current = canvas.node();

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        canvas.attr("transform", event.transform.toString());
      });

    zoomRef.current = zoom;
    svg.call(zoom as never);

    const root = d3.hierarchy<MindNode>(treeData, (d) =>
      expanded.has(d.id) || d.id === "root" ? (d.children ?? []) : [],
    );

    const layout = d3.tree<MindNode>().nodeSize([42, 220]);
    layout(root);

    const nodes = root.descendants();
    const links = root.links();

    const minX = d3.min(nodes, (d) => d.x) ?? 0;
    const maxX = d3.max(nodes, (d) => d.x) ?? 0;
    const offsetY = dims.h / 2 - (minX + maxX) / 2;
    const offsetX = 72;

    const g = canvas
      .append("g")
      .attr("transform", `translate(${offsetX},${offsetY})`);

    const defs = svg.append("defs");
    const shadow = defs
      .append("filter")
      .attr("id", "mindmap-shadow")
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "140%")
      .attr("height", "140%");
    shadow
      .append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 8)
      .attr("stdDeviation", 10)
      .attr("flood-color", "#000000")
      .attr("flood-opacity", 0.24);

    g.append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr(
        "d",
        d3
          .linkHorizontal<
            d3.HierarchyPointLink<MindNode>,
            d3.HierarchyPointNode<MindNode>
          >()
          .x((d) => d.y)
          .y((d) => d.x),
      )
      .attr("fill", "none")
      .attr("stroke", "#30415F")
      .attr("stroke-width", 1.4)
      .attr("stroke-opacity", 0.95);

    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .attr("cursor", "pointer")
      .on("click", (_, d) => {
        const id = d.data.id;
        if (d.data.ref) onSelect?.(d.data.ref);
        if ((d.data.children?.length ?? 0) > 0 || d.children || d._children) {
          setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }
      });

    node
      .append("rect")
      .attr("x", -6)
      .attr("y", -16)
      .attr("rx", 14)
      .attr("width", (d) => Math.max(120, d.data.label.length * 7.4 + 34))
      .attr("height", 32)
      .attr("fill", (d) => (d.data.id === selectedId ? "#1F3A68" : "#121B2D"))
      .attr("stroke", (d) => (d.data.id === selectedId ? "#8AB4FF" : "#24314D"))
      .attr("stroke-width", (d) => (d.data.id === selectedId ? 1.8 : 1.2))
      .attr("filter", "url(#mindmap-shadow)");

    node
      .append("circle")
      .attr("cx", 10)
      .attr("r", 5)
      .attr("fill", (d) => KIND_COLORS[d.data.kind] ?? "#E8EEF8");

    node
      .append("text")
      .attr("x", 24)
      .attr("dy", "0.32em")
      .attr("fill", "#E8EEF8")
      .attr("font-size", 12)
      .attr("font-family", "Inter, sans-serif")
      .text((d) => d.data.label);

    node
      .filter((d) => (d.data.children?.length ?? 0) > 0)
      .append("text")
      .attr("x", (d) => Math.max(120, d.data.label.length * 7.4 + 34) - 18)
      .attr("dy", "0.32em")
      .attr("text-anchor", "middle")
      .attr("fill", "#9FB0CF")
      .attr("font-size", 12)
      .attr("font-family", "Inter, sans-serif")
      .text((d) =>
        expanded.has(d.data.id) || d.data.id === "root" ? "−" : "+",
      );

    requestAnimationFrame(() => fit());
  }, [treeData, dims, expanded, onSelect, selectedId, svgRef]);

  const zoomBy = (k: number) => {
    if (!internalSvgRef.current || !zoomRef.current) return;
    d3.select(internalSvgRef.current)
      .transition()
      .duration(200)
      .call(zoomRef.current.scaleBy, k);
  };

  const toggleFullscreen = async () => {
    if (!hostRef.current) return;
    if (!document.fullscreenElement) {
      await hostRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <div
      ref={hostRef}
      className="relative h-full w-full overflow-hidden rounded-3xl border border-border bg-[var(--color-graph-bg)]"
    >
      <div ref={containerRef} className="h-full w-full touch-none">
        <svg ref={internalSvgRef} className="block h-full w-full" />
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
          onClick={fit}
          className="focus-ring rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/70 hover:bg-white/10"
          aria-label="Fit view"
        >
          Fit
        </button>
      </div>

      <div className="absolute bottom-3 left-3 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[10px] text-white/70 backdrop-blur-sm">
        Drag com mouse ou toque · Pinch/zoom suportado · Clique no nó para
        expandir
      </div>
    </div>
  );
}
