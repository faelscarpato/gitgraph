import { getActiveProvider } from "@/lib/providers/registry";
import { proxyChatCompletion } from "./proxy";
import type { Analysis } from "@/lib/graph-types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function buildSystemPrompt(analysis: Analysis): string {
  const parts: string[] = [
    "Você é um analista de arquitetura de software especializado em analisar repositórios de código.",
    "SEU ESCOPO É ESTRITAMENTE LIMITADO aos dados de análise fornecidos abaixo.",
    "Nunca invente informações que não estejam presentes nos dados fornecidos.",
    "",
    "## Dados da Análise",
    `Repositório: ${analysis.owner}/${analysis.repo}`,
    `Branch: ${analysis.branch}`,
    `Qualidade: ${analysis.quality}`,
    `Total de nós: ${analysis.nodes.length}`,
    `Total de arestas: ${analysis.edges.length}`,
    "",
  ];

  const { metrics } = analysis;

  if (metrics.languages && Object.keys(metrics.languages).length > 0) {
    const langs = Object.entries(metrics.languages)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => `  - ${lang}: ${count} arquivos`)
      .join("\n");
    parts.push("## Linguagens Detectadas", langs, "");
  }

  if (metrics.topByDegree && metrics.topByDegree.length > 0) {
    const top = metrics.topByDegree
      .slice(0, 10)
      .map((n) => `  - ${n.label} (grau: ${n.degree})`)
      .join("\n");
    parts.push("## Nós Mais Conectados (Centralidade)", top, "");
  }

  if (metrics.hotspots && metrics.hotspots.length > 0) {
    const hot = metrics.hotspots
      .slice(0, 10)
      .map((n) => `  - ${n.label} (complexidade: ${n.complexity})`)
      .join("\n");
    parts.push("## Hotspots (Alta Complexidade)", hot, "");
  }

  if (metrics.moduleMetrics && metrics.moduleMetrics.length > 0) {
    const mods = metrics.moduleMetrics
      .map(
        (m) =>
          `  - ${m.module}: Ca=${m.afferentCoupling} Ce=${m.efferentCoupling} I=${m.instability.toFixed(2)} A=${m.abstractness.toFixed(2)} D=${m.distance.toFixed(2)}${m.isGodModule ? " [GOD MODULE]" : ""}`,
      )
      .join("\n");
    parts.push("## Métricas de Módulo (Ca/Ce/I/A/D)", mods, "");
  }

  if (metrics.godModules && metrics.godModules.length > 0) {
    parts.push(
      "## God Modules (Módulos que concentram excessiva responsabilidade)",
      metrics.godModules.map((m) => `  - ${m}`).join("\n"),
      "",
    );
  }

  if (metrics.cycles && metrics.cycles.length > 0) {
    parts.push("## Dependências Cíclicas Detectadas");
    for (const cycle of metrics.cycles) {
      parts.push(`  Ciclo: ${cycle.moduleLabels.join(" → ")}`);
    }
    parts.push("");
  }

  if (analysis.limitations && analysis.limitations.length > 0) {
    parts.push(
      "## Limitações da Análise",
      analysis.limitations.map((l) => `  - ${l}`).join("\n"),
      "",
    );
  }

  parts.push(
    "## Diretrizes",
    "1. Responda APENAS com base nos dados de análise fornecidos acima.",
    "2. Sugira refatorações, melhorias arquiteturais e modularização quando aplicável.",
    "3. Aponte dependências problemáticas, acoplamento excessivo e violações de responsabilidade única.",
    "4. Seja específico: mencione nomes de módulos, arquivos e funções conforme presente nos dados.",
    "5. Se os dados não contiverem informação suficiente para responder, diga isso claramente.",
    "6. Responda em português do Brasil.",
  );

  return parts.join("\n");
}

export async function sendAnalysisMessage(
  analysis: Analysis,
  conversation: ChatMessage[],
): Promise<{ content: string; error?: string }> {
  const provider = getActiveProvider();

  if (!provider || !provider.baseUrl || !provider.apiKey) {
    return {
      content: "",
      error:
        "Nenhum provedor de IA configurado. Vá em Configurações para adicionar um.",
    };
  }

  const system = buildSystemPrompt(analysis);
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...conversation,
  ];

  return proxyChatCompletion({
    data: {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: provider.defaultModel || "gpt-3.5-turbo",
      messages,
      temperature: 0.3,
      maxTokens: 4096,
    },
  });
}
