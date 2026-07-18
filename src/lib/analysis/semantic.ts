import type { Analysis, GraphNode } from "@/lib/graph-types";
import { getActiveProvider } from "@/lib/providers/registry";

/**
 * Interface for semantic search results
 */
export interface SemanticSearchResult {
  node: GraphNode;
  score: number; // Similarity score (0-1)
  explanation?: string; // Optional explanation from AI
}

/**
 * Interface for embedding cache
 */
export interface EmbeddingCache {
  [nodeId: string]: number[]; // Map node ID to embedding vector
}

/**
 * Generate embeddings for text using the configured AI provider
 * Returns a promise that resolves to an embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const provider = getActiveProvider();

  if (!provider || !provider.baseUrl || !provider.apiKey) {
    console.warn("No AI provider configured for embeddings");
    return null;
  }

  try {
    // Try to use the embeddings endpoint (OpenAI compatible)
    const response = await fetch(`${provider.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: provider.defaultModel || "text-embedding-ada-002",
      }),
    });

    if (!response.ok) {
      console.warn(`Embedding generation failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Handle different response formats
    if (Array.isArray(data.data)) {
      // OpenAI format: { data: [{ embedding: [...] }] }
      return data.data[0]?.embedding || null;
    } else if (data.embedding) {
      // Direct embedding format
      return data.embedding;
    } else if (Array.isArray(data)) {
      // Some providers return array directly
      return data;
    }

    return null;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

/**
 * Generate embeddings for all nodes in an analysis
 * This can be expensive for large graphs, so use sparingly
 */
export async function generateEmbeddingsForAnalysis(
  analysis: Analysis,
  onProgress?: (progress: number, total: number) => void,
): Promise<EmbeddingCache> {
  const cache: EmbeddingCache = {};
  const nodesWithContent = analysis.nodes.filter((n) => n.kind === "file" || n.kind === "function");

  const total = nodesWithContent.length;

  for (let i = 0; i < nodesWithContent.length; i++) {
    const node = nodesWithContent[i];

    // Create text representation of the node
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

/**
 * Create a text representation of a node for embedding
 */
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

  // Add connected nodes context
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

/**
 * Calculate cosine similarity between two embedding vectors
 */
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

/**
 * Perform semantic search on an analysis
 * Returns nodes ranked by semantic similarity to the query
 */
export async function semanticSearch(
  analysis: Analysis,
  query: string,
  embeddingCache?: EmbeddingCache,
  limit: number = 10,
): Promise<SemanticSearchResult[]> {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    return [];
  }

  // If we have a cache, use it
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

  // Without cache, generate embeddings on-the-fly (slow for large graphs)
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

/**
 * Generate a natural language explanation for a node using AI
 */
export async function generateNodeExplanation(
  node: GraphNode,
  analysis: Analysis,
): Promise<string | null> {
  const provider = getActiveProvider();

  if (!provider || !provider.baseUrl || !provider.apiKey) {
    return null;
  }

  const nodeText = createNodeText(node, analysis);

  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
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
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("Error generating explanation:", error);
    return null;
  }
}

/**
 * Find similar nodes to a given node using embeddings
 */
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
        // Only include reasonably similar nodes
        results.push({ node: otherNode, score });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
