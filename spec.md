# Especificação do Projeto: GenIA Analyzer

## Visão Geral

**GenIA Analyzer** é uma aplicação web client-side (React + TanStack Start) que transforma qualquer repositório público do GitHub em um **grafo de conhecimento interativo**. Não requer backend, cadastro ou servidor — roda inteiramente no navegador.

**Status**: Projeto limpo, sem dependências Lovable, pronto para deploy no Cloudflare Pages.

---

## Stack Tecnológica

| Camada              | Tecnologia                                                                       |
| ------------------- | -------------------------------------------------------------------------------- |
| Framework           | TanStack Start (React 19, file-based routing)                                    |
| Roteamento          | TanStack Router                                                                  |
| Estado/Server State | TanStack Query                                                                   |
| UI                  | Radix UI + Tailwind CSS v4                                                       |
| Visualização        | D3.js (force-directed graph)                                                     |
| Persistência        | localStorage (versionado via `genia:v2`)                                         |
| Linguagens alvo     | TypeScript, JavaScript, Python, Go, Rust, Java, C#, PHP, Ruby, Scala, +20 outras |

---

## Arquitetura de Pastas

```
src/
├── routes/
│   ├── __root.tsx          # Layout raiz, providers, meta tags
│   ├── index.tsx           # Página principal (form → loading → graph/error)
│   └── settings.tsx        # Configuração de providers + GitHub token
├── components/
│   ├── GraphViewer.tsx     # Visualização D3 (SVG, zoom/pan, hover, seleção)
│   ├── MetricsSidebar.tsx  # Métricas globais + detalhes do nó selecionado
│   ├── InsightPanel.tsx    # Top por grau, hotspots de complexidade, linguagens
│   ├── HistoryPanel.tsx    # Histórico persistido (25 máx), filtro, delete
│   ├── ExportMenu.tsx      # JSON, GraphML, PNG, HTML
│   └── RepoForm.tsx        # Formulário de entrada (URL, branch, API key)
├── lib/
│   ├── analyzer.ts         # Shim v2: exporta parseRepoUrl + runAnalysis
│   ├── analysis/
│   │   ├── pipeline.ts     # Orquestração: fontes → buildGraph → métricas
│   │   ├── types.ts        # Tipos internos (AnalysisSource, PartialAnalysis, etc.)
│   │   ├── sources/
│   │   │   ├── github-api.ts   # Fonte real: GitHub REST API (tree + raw files)
│   │   │   └── deterministic.ts # Fallback sintético determinístico
│   │   ├── graph-builder.ts    # Agrupa em módulos, extrai imports, resolve, métricas
│   │   └── parsers/
│   │       ├── language.ts     # Detecção de linguagem, source/config files
│   │       └── imports.ts      # Regex imports (JS/TS/Py/Go), complexidade, resolução
│   ├── graph-types.ts    # Tipos públicos: GraphNode, GraphEdge, Analysis, Metrics
│   ├── export.ts         # Exportadores (JSON, GraphML, PNG, HTML)
│   ├── history.ts        # CRUD de análises no localStorage
│   ├── persistence/store.ts # Wrapper localStorage versionado + migração v1→v2
│   └── providers/
│       ├── registry.ts   # CRUD de perfis de provider (OpenAI-compat + local-agent)
│       ├── client.ts     # Teste de conectividade (/models → /chat/completions)
│       ├── local-agents.ts # Probe localhost: portas conhecidas (Ollama, LM Studio, etc.)
│       └── types.ts      # ProviderProfile, ProviderTestResult
└── styles.css            # Tokens CSS (cores, espaçamentos, surface-panel, etc.)
```

---

## Fluxo de Dados Principal

