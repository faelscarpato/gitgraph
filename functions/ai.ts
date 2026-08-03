async function handleChat(body: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}) {
  try {
    const response = await fetch(
      `${body.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(body.apiKey ? { Authorization: `Bearer ${body.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: body.model,
          messages: body.messages,
          temperature: body.temperature ?? 0.3,
          max_tokens: body.maxTokens ?? 4096,
        }),
      },
    );
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { content: "", error: text || `HTTP ${response.status}` };
    }
    const result = await response.json();
    return { content: result.choices?.[0]?.message?.content || "" };
  } catch (e) {
    return {
      content: "",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

async function handleEmbedding(body: {
  baseUrl: string;
  apiKey: string;
  model: string;
  input: string;
}) {
  try {
    const response = await fetch(
      `${body.baseUrl.replace(/\/+$/, "")}/embeddings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(body.apiKey ? { Authorization: `Bearer ${body.apiKey}` } : {}),
        },
        body: JSON.stringify({ input: body.input, model: body.model }),
      },
    );
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { embedding: null, error: text || `HTTP ${response.status}` };
    }
    const result = await response.json();
    if (Array.isArray(result.data)) {
      return { embedding: result.data[0]?.embedding ?? null };
    }
    if (result.embedding) {
      return { embedding: result.embedding };
    }
    if (Array.isArray(result)) {
      return { embedding: result };
    }
    return { embedding: null, error: "Unknown embedding format" };
  } catch (e) {
    return {
      embedding: null,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

async function handleTest(body: {
  baseUrl: string;
  apiKey: string;
  model?: string;
}) {
  const started = Date.now();

  try {
    const r = await fetch(`${body.baseUrl.replace(/\/+$/, "")}/models`, {
      headers: body.apiKey ? { Authorization: `Bearer ${body.apiKey}` } : {},
    });
    const latency = Date.now() - started;

    if (r.ok) {
      const data = await r.json().catch(() => ({}));
      const detected =
        data?.data?.[0]?.id ?? data?.models?.[0]?.id ?? data?.models?.[0];
      return {
        ok: true,
        latencyMs: latency,
        status: r.status,
        modelDetected: typeof detected === "string" ? detected : body.model,
        message: `Connected in ${latency}ms`,
      };
    }

    if (r.status === 401 || r.status === 403) {
      return {
        ok: false,
        latencyMs: latency,
        status: r.status,
        message: "Authentication failed. Check the API key.",
      };
    }
  } catch {
    // fallback
  }

  try {
    const r2 = await fetch(
      `${body.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(body.apiKey ? { Authorization: `Bearer ${body.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: body.model ?? "gpt-3.5-turbo",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
      },
    );
    const latency = Date.now() - started;

    if (r2.ok) {
      return {
        ok: true,
        latencyMs: latency,
        status: r2.status,
        message: `Connected in ${latency}ms`,
        modelDetected: body.model,
      };
    }

    const text = await r2.text().catch(() => "");
    return {
      ok: false,
      latencyMs: latency,
      status: r2.status,
      message: text.slice(0, 140) || `HTTP ${r2.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      message:
        e instanceof Error ? e.message : "Network error (CORS or unreachable).",
    };
  }
}

export async function onRequest(context: { request: Request }) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body: Record<string, unknown> = await context.request.json();
  const type = body.type as string;

  let result;
  switch (type) {
    case "chat":
      result = await handleChat(body as Parameters<typeof handleChat>[0]);
      break;
    case "embedding":
      result = await handleEmbedding(
        body as Parameters<typeof handleEmbedding>[0],
      );
      break;
    case "test":
      result = await handleTest(body as Parameters<typeof handleTest>[0]);
      break;
    default:
      return new Response(
        JSON.stringify({ error: `Unknown type: ${body.type}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
  }

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
}
