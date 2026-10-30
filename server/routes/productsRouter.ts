import { Router } from 'express';
import { db } from '../db/sqliteDb.js';

export const productsRouter = Router();

// GET all products with filtering, search, and sorting
productsRouter.get('/', (req, res) => {
  try {
    const {
      search,
      category,
      status,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    } = req.query;

    const products = db.getAllProducts({
      search: search ? String(search) : undefined,
      category: category ? String(category) : undefined,
      status: status ? (status as any) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy: sortBy ? (sortBy as any) : undefined,
      sortOrder: sortOrder ? (sortOrder as any) : undefined,
    });

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single product by ID or SKU
productsRouter.get('/:idOrSku', (req, res) => {
  try {
    const product = db.findProduct(req.params.idOrSku);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create new product
productsRouter.post('/', (req, res) => {
  try {
    const {
      name,
      sku,
      category,
      price,
      stockQuantity,
      minStockThreshold,
      description,
      supplier,
      location,
    } = req.body;

    if (!name || !sku || price === undefined || stockQuantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, sku, price, stockQuantity',
      });
    }

    const newProduct = db.createProduct({
      name,
      sku,
      category: category || 'General',
      price: Number(price),
      stockQuantity: Number(stockQuantity),
      minStockThreshold: minStockThreshold !== undefined ? Number(minStockThreshold) : 10,
      description: description || '',
      supplier: supplier || 'Internal Supplier',
      location: location || 'Warehouse Floor',
    }, 'MANUAL');

    res.status(201).json({ success: true, data: newProduct });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update product details
productsRouter.put('/:idOrSku', (req, res) => {
  try {
    const updated = db.updateProduct(req.params.idOrSku, req.body, 'MANUAL');
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST adjust stock level for product
productsRouter.post('/:idOrSku/stock', (req, res) => {
  try {
    const { delta, newQuantity, reason } = req.body;
    const updated = db.updateStock(req.params.idOrSku, {
      delta: delta !== undefined ? Number(delta) : undefined,
      newQuantity: newQuantity !== undefined ? Number(newQuantity) : undefined,
      reason: reason || 'Manual adjustment via dashboard',
    }, 'MANUAL');

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST batch stock updates
productsRouter.post('/batch-stock', (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'Updates must be an array' });
    }

    const results = db.batchUpdateStock(updates, 'MANUAL');
    res.json({ success: true, count: results.length, data: results });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE remove product
productsRouter.delete('/:idOrSku', (req, res) => {
  try {
    const deleted = db.deleteProduct(req.params.idOrSku, 'MANUAL');
    res.json({ success: true, data: deleted });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
