interface ChatResult {
  content: string;
  error?: string;
}

interface EmbeddingResult {
  embedding: number[] | null;
  error?: string;
}

interface TestResult {
  ok: boolean;
  latencyMs: number;
  status?: number;
  modelDetected?: string;
  message: string;
}

async function proxy<T>(body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch("/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Request failed");
    throw new Error(text);
  }
  return res.json();
}

export async function proxyChatCompletion(
  params: {
    baseUrl: string;
    apiKey: string;
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
  },
  signal?: AbortSignal,
): Promise<ChatResult> {
  return proxy<ChatResult>({ type: "chat", ...params }, signal);
}

export async function proxyEmbedding(
  params: {
    baseUrl: string;
    apiKey: string;
    model: string;
    input: string;
  },
  signal?: AbortSignal,
): Promise<EmbeddingResult> {
  return proxy<EmbeddingResult>({ type: "embedding", ...params }, signal);
}

export async function proxyTestProvider(
  params: {
    baseUrl: string;
    apiKey: string;
    model?: string;
  },
  signal?: AbortSignal,
): Promise<TestResult> {
  return proxy<TestResult>({ type: "test", ...params }, signal);
}
