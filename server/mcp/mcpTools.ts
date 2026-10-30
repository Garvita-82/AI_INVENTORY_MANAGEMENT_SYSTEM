import { MCPTool } from './mcpTypes.js';

export const MCP_TOOLS: MCPTool[] = [
  {
    name: 'search_products',
    description: 'Search for products in the SQLite inventory by product name, SKU, or category. Returns matching products with stock metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search string matching against product name, SKU, variant name, or category.',
        },
        category: {
          type: 'string',
          description: 'Optional category filter (e.g. Peripherals, Electronics, Audio, Office Furniture).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_stock_status',
    description: 'Retrieve all low-stock and out-of-stock products from the SQLite database with safety threshold comparisons.',
    inputSchema: {
      type: 'object',
      properties: {
        statusFilter: {
          type: 'string',
          enum: ['all', 'low_stock', 'out_of_stock'],
          description: 'Filter by specific stock issue: "all" (both low and out of stock), "low_stock", or "out_of_stock"',
        },
      },
    },
  },
  {
    name: 'get_product_details',
    description: 'Retrieve complete product details, SKU, price, current stock quantity, and reorder level from SQLite.',
    inputSchema: {
      type: 'object',
      properties: {
        sku: {
          type: 'string',
          description: 'The unique SKU code of the product to inspect (e.g. TECH-KB-001).',
        },
      },
      required: ['sku'],
    },
  },
  {
    name: 'update_stock',
    description: 'Update the stock quantity of a product in SQLite using its SKU. Accepts either an absolute new quantity or a relative delta.',
    inputSchema: {
      type: 'object',
      properties: {
        sku: {
          type: 'string',
          description: 'The unique SKU of the product to update (e.g. TECH-KB-001).',
        },
        newQuantity: {
          type: 'number',
          description: 'Absolute new stock quantity to set directly (must be non-negative integer).',
        },
        delta: {
          type: 'number',
          description: 'Relative change in stock quantity (+20 to restock, -5 to record sales).',
        },
        reason: {
          type: 'string',
          description: 'Audit explanation for the stock change.',
        },
      },
      required: ['sku'],
    },
  },
  {
    name: 'add_product',
    description: 'Create and register a brand new product in SQLite with category, variant, unique SKU, price, initial stock quantity, and reorder level.',
    inputSchema: {
      type: 'object',
      properties: {
        productName: {
          type: 'string',
          description: 'Full descriptive product title.',
        },
        sku: {
          type: 'string',
          description: 'Unique Stock Keeping Unit (e.g. TECH-KEY-099).',
        },
        category: {
          type: 'string',
          description: 'Product category name.',
        },
        variantName: {
          type: 'string',
          description: 'Variant description (e.g. Matte Black, 34-Inch). Default: Standard.',
        },
        price: {
          type: 'number',
          description: 'Unit retail price in USD (must be non-negative).',
        },
        initialStock: {
          type: 'number',
          description: 'Initial stock units available in the warehouse (must be non-negative integer).',
        },
        reorderLevel: {
          type: 'number',
          description: 'Stock level at or below which low stock alert is triggered. Default: 10.',
        },
        description: {
          type: 'string',
          description: 'Technical specifications and product features.',
        },
      },
      required: ['productName', 'sku', 'category', 'price', 'initialStock'],
    },
  },
  {
    name: 'get_inventory_analytics',
    description: 'Fetch global high-level inventory metrics including total products count, stock levels, out-of-stock items, total inventory financial valuation, and category breakdown.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_restock_recommendations',
    description: 'Analyze all items below safety threshold and out of stock to generate actionable purchase order recommendations with suggested order quantities and estimated costs.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];
