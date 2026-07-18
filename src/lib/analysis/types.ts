import type {
  Analysis,
  AnalysisQuality,
  AnalysisSourceId,
  GraphEdge,
  GraphNode,
} from "@/lib/graph-types";

export interface AnalysisContext {
  owner: string;
  repo: string;
  branch: string;
  repoUrl: string;
  githubToken?: string;
  maxFiles?: number;
  maxBytesPerFile?: number;
}

export interface ProgressEvent {
  pct: number;
  label: string;
  step?: string;
  sourceId?: AnalysisSourceId;
}

export interface PartialAnalysis {
  nodes: GraphNode[];
  edges: GraphEdge[];
  languages?: Record<string, number>;
  warnings?: string[];
  limitations?: string[];
  quality: AnalysisQuality;
}

export interface AnalysisSource {
  id: AnalysisSourceId;
  canRun(ctx: AnalysisContext): Promise<boolean> | boolean;
  run(ctx: AnalysisContext, onProgress: (p: ProgressEvent) => void): Promise<PartialAnalysis>;
}

export interface AnalysisResult {
  analysis: Analysis;
  attempted: Array<{ id: AnalysisSourceId; ok: boolean; reason?: string }>;
}
