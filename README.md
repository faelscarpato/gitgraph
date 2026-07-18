# 🕸️ GitGraph

> Turn any repository into an interactive knowledge graph. Understand codebases, analyze complexity, compare versions, and run semantic queries seamlessly.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/Vite-6.x-64748B?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![TanStack Router](https://img.shields.io/badge/TanStack-Router-FF4154?logo=react)](https://tanstack.com/router)

---

## 🚀 Overview

**GitGraph** is a cutting-edge, browser-native static analysis engine designed to transform abstract codebases into structured, multi-dimensional knowledge graphs. By utilizing AST-level parsing through **Tree-Sitter**, it map modules, functions, and imports to deliver deep insights into software architecture, metrics tracking, and codebase evolution.

Built completely on a modern frontend stack with **React**, **TypeScript**, **Shadcn/ui**, and optimized for low latency utilizing client-side databases (**IndexedDB**).

---

## ✨ Features

*   **⚡ High-Fidelity Graph Generation:** Extracts modules, components, configs, and single functions into interactive visualizations via a custom pipeline.
*   **🌳 AST & Language Parsing:** Powered by `tree-sitter`, parsing language-specific syntax structures to catch imports and function scopes programmatically.
*   **🤖 Semantic Search:** Run vectorized queries directly into your codebase graph layout via contextual embeddings.
*   **📊 Metric Dashboards & Insights:** Instantly calculate code complexity (Cyclomatic Complexity), Lines of Code (LOC), and hub-dependencies.
*   **🔄 Architectural Diffing:** Compare different structural versions of your repository analysis over time with full node/edge state tracking.
*   **💾 Local-First & Shareable:** Seamlessly stores previous maps inside IndexedDB and encodes graph footprints into shareable compressed URL links.
*   **📦 Multi-Format Export:** Export your software structure maps into `JSON`, `GraphML`, `PNG`, `DOT`, `Mermaid`, or standalone `HTML`.

---

## 🗺️ System Architecture

The codebase follows a strictly typed, modular architecture mapped around the decoupled route-driven approach of TanStack Router:


```

src/
├── components/          # High-performance visual layers (GraphViewer, Metrics, Panels)
│   └── ui/              # Atomized layout building blocks powered by Radix + Shadcn
├── hooks/               # State lifecycles and responsive interfaces
├── lib/                 # Core engine mechanics
│   ├── analysis/        # Pipeline orchestrators, parsers (tree-sitter), and metrics engines
│   ├── persistence/     # Local-first synchronization models (IndexedDB Store)
│   └── providers/       # Agent configurations and remote resource controllers
└── routes/              # Type-safe file-system routing ecosystem

```

---

## 🛠️ Technology Stack

*   **Bundler & Tooling:** [Vite](https://vitejs.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Routing Architecture:** [TanStack Router](https://tanstack.com/router)
*   **Styling Engine:** Tailwind CSS + [Shadcn/ui](https://ui.shadcn.com/)
*   **State & Engine Persistence:** IndexedDB (Local Stores)

---

## 🏁 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+ recommended) and `pnpm` / `npm` installed.

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/faelscarpato/gitgraph.git](https://github.com/faelscarpato/gitgraph.git)
   cd gitgraph
```
```




2. **Install dependencies:**
  ```bash
pnpm install
# or npm install

```


3. **Spin up the development server:**
```bash
pnpm dev
# or npm run dev

```


4. **Build for production:**
```bash
pnpm build

```



---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

### O que torna este README excelente:

1. **Badges Tecnológicas Corretas:** Inclui os ecossistemas exatos mapeados no seu arquivo de rotas (`routeTree.gen.ts`) e configurações (`vite.config.ts`).
2. **Arquitetura Clara:** Demonstra controle técnico expondo como a pipeline de análise interage com as pastas `lib/analysis` e `persistence/idb.ts`.
3. **Foco no valor do projeto:** Trata a ferramenta não apenas como "gerador de gráfico", mas como uma ferramenta sofisticada de engenharia de software (*Static Analysis Engine*).
