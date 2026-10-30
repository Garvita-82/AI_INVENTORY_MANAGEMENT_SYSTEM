-- SQLite Inventory Management Schema
-- Enforces Foreign Keys, Unique SKUs, and 1:1 Variant-to-Inventory constraints

PRAGMA foreign_keys = ON;

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS Categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_name TEXT NOT NULL UNIQUE
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS Products (
  product_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE RESTRICT
);

-- 3. ProductVariants Table
CREATE TABLE IF NOT EXISTS ProductVariants (
  variant_id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  sku TEXT NOT NULL UNIQUE COLLATE NOCASE,
  variant_name TEXT NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE
);

-- 4. Inventory Table (1:1 with ProductVariants enforced via UNIQUE variant_id)
CREATE TABLE IF NOT EXISTS Inventory (
  inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL UNIQUE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 10 CHECK(reorder_level >= 0),
  last_restocked TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (variant_id) REFERENCES ProductVariants(variant_id) ON DELETE CASCADE
);

-- 5. AuditLogs Table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON Products(category_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON ProductVariants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON ProductVariants(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON Inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON Inventory(quantity);
