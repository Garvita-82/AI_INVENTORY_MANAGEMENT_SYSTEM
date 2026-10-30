import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import {
  Product,
  NewProductInput,
  AuditLogEntry,
  AuditSource,
  InventoryAnalytics,
  RestockRecommendation,
  ProductFilterOptions,
  StockStatus,
} from '../types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SQLITE_FILE = path.join(DATA_DIR, 'inventory.sqlite');

export class SQLiteInventoryDatabase {
  private db: DatabaseSync;
  private isInitialized = false;

  constructor(dbPath: string = SQLITE_FILE) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    this.db = new DatabaseSync(dbPath);
    this.init();
  }

  private init(): void {
    if (this.isInitialized) return;

    // Enable foreign key constraints
    this.db.exec('PRAGMA foreign_keys = ON;');

    // Create required tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS Categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS Products (
        product_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS ProductVariants (
        variant_id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        sku TEXT NOT NULL UNIQUE COLLATE NOCASE,
        variant_name TEXT NOT NULL,
        price REAL NOT NULL CHECK(price >= 0),
        FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS Inventory (
        inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
        variant_id INTEGER NOT NULL UNIQUE,
        quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
        reorder_level INTEGER NOT NULL DEFAULT 10 CHECK(reorder_level >= 0),
        last_restocked TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (variant_id) REFERENCES ProductVariants(variant_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS AuditLogs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        sku TEXT,
        product_name TEXT,
        details TEXT NOT NULL,
        source TEXT NOT NULL,
        previous_val TEXT,
        new_val TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_products_category ON Products(category_id);
      CREATE INDEX IF NOT EXISTS idx_variants_product ON ProductVariants(product_id);
      CREATE INDEX IF NOT EXISTS idx_variants_sku ON ProductVariants(sku);
      CREATE INDEX IF NOT EXISTS idx_inventory_variant ON Inventory(variant_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON Inventory(quantity);
    `);

    // Check if initial seed is needed
    const countRow = this.db.prepare('SELECT count(*) as count FROM Products').get() as { count: number };
    if (countRow.count === 0) {
      this.seedInitialData();
    }

    this.isInitialized = true;
  }

  public getRawDb(): DatabaseSync {
    return this.db;
  }

  public seedInitialData(): void {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Insert Categories
      const categories = [
        'Peripherals',
        'Electronics',
        'Audio',
        'Office Furniture',
        'Accessories',
        'Networking',
        'Wearables',
      ];

      const categoryMap = new Map<string, number>();
      const insertCatStmt = this.db.prepare('INSERT OR IGNORE INTO Categories (category_name) VALUES (?)');
      const getCatStmt = this.db.prepare('SELECT category_id FROM Categories WHERE category_name = ?');

      for (const cat of categories) {
        insertCatStmt.run(cat);
        const row = getCatStmt.get(cat) as { category_id: number };
        categoryMap.set(cat, row.category_id);
      }

      // 2. Insert Products, ProductVariants, and Inventory
      const sampleItems = [
        {
          productName: 'ApexPro Wireless Mechanical Keyboard',
          category: 'Peripherals',
          description: 'Hot-swappable tactile RGB wireless keyboard with PBT keycaps and 2.4GHz dongle.',
          variants: [
            { sku: 'TECH-KB-001', variantName: 'Tactile Brown Switches', price: 149.99, quantity: 42, reorderLevel: 15 },
            { sku: 'TECH-KB-002', variantName: 'Linear Red Switches', price: 149.99, quantity: 6, reorderLevel: 10 },
          ],
        },
        {
          productName: 'PrecisionErgo Vertical Mouse',
          category: 'Peripherals',
          description: 'Ergonomic vertical wireless mouse designed to reduce wrist strain and forearm pronation.',
          variants: [
            { sku: 'TECH-MS-002', variantName: 'Matte Graphite', price: 79.50, quantity: 8, reorderLevel: 12 },
          ],
        },
        {
          productName: 'ZenithPro Ultra Laptop 16"',
          category: 'Electronics',
          description: 'High-performance 16-inch creator laptop with 32GB RAM, 1TB NVMe SSD, and 3.2K OLED display.',
          variants: [
            { sku: 'LAP-001', variantName: 'Space Gray 32GB/1TB', price: 1299.00, quantity: 10, reorderLevel: 5 },
          ],
        },
        {
          productName: 'UltraWide Curved 34-Inch Monitor (144Hz)',
          category: 'Electronics',
          description: 'WQHD 3440x1440 curved IPS display with USB-C 90W power delivery and HDR400.',
          variants: [
            { sku: 'DISP-MON-003', variantName: 'WQHD 34-Inch Black', price: 499.00, quantity: 0, reorderLevel: 5 },
          ],
        },
        {
          productName: 'AcousticShield ANC Noise-Cancelling Headphones',
          category: 'Audio',
          description: 'Over-ear studio-grade active noise cancellation headphones with 45-hour battery life.',
          variants: [
            { sku: 'AUD-ANC-004', variantName: 'Midnight Black', price: 249.99, quantity: 24, reorderLevel: 10 },
          ],
        },
        {
          productName: 'ClearVoice USB-C Podcast Condenser Microphone',
          category: 'Audio',
          description: 'Cardioid 24-bit/96kHz studio condenser mic with built-in pop filter and zero-latency headphone out.',
          variants: [
            { sku: 'AUD-MIC-008', variantName: 'Studio Black Cardioid', price: 119.00, quantity: 0, reorderLevel: 6 },
          ],
        },
        {
          productName: 'OmniDesk Dual-Motor Electric Standing Desk (60x30")',
          category: 'Office Furniture',
          description: 'Solid walnut dual-motor motorized sit-stand desk with anti-collision sensor and memory presets.',
          variants: [
            { sku: 'FURN-DSK-005', variantName: 'Solid Walnut / Black Frame', price: 589.00, quantity: 4, reorderLevel: 8 },
            { sku: 'FURN-DSK-006', variantName: 'White Oak / White Frame', price: 589.00, quantity: 12, reorderLevel: 8 },
          ],
        },
        {
          productName: 'Zenith Lumbar High-Back Mesh Ergonomic Chair',
          category: 'Office Furniture',
          description: 'Breathable matrix mesh chair with 4D adjustable armrests and dynamic lumbar pressure response.',
          variants: [
            { sku: 'FURN-CHR-006', variantName: 'Onyx Black Mesh', price: 389.00, quantity: 18, reorderLevel: 10 },
          ],
        },
        {
          productName: 'Thunderbolt 4 Pro Docking Station (12-in-1)',
          category: 'Accessories',
          description: 'High-speed 40Gbps dock with dual 4K60Hz display support, 100W PD charging, and 2.5GbE LAN.',
          variants: [
            { sku: 'ACC-DCK-007', variantName: 'Space Gray 12-Port', price: 199.99, quantity: 3, reorderLevel: 15 },
          ],
        },
        {
          productName: 'UltraStream 4K60 HDR Streaming Webcam',
          category: 'Electronics',
          description: 'Sony STARVIS sensor 4K webcam with dual beamforming microphones and AI auto-framing.',
          variants: [
            { sku: 'TECH-CAM-009', variantName: '4K60 Standard', price: 169.50, quantity: 31, reorderLevel: 10 },
          ],
        },
        {
          productName: 'MagCharge 3-in-1 Fast Wireless Charging Stand',
          category: 'Accessories',
          description: 'Qi2 certified 15W magnetic rapid charging station for phone, smartwatch, and wireless earbuds.',
          variants: [
            { sku: 'ACC-CHG-010', variantName: 'Aluminum Silver 15W', price: 69.99, quantity: 65, reorderLevel: 20 },
          ],
        },
        {
          productName: 'MeshLink Wi-Fi 7 Tri-Band Router System (2-Pack)',
          category: 'Networking',
          description: 'Next-gen Wi-Fi 7 mesh node covering up to 6,000 sq ft with 10Gbps aggregate speeds and MLO.',
          variants: [
            { sku: 'NET-RTR-011', variantName: 'White 2-Node System', price: 349.00, quantity: 7, reorderLevel: 10 },
          ],
        },
        {
          productName: 'SmartBio Track Ultra Smartwatch',
          category: 'Wearables',
          description: 'Titanium case smartwatch with dual-frequency GPS, ECG monitor, and 14-day battery reserve.',
          variants: [
            { sku: 'WR-WAT-012', variantName: 'Titanium 46mm Sport Band', price: 279.99, quantity: 19, reorderLevel: 8 },
          ],
        },
        {
          productName: 'PureAir HEPA Pro Smart Air Purifier',
          category: 'Electronics',
          description: 'H13 true HEPA air filtration unit with laser particulate counter and smartphone automation.',
          variants: [
            { sku: 'ENV-AIR-013', variantName: 'Arctic White H13', price: 189.99, quantity: 0, reorderLevel: 5 },
          ],
        },
        {
          productName: 'SpeedFlex Braided Thunderbolt 4 Cable (2m)',
          category: 'Accessories',
          description: 'Reinforced ballistic nylon USB4/Thunderbolt 4 cable supporting 240W EPR charging & 40Gbps.',
          variants: [
            { sku: 'ACC-CBL-014', variantName: 'Ballistic Nylon 2m', price: 34.50, quantity: 110, reorderLevel: 25 },
          ],
        },
        {
          productName: 'AeroStand Aluminum Laptop Riser with Hub',
          category: 'Accessories',
          description: 'Foldable ergonomic CNC aluminum laptop stand with integrated 4-port USB 3.2 Gen 2 pass-through.',
          variants: [
            { sku: 'ACC-RSR-015', variantName: 'CNC Silver 4-Port Hub', price: 54.00, quantity: 6, reorderLevel: 12 },
          ],
        },
      ];

      const insertProdStmt = this.db.prepare(`
        INSERT INTO Products (category_id, product_name, description)
        VALUES (?, ?, ?)
      `);

      const insertVarStmt = this.db.prepare(`
        INSERT INTO ProductVariants (product_id, sku, variant_name, price)
        VALUES (?, ?, ?, ?)
      `);

      const insertInvStmt = this.db.prepare(`
        INSERT INTO Inventory (variant_id, quantity, reorder_level, last_restocked, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `);

      for (const item of sampleItems) {
        const catId = categoryMap.get(item.category) || 1;
        const prodRes = insertProdStmt.run(catId, item.productName, item.description);
        const productId = Number(prodRes.lastInsertRowid);

        for (const v of item.variants) {
          const varRes = insertVarStmt.run(productId, v.sku, v.variantName, v.price);
          const variantId = Number(varRes.lastInsertRowid);
          insertInvStmt.run(variantId, v.quantity, v.reorderLevel);
        }
      }

      // Initial audit log
      this.db.prepare(`
        INSERT INTO AuditLogs (timestamp, action, sku, product_name, details, source)
        VALUES (datetime('now'), 'CREATE', 'ALL', 'Catalog Seed', 'Initialized SQLite database with 4 relational tables and enterprise seed data', 'MANUAL')
      `).run();

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      console.error('Failed to seed SQLite database:', err);
      throw err;
    }
  }

  private mapRowToProduct(row: any): Product {
    const qty = Number(row.quantity);
    const reorder = Number(row.reorder_level);

    let stockStatus: StockStatus = 'in_stock';
    if (qty <= 0) stockStatus = 'out_of_stock';
    else if (qty <= reorder) stockStatus = 'low_stock';

    return {
      id: `prod_${row.product_id}_var_${row.variant_id}`,
      name: row.product_name,
      sku: row.sku,
      category: row.category_name,
      price: Number(row.price),
      stockQuantity: qty,
      minStockThreshold: reorder,
      stockStatus,
      description: row.description || '',
      supplier: 'Primary Supplier',
      location: `Warehouse Row ${row.category_id} - Shelf ${row.variant_id}`,
      lastRestocked: row.last_restocked || row.updated_at || new Date().toISOString(),
      createdAt: row.updated_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  public getAllProducts(filters?: ProductFilterOptions): Product[] {
    let sql = `
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
        i.updated_at
      FROM ProductVariants pv
      JOIN Products p ON p.product_id = pv.product_id
      JOIN Categories c ON c.category_id = p.category_id
      JOIN Inventory i ON i.variant_id = pv.variant_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.search) {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      sql += ` AND (
        lower(p.product_name) LIKE ? OR 
        lower(pv.sku) LIKE ? OR 
        lower(pv.variant_name) LIKE ? OR 
        lower(c.category_name) LIKE ? OR 
        lower(p.description) LIKE ?
      )`;
      params.push(term, term, term, term, term);
    }

    if (filters?.category && filters.category !== 'all') {
      sql += ` AND lower(c.category_name) = lower(?)`;
      params.push(filters.category);
    }

    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'out_of_stock') {
        sql += ` AND i.quantity = 0`;
      } else if (filters.status === 'low_stock') {
        sql += ` AND i.quantity > 0 AND i.quantity <= i.reorder_level`;
      } else if (filters.status === 'in_stock') {
        sql += ` AND i.quantity > i.reorder_level`;
      }
    }

    if (filters?.minPrice !== undefined) {
      sql += ` AND pv.price >= ?`;
      params.push(filters.minPrice);
    }

    if (filters?.maxPrice !== undefined) {
      sql += ` AND pv.price <= ?`;
      params.push(filters.maxPrice);
    }

    const sortMap: Record<string, string> = {
      name: 'p.product_name',
      sku: 'pv.sku',
      price: 'pv.price',
      stockQuantity: 'i.quantity',
      updatedAt: 'i.updated_at',
    };

    const sortByCol = (filters?.sortBy && sortMap[filters.sortBy]) || 'i.updated_at';
    const sortOrder = filters?.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortByCol} ${sortOrder}`;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    return rows.map(r => this.mapRowToProduct(r));
  }

  public getProductBySku(sku: string): Product | undefined {
    const trimmed = sku.trim();
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
        i.updated_at
      FROM ProductVariants pv
      JOIN Products p ON p.product_id = pv.product_id
      JOIN Categories c ON c.category_id = p.category_id
      JOIN Inventory i ON i.variant_id = pv.variant_id
      WHERE pv.sku = ? COLLATE NOCASE
    `;

    const row = this.db.prepare(sql).get(trimmed);
    if (!row) return undefined;
    return this.mapRowToProduct(row);
  }

  public getProductById(id: string): Product | undefined {
    // ID may be "prod_X_var_Y" or number
    let variantId: number | null = null;
    let productId: number | null = null;

    if (id.includes('_var_')) {
      const parts = id.split('_var_');
      variantId = parseInt(parts[1], 10);
    } else if (id.startsWith('prod_')) {
      productId = parseInt(id.replace('prod_', ''), 10);
    } else {
      variantId = parseInt(id, 10);
    }

    if (variantId && !isNaN(variantId)) {
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
          i.updated_at
        FROM ProductVariants pv
        JOIN Products p ON p.product_id = pv.product_id
        JOIN Categories c ON c.category_id = p.category_id
        JOIN Inventory i ON i.variant_id = pv.variant_id
        WHERE pv.variant_id = ?
      `;
      const row = this.db.prepare(sql).get(variantId);
      if (row) return this.mapRowToProduct(row);
    }

    if (productId && !isNaN(productId)) {
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
          i.updated_at
        FROM ProductVariants pv
        JOIN Products p ON p.product_id = pv.product_id
        JOIN Categories c ON c.category_id = p.category_id
        JOIN Inventory i ON i.variant_id = pv.variant_id
        WHERE p.product_id = ?
        LIMIT 1
      `;
      const row = this.db.prepare(sql).get(productId);
      if (row) return this.mapRowToProduct(row);
    }

    return undefined;
  }

  public findProduct(idOrSku: string): Product | undefined {
    return this.getProductBySku(idOrSku) || this.getProductById(idOrSku);
  }

  public createProduct(input: NewProductInput, source: AuditSource = 'MANUAL'): Product {
    const sku = input.sku?.trim().toUpperCase();
    if (!sku) {
      throw new Error('Product SKU is required');
    }

    if (!input.name || !input.name.trim()) {
      throw new Error('Product name is required');
    }

    if (input.price === undefined || isNaN(Number(input.price)) || Number(input.price) < 0) {
      throw new Error('Price must be a valid non-negative number');
    }

    if (input.stockQuantity === undefined || isNaN(Number(input.stockQuantity)) || Number(input.stockQuantity) < 0) {
      throw new Error('Stock quantity must be a non-negative integer');
    }

    const categoryName = (input.category || 'General').trim();
    const threshold = input.minStockThreshold !== undefined ? Math.max(0, Number(input.minStockThreshold)) : 10;
    const price = Math.round(Number(input.price) * 100) / 100;
    const stockQty = Math.floor(Number(input.stockQuantity));

    // Verify SKU uniqueness
    const existingSku = this.getProductBySku(sku);
    if (existingSku) {
      throw new Error(`Product with SKU "${sku}" already exists in SQLite inventory.`);
    }

    this.db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Get or create category
      let categoryId: number;
      const catRow = this.db.prepare('SELECT category_id FROM Categories WHERE category_name = ?').get(categoryName) as { category_id: number } | undefined;
      if (catRow) {
        categoryId = catRow.category_id;
      } else {
        const catRes = this.db.prepare('INSERT INTO Categories (category_name) VALUES (?)').run(categoryName);
        categoryId = Number(catRes.lastInsertRowid);
      }

      // 2. Insert Product
      const prodRes = this.db.prepare(`
        INSERT INTO Products (category_id, product_name, description)
        VALUES (?, ?, ?)
      `).run(categoryId, input.name.trim(), input.description?.trim() || '');
      const productId = Number(prodRes.lastInsertRowid);

      // 3. Insert ProductVariant (enforces UNIQUE sku)
      const varRes = this.db.prepare(`
        INSERT INTO ProductVariants (product_id, sku, variant_name, price)
        VALUES (?, ?, ?, ?)
      `).run(productId, sku, 'Standard', price);
      const variantId = Number(varRes.lastInsertRowid);

      // 4. Insert Inventory (enforces UNIQUE variant_id -> 1:1 relationship)
      this.db.prepare(`
        INSERT INTO Inventory (variant_id, quantity, reorder_level, last_restocked, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `).run(variantId, stockQty, threshold);

      // 5. Add Audit Log
      this.db.prepare(`
        INSERT INTO AuditLogs (timestamp, action, sku, product_name, details, source, new_val)
        VALUES (datetime('now'), 'CREATE', ?, ?, ?, ?, ?)
      `).run(
        sku,
        input.name.trim(),
        `Created product "${input.name.trim()}" (SKU: ${sku}) with ${stockQty} units @ $${price.toFixed(2)}`,
        source,
        JSON.stringify({ sku, name: input.name, price, stockQuantity: stockQty, category: categoryName })
      );

      this.db.exec('COMMIT;');

      const created = this.getProductBySku(sku);
      if (!created) {
        throw new Error('Failed to retrieve newly inserted product.');
      }
      return created;
    } catch (err: any) {
      this.db.exec('ROLLBACK;');
      if (err.message?.includes('UNIQUE constraint failed: ProductVariants.sku')) {
        throw new Error(`Product with SKU "${sku}" already exists in database.`);
      }
      throw err;
    }
  }

  public updateStock(
    idOrSku: string,
    options: { delta?: number; newQuantity?: number; reason?: string },
    source: AuditSource = 'MANUAL'
  ): Product {
    const existing = this.findProduct(idOrSku);
    if (!existing) {
      throw new Error(`Product not found with identifier: "${idOrSku}"`);
    }

    const previousQuantity = existing.stockQuantity;
    let finalQuantity: number;

    if (options.newQuantity !== undefined) {
      finalQuantity = Math.floor(options.newQuantity);
    } else if (options.delta !== undefined) {
      finalQuantity = previousQuantity + Math.floor(options.delta);
    } else {
      throw new Error('Either "delta" or "newQuantity" must be provided to update stock');
    }

    if (finalQuantity < 0) {
      throw new Error(
        `Cannot set stock quantity to ${finalQuantity}. Current stock is ${previousQuantity}, requested change violates non-negative constraint.`
      );
    }

    // Extract variant_id from product
    const variantRow = this.db.prepare('SELECT variant_id FROM ProductVariants WHERE sku = ? COLLATE NOCASE').get(existing.sku) as { variant_id: number };
    if (!variantRow) {
      throw new Error(`Variant not found for SKU "${existing.sku}"`);
    }

    const isRestock = finalQuantity > previousQuantity;

    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.prepare(`
        UPDATE Inventory
        SET 
          quantity = ?,
          updated_at = datetime('now'),
          last_restocked = CASE WHEN ? = 1 THEN datetime('now') ELSE last_restocked END
        WHERE variant_id = ?
      `).run(finalQuantity, isRestock ? 1 : 0, variantRow.variant_id);

      const changeNote = isRestock
        ? `Restocked +${finalQuantity - previousQuantity} units (${previousQuantity} -> ${finalQuantity})`
        : finalQuantity < previousQuantity
        ? `Reduced by ${previousQuantity - finalQuantity} units (${previousQuantity} -> ${finalQuantity})`
        : `Stock maintained at ${finalQuantity}`;

      const reasonNote = options.reason ? ` [Reason: ${options.reason}]` : '';

      this.db.prepare(`
        INSERT INTO AuditLogs (timestamp, action, sku, product_name, details, source, previous_val, new_val)
        VALUES (datetime('now'), 'STOCK_ADJUST', ?, ?, ?, ?, ?, ?)
      `).run(
        existing.sku,
        existing.name,
        `${changeNote}${reasonNote}`,
        source,
        JSON.stringify({ quantity: previousQuantity, status: existing.stockStatus }),
        JSON.stringify({ quantity: finalQuantity })
      );

      this.db.exec('COMMIT;');

      const updated = this.getProductBySku(existing.sku);
      if (!updated) throw new Error('Failed to retrieve updated product');
      return updated;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  public updateProduct(
    idOrSku: string,
    updates: Partial<Omit<Product, 'id' | 'createdAt'>>,
    source: AuditSource = 'MANUAL'
  ): Product {
    const existing = this.findProduct(idOrSku);
    if (!existing) {
      throw new Error(`Product not found: "${idOrSku}"`);
    }

    const variantRow = this.db.prepare(`
      SELECT pv.variant_id, pv.product_id, p.category_id 
      FROM ProductVariants pv 
      JOIN Products p ON p.product_id = pv.product_id
      WHERE pv.sku = ? COLLATE NOCASE
    `).get(existing.sku) as { variant_id: number; product_id: number; category_id: number };

    this.db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Update Product details if provided
      if (updates.name !== undefined || updates.description !== undefined || updates.category !== undefined) {
        let categoryId = variantRow.category_id;
        if (updates.category) {
          const catName = updates.category.trim();
          const catRow = this.db.prepare('SELECT category_id FROM Categories WHERE category_name = ?').get(catName) as { category_id: number } | undefined;
          if (catRow) {
            categoryId = catRow.category_id;
          } else {
            const catRes = this.db.prepare('INSERT INTO Categories (category_name) VALUES (?)').run(catName);
            categoryId = Number(catRes.lastInsertRowid);
          }
        }

        this.db.prepare(`
          UPDATE Products 
          SET 
            product_name = coalesce(?, product_name),
            description = coalesce(?, description),
            category_id = ?
          WHERE product_id = ?
        `).run(
          updates.name?.trim() || null,
          updates.description !== undefined ? updates.description.trim() : null,
          categoryId,
          variantRow.product_id
        );
      }

      // 2. Update Variant details (price, sku)
      if (updates.price !== undefined || updates.sku !== undefined) {
        if (updates.price !== undefined && updates.price < 0) {
          throw new Error('Price cannot be negative');
        }

        const newPrice = updates.price !== undefined ? Math.round(updates.price * 100) / 100 : null;
        const newSku = updates.sku ? updates.sku.trim().toUpperCase() : null;

        this.db.prepare(`
          UPDATE ProductVariants
          SET 
            price = coalesce(?, price),
            sku = coalesce(?, sku)
          WHERE variant_id = ?
        `).run(newPrice, newSku, variantRow.variant_id);
      }

      // 3. Update Inventory (stockQuantity, minStockThreshold)
      if (updates.stockQuantity !== undefined || updates.minStockThreshold !== undefined) {
        if (updates.stockQuantity !== undefined && updates.stockQuantity < 0) {
          throw new Error('Stock quantity cannot be negative');
        }

        this.db.prepare(`
          UPDATE Inventory
          SET 
            quantity = coalesce(?, quantity),
            reorder_level = coalesce(?, reorder_level),
            updated_at = datetime('now')
          WHERE variant_id = ?
        `).run(
          updates.stockQuantity !== undefined ? Math.floor(updates.stockQuantity) : null,
          updates.minStockThreshold !== undefined ? Math.floor(updates.minStockThreshold) : null,
          variantRow.variant_id
        );
      }

      // Log update
      this.db.prepare(`
        INSERT INTO AuditLogs (timestamp, action, sku, product_name, details, source, previous_val, new_val)
        VALUES (datetime('now'), 'UPDATE', ?, ?, ?, ?, ?, ?)
      `).run(
        updates.sku || existing.sku,
        updates.name || existing.name,
        `Updated details for "${existing.name}" (${Object.keys(updates).join(', ')})`,
        source,
        JSON.stringify(existing),
        JSON.stringify(updates)
      );

      this.db.exec('COMMIT;');

      const updated = this.getProductBySku(updates.sku || existing.sku);
      if (!updated) throw new Error('Failed to retrieve updated product');
      return updated;
    } catch (err: any) {
      this.db.exec('ROLLBACK;');
      if (err.message?.includes('UNIQUE constraint failed: ProductVariants.sku')) {
        throw new Error(`SKU "${updates.sku}" is already assigned to another product.`);
      }
      throw err;
    }
  }

  public deleteProduct(idOrSku: string, source: AuditSource = 'MANUAL'): Product {
    const existing = this.findProduct(idOrSku);
    if (!existing) {
      throw new Error(`Product not found: "${idOrSku}"`);
    }

    const variantRow = this.db.prepare(`
      SELECT pv.variant_id, pv.product_id, (SELECT count(*) FROM ProductVariants WHERE product_id = pv.product_id) as variant_count
      FROM ProductVariants pv
      WHERE pv.sku = ? COLLATE NOCASE
    `).get(existing.sku) as { variant_id: number; product_id: number; variant_count: number } | undefined;

    if (!variantRow) {
      throw new Error(`Product variant not found for SKU "${existing.sku}"`);
    }

    this.db.exec('BEGIN TRANSACTION;');
    try {
      // If this was the last variant for the product, deleting the product cascades and removes all
      if (variantRow.variant_count <= 1) {
        this.db.prepare('DELETE FROM Products WHERE product_id = ?').run(variantRow.product_id);
      } else {
        this.db.prepare('DELETE FROM ProductVariants WHERE variant_id = ?').run(variantRow.variant_id);
      }

      this.db.prepare(`
        INSERT INTO AuditLogs (timestamp, action, sku, product_name, details, source, previous_val)
        VALUES (datetime('now'), 'DELETE', ?, ?, ?, ?, ?)
      `).run(
        existing.sku,
        existing.name,
        `Removed product "${existing.name}" (SKU: ${existing.sku}) from SQLite catalog`,
        source,
        JSON.stringify(existing)
      );

      this.db.exec('COMMIT;');
      return existing;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  public batchUpdateStock(
    items: Array<{ idOrSku: string; delta?: number; newQuantity?: number; reason?: string }>,
    source: AuditSource = 'MANUAL'
  ): Product[] {
    const results: Product[] = [];
    const errors: string[] = [];

    for (const item of items) {
      try {
        const updated = this.updateStock(item.idOrSku, {
          delta: item.delta,
          newQuantity: item.newQuantity,
          reason: item.reason,
        }, source);
        results.push(updated);
      } catch (err: any) {
        errors.push(`Item ${item.idOrSku}: ${err.message}`);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`Batch update failed: ${errors.join('; ')}`);
    }

    return results;
  }

  public getAnalytics(): InventoryAnalytics {
    const overviewRow = this.db.prepare(`
      SELECT 
        count(pv.variant_id) as totalProducts,
        coalesce(sum(i.quantity), 0) as totalStockUnits,
        coalesce(sum(i.quantity * pv.price), 0.0) as totalValuation,
        count(CASE WHEN i.quantity = 0 THEN 1 END) as outOfStockCount,
        count(CASE WHEN i.quantity > 0 AND i.quantity <= i.reorder_level THEN 1 END) as lowStockCount,
        count(CASE WHEN i.quantity > i.reorder_level THEN 1 END) as inStockCount
      FROM ProductVariants pv
      JOIN Inventory i ON i.variant_id = pv.variant_id
    `).get() as any;

    const categoryRows = this.db.prepare(`
      SELECT 
        c.category_name,
        count(pv.variant_id) as count,
        coalesce(sum(i.quantity), 0) as totalStock,
        coalesce(sum(i.quantity * pv.price), 0.0) as totalValuation
      FROM Categories c
      JOIN Products p ON p.category_id = c.category_id
      JOIN ProductVariants pv ON pv.product_id = p.product_id
      JOIN Inventory i ON i.variant_id = pv.variant_id
      GROUP BY c.category_name
      ORDER BY c.category_name ASC
    `).all() as any[];

    const categories: string[] = [];
    const categoryBreakdown: Record<string, { count: number; totalStock: number; totalValuation: number }> = {};

    for (const row of categoryRows) {
      categories.push(row.category_name);
      categoryBreakdown[row.category_name] = {
        count: Number(row.count),
        totalStock: Number(row.totalStock),
        totalValuation: Math.round(Number(row.totalValuation) * 100) / 100,
      };
    }

    const auditRows = this.db.prepare(`
      SELECT log_id, timestamp, action, sku, product_name, details, source, previous_val, new_val
      FROM AuditLogs
      ORDER BY log_id DESC
      LIMIT 15
    `).all() as any[];

    const recentActivities: AuditLogEntry[] = auditRows.map(r => ({
      id: `log_${r.log_id}`,
      timestamp: r.timestamp,
      action: r.action,
      sku: r.sku,
      productName: r.product_name,
      details: r.details,
      source: r.source as AuditSource,
      previousValue: r.previous_val ? JSON.parse(r.previous_val) : undefined,
      newValue: r.new_val ? JSON.parse(r.new_val) : undefined,
    }));

    return {
      totalProducts: Number(overviewRow.totalProducts),
      totalStockUnits: Number(overviewRow.totalStockUnits),
      totalValuation: Math.round(Number(overviewRow.totalValuation) * 100) / 100,
      lowStockCount: Number(overviewRow.lowStockCount),
      outOfStockCount: Number(overviewRow.outOfStockCount),
      inStockCount: Number(overviewRow.inStockCount),
      categories,
      categoryBreakdown,
      recentActivities,
    };
  }

  public getRestockRecommendations(): RestockRecommendation[] {
    const sql = `
      SELECT 
        p.product_id,
        p.product_name,
        c.category_name,
        pv.variant_id,
        pv.sku,
        pv.price,
        i.quantity,
        i.reorder_level
      FROM ProductVariants pv
      JOIN Products p ON p.product_id = pv.product_id
      JOIN Categories c ON c.category_id = p.category_id
      JOIN Inventory i ON i.variant_id = pv.variant_id
      WHERE i.quantity <= i.reorder_level
      ORDER BY (i.quantity = 0) DESC, (i.quantity * pv.price) ASC
    `;

    const rows = this.db.prepare(sql).all() as any[];

    return rows.map(r => {
      const currentStock = Number(r.quantity);
      const minThreshold = Number(r.reorder_level);
      const price = Number(r.price);
      const isDepleted = currentStock === 0;

      const recommendedOrder = isDepleted
        ? Math.max(10, minThreshold * 2)
        : Math.max(5, (minThreshold * 2) - currentStock);

      const estimatedCost = Math.round(recommendedOrder * price * 100) / 100;

      return {
        productId: `prod_${r.product_id}_var_${r.variant_id}`,
        sku: r.sku,
        name: r.product_name,
        category: r.category_name,
        currentStock,
        minThreshold,
        recommendedOrder,
        estimatedCost,
        urgency: isDepleted ? 'CRITICAL' : 'WARNING',
        reason: isDepleted
          ? 'Item is completely depleted (0 stock). Immediate purchase order required.'
          : `Stock at ${currentStock} units is at/below safety threshold (${minThreshold}). Reorder suggested.`,
      };
    });
  }

  public getAuditLogs(limit = 50): AuditLogEntry[] {
    const rows = this.db.prepare(`
      SELECT log_id, timestamp, action, sku, product_name, details, source, previous_val, new_val
      FROM AuditLogs
      ORDER BY log_id DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(r => ({
      id: `log_${r.log_id}`,
      timestamp: r.timestamp,
      action: r.action,
      sku: r.sku,
      productName: r.product_name,
      details: r.details,
      source: r.source as AuditSource,
      previousValue: r.previous_val ? JSON.parse(r.previous_val) : undefined,
      newValue: r.new_val ? JSON.parse(r.new_val) : undefined,
    }));
  }

  public resetToDemo(): void {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.exec(`
        DELETE FROM AuditLogs;
        DELETE FROM Inventory;
        DELETE FROM ProductVariants;
        DELETE FROM Products;
        DELETE FROM Categories;
        DELETE FROM sqlite_sequence WHERE name IN ('Categories', 'Products', 'ProductVariants', 'Inventory', 'AuditLogs');
      `);
      this.db.exec('COMMIT;');
      this.seedInitialData();
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }
}

// Export singleton instance backed by persistent SQLite file
export const db = new SQLiteInventoryDatabase();
