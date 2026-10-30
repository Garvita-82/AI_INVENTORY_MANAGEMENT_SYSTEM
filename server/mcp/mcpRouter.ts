import { Router, Request, Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createInventoryMcpServer } from './inventoryMcpServer.js';
import { JSONRPCRequest, JSONRPCResponse } from './mcpTypes.js';

export const mcpRouter = Router();

// Active SSE transports mapped by sessionId
const sseTransports = new Map<string, SSEServerTransport>();

// Shared internal client for direct JSON-RPC execution
let internalClient: Client | null = null;

async function getInternalClient(): Promise<Client> {
  if (!internalClient) {
    const server = createInventoryMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: 'internal-mcp-client', version: '1.0.0' });
    await client.connect(clientTransport);
    internalClient = client;
  }
  return internalClient;
}

// 1. SSE Transport Endpoints for remote MCP Clients
mcpRouter.get('/sse', async (req: Request, res: Response) => {
  try {
    const transport = new SSEServerTransport('/api/mcp/messages', res);
    const server = createInventoryMcpServer();

    sseTransports.set(transport.sessionId, transport);

    req.on('close', () => {
      sseTransports.delete(transport.sessionId);
    });

    await server.connect(transport);
    console.log(`🔌 MCP Client connected via SSE (Session: ${transport.sessionId})`);
  } catch (err: any) {
    console.error('Failed to establish SSE MCP transport:', err);
    if (!res.headersSent) {
      res.status(500).send(`SSE Connection failed: ${err.message}`);
    }
  }
});

mcpRouter.post('/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    return res.status(400).send('Missing sessionId query parameter');
  }

  const transport = sseTransports.get(sessionId);
  if (!transport) {
    return res.status(404).send(`Session "${sessionId}" not found or expired`);
  }

  try {
    await transport.handlePostMessage(req, res);
  } catch (err: any) {
    console.error('Error handling SSE message:', err);
    res.status(500).send(`Error processing message: ${err.message}`);
  }
});

// 2. Direct JSON-RPC 2.0 Endpoint (for UI Inspector, curl, and automated tests)
mcpRouter.post('/', async (req: Request, res: Response) => {
  const body = req.body as JSONRPCRequest;

  if (!body || body.jsonrpc !== '2.0' || !body.method) {
    const errorResponse: JSONRPCResponse = {
      jsonrpc: '2.0',
      id: body?.id ?? null,
      error: {
        code: -32600,
        message: 'Invalid Request: must be JSON-RPC 2.0 with method specified',
      },
    };
    return res.status(400).json(errorResponse);
  }

  const { method, params, id } = body;

  try {
    const client = await getInternalClient();

    switch (method) {
      case 'initialize': {
        const response: JSONRPCResponse = {
          jsonrpc: '2.0',
          id: id ?? null,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              logging: {},
            },
            serverInfo: {
              name: 'nexus-stock-inventory-server',
              version: '1.0.0',
            },
          },
        };
        return res.json(response);
      }

      case 'tools/list': {
        const toolsResult = await client.listTools();
        const response: JSONRPCResponse = {
          jsonrpc: '2.0',
          id: id ?? null,
          result: toolsResult,
        };
        return res.json(response);
      }

      case 'tools/call': {
        if (!params || !params.name) {
          const response: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: id ?? null,
            error: {
              code: -32602,
              message: 'Invalid params: "name" is required for tools/call',
            },
          };
          return res.status(400).json(response);
        }

        const callResult = await client.callTool({
          name: params.name,
          arguments: params.arguments || {},
        });

        const response: JSONRPCResponse = {
          jsonrpc: '2.0',
          id: id ?? null,
          result: callResult,
        };
        return res.json(response);
      }

      default: {
        const response: JSONRPCResponse = {
          jsonrpc: '2.0',
          id: id ?? null,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
        return res.status(404).json(response);
      }
    }
  } catch (err: any) {
    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      id: id ?? null,
      error: {
        code: -32603,
        message: err.message || 'Internal MCP Server error',
      },
    };
    return res.status(500).json(response);
  }
});

// 3. UI Inspector & Discovery Endpoints
mcpRouter.get('/tools', async (req: Request, res: Response) => {
  try {
    const client = await getInternalClient();
    const result = await client.listTools();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

mcpRouter.get('/info', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  const sseUrl = `${protocol}://${host}/api/mcp/sse`;
  const jsonRpcUrl = `${protocol}://${host}/api/mcp`;

  res.json({
    serverName: 'nexus-stock-inventory-server',
    version: '1.0.0',
    protocol: 'Model Context Protocol (Official SDK)',
    transports: {
      stdio: {
        command: 'npx',
        args: ['tsx', 'server/mcp/stdioServer.ts'],
      },
      sse: {
        url: sseUrl,
      },
      jsonrpc: {
        url: jsonRpcUrl,
      },
    },
    claudeDesktopConfig: {
      mcpServers: {
        'nexus-stock-inventory': {
          command: 'npx',
          args: ['tsx', 'server/mcp/stdioServer.ts'],
        },
      },
    },
    claudeDesktopSseConfig: {
      mcpServers: {
        'nexus-stock-inventory': {
          url: sseUrl,
          type: 'sse',
        },
      },
    },
  });
});
