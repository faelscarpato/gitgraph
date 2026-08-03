"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Sobre a Ferramenta</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </DialogTitle>
          <DialogDescription>
            Entenda como o GitGraph Analyzer funciona e como usar seus arquivos
            de exportação.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-2 mt-4 space-y-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Como a ferramenta funciona
            </h3>
            <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">
              <p>
                <strong>Entrada:</strong> URL de repositório GitHub (público).
              </p>
              <p>
                <strong>Processo:</strong> A ferramenta busca a árvore de
                arquivos do repositório, analisa os fontes (parseando imports
                reais em JavaScript/TypeScript, Python, Go), constrói um grafo
                de dependências entre módulos, arquivos e funções, calcula
                métricas (complexidade, LOC, etc.) e gera arquivos de exportação
                em múltiplos formatos.
              </p>
              <p>
                <strong>Saída:</strong> JSON, GraphML, Mermaid, HTML, TXT, DOT —
                prontos para uso por humanos e LLMs.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              O que cada arquivo exportável entrega
            </h3>
            <dl className="space-y-4 text-sm text-foreground/90">
              <div>
                <dt className="font-mono font-medium text-primary">JSON</dt>
                <dd className="mt-1 ml-4">
                  Visão estruturada completa do projeto: nós (módulos, arquivos,
                  funções), arestas (imports, calls, config), métricas,
                  qualidade da análise, limitações. Ideal para consumo
                  programático por agentes de IA.
                </dd>
              </div>
              <div>
                <dt className="font-mono font-medium text-primary">GraphML</dt>
                <dd className="mt-1 ml-4">
                  Formato padrão de grafo para ferramentas externas como Gephi,
                  yEd, Cytoscape. Permite visualização e análise avançada de
                  redes em software especializado.
                </dd>
              </div>
              <div>
                <dt className="font-mono font-medium text-primary">Mermaid</dt>
                <dd className="mt-1 ml-4">
                  Descrição textual de grafos renderizável em Markdown (GitHub,
                  GitLab, Notion, Obsidian, docs-as-code). Gera diagramas de
                  dependência legíveis em documentação.
                </dd>
              </div>
              <div>
                <dt className="font-mono font-medium text-primary">HTML</dt>
                <dd className="mt-1 ml-4">
                  Relatório estático autossuficiente com tabela de nós,
                  métricas, avisos e dados brutos embutidos. Abre em qualquer
                  navegador sem dependências.
                </dd>
              </div>
              <div>
                <dt className="font-mono font-medium text-primary">TXT</dt>
                <dd className="mt-1 ml-4">
                  Lista simples de nós e arestas em formato texto puro. Útil
                  para grep, diffs rápidos ou ingestão em pipelines simples.
                </dd>
              </div>
              <div>
                <dt className="font-mono font-medium text-primary">
                  DOT (Graphviz)
                </dt>
                <dd className="mt-1 ml-4">
                  Formato nativo do Graphviz. Permite layout automático (dot,
                  neato, fdp, sfdp, twopi, circo) e personalização visual
                  avançada via atributos de grafo/nó/aresta.
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Como utilizar esses arquivos em LLMs
            </h3>
            <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">
              <p>
                <strong>Objetivo: reduzir custo de tokens.</strong> Em vez de a
                IA ler centenas de arquivos brutos do repositório (o que consome
                milhares de tokens e perde contexto global), ela lê o
                <code className="bg-muted px-1 rounded font-mono text-xs">
                  JSON
                </code>
                ,
                <code className="bg-muted px-1 rounded font-mono text-xs">
                  GraphML
                </code>{" "}
                ou
                <code className="bg-muted px-1 rounded font-mono text-xs">
                  Mermaid
                </code>{" "}
                que já resumem a arquitetura, dependências e métricas do
                projeto.
              </p>
              <p>Isso aumenta drasticamente a eficiência de:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Agentes de código (copilots, code assistants)</li>
                <li>CLIs de análise automatizada</li>
                <li>Revisão de arquitetura por IA</li>
                <li>Geração de documentação técnica</li>
                <li>Refatoração assistida em larga escala</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Dica: use o JSON para análise programática completa, Mermaid
                para diagramas em conversa, GraphML para ferramentas de
                visualização externas.
              </p>
            </div>
          </section>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
