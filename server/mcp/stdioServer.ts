#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createInventoryMcpServer } from './inventoryMcpServer.js';

async function runStdioServer() {
  const server = createInventoryMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('🚀 NexusStock MCP Server connected and listening on stdio');
}

runStdioServer().catch(err => {
  console.error('❌ Fatal error in MCP stdio server:', err);
  process.exit(1);
});
