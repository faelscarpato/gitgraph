import { fileURLToPath } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Inicializa o Servidor MCP com metadados do seu projeto
export const server = new Server(
    {
        name: "gitgraph-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {}, // Indica que este servidor fornece ferramentas
        },
    }
);

// ROTA 1: Lista para a IA quais ferramentas estão disponíveis
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "analyze_repository_structure",
                description: "Gera e retorna o JSON estrutural (Grafo de Conhecimento, dependências e complexidade) de um repositório Git.",
                inputSchema: {
                    type: "object",
                    properties: {
                        repoUrl: {
                            type: "string",
                            description: "A URL do repositório GitHub para análise (ex: https://github.com/usuario/repo.git)"
                        }
                    },
                    required: ["repoUrl"]
                }
            },
            // As próximas tools (semantic_code_search, etc) entrarão aqui depois...
        ]
    };
});

// ROTA 2: Executa a ferramenta quando a IA solicita
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "analyze_repository_structure") {
        const repoUrl = request.params.arguments?.repoUrl as string;

        try {
            // =====================================================================
            // AQUI É A PONTE! É aqui que chamaremos a API/CLI do motor do Gitgraph.
            // Por enquanto, vamos simular a resposta para validar a conexão.
            // =====================================================================

            const simulatedResult = {
                message: `Análise solicitada para: ${repoUrl}`,
                status: "success",
                nodes: 430,
                edges: 1378,
                hotspots: ["src/lib/analysis/parsers/tree-sitter.ts"]
            };

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(simulatedResult, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Erro na análise: ${error}` }],
                isError: true,
            };
        }
    }

    throw new Error("Ferramenta não encontrada");
});

// Função para iniciar o transporte via STDIO (Terminal)
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Gitgraph MCP Server rodando via STDIO...");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        console.error("Erro fatal no servidor:", error);
        process.exit(1);
    });
}