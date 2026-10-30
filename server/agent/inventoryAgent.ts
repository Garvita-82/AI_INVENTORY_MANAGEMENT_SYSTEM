import { FunctionDeclaration, Type } from '@google/genai';
import { getMcpClient, executeMcpToolCall } from '../mcp/mcpClientBridge.js';
import { getGeminiClient } from './geminiClient.js';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolCallExecution {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: any;
  error?: string;
  status: 'running' | 'success' | 'error';
}

export interface AgentResponse {
  reply: string;
  toolCalls: ToolCallExecution[];
  affectedProducts: string[];
  suggestedActions: string[];
}

export async function processAgentMessage(
  userMessage: string,
  history: ChatTurn[] = []
): Promise<AgentResponse> {
  const executedToolTraces: ToolCallExecution[] = [];
  const affectedProductIds = new Set<string>();

  // Helper to execute an MCP tool through the official MCP Client connection
  async function runMcpClientTool(toolName: string, toolArgs: Record<string, any>): Promise<any> {
    const callId = `mcp_call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const trace: ToolCallExecution = {
      id: callId,
      name: toolName,
      args: toolArgs,
      status: 'running',
    };
    executedToolTraces.push(trace);

    // Call the tool through the real MCP Client connection over transport
    const mcpResult = await executeMcpToolCall(toolName, toolArgs);

    if (mcpResult.isError) {
      trace.status = 'error';
      trace.error = mcpResult.text;
    } else {
      trace.status = 'success';
      trace.result = mcpResult.text;

      // Extract affected SKUs
      try {
        const parsed = JSON.parse(mcpResult.text);
        if (parsed.sku) affectedProductIds.add(parsed.sku);
        if (Array.isArray(parsed.products)) {
          parsed.products.forEach((p: any) => p.sku && affectedProductIds.add(p.sku));
        }
        if (Array.isArray(parsed.items)) {
          parsed.items.forEach((p: any) => p.sku && affectedProductIds.add(p.sku));
        }
      } catch (_) {
        // ignore JSON parse if plain text
      }
    }

    return mcpResult;
  }

  // 1. First, attempt full Gemini 3.8 Flash LLM multi-turn function calling
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const client = await getMcpClient();
      const mcpToolsList = await client.listTools();

      // Convert MCP tool schemas to Gemini Function Declarations
      const functionDeclarations: FunctionDeclaration[] = mcpToolsList.tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema as any,
      }));

      const ai = getGeminiClient();

      const systemInstruction = `You are NexusStock AI, an autonomous inventory management agent.
You interact with the real SQLite inventory database EXCLUSIVELY by invoking the registered MCP tools through an active Model Context Protocol client connection.

CRITICAL RULES:
1. NEVER fabricate product data or claim that an inventory operation succeeded without confirmation from the MCP tool.
2. If the user asks about stock, products, or metrics, CALL the appropriate MCP tool ("search_products", "get_stock_status", or "get_product_details").
3. If the user asks to update or add stock, CALL "update_stock" or "add_product".
4. If a tool reports an error (e.g. SKU not found or negative quantity), report the exact error honestly and suggest a resolution.
5. Provide crisp, professional Markdown responses. Format lists as tables or bold bullet points. Include SKU, price, quantity, and status.`;

      const contents: any[] = [];
      const trimmedHistory = history.slice(-6);
      for (const turn of trimmedHistory) {
        contents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });

      const tools = [{ functionDeclarations }];

      let loopCount = 0;
      const maxLoops = 4;

      while (loopCount < maxLoops) {
        loopCount++;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            tools,
          },
        });

        const candidateContent = response.candidates?.[0]?.content;
        const functionCalls = response.functionCalls;

        if (!functionCalls || functionCalls.length === 0) {
          const textReply = response.text || 'I have completed your request.';
          return {
            reply: textReply,
            toolCalls: executedToolTraces,
            affectedProducts: Array.from(affectedProductIds),
            suggestedActions: generateFollowUpSuggestions(executedToolTraces),
          };
        }

        if (candidateContent) {
          contents.push(candidateContent);
        }

        const functionResponseParts: any[] = [];

        for (const call of functionCalls) {
          const toolName = call.name || 'unknown_tool';
          const toolArgs = (call.args as Record<string, any>) || {};

          const mcpResult = await runMcpClientTool(toolName, toolArgs);

          functionResponseParts.push({
            functionResponse: {
              id: call.id,
              name: toolName,
              response: {
                output: mcpResult.text,
                isError: mcpResult.isError,
              },
            },
          });
        }

        contents.push({
          role: 'user',
          parts: functionResponseParts,
        });
      }
    } catch (llmErr: any) {
      console.warn('Gemini LLM call failed, routing through MCP natural-language interpreter:', llmErr.message);
      // Fall through to deterministic MCP natural-language parser below
    }
  }

  // 2. Deterministic MCP Natural-Language Processor
  // Directly identifies user intent and dispatches to the official MCP client tools
  const cleaned = userMessage.trim();
  const lower = cleaned.toLowerCase();

  // Request 1: "Show all low-stock or out-of-stock products"
  if (
    lower.includes('low-stock') ||
    lower.includes('low stock') ||
    lower.includes('out-of-stock') ||
    lower.includes('out of stock') ||
    (lower.includes('stock') && (lower.includes('status') || lower.includes('alert') || lower.includes('critical')))
  ) {
    let filter: 'all' | 'low_stock' | 'out_of_stock' = 'all';
    if (lower.includes('out-of-stock') || lower.includes('out of stock')) {
      if (!lower.includes('low-stock') && !lower.includes('low stock')) filter = 'out_of_stock';
    } else if (lower.includes('low-stock') || lower.includes('low stock')) {
      filter = 'low_stock';
    }

    const mcpRes = await runMcpClientTool('get_stock_status', { statusFilter: filter });

    if (mcpRes.isError) {
      return {
        reply: `❌ **Failed to retrieve stock status:** ${mcpRes.text}`,
        toolCalls: executedToolTraces,
        affectedProducts: [],
        suggestedActions: ['Try searching products', 'Check total valuation'],
      };
    }

    const data = JSON.parse(mcpRes.text);
    const rows = data.items || [];

    let tableMd = `### 📊 Stock Health Status (${data.totalAlerts} Alert Items)\n\n`;
    tableMd += `**Summary:** ${data.outOfStockCount} Out-of-Stock items, ${data.lowStockCount} Low-Stock items below safety threshold.\n\n`;
    tableMd += `| SKU | Product Name | Category | Stock | Reorder Level | Urgency | Suggested Reorder | Est. Cost |\n`;
    tableMd += `|---|---|---|---|---|---|---|---|\n`;

    rows.forEach((r: any) => {
      const urgencyBadge = r.urgency === 'CRITICAL' ? '🔴 **CRITICAL**' : '🟡 **WARNING**';
      tableMd += `| \`${r.sku}\` | ${r.productName} (${r.variantName}) | ${r.category} | **${r.currentQuantity}** | ${r.reorderLevel} | ${urgencyBadge} | +${r.recommendedRestock} units | $${r.estimatedRestockCost.toFixed(2)} |\n`;
    });

    tableMd += `\n*Data retrieved in real-time from SQLite via \`get_stock_status\` MCP tool.*`;

    return {
      reply: tableMd,
      toolCalls: executedToolTraces,
      affectedProducts: Array.from(affectedProductIds),
      suggestedActions: ['Order restock for critical items', 'List available products in Electronics', 'What is the price of LAP-001?'],
    };
  }

  // Request 4: "Update the stock quantity of SKU LAP-001 to 25" (or relative adjustments)
  const updateMatch =
    lower.match(/update(?:\s+the)?\s+stock(?:\s+quantity)?\s+of\s+(?:sku\s+)?([a-z0-9-]+)\s+(?:to|=)\s+(\d+)/i) ||
    lower.match(/set\s+(?:the\s+)?stock\s+(?:of\s+)?(?:sku\s+)?([a-z0-9-]+)\s+(?:to|=)\s+(\d+)/i) ||
    lower.match(/update\s+(?:sku\s+)?([a-z0-9-]+)\s+stock\s+(?:to|=)\s+(\d+)/i);

  const deltaMatch =
    lower.match(/(?:add|increase|restock)\s+(\d+)\s+units?\s+(?:to|for)\s+(?:sku\s+)?([a-z0-9-]+)/i) ||
    lower.match(/(?:deduct|reduce|decrease)\s+(\d+)\s+units?\s+(?:from|for)\s+(?:sku\s+)?([a-z0-9-]+)/i);

  if (updateMatch) {
    const sku = updateMatch[1].toUpperCase();
    const newQuantity = parseInt(updateMatch[2], 10);

    const mcpRes = await runMcpClientTool('update_stock', {
      sku,
      newQuantity,
      reason: 'Updated via chatbot natural language instruction',
    });

    if (mcpRes.isError) {
      return {
        reply: `❌ **Stock update failed:** ${mcpRes.text}`,
        toolCalls: executedToolTraces,
        affectedProducts: [],
        suggestedActions: [`Check details for SKU ${sku}`, 'Show all low-stock products'],
      };
    }

    const data = JSON.parse(mcpRes.text);
    return {
      reply: `✅ **Successfully updated stock in SQLite database:**\n\n- **Product:** ${data.productName} (\`${data.sku}\`)\n- **Previous Stock:** ${data.previousQuantity} units\n- **New Stock:** **${data.newQuantity} units**\n- **Status:** \`${data.stockStatus.toUpperCase()}\` (Safety buffer: ${data.reorderLevel} units)\n\n*Transaction confirmed and recorded in immutable audit log via \`update_stock\` MCP tool.*`,
      toolCalls: executedToolTraces,
      affectedProducts: Array.from(affectedProductIds),
      suggestedActions: [`What is the price and stock quantity of SKU ${sku}?`, 'Show low-stock products', 'Total valuation'],
    };
  }

  if (deltaMatch) {
    const isDeduct = lower.startsWith('deduct') || lower.startsWith('reduce') || lower.startsWith('decrease');
    const amount = parseInt(deltaMatch[1], 10);
    const sku = deltaMatch[2].toUpperCase();
    const delta = isDeduct ? -amount : amount;

    const mcpRes = await runMcpClientTool('update_stock', {
      sku,
      delta,
      reason: isDeduct ? 'Deduction via natural language instruction' : 'Restock via natural language instruction',
    });

    if (mcpRes.isError) {
      return {
        reply: `❌ **Stock adjustment failed:** ${mcpRes.text}`,
        toolCalls: executedToolTraces,
        affectedProducts: [],
        suggestedActions: [`Check details for SKU ${sku}`, 'Show low stock products'],
      };
    }

    const data = JSON.parse(mcpRes.text);
    return {
      reply: `✅ **Successfully updated stock in SQLite database:**\n\n- **Product:** ${data.productName} (\`${data.sku}\`)\n- **Adjustment:** ${delta > 0 ? '+' : ''}${delta} units\n- **New Stock:** **${data.newQuantity} units**\n- **Status:** \`${data.stockStatus.toUpperCase()}\`\n\n*Confirmed via \`update_stock\` MCP tool.*`,
      toolCalls: executedToolTraces,
      affectedProducts: Array.from(affectedProductIds),
      suggestedActions: [`What is the price and stock quantity of SKU ${sku}?`, 'Show low-stock products'],
    };
  }

  // Request 5: "Add a Wireless Mouse under Electronics with SKU MOU-101, price 799, and initial stock quantity 50"
  if (lower.startsWith('add') && (lower.includes('sku') || lower.includes('price') || lower.includes('stock'))) {
    const skuMatch = lower.match(/sku\s+([a-z0-9-]+)/i);
    const priceMatch = lower.match(/price\s+(?:is\s+)?(?:\$)?(\d+(?:\.\d+)?)/i);
    const stockMatch = lower.match(/(?:initial\s+)?stock(?:\s+quantity)?\s+(?:is\s+)?(\d+)/i) || lower.match(/quantity\s+(\d+)/i);
    const categoryMatch = lower.match(/(?:under|category|in)\s+([a-z\s]+?)(?:\s+with|\s+sku|\s+price|,|$)/i);

    // Extract product name
    let productName = 'New Product';
    const nameMatch = cleaned.match(/^add\s+(?:a|an)?\s*(.+?)(?:\s+under|\s+in|\s+with|\s+category|\s+sku|\s+price)/i);
    if (nameMatch && nameMatch[1].trim()) {
      productName = nameMatch[1].trim();
    }

    const sku = skuMatch ? skuMatch[1].toUpperCase() : `PROD-${Date.now().toString().slice(-4)}`;
    const category = categoryMatch ? categoryMatch[1].trim() : 'General';
    const price = priceMatch ? parseFloat(priceMatch[1]) : 49.99;
    const initialStock = stockMatch ? parseInt(stockMatch[1], 10) : 10;

    const mcpRes = await runMcpClientTool('add_product', {
      productName,
      sku,
      category,
      price,
      initialStock,
      reorderLevel: 10,
      description: `Added via natural language instruction on ${new Date().toLocaleDateString()}`,
    });

    if (mcpRes.isError) {
      return {
        reply: `❌ **Failed to add product:** ${mcpRes.text}`,
        toolCalls: executedToolTraces,
        affectedProducts: [],
        suggestedActions: ['List products in this category', 'Show low-stock products'],
      };
    }

    const data = JSON.parse(mcpRes.text);
    return {
      reply: `✨ **Successfully created product in SQLite database:**\n\n- **Product:** **${data.productName}**\n- **SKU:** \`${data.sku}\`\n- **Category:** ${data.category}\n- **Price:** **$${data.price.toFixed(2)}**\n- **Initial Stock:** **${data.stockQuantity} units**\n- **Safety Buffer (Reorder Level):** ${data.reorderLevel} units\n- **Status:** \`${data.status.toUpperCase()}\`\n\n*Product registered with relational category, variant, and 1:1 inventory records via \`add_product\` MCP tool.*`,
      toolCalls: executedToolTraces,
      affectedProducts: Array.from(affectedProductIds),
      suggestedActions: [`What is the price and stock quantity of SKU ${data.sku}?`, `List available products in ${data.category}`, 'Show low-stock products'],
    };
  }

  // Request 3: "What is the price and stock quantity of SKU LAP-001?"
  const skuLookupMatch = lower.match(/(?:sku|item|product)\s+([a-z0-9-]+)/i) || (lower.includes('sku') && cleaned.match(/([A-Z]{2,5}-[A-Z0-9-]+)/));
  if (skuLookupMatch && (lower.includes('price') || lower.includes('stock') || lower.includes('quantity') || lower.includes('details') || lower.includes('what is') || lower.includes('how many'))) {
    const sku = (skuLookupMatch[1] || skuLookupMatch[0]).toUpperCase();

    const mcpRes = await runMcpClientTool('get_product_details', { sku });

    if (mcpRes.isError) {
      return {
        reply: `❌ **Product Not Found:** ${mcpRes.text}`,
        toolCalls: executedToolTraces,
        affectedProducts: [],
        suggestedActions: ['Show all low-stock products', 'Search products by keyword', 'Add new product'],
      };
    }

    const data = JSON.parse(mcpRes.text);
    const statusEmoji = data.status === 'in_stock' ? '🟢' : data.status === 'low_stock' ? '🟡' : '🔴';

    return {
      reply: `📦 **Product Details for SKU \`${data.sku}\`:**\n\n- **Name:** **${data.productName}**\n- **Variant:** ${data.variantName}\n- **Category:** ${data.category}\n- **Price:** **$${data.price.toFixed(2)}**\n- **Stock Quantity:** **${data.stockQuantity} units**\n- **Reorder Level:** ${data.reorderLevel} units\n- **Stock Status:** ${statusEmoji} **${data.status.replace('_', ' ').toUpperCase()}**\n${data.description ? `- **Description:** ${data.description}\n` : ''}- **Last Restocked:** ${data.lastRestocked}\n\n*Confirmed from SQLite database via \`get_product_details\` MCP tool.*`,
      toolCalls: executedToolTraces,
      affectedProducts: [data.sku],
      suggestedActions: [`Update the stock quantity of SKU ${data.sku} to 25`, `List available products in ${data.category}`, 'Show low stock products'],
    };
  }

  // Request 2: "List available products in the Electronics category" (or search products)
  const knownCategories = ['Electronics', 'Peripherals', 'Audio', 'Office Furniture', 'Accessories', 'Networking', 'Wearables'];
  let targetCategory: string | undefined = undefined;

  for (const cat of knownCategories) {
    if (lower.includes(cat.toLowerCase())) {
      targetCategory = cat;
      break;
    }
  }

  if (!targetCategory) {
    const categoryMatch = lower.match(/(?:in|for|under)\s+(?:the\s+)?([a-z0-9\s-]+?)\s+(?:category|catalog|section)/i);
    if (categoryMatch) {
      targetCategory = categoryMatch[1].trim();
    }
  }

  // Execute search_products via MCP Client
  const mcpRes = await runMcpClientTool('search_products', {
    query: targetCategory ? '' : cleaned,
    category: targetCategory,
  });

  if (mcpRes.isError) {
    return {
      reply: `❌ **Search query failed:** ${mcpRes.text}`,
      toolCalls: executedToolTraces,
      affectedProducts: [],
      suggestedActions: ['Show low stock products', 'Reset filters'],
    };
  }

  const data = JSON.parse(mcpRes.text);
  const products = data.products || [];

  if (products.length === 0) {
    return {
      reply: `🔍 No products found matching your query "${cleaned}"${targetCategory ? ` in category "${targetCategory}"` : ''}.\n\nTry searching by broader terms or view all stock status alerts.`,
      toolCalls: executedToolTraces,
      affectedProducts: [],
      suggestedActions: ['Show all low-stock or out-of-stock products', 'List available products in Electronics'],
    };
  }

  let tableMd = `### 📦 Inventory Products${targetCategory ? ` (${targetCategory} Category)` : ''}\n\n`;
  tableMd += `Found **${products.length} matching products** in SQLite database:\n\n`;
  tableMd += `| SKU | Product Name | Category | Price | Stock Quantity | Status |\n`;
  tableMd += `|---|---|---|---|---|---|\n`;

  products.forEach((p: any) => {
    const statusEmoji = p.status === 'in_stock' ? '🟢 In Stock' : p.status === 'low_stock' ? '🟡 Low Stock' : '🔴 Out of Stock';
    tableMd += `| \`${p.sku}\` | **${p.productName}** | ${p.category} | $${p.price.toFixed(2)} | **${p.stockQuantity}** | ${statusEmoji} |\n`;
  });

  tableMd += `\n*Retrieved via \`search_products\` MCP tool over official MCP client connection.*`;

  return {
    reply: tableMd,
    toolCalls: executedToolTraces,
    affectedProducts: Array.from(affectedProductIds),
    suggestedActions: [
      products[0] ? `What is the price and stock quantity of SKU ${products[0].sku}?` : 'Show low stock products',
      'Show all low-stock or out-of-stock products',
      'Update stock quantity',
    ],
  };
}

function generateFollowUpSuggestions(toolCalls: ToolCallExecution[]): string[] {
  const calledNames = toolCalls.map(t => t.name);

  if (calledNames.includes('update_stock') || calledNames.includes('add_product')) {
    return ['What is the price and stock quantity of SKU LAP-001?', 'Show all low-stock or out-of-stock products', 'List available products in Electronics'];
  }
  if (calledNames.includes('get_stock_status')) {
    return ['What is the price and stock quantity of SKU LAP-001?', 'Update the stock quantity of SKU LAP-001 to 25', 'List available products in Electronics'];
  }
  return ['Show all low-stock or out-of-stock products', 'List available products in the Electronics category', 'What is the price and stock quantity of SKU LAP-001?'];
}
