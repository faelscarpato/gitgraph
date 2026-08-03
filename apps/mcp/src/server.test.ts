import { describe, it, expect } from 'vitest';
import { server } from './server.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

// Helper to create a mock transport
const mockTransport = {
    start: async () => {},
    close: async () => {},
    send: async (msg: any) => { lastMessage = msg; },
} as Transport;

let lastMessage: any;

function getLastMessage() {
    return lastMessage;
}

async function sendMessage(msg: any) {
    if (mockTransport.onmessage) {
        mockTransport.onmessage(msg);
        // Give the event loop a tick to process the promise
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

import { beforeAll, afterAll } from 'vitest';

describe('Gitgraph MCP Server', () => {
    beforeAll(async () => {
        await server.connect(mockTransport);
    });

    afterAll(async () => {
        await server.close();
    });

    it('should register analyze_repository_structure tool with correct schema', async () => {
        // Send a list tools request (JSON-RPC)
        await sendMessage({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
            params: {}
        });

        const response = getLastMessage();
        expect(response).toBeDefined();
        expect(response.id).toBe(1);
        expect(response.result).toBeDefined();
        expect(response.result.tools).toBeInstanceOf(Array);
        
        const tool = response.result.tools.find((t: any) => t.name === 'analyze_repository_structure');
        expect(tool).toBeDefined();
        expect(tool.description).toContain('JSON estrutural');
        
        // Verify input schema
        expect(tool.inputSchema).toEqual({
            type: "object",
            properties: {
                repoUrl: {
                    type: "string",
                    description: "A URL do repositório GitHub para análise (ex: https://github.com/usuario/repo.git)"
                }
            },
            required: ["repoUrl"]
        });
    });

    it('should call tool analyze_repository_structure and return expected JSON response', async () => {
        // Send a call tool request
        const repoUrl = "https://github.com/vitest-dev/vitest";
        await sendMessage({
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: {
                name: "analyze_repository_structure",
                arguments: {
                    repoUrl
                }
            }
        });

        const response = getLastMessage();
        expect(response).toBeDefined();
        expect(response.id).toBe(2);
        expect(response.result).toBeDefined();
        expect(response.result.content).toBeInstanceOf(Array);
        
        const content = response.result.content[0];
        expect(content.type).toBe("text");
        
        // Parse the simulated JSON response
        const jsonResponse = JSON.parse(content.text);
        expect(jsonResponse.status).toBe("success");
        expect(jsonResponse.message).toContain(repoUrl);
        expect(jsonResponse.nodes).toBeTypeOf('number');
        expect(jsonResponse.edges).toBeTypeOf('number');
        expect(jsonResponse.hotspots).toBeInstanceOf(Array);
    });
    
    it('should return error for unknown tool', async () => {
        await sendMessage({
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: {
                name: "unknown_tool",
                arguments: {}
            }
        });

        const response = getLastMessage();
        expect(response).toBeDefined();
        expect(response.id).toBe(3);
        expect(response.error).toBeDefined();
        expect(response.error.message).toContain("Ferramenta não encontrada");
    });
});
