"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const SKILL_URL = "/knowledge/gitgraph-analyzer/SKILL.md";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LLMSModal({ open, onOpenChange }: Props) {
  const [skillContent, setSkillContent] = useState<string>("");
  const [skillLoading, setSkillLoading] = useState(true);
  const [skillError, setSkillError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSkillLoading(true);
      setSkillError(null);
      fetch(SKILL_URL)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((text) => {
          setSkillContent(text);
          setSkillLoading(false);
        })
        .catch((err) => {
          setSkillError("Não foi possível carregar a skill no momento.");
          setSkillLoading(false);
          console.error("Failed to load skill:", err);
        });
    } else {
      setSkillContent("");
      setSkillLoading(false);
      setSkillError(null);
    }
  }, [open]);

  const copySkill = async () => {
    if (!skillContent || skillLoading) return;
    try {
      await navigator.clipboard.writeText(skillContent);
      // Could add toast here if needed
    } catch (err) {
      console.error("Failed to copy skill:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>LLMs — Documentação de Uso</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </DialogTitle>
          <DialogDescription>
            Como integrar o gitgraph-analyzer em IDEs, CLIs e chatbots. Inclui
            skill oficial copiável.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[75vh] pr-2 mt-4 space-y-8">
          {/* Official Skill Section */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              Skill Oficial do gitgraph-analyzer
              <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                v2
              </span>
            </h3>
            <p className="text-sm text-foreground/80 mb-3">
              Esta skill ensina a IA a entender o formato de saída e usar o
              projeto como motor de análise.
              <br />
              <a
                href="https://github.com/faelscarpato/gitgraph/tree/b590805768d39b956fb01275bf22e544fc72bee6/public/knowledge/gitgraph-analyzer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                Ver no GitHub →
              </a>
            </p>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  SKILL.md (carregado dinamicamente)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copySkill}
                  disabled={!skillContent || skillLoading}
                  className="gap-1.5"
                >
                  {skillLoading ? "Carregando…" : "Copiar skill"}
                </Button>
              </div>
              <div
                className={cn(
                  "rounded-md border border-border bg-surface p-4 font-mono text-[11px] overflow-auto max-h-96",
                  skillLoading && "opacity-50",
                )}
              >
                {skillLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    Carregando skill…
                  </div>
                ) : skillError ? (
                  <div className="text-destructive">{skillError}</div>
                ) : skillContent ? (
                  <pre className="whitespace-pre-wrap">{skillContent}</pre>
                ) : (
                  <div className="text-muted-foreground">Conteúdo vazio.</div>
                )}
              </div>
            </div>
          </section>

          {/* Usage in IDEs */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Uso em IDEs (Copilot, OpenCode, Claude Code, etc.)
            </h3>
            <div className="space-y-4 text-sm text-foreground/80">
              <p>Configure seu agente/IDE para:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>
                  Clonar o repositório da plataforma:{" "}
                  <code className="bg-muted px-1 rounded font-mono text-xs">
                    git clone https://github.com/faelscarpato/gitgraph.git
                  </code>
                </li>
                <li>
                  Carregar a skill a partir do link:{" "}
                  <code className="bg-muted px-1 rounded font-mono text-xs">
                    https://github.com/faelscarpato/gitgraph/tree/b590805768d39b956fb01275bf22e544fc72bee6/public/knowledge/gitgraph-analyzer
                  </code>
                </li>
                <li>
                  Receber a URL do repositório que o usuário quer analisar
                </li>
                <li>
                  Executar a análise (via API local ou CLI) para gerar
                  JSON/GraphML/Mermaid
                </li>
                <li>
                  Usar esses dados estruturados em vez de ler arquivos brutos um
                  por um
                </li>
              </ol>

              <div className="rounded-md border border-border bg-surface p-4">
                <p className="font-mono text-xs text-muted-foreground mb-2">
                  Agent Prompt / Instruções para o Copilot:
                </p>
                <pre className="whitespace-pre-wrap text-[11px] font-mono text-foreground/90">
                  <code>{`# GitGraph Analyzer Skill
Você tem acesso ao gitgraph-analyzer para analisar repositórios GitHub.

Quando o usuário fornecer uma URL de repositório:
1. Clone o repositório gitgraph: git clone https://github.com/faelscarpato/gitgraph.git
2. Carregue a skill em: https://github.com/faelscarpato/gitgraph/tree/b590805768d39b956fb01275bf22e544fc72bee6/public/knowledge/gitgraph-analyzer
3. Execute a análise no repositório alvo
4. Use os arquivos gerados (JSON, GraphML, Mermaid) como fonte de verdade
5. NÃO leia arquivos brutos do repositório — use os dados estruturados

Formatos disponíveis:
- JSON: análise completa estruturada (nodes, edges, metrics, quality)
- GraphML: para Gephi/yEd/Cytoscape
- Mermaid: diagramas renderizáveis em Markdown
- HTML: relatório estático autossuficiente
- DOT: para Graphviz

Isso reduz custo de tokens em ~90% vs leitura de arquivos brutos.`}</code>
                </pre>
              </div>
            </div>
          </section>

          {/* Usage in CLIs */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Uso em CLIs (gemini-cli, agentes de terminal, etc.)
            </h3>
            <div className="space-y-4 text-sm text-foreground/80">
              <p>Passo a passo para agentes de linha de comando:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Instale/clone o gitgraph-analyzer localmente</li>
                <li>
                  Carregue a skill (o arquivo SKILL.md define como o agente deve
                  operar)
                </li>
                <li>
                  Receba a URL do repositório do usuário via argumento ou input
                </li>
                <li>
                  Execute:{" "}
                  <code className="bg-muted px-1 rounded font-mono text-xs">
                    gitgraph analyze --repo https://github.com/owner/repo
                    --branch main
                  </code>
                </li>
                <li>
                  Os arquivos de saída serão gerados em{" "}
                  <code className="bg-muted px-1 rounded font-mono text-xs">
                    ./gitgraph-output/
                  </code>
                </li>
                <li>
                  Leia o JSON/GraphML/Mermaid para responder perguntas sobre o
                  projeto
                </li>
              </ol>

              <div className="rounded-md border border-border bg-surface p-4">
                <p className="font-mono text-xs text-muted-foreground mb-2">
                  Prompt base para CLI agents:
                </p>
                <pre className="whitespace-pre-wrap text-[11px] font-mono text-foreground/90">
                  <code>{`Você é um agente de análise de código com acesso ao gitgraph-analyzer.

Ferramentas disponíveis:
- gitgraph analyze --repo <URL> --branch <branch> --output <dir>
- Leitura de arquivos JSON/GraphML/Mermaid/HTML/DOT gerados

Fluxo de trabalho:
1. Usuário informa: "Analise https://github.com/facebook/react"
2. Execute: gitgraph analyze --repo https://github.com/facebook/react --branch main
3. Leia o JSON gerado em ./gitgraph-output/react-main.json
4. Responda perguntas usando APENAS os dados estruturados (nodes, edges, metrics)
5. Se precisar de visualização, use o Mermaid ou GraphML

NUNCA leia arquivos fonte do repositório diretamente. Use os exports.`}</code>
                </pre>
              </div>
            </div>
          </section>

          {/* Usage in Chatbots */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Uso em Chatbots (Claude, GPT, Gemini, Codex, etc.)
            </h3>
            <div className="space-y-4 text-sm text-foreground/80">
              <p>Prompt base para colar no chat:</p>

              <div className="rounded-md border border-border bg-surface p-4">
                <pre className="whitespace-pre-wrap text-[11px] font-mono text-foreground/90">
                  <code>{`Quero analisar um repositório GitHub usando o gitgraph-analyzer.

Links de referência:
- Projeto gitgraph: https://github.com/faelscarpato/gitgraph
- Skill/Documentação: https://github.com/faelscarpato/gitgraph/tree/b590805768d39b956fb01275bf22e544fc72bee6/public/knowledge/gitgraph-analyzer

Repositório a analisar: https://github.com/OWNER/REPO (branch: main)

Por favor:
1. Use o gitgraph-analyzer para gerar os arquivos de exportação (JSON, GraphML, Mermaid)
2. Responda minhas perguntas sobre o projeto USANDO APENAS os dados estruturados gerados
3. Não leia arquivos brutos do repositório — use o JSON/GraphML/Mermaid como fonte

Pergunta inicial: [sua pergunta sobre a arquitetura, dependências, complexidade, etc.]`}</code>
                </pre>
              </div>

              <p className="text-xs text-muted-foreground">
                Dica: Anexe o JSON gerado ao contexto da conversa (se o chatbot
                suportar upload de arquivos) para análise ainda mais precisa.
              </p>
            </div>
          </section>

          {/* Quick Reference */}
          <section className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Referência Rápida — Formatos de Exportação
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  fmt: "JSON",
                  use: "Análise programática completa, agentes de código, pipelines",
                },
                {
                  fmt: "GraphML",
                  use: "Gephi, yEd, Cytoscape, visualização de redes",
                },
                {
                  fmt: "Mermaid",
                  use: "Diagramas em Markdown, docs, GitHub, Notion, Obsidian",
                },
                {
                  fmt: "HTML",
                  use: "Relatório estático portátil, compartilhamento sem dependências",
                },
                {
                  fmt: "DOT",
                  use: "Graphviz (dot, neato, fdp, sfdp, twopi, circo)",
                },
                {
                  fmt: "TXT",
                  use: "Listas simples, grep, diffs, pipelines Unix",
                },
              ].map(({ fmt, use }) => (
                <div
                  key={fmt}
                  className="rounded-md border border-border bg-surface p-3"
                >
                  <div className="font-mono font-medium text-primary">
                    {fmt}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {use}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
