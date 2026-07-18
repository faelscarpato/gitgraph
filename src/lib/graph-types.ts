export type NodeKind = "module" | "file" | "function" | "external" | "config";

export type AnalysisQuality = "full" | "partial" | "degraded";
export type AnalysisSourceId = "github-api" | "github-raw" | "deterministic";

export interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  path?: string;
  loc?: number;
  complexity?: number;
  group?: string;
  language?: string;
  entrypoint?: boolean;
  // Additional metadata for functions
  functionData?: {
    parameters?: string[];
    isMethod?: boolean;
    className?: string;
    line?: number;
  };
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  kind: "import" | "call" | "config";
}

export interface AnalysisMetrics {
  nodes: number;
  edges: number;
  modules: number;
  files: number;
  functions: number;
  externals: number;
  avgDegree: number;
  density: number;
  maxComplexity: number;
  warnings: string[];
  topByDegree?: Array<{ id: string; label: string; degree: number }>;
  hotspots?: Array<{ id: string; label: string; complexity: number }>;
  languages?: Record<string, number>;
}

export interface Analysis {
  id: string;
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  createdAt: number;
  status: "success" | "partial" | "error";
  quality: AnalysisQuality;
  sourceUsed: AnalysisSourceId;
  attempted?: Array<{ id: AnalysisSourceId; ok: boolean; reason?: string }>;
  limitations?: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: AnalysisMetrics;
}
