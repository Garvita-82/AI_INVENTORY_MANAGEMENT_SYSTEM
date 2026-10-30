import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createInventoryMcpServer } from './inventoryMcpServer.js';

let sharedClient: Client | null = null;

export async function getMcpClient(): Promise<Client> {
  if (!sharedClient) {
    const server = createInventoryMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);

    const client = new Client({
      name: 'nexus-stock-ai-bridge',
      version: '1.0.0',
    });

    await client.connect(clientTransport);
    sharedClient = client;
    console.log('✅ Connected official MCP Client to custom SQLite MCP Server over InMemoryTransport');
  }
  return sharedClient;
}

export async function executeMcpToolCall(name: string, args: Record<string, any>): Promise<{
  text: string;
  isError: boolean;
  raw: any;
}> {
  const client = await getMcpClient();
  const result: any = await client.callTool({
    name,
    arguments: args,
  });

  const text = result.content?.[0]?.text || '';
  return {
    text,
    isError: !!result.isError,
    raw: result,
  };
}