```
Usuário cola URL GitHub
        │
        ▼
parseRepoUrl() → {owner, repo}
        │
        ▼
runAnalysis(opts) ──────────────────────────┐
        │                                   │
        ▼                                   │
githubApiSource.canRun() → true             │
        │                                   │
        ▼                                   │
resolveBranch() → branch real               │
        │                                   │
        ▼                                   │
GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
        │                                   │
        ▼                                   │
Filtra blobs: source files + config files   │
        │                                   │
        ▼                                   │
Prioriza: profundidade rasa + entrypoints   │
        │                                   │
        ▼                                   │
Corta em maxFiles (default 300)             │
        │                                   │
        ▼                                   │
Fetch concorrente (8 workers) raw.githubusercontent.com
        │                                   │
        ▼                                   │
buildGraph(files) ──────────────────────────┤
        │                                   │
        ├─► Módulos (pastas de 1º nível)    │
        ├─► Arquivos (nodes kind=file)      │
        ├─► Imports relativos → edges file→file  │
        ├─► Imports externos → nodes kind=external │
        ├─► Complexidade ciclomática (regex)     │
        └─► Linhas de código (LOC)               │
        │                                   │
        ▼                                   │
computeMetrics(nodes, edges, languages)     │
        │                                   │
        ▼                                   │
PartialAnalysis {nodes, edges, quality, warnings, limitations}
        │                                   │
        ▼                                   │
Analysis completo (id, status, metrics, ...) │
        │                                   │
        ▼                                   ▼
saveAnalysis() → localStorage (histórico + análise)
        │
        ▼
Render: GraphViewer + MetricsSidebar + InsightPanel
```

---

## Fontes de Análise (Pipeline)

| Fonte              | ID              | Qualidade          | Quando falha                                                    |
| ------------------ | --------------- | ------------------ | --------------------------------------------------------------- |
| **GitHub API**     | `github-api`    | `full` / `partial` | Rate limit (403), repo privado, tree truncado, >300 arquivos    |
| **Determinístico** | `deterministic` | `degraded`         | Sempre roda (fallback) — grafo sintético baseado no hash da URL |

**Ordem padrão**: `github-api` → `deterministic`. Para a primeira que conseguir rodar (`canRun=true` e não lançar erro).

---

## Modelo de Dados (Tipos Principais)

### `GraphNode`

```ts
type NodeKind = "module" | "file" | "function" | "external" | "config";

interface GraphNode {
  id: string; // "mod:src/core", "file:src/core/index.ts", "ext:react"
  label: string; // Rótulo curto
  kind: NodeKind;
  path?: string; // Caminho no repo (para files/config)
  loc?: number; // Linhas de código
  complexity?: number; // Complexidade ciclomática estimada
  group?: string; // Módulo pai
  language?: string; // "TypeScript", "Python", etc.
  entrypoint?: boolean; // true se main/index/entrypoint
}
```

### `GraphEdge`

```ts
interface GraphEdge {
  source: string; // node.id origem
  target: string; // node.id destino
  weight: number; // 1 (peso fixo atual)
  kind: "import" | "call" | "config";
}
```

### `AnalysisMetrics`

```ts
interface AnalysisMetrics {
  nodes: number;
  edges: number;
  modules: number;
  files: number;
  functions: number; // atualmente 0 (não extraído)
  externals: number;
  avgDegree: number; // grau médio
  density: number; // edges / (nodes * (nodes-1))
  maxComplexity: number;
  warnings: string[];
  topByDegree: Array<{ id; label; degree }>; // top 5
  hotspots: Array<{ id; label; complexity }>; // top 5
  languages?: Record<string, number>; // contagem por linguagem
}
```

### `Analysis` (objeto persistido/exportado)

```ts
interface Analysis {
  id: string; // "owner-repo-branch-timestamp"
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  createdAt: number; // epoch ms
  status: "success" | "partial" | "error";
  quality: "full" | "partial" | "degraded";
  sourceUsed: "github-api" | "github-raw" | "deterministic";
  attempted: Array<{ id; ok; reason? }>;
  limitations: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: AnalysisMetrics;
}
```

