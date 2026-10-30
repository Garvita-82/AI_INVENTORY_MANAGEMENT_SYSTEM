import path from 'path';
import { SQLiteInventoryDatabase } from './sqliteDb.js';

async function main() {
  console.log('📦 Initializing SQLite Inventory Database...');
  const dbPath = path.resolve(process.cwd(), 'data', 'inventory.sqlite');
  console.log(`📍 Database file: ${dbPath}`);

  const database = new SQLiteInventoryDatabase(dbPath);

  // Force clean reset and re-seed
  console.log('🔄 Seeding Categories, Products, ProductVariants, and Inventory tables...');
  database.resetToDemo();

  const analytics = database.getAnalytics();
  const products = database.getAllProducts();

  console.log('✅ SQLite Database successfully initialized with 4 relational tables:');
  console.log(`   - 1. Categories (${analytics.categories.length} distinct categories: ${analytics.categories.join(', ')})`);
  console.log(`   - 2. Products`);
  console.log(`   - 3. ProductVariants (${analytics.totalProducts} total SKUs)`);
  console.log(`   - 4. Inventory (${analytics.totalStockUnits} total stock units, valuation: $${analytics.totalValuation.toLocaleString()})`);
  console.log(`   - Status Breakdown: ${analytics.inStockCount} In Stock, ${analytics.lowStockCount} Low Stock, ${analytics.outOfStockCount} Out of Stock`);

  console.log('\nSample catalog preview:');
  products.slice(0, 5).forEach(p => {
    console.log(`   [${p.sku}] ${p.name} | Category: ${p.category} | Qty: ${p.stockQuantity} (${p.stockStatus}) | $${p.price.toFixed(2)}`);
  });

  console.log('\n🚀 Database ready for production & local development.');
}

main().catch(err => {
  console.error('❌ Database initialization error:', err);
  process.exit(1);
});
