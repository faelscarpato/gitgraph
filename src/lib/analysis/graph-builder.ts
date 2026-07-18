import type { GraphEdge, GraphNode, AnalysisMetrics, NodeKind } from "@/lib/graph-types";
import type { PartialAnalysis } from "./types";
import { detectLanguage, isConfigFile } from "./parsers/language";
import { countLines, estimateComplexity, extractImports, resolveImport } from "./parsers/imports";
import {
  extractFunctionsFromCode,
  functionsToNodes,
  extractFunctionCalls,
} from "./parsers/functions";
import { extractFunctionsWithTreeSitter } from "./parsers/tree-sitter";

const ENTRYPOINT_PATTERNS = [
  /^src\/(main|index)\.(ts|tsx|js|jsx)$/,
  /^src\/routes\/__root\.(ts|tsx)$/,
  /^main\.(py|go)$/,
  /^cmd\/[^/]+\/main\.go$/,
  /^index\.(html|js|ts)$/,
];

export interface FileEntry {
  path: string;
  content?: string; // may be undefined when only tree was fetched
  size?: number;
}

export async function buildGraph(files: FileEntry[]): Promise<PartialAnalysis> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const languages: Record<string, number> = {};
  const fileSet = new Set(files.map((f) => f.path));

  // Group into top-level module directories
  const moduleFor = (path: string): string => {
    const parts = path.split("/");
    if (parts[0] === "src" && parts.length > 2) return `src/${parts[1]}`;
    return parts.length > 1 ? parts[0] : "root";
  };
  const modules = new Map<string, GraphNode>();

  // First pass: create modules and files
  for (const f of files) {
    const modKey = moduleFor(f.path);
    if (!modules.has(modKey)) {
      const n: GraphNode = {
        id: `mod:${modKey}`,
        label: modKey.split("/").slice(-1)[0],
        kind: "module",
        group: modKey,
      };
      modules.set(modKey, n);
      nodes.push(n);
    }

    const lang = detectLanguage(f.path);
    if (lang) languages[lang] = (languages[lang] ?? 0) + 1;

    const loc = f.content ? countLines(f.content) : undefined;
    const complexity = f.content ? estimateComplexity(f.content) : undefined;
    const isEntry = ENTRYPOINT_PATTERNS.some((r) => r.test(f.path));
    const kind: NodeKind = isConfigFile(f.path) ? "config" : "file";

    const node: GraphNode = {
      id: `file:${f.path}`,
      label: f.path.split("/").pop() ?? f.path,
      kind,
      path: f.path,
      group: modKey,
      loc,
      complexity,
      language: lang,
      entrypoint: isEntry,
    };
    nodes.push(node);
    edges.push({ source: modules.get(modKey)!.id, target: node.id, weight: 1, kind: "import" });
  }

  // Second pass: extract functions from files with content
  const functionNodes: GraphNode[] = [];
  const functionMap = new Map<string, GraphNode>();

  for (const f of files) {
    if (!f.content) continue;

    const lang = detectLanguage(f.path) || "";

    // Try Tree-sitter first for accurate AST-based extraction
    let functions: Awaited<ReturnType<typeof extractFunctionsWithTreeSitter>>;
    try {
      functions = await extractFunctionsWithTreeSitter(f.path, f.content, lang);
    } catch {
      // Fallback to regex-based extraction
      functions = extractFunctionsFromCode(f.path, f.content, lang);
    }

    const funcNodes = functionsToNodes(functions);

    for (const funcNode of funcNodes) {
      // Link function to its file
      edges.push({
        source: `file:${f.path}`,
        target: funcNode.id,
        weight: 1,
        kind: "import",
      });

      // Link function to module
      const modKey = moduleFor(f.path);
      if (modules.has(modKey)) {
        edges.push({
          source: modules.get(modKey)!.id,
          target: funcNode.id,
          weight: 1,
          kind: "import",
        });
      }

      functionNodes.push(funcNode);
      functionMap.set(funcNode.id, funcNode);
    }
  }

  nodes.push(...functionNodes);

  // Externals: derived from imports
  const externals = new Map<string, GraphNode>();

  for (const f of files) {
    if (!f.content) continue;
    const imports = extractImports(f.path, f.content);
    for (const imp of imports) {
      if (imp.isRelative) {
        const resolved = resolveImport(f.path, imp.raw, fileSet);
        if (resolved && resolved !== f.path) {
          edges.push({
            source: `file:${f.path}`,
            target: `file:${resolved}`,
            weight: 1,
            kind: "import",
          });
        }
      } else {
        const name = imp.raw
          .split("/")
          .slice(0, imp.raw.startsWith("@") ? 2 : 1)
          .join("/");
        if (!name) continue;
        const id = `ext:${name}`;
        if (!externals.has(id)) {
          const n: GraphNode = {
            id,
            label: name,
            kind: "external",
            group: "external",
          };
          externals.set(id, n);
          nodes.push(n);
        }
        edges.push({
          source: `file:${f.path}`,
          target: id,
          weight: 1,
          kind: "import",
        });
      }
    }
  }

  // Third pass: extract function calls to build call graph
  for (const f of files) {
    if (!f.content) continue;

    const lang = detectLanguage(f.path) || "";
    const fileId = `file:${f.path}`;

    // Get all function nodes
    const allFunctionNodes = nodes.filter((n) => n.kind === "function");

    // Extract calls from this file
    const callEdges = extractFunctionCalls(f.path, fileId, f.content, lang, allFunctionNodes);
    edges.push(...callEdges);
  }

  const metrics = computeMetrics(nodes, edges, languages);
  return {
    nodes,
    edges,
    languages,
    warnings: [],
    limitations: [],
    quality: files.some((f) => f.content) ? "full" : "partial",
  };
}

export function computeMetrics(
  nodes: GraphNode[],
  edges: GraphEdge[],
  languages?: Record<string, number>,
): AnalysisMetrics {
  const counts: Record<NodeKind, number> = {
    module: 0,
    file: 0,
    function: 0,
    external: 0,
    config: 0,
  };
  const degree = new Map<string, number>();
  for (const n of nodes) counts[n.kind] += 1;
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  const avgDegree = nodes.length
    ? [...degree.values()].reduce((a, b) => a + b, 0) / nodes.length
    : 0;
  const density = nodes.length > 1 ? edges.length / (nodes.length * (nodes.length - 1)) : 0;
  const maxComplexity = nodes.reduce((m, n) => Math.max(m, n.complexity ?? 0), 0);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const topByDegree = [...degree.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, deg]) => ({ id, label: nodeMap.get(id)?.label ?? id, degree: deg }));

  const hotspots = nodes
    .filter((n) => (n.complexity ?? 0) > 0)
    .sort((a, b) => (b.complexity ?? 0) - (a.complexity ?? 0))
    .slice(0, 5)
    .map((n) => ({ id: n.id, label: n.label, complexity: n.complexity ?? 0 }));

  return {
    nodes: nodes.length,
    edges: edges.length,
    modules: counts.module,
    files: counts.file,
    functions: counts.function,
    externals: counts.external,
    avgDegree: Math.round(avgDegree * 100) / 100,
    density: Math.round(density * 10000) / 10000,
    maxComplexity,
    warnings: [],
    topByDegree,
    hotspots,
    languages,
  };
}