---

## Persistência (localStorage)

**Namespace**: `genia:v2:`  
**Chaves**:

- `genia:v2:history` — `HistoryEntry[]` (máx 25)
- `genia:v2:analysis:{id}` — `Analysis` completo
- `genia:v2:providers` — `ProviderProfile[]`
- `genia:v2:providers:active` — `string | null`
- `genia:v2:github:token` — `string | null`
- `genia:v2:version` — `2` (migração automática v1→v2)

---

## Providers de IA (Settings)

Suporta **qualquer endpoint OpenAI-compatível**:

- Remotos: OpenAI, Groq, Together, OpenRouter, etc.
- Locais: detecção automática em portas conhecidas
  - Ollama (11434), LM Studio (1234), opencode (4096), Claude Code (7777), Codex (8787), Gemini CLI (8000), Hermes (5000)

**Perfil salvo**: `name`, `baseUrl`, `apiKey?`, `defaultModel?`, `kind: "openai-compatible" | "local-agent"`

**Teste de conectividade**: `GET /models` → fallback `POST /chat/completions` com `max_tokens: 1`.

---

## Exportação

| Formato     | Uso                    | Detalhes                                                                 |
| ----------- | ---------------------- | ------------------------------------------------------------------------ |
| **JSON**    | Consumo por agentes IA | Inclui `_export` com metadados de qualidade, fonte, limitações           |
| **GraphML** | Gephi, yEd, Cytoscape  | Nodes com `label`, `kind`; edges com `kind`                              |
| **PNG**     | Screenshot do grafo    | Clona SVG, desenha em canvas 2x, fundo `#0d1424`                         |
| **HTML**    | Relatório autônomo     | Tabela de nós, métricas, warnings, limitations, JSON embutido em `<pre>` |

---

## UI / UX

### Página Principal (`/`)

- **Header**: Logo, badge de qualidade (verde/amarelo/vermelho), Settings, Export
- **Sidebar esquerda (lg+)**: HistoryPanel (filtro, status, delete, clear)
- **Centro**: 4 views mutuamente exclusivas
  1. `FormView` — RepoForm + features
  2. `LoadingView` — Barra de progresso + passos (resolve branch → fetch tree → parse → graph → metrics)
  3. `ErrorView` — Mensagem + retry + link settings
  4. `GraphView` — Toolbar (filtros por kind, search), GraphViewer, drawer mobile
- **Sidebar direita (xl+)**: MetricsSidebar + InsightPanel

### GraphViewer (D3)

- **Force simulation**: link (distância module=60, file=45), charge -140, center, collide (radius+6)
- **Interação**: drag nodes, zoom/pan (0.2×–5×), fit button
- **Hover**: destaca vizinhos (opacity 1 vs 0.18), edges fortes (0.95 vs 0.08)
- **Click**: seleciona nó → atualiza Sidebar + InsightPanel
- **Legenda**: cores por kind, contagem nodes/edges

### Cores (CSS Variables)

```css
--color-node-module: #60a5fa; /* blue-400 */
--color-node-file: #34d399; /* emerald-400 */
--color-node-function: #fbbf24; /* amber-400 */
--color-node-external: #f472b6; /* pink-400 */
--color-node-config: #a78bfa; /* violet-400 */
--color-graph-bg: #0d1424;
--color-graph-grid: #1e2a44;
--color-edge: #334155;
--color-edge-strong: #60a5fa;
```

---

## Qualidade & Limitações Conhecidas

| Aspecto                 | Status                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| Parsing de imports      | Regex (não AST) — falsos positivos/negativos em código complexo      |
| Funções (kind=function) | Não extraídas atualmente (`functions: 0` nas métricas)               |
| Go imports              | Apenas single-line + grouped; não resolve vendor/modules.txt         |
| Python                  | `from x import y` + `import x`; não resolve pacotes locais complexos |
| Rate limit GitHub       | 60 req/h anônimo → 5000/h com token (Settings)                       |
| Tamanho arquivo         | Max 200 KB/arquivo (configurável via `maxBytesPerFile`)              |
| Concurrency             | 8 fetches paralelos                                                  |
| Armazenamento           | localStorage (~5-10 MB limite prático)                               |

