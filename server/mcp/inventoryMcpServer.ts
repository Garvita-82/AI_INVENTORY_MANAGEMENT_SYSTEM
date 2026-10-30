import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db/sqliteDb.js';

export function createInventoryMcpServer(): McpServer {
  const server = new McpServer({
    name: 'nexus-stock-inventory-server',
    version: '1.0.0',
  });

  const rawDb = db.getRawDb();

  // 1. TOOL: search_products
  server.tool(
    'search_products',
    'Search for products in the SQLite inventory by product name, SKU, or category.',
    {
      query: z.string().describe('Search query matching against product name, SKU, variant name, or category'),
      category: z.string().optional().describe('Optional category filter (e.g. Peripherals, Electronics, Audio, Office Furniture)'),
    },
    async ({ query, category }) => {
      try {
        const term = `%${query.trim().toLowerCase()}%`;
        let sql = `
          SELECT 
            p.product_id,
            p.product_name,
            p.description,
            c.category_name,
            pv.variant_id,
            pv.sku,
            pv.variant_name,
            pv.price,
            i.quantity,
            i.reorder_level,
            CASE 
              WHEN i.quantity = 0 THEN 'out_of_stock'
              WHEN i.quantity <= i.reorder_level THEN 'low_stock'
              ELSE 'in_stock'
            END as status
          FROM ProductVariants pv
          JOIN Products p ON p.product_id = pv.product_id
          JOIN Categories c ON c.category_id = p.category_id
          JOIN Inventory i ON i.variant_id = pv.variant_id
          WHERE (
            lower(p.product_name) LIKE ? OR
            lower(pv.sku) LIKE ? OR
            lower(c.category_name) LIKE ? OR
            lower(pv.variant_name) LIKE ?
          )
        `;

        const params: any[] = [term, term, term, term];

        if (category && category.trim()) {
          sql += ` AND lower(c.category_name) = lower(?)`;
          params.push(category.trim());
        }

        sql += ` ORDER BY p.product_name ASC, pv.variant_name ASC`;

        const stmt = rawDb.prepare(sql);
        const rows = stmt.all(...params) as any[];

        const results = rows.map(r => ({
          sku: r.sku,
          productName: r.product_name,
          variantName: r.variant_name,
          category: r.category_name,
          price: Number(r.price),
          stockQuantity: Number(r.quantity),
          reorderLevel: Number(r.reorder_level),
          status: r.status,
          description: r.description || '',
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: results.length,
                  query,
                  categoryFilter: category || null,
                  products: results,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Database error during search_products: ${err.message}` }],
        };
      }
    }
  );

  // 2. TOOL: get_stock_status
  server.tool(
    'get_stock_status',
    'Retrieve all low-stock and out-of-stock products from the SQLite database with safety threshold comparisons.',
    {
      statusFilter: z
        .enum(['all', 'low_stock', 'out_of_stock'])
        .optional()
        .default('all')
        .describe('Filter by specific stock issue: "all" (both low and out of stock), "low_stock", or "out_of_stock"'),
    },
    async ({ statusFilter }) => {
      try {
        let condition = 'i.quantity <= i.reorder_level';
        if (statusFilter === 'out_of_stock') {
          condition = 'i.quantity = 0';
        } else if (statusFilter === 'low_stock') {
          condition = 'i.quantity > 0 AND i.quantity <= i.reorder_level';
        }

        const sql = `
          SELECT 
            p.product_name,
            pv.sku,
            pv.variant_name,
            c.category_name,
            pv.price,
            i.quantity,
            i.reorder_level,
            CASE 
              WHEN i.quantity = 0 THEN 'out_of_stock'
              WHEN i.quantity <= i.reorder_level THEN 'low_stock'
              ELSE 'in_stock'
            END as status
          FROM ProductVariants pv
          JOIN Products p ON p.product_id = pv.product_id
          JOIN Categories c ON c.category_id = p.category_id
          JOIN Inventory i ON i.variant_id = pv.variant_id
          WHERE ${condition}
          ORDER BY (i.quantity = 0) DESC, i.quantity ASC
        `;

        const rows = rawDb.prepare(sql).all() as any[];

        const items = rows.map(r => {
          const qty = Number(r.quantity);
          const reorder = Number(r.reorder_level);
          const price = Number(r.price);
          const recommendedRestock = qty === 0 ? Math.max(10, reorder * 2) : Math.max(5, reorder * 2 - qty);

          return {
            sku: r.sku,
            productName: r.product_name,
            variantName: r.variant_name,
            category: r.category_name,
            price,
            currentQuantity: qty,
            reorderLevel: reorder,
            status: r.status,
            urgency: qty === 0 ? 'CRITICAL' : 'WARNING',
            recommendedRestock,
            estimatedRestockCost: Math.round(recommendedRestock * price * 100) / 100,
          };
        });

        const outOfStockCount = items.filter(i => i.status === 'out_of_stock').length;
        const lowStockCount = items.filter(i => i.status === 'low_stock').length;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalAlerts: items.length,
                  outOfStockCount,
                  lowStockCount,
                  statusFilter,
                  items,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Database error during get_stock_status: ${err.message}` }],
        };
      }
    }
  );

  // 3. TOOL: get_product_details
  server.tool(
    'get_product_details',
    'Retrieve complete product details, SKU, price, current stock quantity, and reorder level from SQLite.',
    {
      sku: z.string().describe('The unique SKU code of the product to inspect (e.g. TECH-KB-001)'),
    },
    async ({ sku }) => {
      try {
        const trimmedSku = sku.trim();
        const sql = `
          SELECT 
            p.product_id,
            p.product_name,
            p.description,
            c.category_id,
            c.category_name,
            pv.variant_id,
            pv.sku,
            pv.variant_name,
            pv.price,
            i.inventory_id,
            i.quantity,
            i.reorder_level,
            i.last_restocked,
            i.updated_at,
            CASE 
              WHEN i.quantity = 0 THEN 'out_of_stock'
              WHEN i.quantity <= i.reorder_level THEN 'low_stock'
              ELSE 'in_stock'
            END as status
          FROM ProductVariants pv
          JOIN Products p ON p.product_id = pv.product_id
          JOIN Categories c ON c.category_id = p.category_id
          JOIN Inventory i ON i.variant_id = pv.variant_id
          WHERE pv.sku = ? COLLATE NOCASE
        `;

        const row = rawDb.prepare(sql).get(trimmedSku) as any;

        if (!row) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: Product with SKU "${trimmedSku}" was not found in the SQLite inventory database.`,
              },
            ],
          };
        }

        const details = {
          productId: row.product_id,
          variantId: row.variant_id,
          sku: row.sku,
          productName: row.product_name,
          variantName: row.variant_name,
          category: row.category_name,
          price: Number(row.price),
          stockQuantity: Number(row.quantity),
          reorderLevel: Number(row.reorder_level),
          status: row.status,
          description: row.description || '',
          lastRestocked: row.last_restocked,
          updatedAt: row.updated_at,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(details, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Database error during get_product_details: ${err.message}` }],
        };
      }
    }
  );

  // 4. TOOL: update_stock
  server.tool(
    'update_stock',
    'Update the stock quantity of a product in SQLite using its SKU. Accepts either an absolute new quantity or a relative delta.',
    {
      sku: z.string().describe('The unique SKU of the product to update (e.g. TECH-KB-001)'),
      newQuantity: z.number().int().optional().describe('Absolute new stock quantity to set (must be non-negative)'),
      delta: z.number().int().optional().describe('Relative quantity adjustment (+10 to restock, -3 to deduct)'),
      reason: z.string().optional().describe('Audit explanation for the stock change'),
    },
    async ({ sku, newQuantity, delta, reason }) => {
      try {
        if (newQuantity === undefined && delta === undefined) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Validation error: You must provide either "newQuantity" or "delta" to update stock.',
              },
            ],
          };
        }

        const trimmedSku = sku.trim();

        // 1. Check if SKU exists
        const checkSql = `
          SELECT 
            pv.variant_id,
            pv.sku,
            p.product_name,
            i.quantity,
            i.reorder_level
          FROM ProductVariants pv
          JOIN Products p ON p.product_id = pv.product_id
          JOIN Inventory i ON i.variant_id = pv.variant_id
          WHERE pv.sku = ? COLLATE NOCASE
        `;

        const row = rawDb.prepare(checkSql).get(trimmedSku) as any;

        if (!row) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: Product with SKU "${trimmedSku}" does not exist in the database. Update aborted.`,
              },
            ],
          };
        }

        const currentQty = Number(row.quantity);
        let targetQuantity: number;

        if (newQuantity !== undefined) {
          targetQuantity = newQuantity;
        } else {
          targetQuantity = currentQty + delta!;
        }

        if (targetQuantity < 0) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Validation error: Stock quantity cannot be negative. Current stock is ${currentQty}, requested update results in ${targetQuantity} units.`,
              },
            ],
          };
        }

        const isRestock = targetQuantity > currentQty;
        const reorderLevel = Number(row.reorder_level);
        const newStatus =
          targetQuantity === 0 ? 'out_of_stock' : targetQuantity <= reorderLevel ? 'low_stock' : 'in_stock';

        // 2. Perform transactional update
        rawDb.exec('BEGIN TRANSACTION;');
        try {
          const updateRes = rawDb.prepare(`
            UPDATE Inventory
            SET 
              quantity = ?,
              updated_at = datetime('now'),
              last_restocked = CASE WHEN ? = 1 THEN datetime('now') ELSE last_restocked END
            WHERE variant_id = ?
          `).run(targetQuantity, isRestock ? 1 : 0, row.variant_id);

          if (updateRes.changes !== 1) {
            throw new Error(`Expected 1 inventory row to update, but affected ${updateRes.changes} rows.`);
          }

          // 3. Log to AuditLogs
          const auditDetails = isRestock
            ? `Restocked +${targetQuantity - currentQty} units (${currentQty} -> ${targetQuantity})`
            : targetQuantity < currentQty
            ? `Deducted ${currentQty - targetQuantity} units (${currentQty} -> ${targetQuantity})`
            : `Maintained at ${targetQuantity} units`;

          const reasonText = reason ? ` [Reason: ${reason}]` : ' [MCP Tool Update]';

          rawDb.prepare(`
            INSERT INTO AuditLogs (timestamp, action, sku, product_name, details, source, previous_val, new_val)
            VALUES (datetime('now'), 'STOCK_ADJUST', ?, ?, ?, 'MCP_TOOL', ?, ?)
          `).run(
            row.sku,
            row.product_name,
            `${auditDetails}${reasonText}`,
            JSON.stringify({ quantity: currentQty }),
            JSON.stringify({ quantity: targetQuantity, status: newStatus })
          );

          rawDb.exec('COMMIT;');

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    sku: row.sku,
                    productName: row.product_name,
                    previousQuantity: currentQty,
                    newQuantity: targetQuantity,
                    delta: targetQuantity - currentQty,
                    stockStatus: newStatus,
                    reorderLevel,
                    message: `Successfully updated stock for ${row.product_name} (${row.sku}) in SQLite database.`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (dbErr: any) {
          rawDb.exec('ROLLBACK;');
          throw dbErr;
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Database error during update_stock: ${err.message}` }],
        };
      }
    }
  );

  // 5. TOOL: add_product
  server.tool(
    'add_product',
    'Create and register a brand new product in SQLite with category, variant, unique SKU, price, initial stock, and reorder level.',
    {
      productName: z.string().min(1).describe('Full descriptive product name'),
      sku: z.string().min(1).describe('Unique Stock Keeping Unit (e.g. TECH-ACC-099)'),
      category: z.string().min(1).describe('Product category (e.g. Electronics, Peripherals, Audio, Office Furniture)'),
      variantName: z.string().optional().default('Standard').describe('Variant description (e.g. 16GB Black, Matte Finish)'),
      price: z.number().min(0).describe('Unit retail price in USD (must be non-negative)'),
      initialStock: z.number().int().min(0).describe('Initial units available in warehouse (must be non-negative integer)'),
      reorderLevel: z.number().int().min(0).optional().default(10).describe('Safety reorder threshold (default: 10)'),
      description: z.string().optional().describe('Technical specifications and product features'),
    },
    async ({ productName, sku, category, variantName, price, initialStock, reorderLevel = 10, description = '' }) => {
      try {
        const trimmedSku = sku.trim().toUpperCase();

        // 1. Check for SKU uniqueness before beginning transaction
        const existingRow = rawDb.prepare('SELECT variant_id FROM ProductVariants WHERE sku = ? COLLATE NOCASE').get(trimmedSku);
        if (existingRow) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Constraint error: A product variant with SKU "${trimmedSku}" already exists in the database. SKUs must be unique.`,
              },
            ],
          };
        }

        rawDb.exec('BEGIN TRANSACTION;');
        try {
          // 2. Insert or find Category
          let categoryId: number;
          const catRow = rawDb.prepare('SELECT category_id FROM Categories WHERE category_name = ? COLLATE NOCASE').get(category.trim()) as any;
          if (catRow) {
            categoryId = catRow.category_id;
          } else {
            const catRes = rawDb.prepare('INSERT INTO Categories (category_name) VALUES (?)').run(category.trim());
            categoryId = Number(catRes.lastInsertRowid);
          }

          // 3. Insert Product
          const prodRes = rawDb.prepare(`
            INSERT INTO Products (category_id, product_name, description)
            VALUES (?, ?, ?)
          `).run(categoryId, productName.trim(), description.trim());
          const productId = Number(prodRes.lastInsertRowid);

          // 4. Insert ProductVariant (enforces UNIQUE sku)
          const varRes = rawDb.prepare(`
            INSERT INTO ProductVariants (product_id, sku, variant_name, price)
            VALUES (?, ?, ?, ?)
          `).run(productId, trimmedSku, variantName.trim(), Math.round(price * 100) / 100);
          const variantId = Number(varRes.lastInsertRowid);

          // 5. Insert Inventory (enforces UNIQUE variant_id -> 1:1 relationship)
          const invRes = rawDb.prepare(`
            INSERT INTO Inventory (variant_id, quantity, reorder_level, last_restocked, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
          `).run(variantId, initialStock, reorderLevel);

          if (invRes.changes !== 1) {
            throw new Error('Failed to create inventory record for new variant.');
          }

          // 6. Log to AuditLogs
          rawDb.prepare(`
            INSERT INTO AuditLogs (timestamp, action, sku, product_name, details, source, new_val)
            VALUES (datetime('now'), 'CREATE', ?, ?, ?, 'MCP_TOOL', ?)
          `).run(
            trimmedSku,
            productName.trim(),
            `Registered new product "${productName.trim()}" (SKU: ${trimmedSku}) with ${initialStock} units @ $${price.toFixed(2)}`,
            JSON.stringify({
              sku: trimmedSku,
              name: productName,
              category,
              variantName,
              price,
              initialStock,
              reorderLevel,
            })
          );

          rawDb.exec('COMMIT;');

          const status =
            initialStock === 0 ? 'out_of_stock' : initialStock <= reorderLevel ? 'low_stock' : 'in_stock';

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    productId,
                    variantId,
                    sku: trimmedSku,
                    productName: productName.trim(),
                    variantName: variantName.trim(),
                    category: category.trim(),
                    price: Math.round(price * 100) / 100,
                    stockQuantity: initialStock,
                    reorderLevel,
                    status,
                    message: `Product "${productName.trim()}" with SKU "${trimmedSku}" created successfully in SQLite database.`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (dbErr: any) {
          rawDb.exec('ROLLBACK;');
          throw dbErr;
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Database error during add_product: ${err.message}` }],
        };
      }
    }
  );

  return server;
}
