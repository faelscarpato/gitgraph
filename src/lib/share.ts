import type { Analysis } from "@/lib/graph-types";

/**
 * Compress and encode analysis for URL sharing
 * Uses pako for compression and base64 for encoding
 */
export async function compressAnalysisForUrl(analysis: Analysis): Promise<string> {
  try {
    // Create a shareable payload with essential data
    const payload = {
      id: analysis.id,
      repoUrl: analysis.repoUrl,
      owner: analysis.owner,
      repo: analysis.repo,
      branch: analysis.branch,
      createdAt: analysis.createdAt,
      quality: analysis.quality,
      sourceUsed: analysis.sourceUsed,
      nodes: analysis.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        kind: n.kind,
        path: n.path,
        loc: n.loc,
        complexity: n.complexity,
        group: n.group,
        language: n.language,
        entrypoint: n.entrypoint,
      })),
      edges: analysis.edges.map((e) => ({
        source: e.source,
        target: e.target,
        weight: e.weight,
        kind: e.kind,
      })),
      metrics: {
        nodes: analysis.metrics.nodes,
        edges: analysis.metrics.edges,
        modules: analysis.metrics.modules,
        files: analysis.metrics.files,
        functions: analysis.metrics.functions,
        externals: analysis.metrics.externals,
        avgDegree: analysis.metrics.avgDegree,
        density: analysis.metrics.density,
        maxComplexity: analysis.metrics.maxComplexity,
        warnings: analysis.metrics.warnings,
        topByDegree: analysis.metrics.topByDegree,
        hotspots: analysis.metrics.hotspots,
        languages: analysis.metrics.languages,
      },
      _shared: true,
      _version: "1",
    };

    // Stringify and compress
    const jsonString = JSON.stringify(payload);

    // For now, we'll use a simple base64 encoding without compression
    // since pako might not be available in the browser
    const encoded = btoa(encodeURIComponent(jsonString));

    // URL-safe base64
    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (error) {
    console.error("Failed to compress analysis:", error);
    return "";
  }
}

/**
 * Decode and decompress analysis from URL
 */
export function decodeAnalysisFromUrl(encoded: string): Analysis | null {
  try {
    // URL-safe base64
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");

    const jsonString = decodeURIComponent(atob(base64));
    const payload = JSON.parse(jsonString);

    // Convert back to Analysis format
    return {
      id: payload.id,
      repoUrl: payload.repoUrl,
      owner: payload.owner,
      repo: payload.repo,
      branch: payload.branch,
      createdAt: payload.createdAt,
      status: "success",
      quality: payload.quality,
      sourceUsed: payload.sourceUsed,
      attempted: [],
      limitations: [],
      nodes: payload.nodes,
      edges: payload.edges,
      metrics: payload.metrics,
    };
  } catch (error) {
    console.error("Failed to decode analysis:", error);
    return null;
  }
}

/**
 * Generate shareable URL for an analysis
 */
export function generateShareUrl(analysis: Analysis, baseUrl: string = ""): string {
  // For now, we'll use a simple approach with the analysis ID
  // In a real implementation, we'd compress the full analysis
  const encodedId = btoa(analysis.id);
  const shareData = `${analysis.owner}/${analysis.repo}@${analysis.branch}`;
  const encodedShare = btoa(shareData).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // Use URL hash to avoid server-side issues
  return `${baseUrl}/share#${encodedShare}`;
}

/**
 * Extract analysis info from share URL
 */
export function extractShareInfoFromUrl(
  url: string,
): { owner: string; repo: string; branch: string } | null {
  try {
    const hash = url.split("#")[1];
    if (!hash) return null;

    const base64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    const shareData = atob(base64);
    const [ownerRepo, branch] = shareData.split("@");
    const [owner, repo] = ownerRepo.split("/");

    if (!owner || !repo) return null;

    return { owner, repo, branch: branch || "main" };
  } catch (error) {
    console.error("Failed to extract share info:", error);
    return null;
  }
}
