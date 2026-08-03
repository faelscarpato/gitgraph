import type { Analysis, GraphNode } from "@/lib/graph-types";
import { getActiveProvider } from "@/lib/providers/registry";
import { proxyEmbedding, proxyChatCompletion } from "@/lib/ai/proxy";

export interface SemanticSearchResult {
  node: GraphNode;
  score: number;
  explanation?: string;
}

export interface EmbeddingCache {
  [nodeId: string]: number[];
}

export async function generateEmbedding(
  text: string,
): Promise<number[] | null> {
  const provider = getActiveProvider();

  if (!provider || !provider.baseUrl || !provider.apiKey) {
    console.warn("No AI provider configured for embeddings");
    return null;
  }

  const result = await proxyEmbedding({
    data: {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: provider.defaultModel || "text-embedding-ada-002",
      input: text,
    },
  });

  if (result.error || !result.embedding) {
    console.warn("Embedding generation failed:", result.error);
    return null;
  }

  return result.embedding;
}

export async function generateEmbeddingsForAnalysis(
  analysis: Analysis,
  onProgress?: (progress: number, total: number) => void,
): Promise<EmbeddingCache> {
  const cache: EmbeddingCache = {};
  const nodesWithContent = analysis.nodes.filter(
    (n) => n.kind === "file" || n.kind === "function",
  );

  const total = nodesWithContent.length;

  for (let i = 0; i < nodesWithContent.length; i++) {
    const node = nodesWithContent[i];
    const text = createNodeText(node, analysis);
    const embedding = await generateEmbedding(text);
    if (embedding) {
      cache[node.id] = embedding;
    }
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return cache;
}

function createNodeText(node: GraphNode, analysis: Analysis): string {
  const parts: string[] = [
    `Node type: ${node.kind}`,
    `Label: ${node.label}`,
    `Language: ${node.language || "unknown"}`,
  ];

  if (node.path) {
    parts.push(`Path: ${node.path}`);
  }

  if (node.group) {
    parts.push(`Group: ${node.group}`);
  }

  if (node.loc !== undefined) {
    parts.push(`Lines of code: ${node.loc}`);
  }

  if (node.complexity !== undefined) {
    parts.push(`Complexity: ${node.complexity}`);
  }

  const connected = analysis.edges
    .filter((e) => e.source === node.id || e.target === node.id)
    .map((e) => {
      const otherId = e.source === node.id ? e.target : e.source;
      const otherNode = analysis.nodes.find((n) => n.id === otherId);
      return otherNode ? otherNode.label : otherId;
    });

  if (connected.length > 0) {
    parts.push(`Connected to: ${connected.slice(0, 5).join(", ")}`);
  }

  return parts.join("\n");
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

export async function semanticSearch(
  analysis: Analysis,
  query: string,
  embeddingCache?: EmbeddingCache,
  limit: number = 10,
): Promise<SemanticSearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    return [];
  }

  if (embeddingCache) {
    const results: SemanticSearchResult[] = [];

    for (const node of analysis.nodes) {
      const embedding = embeddingCache[node.id];
      if (embedding) {
        const score = cosineSimilarity(queryEmbedding, embedding);
        if (score > 0) {
          results.push({ node, score });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  const results: SemanticSearchResult[] = [];

  for (const node of analysis.nodes) {
    const nodeText = createNodeText(node, analysis);
    const nodeEmbedding = await generateEmbedding(nodeText);

    if (nodeEmbedding) {
      const score = cosineSimilarity(queryEmbedding, nodeEmbedding);
      if (score > 0) {
        results.push({ node, score });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function generateNodeExplanation(
  node: GraphNode,
  analysis: Analysis,
): Promise<string | null> {
  const provider = getActiveProvider();

  if (!provider || !provider.baseUrl || !provider.apiKey) {
    return null;
  }

  const nodeText = createNodeText(node, analysis);

  const result = await proxyChatCompletion({
    data: {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: provider.defaultModel || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful code analysis assistant. Explain the purpose and functionality of the given code node concisely.",
        },
        {
          role: "user",
          content: `Explain this code node:\n\n${nodeText}\n\nProvide a brief explanation (2-3 sentences) of what this node does.`,
        },
      ],
      temperature: 0.3,
      maxTokens: 150,
    },
  });

  return result.content || null;
}

export async function findSimilarNodes(
  node: GraphNode,
  analysis: Analysis,
  embeddingCache?: EmbeddingCache,
  limit: number = 5,
): Promise<SemanticSearchResult[]> {
  const nodeText = createNodeText(node, analysis);
  const nodeEmbedding = await generateEmbedding(nodeText);

  if (!nodeEmbedding) {
    return [];
  }

  const results: SemanticSearchResult[] = [];

  for (const otherNode of analysis.nodes) {
    if (otherNode.id === node.id) continue;

    let otherEmbedding: number[] | null | undefined;

    if (embeddingCache) {
      otherEmbedding = embeddingCache[otherNode.id];
    } else {
      const otherText = createNodeText(otherNode, analysis);
      otherEmbedding = await generateEmbedding(otherText);
    }

    if (otherEmbedding) {
      const score = cosineSimilarity(nodeEmbedding, otherEmbedding);
      if (score > 0.5) {
        results.push({ node: otherNode, score });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