---

## Scripts Disponíveis

```json
{
  "dev": "vite dev",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "preview": "vite preview",
  "lint": "eslint .",
  "format": "prettier --write ."
}
```

## Novos Recursos Implementados

### 1. Suporte a Mais Linguagens ✅

- **Arquivos de origem**: +20 linguagens adicionais (Rust, Java, C#, PHP, Ruby, Scala, Swift, Lua, Elixir, Erlang, Haskell, Clojure, F#, Objective-C, MATLAB, R, Julia, Solidity, SQL, GraphQL, Protocol Buffers, Dockerfile, Makefile, CMake)
- **Parsers de import**: Regex específicos para cada linguagem
- **Detecção de linguagem**: Baseado em extensão de arquivo

### 2. Comparação de Análises (Diff) ✅

- **Página `/diff`**: Interface para comparar duas análises salvas
- **Métricas de diff**: Nodes/edges adicionados, removidos, modificados
- **Análise de complexidade**: LOC e complexidade ciclomática por nó
- **Visualização**: Cards de estatísticas, listas de changes detalhados

### 3. Compartilhamento via URL ✅

- **Geração de URL**: Codificação base64 da info do repositório
- **Página `/share`**: Carrega análise do GitHub ou decodifica do URL
- **Botão "URL"**: No menu Export, copia link para clipboard
- **Auto-redirect**: Após carregar, redireciona para a página principal

### 4. Extração de Funções ✅

- **Regex avançado**: Parsers específicos para cada linguagem detectar funções
- **Nós do tipo "function"**: Funções agora aparecem como nós no grafo
- **Metadados**: Parâmetros, linha, linguagem, se é método
- **Integração com grafo**: Funções vinculadas aos arquivos e módulos pais
- **Preparação para Tree-sitter**: Estrutura pronta para integração futura

### 5. Call Graph ✅

- **Edges do tipo "call"**: Chamadas de função agora criam edges no grafo
- **Detecção de chamadas**: Regex para identificar chamadas de função no código
- **Vinculação automática**: Chamadas são vinculadas às funções correspondentes
- **Filtro por tipo**: Edges de call podem ser diferenciados de edges de import

### 6. Busca Semântica com IA ✅

- **Painel de busca**: Interface na view de grafo (botão "AI Search")
- **Embeddings**: Geração de vetores usando provider configurado
- **Similaridade coseno**: Ranqueamento de nós por semelhança com a query
- **Explicações com IA**: Geração de descrições naturais para os nós
- **Busca por significado**: Encontrar nós semanticamente similares

## Deploy no Cloudflare Pages

### Configuração

1. **wrangler.toml**: Configuração básica para Cloudflare Pages
2. **cloudflare.toml**: Configuração de redirects para SPA
3. **GitHub Actions**: Workflow de deploy automático em `/github/workflows/deploy.yml`
4. **\_redirects**: Arquivo público para roteamento SPA

### Requisitos

- Variáveis de ambiente no Cloudflare:
  - `CLOUDFLARE_API_TOKEN` (para deploy via GitHub Actions)
  - `CLOUDFLARE_ACCOUNT_ID` (para deploy via GitHub Actions)

### Build

```bash
npm install
npm run build
```

O output é gerado em `dist/` (client + server).

## Arquivos Modificados/Removidos

### Removidos (Lovable)

- `src/lib/lovable-error-reporting.ts` - Removido completamente
- `bunfig.toml` - Removido (usava exclusões do Lovable)
- `bun.lock` - Removido
- Referências no `package.json` - `@lovable.dev/vite-tanstack-config`
- Referências no `vite.config.ts` - Import do Lovable
- Referências no `__root.tsx` - Import e uso do reportLovableError
- Referências no `AGENTS.md` - Comentários do Lovable

### Adicionados

- `src/lib/analysis/diff.ts` - Lógica de comparação de análises
- `src/routes/diff.tsx` - Página de comparação
- `src/routes/share.tsx` - Página de compartilhamento
- `src/lib/share.ts` - Utilitários de compartilhamento via URL
- `src/lib/analysis/semantic.ts` - Busca semântica com embeddings
- `src/components/SemanticSearchPanel.tsx` - Painel de busca AI
- `src/components/ExportMenu.tsx` - Botão URL adicionado
- `src/lib/analysis/parsers/functions.ts` - Extração de funções
- `src/lib/analysis/parsers/tree-sitter.ts` - Prep para Tree-sitter (futuro)
- `.github/workflows/deploy.yml` - GitHub Actions para Cloudflare
- `wrangler.toml` - Configuração Cloudflare
- `cloudflare.toml` - Configuração Pages
- `public/_redirects` - Redirects para SPA

### Modificados

- `package.json` - Removido `@lovable.dev/vite-tanstack-config`, adicionado `@tanstack/devtools-vite`
- `vite.config.ts` - Configuração padrão do TanStack Start
- `src/routes/__root.tsx` - Removido import do lovable-error-reporting
- `src/routes/index.tsx` - Adicionado link para `/diff`
- `src/server.ts` - Removido import do error-capture
- `src/lib/analysis/parsers/language.ts` - +20 linguagens adicionais
- `src/lib/analysis/parsers/imports.ts` - Parsers para novas linguagens

---

## Extensibilidade (Pontos de Entrada)

1. **Nova fonte de análise**: Implementar `AnalysisSource` (`id`, `canRun(ctx)`, `run(ctx, onProgress)`) e adicionar em `DEFAULT_ORDER` no `pipeline.ts`.
2. **Novo parser de linguagem**: Estender `extractImports()` em `imports.ts` + adicionar extensão em `language.ts`.
3. **Novo exportador**: Adicionar função em `export.ts` + botão em `ExportMenu.tsx`.
4. **Novo tipo de nó/edge**: Estender `NodeKind` / `GraphEdge.kind` em `graph-types.ts` + atualizar `graph-builder.ts` + cores em `GraphViewer.tsx`.

---

## Segurança & Privacidade

- **Zero server**: Tudo roda no browser do usuário
- **Tokens**: GitHub token + API keys ficam apenas no localStorage (mesmo origin)
- **CORS**: Fetch direto para `api.github.com` e `raw.githubusercontent.com`; providers dependem de CORS do endpoint
- **Nenhum dado** enviado para terceiros exceto GitHub e provider de IA configurado pelo usuário

---

## Roadmap

### ✅ Implementado

- [x] Remover dependências Lovable
- [x] Configurar para Cloudflare Pages
- [x] Suporte a mais linguagens (Rust, Java, C#, PHP, Ruby, Scala, +20)
- [x] Diff entre duas análises (base vs head)
- [x] Compartilhamento via URL

### 🚀 Próximos Passos (Prioridade Média)

- [ ] Extração real de funções (Tree-sitter WASM)
- [ ] Call graph (não apenas import graph)
- [ ] Embeddings + busca semântica no grafo
- [ ] Modo offline-first com Service Worker
- [ ] Persistência IndexedDB para análises grandes
- [ ] Filtros avançados no grafo (por linguagem, complexidade, etc.)

### 🌟 Futuro (Prioridade Baixa)

- [ ] Integração com providers de IA para análise automática
- [ ] Visualização 3D do grafo
- [ ] Export para formatos adicionais (DOT, Mermaid)
- [ ] Import de repositórios privados (com autenticação)
- [ ] Análise incremental (apenas changes desde última análise)
