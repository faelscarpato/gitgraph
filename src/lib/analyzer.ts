// v2 compatibility shim: keep the public parseRepoUrl export and expose runAnalysis.
// Older imports (RepoForm) rely on parseRepoUrl.
export { parseRepoUrl, runAnalysis } from "./analysis/pipeline";
export type { AnalysisResult } from "./analysis/types";
