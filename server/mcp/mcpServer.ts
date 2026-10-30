import { db } from '../db/sqliteDb.js';
import { AuditSource } from '../types.js';
import { MCP_TOOLS } from './mcpTools.js';
import { MCPCallToolResult, MCPListToolsResult } from './mcpTypes.js';

export class MCPServer {
  public listTools(): MCPListToolsResult {
    return {
      tools: MCP_TOOLS,
    };
  }

  public async callTool(
    name: string,
    args: Record<string, any> = {},
    source: AuditSource = 'MCP_TOOL'
  ): Promise<MCPCallToolResult> {
    try {
      switch (name) {
        case 'search_products':
        case 'list_inventory': {
          const searchQuery = args.query || args.search || '';
          const categoryFilter = args.category;
          const statusFilter = args.status;

          const products = db.getAllProducts({
            search: searchQuery ? String(searchQuery) : undefined,
            category: categoryFilter ? String(categoryFilter) : undefined,
            status: statusFilter ? (statusFilter as any) : undefined,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    count: products.length,
                    query: searchQuery,
                    category: categoryFilter || 'all',
                    products: products.map(p => ({
                      sku: p.sku,
                      name: p.name,
                      category: p.category,
                      price: p.price,
                      stockQuantity: p.stockQuantity,
                      reorderLevel: p.minStockThreshold,
                      stockStatus: p.stockStatus,
                      location: p.location,
                    })),
                  },
                  null,
                  2
                ),
              },
            ],
            metadata: { resultCount: products.length, filters: args },
          };
        }

        case 'get_stock_status': {
          const status = args.statusFilter || 'all';
          const recommendations = db.getRestockRecommendations();
          const analytics = db.getAnalytics();

          let filtered = recommendations;
          if (status === 'out_of_stock') {
            filtered = recommendations.filter(r => r.urgency === 'CRITICAL');
          } else if (status === 'low_stock') {
            filtered = recommendations.filter(r => r.urgency === 'WARNING');
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    totalAlerts: filtered.length,
                    outOfStockCount: analytics.outOfStockCount,
                    lowStockCount: analytics.lowStockCount,
                    statusFilter: status,
                    items: filtered.map(r => ({
                      sku: r.sku,
                      productName: r.name,
                      category: r.category,
                      currentQuantity: r.currentStock,
                      reorderLevel: r.minThreshold,
                      urgency: r.urgency,
                      recommendedRestock: r.recommendedOrder,
                      estimatedCost: r.estimatedCost,
                      reason: r.reason,
                    })),
                  },
                  null,
                  2
                ),
              },
            ],
            metadata: { count: filtered.length },
          };
        }

        case 'get_product_details':
        case 'get_product': {
          const skuOrId = args.sku || args.idOrSku;
          if (!skuOrId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Error: "sku" argument is required.' }],
            };
          }

          const product = db.findProduct(skuOrId);
          if (!product) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Error: Product with SKU "${skuOrId}" was not found.` }],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    stockQuantity: product.stockQuantity,
                    reorderLevel: product.minStockThreshold,
                    stockStatus: product.stockStatus,
                    description: product.description,
                    supplier: product.supplier,
                    location: product.location,
                    lastRestocked: product.lastRestocked,
                  },
                  null,
                  2
                ),
              },
            ],
            metadata: { product },
          };
        }

        case 'update_stock': {
          const targetSku = args.sku || args.idOrSku;
          if (!targetSku) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Error: "sku" argument is required.' }],
            };
          }

          const targetQty = args.newQuantity !== undefined ? args.newQuantity : args.quantity;
          const deltaQty = args.delta;

          if (targetQty === undefined && deltaQty === undefined) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Error: Either "newQuantity" or "delta" must be provided.' }],
            };
          }

          const updated = db.updateStock(
            targetSku,
            {
              delta: deltaQty !== undefined ? Number(deltaQty) : undefined,
              newQuantity: targetQty !== undefined ? Number(targetQty) : undefined,
              reason: args.reason || 'MCP Tool execution',
            },
            source
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    sku: updated.sku,
                    productName: updated.name,
                    stockQuantity: updated.stockQuantity,
                    reorderLevel: updated.minStockThreshold,
                    stockStatus: updated.stockStatus,
                    message: `Successfully updated stock for "${updated.name}" (${updated.sku}). Current quantity: ${updated.stockQuantity} units.`,
                  },
                  null,
                  2
                ),
              },
            ],
            metadata: { product: updated },
          };
        }

        case 'add_product': {
          const name = args.productName || args.name;
          const sku = args.sku;
          const category = args.category;
          const price = args.price;
          const stockQuantity = args.initialStock !== undefined ? args.initialStock : args.stockQuantity;
          const reorderLevel = args.reorderLevel !== undefined ? args.reorderLevel : args.minStockThreshold;

          if (!name || !sku || price === undefined || stockQuantity === undefined) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: 'Error: Missing required fields: productName, sku, price, initialStock.',
                },
              ],
            };
          }

          const created = db.createProduct(
            {
              name: String(name),
              sku: String(sku),
              category: String(category || 'General'),
              price: Number(price),
              stockQuantity: Number(stockQuantity),
              minStockThreshold: reorderLevel !== undefined ? Number(reorderLevel) : 10,
              description: args.description || '',
              supplier: args.supplier || 'Primary Supplier',
              location: args.location || 'Warehouse Main Floor',
            },
            source
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    sku: created.sku,
                    productName: created.name,
                    category: created.category,
                    price: created.price,
                    stockQuantity: created.stockQuantity,
                    reorderLevel: created.minStockThreshold,
                    stockStatus: created.stockStatus,
                    message: `Successfully created product "${created.name}" (SKU: ${created.sku}).`,
                  },
                  null,
                  2
                ),
              },
            ],
            metadata: { product: created },
          };
        }

        case 'get_inventory_analytics': {
          const analytics = db.getAnalytics();
          return {
            content: [{ type: 'text', text: JSON.stringify(analytics, null, 2) }],
            metadata: { analytics },
          };
        }

        case 'get_restock_recommendations': {
          const recommendations = db.getRestockRecommendations();
          return {
            content: [{ type: 'text', text: JSON.stringify(recommendations, null, 2) }],
            metadata: { count: recommendations.length },
          };
        }

        default:
          return {
            isError: true,
            content: [{ type: 'text', text: `Unknown tool: "${name}"` }],
          };
      }
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Operation failed: ${err.message || 'Database error'}` }],
      };
    }
  }
}

export const mcpServer = new MCPServer();
