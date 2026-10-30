import { SQLiteInventoryDatabase } from './sqliteDb.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('🧪 Starting SQLite Inventory Database Test Suite...\n');

  // Use in-memory SQLite database instance for isolated deterministic testing
  const testDb = new SQLiteInventoryDatabase(':memory:');
  const rawDb = testDb.getRawDb();

  // Test 1: Verify tables exist
  console.log('1. Verifying Database Schema & Tables:');
  const tables = rawDb.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all() as { name: string }[];
  const tableNames = tables.map(t => t.name);

  assert(tableNames.includes('Categories'), 'Categories table exists');
  assert(tableNames.includes('Products'), 'Products table exists');
  assert(tableNames.includes('ProductVariants'), 'ProductVariants table exists');
  assert(tableNames.includes('Inventory'), 'Inventory table exists');
  assert(tableNames.includes('AuditLogs'), 'AuditLogs table exists');

  // Test 2: Foreign Key Constraints
  console.log('\n2. Testing Foreign Key Constraints:');
  try {
    rawDb.prepare('INSERT INTO Products (category_id, product_name) VALUES (?, ?)').run(9999, 'Orphan Product');
    assert(false, 'Foreign Key: Invalid category_id rejected', 'Expected FOREIGN KEY constraint failure');
  } catch (e: any) {
    assert(e.message.includes('FOREIGN KEY constraint failed'), 'Foreign Key: Invalid category_id rejected');
  }

  try {
    rawDb.prepare('INSERT INTO ProductVariants (product_id, sku, variant_name, price) VALUES (?, ?, ?, ?)').run(9999, 'ORPHAN-01', 'Var', 10.0);
    assert(false, 'Foreign Key: Invalid product_id rejected', 'Expected FOREIGN KEY constraint failure');
  } catch (e: any) {
    assert(e.message.includes('FOREIGN KEY constraint failed'), 'Foreign Key: Invalid product_id rejected');
  }

  // Test 3: Unique SKU Constraint (case-insensitive)
  console.log('\n3. Testing Unique SKU Constraint:');
  try {
    // Attempt inserting product with already existing SKU 'TECH-KB-001'
    testDb.createProduct({
      name: 'Duplicate Keyboard',
      sku: 'tech-kb-001', // Lowercase test
      category: 'Peripherals',
      price: 99.99,
      stockQuantity: 10,
    });
    assert(false, 'Unique SKU: Duplicate SKU rejected', 'Expected uniqueness failure');
  } catch (e: any) {
    assert(
      e.message.includes('already exists') || e.message.includes('UNIQUE constraint'),
      'Unique SKU: Duplicate SKU (case-insensitive) rejected'
    );
  }

  // Test 4: Enforce 1:1 Variant to Inventory Constraint
  console.log('\n4. Testing 1:1 ProductVariant to Inventory Record:');
  try {
    const existingVariant = rawDb.prepare('SELECT variant_id FROM ProductVariants LIMIT 1').get() as { variant_id: number };
    rawDb.prepare('INSERT INTO Inventory (variant_id, quantity, reorder_level) VALUES (?, 10, 5)').run(existingVariant.variant_id);
    assert(false, '1:1 Constraint: Duplicate inventory record rejected', 'Expected UNIQUE constraint on variant_id');
  } catch (e: any) {
    assert(e.message.includes('UNIQUE constraint failed: Inventory.variant_id'), '1:1 Constraint: Duplicate inventory record for same variant rejected');
  }

  // Test 5: Negative Constraints (Quantity and Price)
  console.log('\n5. Testing Check Constraints (Non-Negative Stock & Price):');
  try {
    testDb.createProduct({
      name: 'Negative Stock Item',
      sku: 'TEST-NEG-01',
      category: 'Electronics',
      price: 25.0,
      stockQuantity: -5,
    });
    assert(false, 'Negative Stock rejected at creation', 'Expected error for negative stock');
  } catch (e: any) {
    assert(e.message.includes('Stock quantity must be a non-negative') || e.message.includes('CHECK constraint'), 'Negative Stock rejected at creation');
  }

  try {
    testDb.createProduct({
      name: 'Negative Price Item',
      sku: 'TEST-NEG-02',
      category: 'Electronics',
      price: -10.0,
      stockQuantity: 10,
    });
    assert(false, 'Negative Price rejected', 'Expected error for negative price');
  } catch (e: any) {
    assert(e.message.includes('Price must be a valid non-negative') || e.message.includes('CHECK constraint'), 'Negative Price rejected');
  }

  // Test 6: Real Database Queries (Search, Filter, Stock Retrieval)
  console.log('\n6. Testing Real Database Queries:');
  const allProducts = testDb.getAllProducts();
  assert(allProducts.length > 0, `Retrieved ${allProducts.length} seeded products`);

  const searchResults = testDb.getAllProducts({ search: 'Keyboard' });
  assert(
    searchResults.length >= 2 && searchResults.every(p => p.name.includes('Keyboard')),
    'Search query by name works'
  );

  const outOfStock = testDb.getAllProducts({ status: 'out_of_stock' });
  assert(
    outOfStock.length > 0 && outOfStock.every(p => p.stockQuantity === 0 && p.stockStatus === 'out_of_stock'),
    `Filtered ${outOfStock.length} out-of-stock products with quantity = 0`
  );

  const lowStock = testDb.getAllProducts({ status: 'low_stock' });
  assert(
    lowStock.length > 0 && lowStock.every(p => p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0),
    `Filtered ${lowStock.length} low-stock products matching threshold`
  );

  // Test 7: Stock Updating & Persistence
  console.log('\n7. Testing Stock Quantity Updates & Persistence:');
  const testProduct = testDb.getProductBySku('TECH-KB-001');
  assert(!!testProduct, 'Found test product TECH-KB-001');

  if (testProduct) {
    const initialQty = testProduct.stockQuantity;
    const delta = 15;
    const updated = testDb.updateStock('TECH-KB-001', { delta, reason: 'Unit Test Restock' });
    assert(updated.stockQuantity === initialQty + delta, `Stock increased from ${initialQty} to ${updated.stockQuantity}`);

    // Verify persistence by querying fresh from DB
    const persisted = testDb.getProductBySku('TECH-KB-001');
    assert(persisted?.stockQuantity === initialQty + delta, 'Stock quantity update persists in SQLite table');

    // Test rejection of stock reduction beyond 0
    try {
      testDb.updateStock('TECH-KB-001', { delta: -(persisted!.stockQuantity + 100), reason: 'Excessive deduction' });
      assert(false, 'Negative stock reduction rejected', 'Expected constraint violation');
    } catch (e: any) {
      assert(e.message.includes('violates non-negative constraint') || e.message.includes('CHECK constraint'), 'Negative stock deduction rejected');
    }
  }

  // Test 8: Adding New Products Across Categories
  console.log('\n8. Testing Adding New Products:');
  const newProduct = testDb.createProduct({
    name: 'OmniSense AI Sensor Hub',
    sku: 'IOT-HUB-900',
    category: 'Smart Hardware',
    price: 129.50,
    stockQuantity: 25,
    minStockThreshold: 10,
    description: 'Edge IoT sensor telemetry aggregator with Zigbee 3.0.',
  }, 'MANUAL');

  assert(newProduct.sku === 'IOT-HUB-900', 'New product SKU verified');
  assert(newProduct.category === 'Smart Hardware', 'Dynamic category insertion verified');
  const retrievedNew = testDb.getProductBySku('IOT-HUB-900');
  assert(retrievedNew?.stockQuantity === 25, 'Newly added product exists in Inventory table');

  // Test 9: Aggregation & Analytics
  console.log('\n9. Testing Database Analytics & Aggregations:');
  const analytics = testDb.getAnalytics();
  assert(analytics.totalProducts > 0, `Total products: ${analytics.totalProducts}`);
  assert(analytics.totalStockUnits > 0, `Total stock units: ${analytics.totalStockUnits}`);
  assert(analytics.totalValuation > 0, `Total inventory valuation: $${analytics.totalValuation}`);
  assert(
    analytics.totalProducts === (analytics.inStockCount + analytics.lowStockCount + analytics.outOfStockCount),
    'Stock status counts match total products exactly'
  );

  // Test 10: Audit Log Tracking
  console.log('\n10. Testing Audit Trail:');
  const logs = testDb.getAuditLogs(10);
  assert(logs.length > 0, `Audit logs recorded: ${logs.length} entries`);
  assert(logs.some(l => l.sku === 'TECH-KB-001'), 'Audit log contains stock adjustment record');
  assert(logs.some(l => l.sku === 'IOT-HUB-900'), 'Audit log contains product creation record');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
