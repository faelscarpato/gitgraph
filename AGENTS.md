# GitGraph — Instructions for AI Agents

## Essential Commands

- Install: `pnpm install` (or `npm install`)
- Dev server: `pnpm dev`
- Build: `pnpm build`
- Preview: `pnpm preview`
- Lint: `pnpm lint`
- Format: `pnpm format`

## Required Skill

Before any action, load the official GitGraph skill:
→ [public/knowledge/gitgraph-analyzer](https://github.com/faelscarpato/gitgraph/tree/b590805768d39b956fb01275bf22e544fc72bee6/public/knowledge/gitgraph-analyzer)

Follow the skill’s flow:

1. Tell the user you’ll analyze the repo with GitGraph.
2. Ask for the GitHub repo URL.
3. Open https://gitgraph.pages.dev, paste the URL, click **Analyze**.
4. Use the returned JSON as the sole source for answering questions.
5. If the JSON lacks needed data, ask the user to export it from the platform.

## Notes

- The repo uses Vite, React, TanStack Router, Tailwind + Shadcn/ui, and Tree‑sitter for parsing.
- No test script is defined; rely on manual verification or add your own.
- Keep responses concise; refer to the JSON for specifics.
