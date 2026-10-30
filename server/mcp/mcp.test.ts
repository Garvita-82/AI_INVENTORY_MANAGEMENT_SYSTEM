import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createInventoryMcpServer } from './inventoryMcpServer.js';
import { db } from '../db/sqliteDb.js';

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

async function runMcpTests() {
  console.log('🧪 Starting Official Model Context Protocol (MCP) Server Test Suite...\n');

  // Initialize SQLite database to clean seed state
  db.resetToDemo();

  // Create MCP Server instance
  const server = createInventoryMcpServer();

  // Create linked in-memory MCP transport pair
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  // Connect server
  await server.connect(serverTransport);

  // Connect official MCP Client
  const client = new Client({ name: 'mcp-test-runner', version: '1.0.0' });
  await client.connect(clientTransport);

  // 1. Test Tools Registration
  console.log('1. Testing MCP Tools Registration:');
  const toolList = await client.listTools();
  const registeredNames = toolList.tools.map(t => t.name);

  assert(registeredNames.includes('search_products'), 'Tool "search_products" registered');
  assert(registeredNames.includes('get_stock_status'), 'Tool "get_stock_status" registered');
  assert(registeredNames.includes('get_product_details'), 'Tool "get_product_details" registered');
  assert(registeredNames.includes('update_stock'), 'Tool "update_stock" registered');
  assert(registeredNames.includes('add_product'), 'Tool "add_product" registered');

  // 2. Test Tool 1: search_products
  console.log('\n2. Testing "search_products":');
  const searchRes: any = await client.callTool({
    name: 'search_products',
    arguments: { query: 'Keyboard' },
  });

  assert(searchRes.isError !== true, 'search_products executed without error');
  const searchJson = JSON.parse(searchRes.content[0].text);
  assert(searchJson.count >= 2, `Found ${searchJson.count} products matching "Keyboard"`);
  assert(
    searchJson.products.some((p: any) => p.sku === 'TECH-KB-001'),
    'Search returned expected SKU TECH-KB-001'
  );

  // Category filter in search
  const catSearchRes: any = await client.callTool({
    name: 'search_products',
    arguments: { query: '', category: 'Audio' },
  });
  const catSearchJson = JSON.parse(catSearchRes.content[0].text);
  assert(
    catSearchJson.products.every((p: any) => p.category === 'Audio'),
    'Search with category filter restricted to Audio category'
  );

  // 3. Test Tool 2: get_stock_status
  console.log('\n3. Testing "get_stock_status":');
  const stockStatusRes: any = await client.callTool({
    name: 'get_stock_status',
    arguments: { statusFilter: 'all' },
  });

  assert(stockStatusRes.isError !== true, 'get_stock_status executed successfully');
  const stockJson = JSON.parse(stockStatusRes.content[0].text);
  assert(stockJson.totalAlerts > 0, `Detected ${stockJson.totalAlerts} items requiring attention`);
  assert(stockJson.outOfStockCount >= 3, `Identified ${stockJson.outOfStockCount} out-of-stock items`);
  assert(stockJson.lowStockCount >= 5, `Identified ${stockJson.lowStockCount} low-stock items`);

  // Test out-of-stock only filter
  const outOfStockRes: any = await client.callTool({
    name: 'get_stock_status',
    arguments: { statusFilter: 'out_of_stock' },
  });
  const outOfStockJson = JSON.parse(outOfStockRes.content[0].text);
  assert(
    outOfStockJson.items.every((i: any) => i.currentQuantity === 0 && i.status === 'out_of_stock'),
    'get_stock_status(out_of_stock) filtered only 0-quantity items'
  );

  // 4. Test Tool 3: get_product_details
  console.log('\n4. Testing "get_product_details":');
  const detailsRes: any = await client.callTool({
    name: 'get_product_details',
    arguments: { sku: 'TECH-KB-001' },
  });

  assert(detailsRes.isError !== true, 'get_product_details returned for valid SKU');
  const detailsJson = JSON.parse(detailsRes.content[0].text);
  assert(detailsJson.sku === 'TECH-KB-001', 'SKU matches TECH-KB-001');
  assert(detailsJson.price === 149.99, 'Price matches $149.99');
  assert(detailsJson.reorderLevel === 15, 'Reorder level matches 15');
  assert(detailsJson.stockQuantity === 42, 'Stock quantity matches 42 units');

  // Test missing SKU handling
  const missingSkuRes: any = await client.callTool({
    name: 'get_product_details',
    arguments: { sku: 'NON-EXISTENT-SKU-999' },
  });
  assert(missingSkuRes.isError === true, 'Missing SKU returns isError: true');
  assert(
    missingSkuRes.content[0].text.includes('was not found'),
    'Missing SKU returns informative error message'
  );

  // 5. Test Tool 4: update_stock
  console.log('\n5. Testing "update_stock":');
  // Incremental restock (+20)
  const updateRes1: any = await client.callTool({
    name: 'update_stock',
    arguments: {
      sku: 'TECH-KB-001',
      delta: 20,
      reason: 'MCP Test Restock',
    },
  });

  assert(updateRes1.isError !== true, 'update_stock (+20 delta) executed successfully');
  const updateJson1 = JSON.parse(updateRes1.content[0].text);
  assert(updateJson1.newQuantity === 62, `Stock increased from 42 to ${updateJson1.newQuantity}`);

  // Verify persistence directly in SQLite database
  const directDbCheck1 = db.getProductBySku('TECH-KB-001');
  assert(directDbCheck1?.stockQuantity === 62, 'Verified stock adjustment persisted directly in SQLite table');

  // Absolute stock setting
  const updateRes2: any = await client.callTool({
    name: 'update_stock',
    arguments: {
      sku: 'TECH-KB-001',
      newQuantity: 75,
      reason: 'Physical inventory audit',
    },
  });
  const updateJson2 = JSON.parse(updateRes2.content[0].text);
  assert(updateJson2.newQuantity === 75, `Stock set to ${updateJson2.newQuantity}`);
  const directDbCheck2 = db.getProductBySku('TECH-KB-001');
  assert(directDbCheck2?.stockQuantity === 75, 'Verified absolute stock set persists in SQLite database');

  // Test negative stock rejection
  const invalidStockRes: any = await client.callTool({
    name: 'update_stock',
    arguments: {
      sku: 'TECH-KB-001',
      newQuantity: -10,
    },
  });
  assert(invalidStockRes.isError === true, 'Negative stock quantity update rejected');
  assert(
    invalidStockRes.content[0].text.includes('cannot be negative'),
    'Negative stock returns constraint violation error'
  );

  // Test missing SKU rejection in update_stock
  const updateMissingRes: any = await client.callTool({
    name: 'update_stock',
    arguments: {
      sku: 'NON-EXISTENT-SKU',
      delta: 5,
    },
  });
  assert(updateMissingRes.isError === true, 'update_stock for non-existent SKU rejected');

  // 6. Test Tool 5: add_product
  console.log('\n6. Testing "add_product":');
  const addRes: any = await client.callTool({
    name: 'add_product',
    arguments: {
      productName: 'ApexVision 4K Action Camera',
      sku: 'CAM-ACT-888',
      category: 'Electronics',
      variantName: 'Black Waterproof Edition',
      price: 289.99,
      initialStock: 35,
      reorderLevel: 8,
      description: 'Ultra-wide 170-degree action camera with dual displays and 6-axis stabilization.',
    },
  });

  assert(addRes.isError !== true, 'add_product executed without error');
  const addJson = JSON.parse(addRes.content[0].text);
  assert(addJson.sku === 'CAM-ACT-888', 'Returned created SKU CAM-ACT-888');
  assert(addJson.stockQuantity === 35, 'Initial stock matches 35 units');

  // Verify newly created product exists in SQLite
  const newInDb = db.getProductBySku('CAM-ACT-888');
  assert(!!newInDb, 'Newly added product found in SQLite database');
  assert(newInDb?.price === 289.99, 'Product price persisted correctly');
  assert(newInDb?.category === 'Electronics', 'Product category persisted correctly');

  // Test duplicate SKU rejection
  const dupRes: any = await client.callTool({
    name: 'add_product',
    arguments: {
      productName: 'Duplicate SKU Camera',
      sku: 'cam-act-888', // Lowercase collision
      category: 'Electronics',
      price: 199.0,
      initialStock: 10,
    },
  });
  assert(dupRes.isError === true, 'Duplicate SKU rejected with constraint error');
  assert(
    dupRes.content[0].text.includes('already exists'),
    'Duplicate SKU returns informative error message'
  );

  console.log('\n========================================');
  console.log(`MCP Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMcpTests().catch(err => {
  console.error('Fatal MCP test error:', err);
  process.exit(1);
});
