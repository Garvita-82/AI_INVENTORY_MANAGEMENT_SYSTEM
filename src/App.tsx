import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardStats } from './components/DashboardStats';
import { StockHealthBar } from './components/StockHealthBar';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { FilterBar } from './components/FilterBar';
import { InventoryTable } from './components/InventoryTable';
import { ProductGrid } from './components/ProductGrid';
import { AIChatDrawer } from './components/AIChatDrawer';
import { ProductModal } from './components/ProductModal';
import { StockAdjustModal } from './components/StockAdjustModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { RestockPlannerView } from './components/RestockPlannerView';
import { MCPInspectorModal } from './components/MCPInspectorModal';
import { AuditLogModal } from './components/AuditLogModal';
import { ToastProvider, useToast } from './components/Toast';
import {
  Product,
  StockStatus,
  InventoryAnalytics,
  RestockRecommendation,
  NewProductInput,
} from './types/inventory';
import {
  fetchProducts,
  fetchAnalytics,
  fetchRecommendations,
  createProduct,
  updateProduct,
  adjustStock,
  deleteProduct,
  resetDemoData,
} from './services/api';

function InventoryApp() {
  const { showToast } = useToast();

  // Navigation state
  const [currentTab, setCurrentTab] = useState<'inventory' | 'planning' | 'mcp' | 'audit'>('inventory');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<RestockRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<StockStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'name' | 'sku' | 'price' | 'stockQuantity'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prods, stats, recs] = await Promise.all([
        fetchProducts({
          search: search || undefined,
          category: category !== 'all' ? category : undefined,
          status: status !== 'all' ? status : undefined,
          sortBy,
          sortOrder,
        }),
        fetchAnalytics(),
        fetchRecommendations(),
      ]);

      setProducts(prods);
      setAnalytics(stats);
      setRecommendations(recs);
    } catch (err: any) {
      showToast('error', 'Failed to load inventory', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [search, category, status, sortBy, sortOrder, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Categories list from analytics or products
  const categories = useMemo(() => {
    if (analytics?.categories && analytics.categories.length > 0) {
      return analytics.categories;
    }
    const set = new Set<string>();
    products.forEach(p => set.add(p.category));
    return Array.from(set).sort();
  }, [analytics, products]);

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setCategory('all');
    setStatus('all');
    setSortBy('updatedAt');
    setSortOrder('desc');
  };

  // Quick inline stock adjustments (+1 / -1)
  const handleQuickStockChange = async (product: Product, delta: number) => {
    const targetQuantity = product.stockQuantity + delta;
    if (targetQuantity < 0) return;

    // Optimistic update
    setProducts(prev =>
      prev.map(p =>
        p.id === product.id
          ? {
              ...p,
              stockQuantity: targetQuantity,
              stockStatus:
                targetQuantity <= 0
                  ? 'out_of_stock'
                  : targetQuantity <= p.minStockThreshold
                  ? 'low_stock'
                  : 'in_stock',
            }
          : p
      )
    );

    try {
      const updated = await adjustStock(product.id, {
        delta,
        reason: delta > 0 ? 'Quick Restock via Stepper' : 'Quick Deduction via Stepper',
      });

      // Sync state and analytics
      setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      const stats = await fetchAnalytics();
      setAnalytics(stats);
      const recs = await fetchRecommendations();
      setRecommendations(recs);

      showToast(
        'success',
        'Stock Updated',
        `${product.sku}: ${delta > 0 ? '+' : ''}${delta} units (New total: ${updated.stockQuantity})`
      );
    } catch (err: any) {
      // Revert on failure
      loadData();
      showToast('error', 'Stock update failed', err.message);
    }
  };

  // Add or Edit Product Submit
  const handleProductSubmit = async (formData: NewProductInput | Partial<Product>) => {
    try {
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, formData);
        showToast('success', 'Product Updated', `Saved changes to "${updated.name}" (${updated.sku})`);
      } else {
        const created = await createProduct(formData as NewProductInput);
        showToast('success', 'Product Created', `Added "${created.name}" (SKU: ${created.sku}) to catalog`);
      }
      loadData();
      setEditingProduct(null);
    } catch (err: any) {
      throw err;
    }
  };

  // Adjust Stock Modal Submit
  const handleStockModalSubmit = async (
    idOrSku: string,
    options: { delta?: number; newQuantity?: number; reason?: string }
  ) => {
    try {
      const updated = await adjustStock(idOrSku, options);
      showToast(
        'success',
        'Stock Adjusted',
        `${updated.name} (${updated.sku}) is now at ${updated.stockQuantity} units (${updated.stockStatus.replace('_', ' ')})`
      );
      loadData();
    } catch (err: any) {
      throw err;
    }
  };

  // Delete Product Submit
  const handleDeleteConfirm = async () => {
    if (!deleteProductTarget) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deleteProductTarget.id);
      showToast(
        'warning',
        'Product Deleted',
        `Removed "${deleteProductTarget.name}" (${deleteProductTarget.sku}) from catalog`
      );
      setDeleteProductTarget(null);
      loadData();
    } catch (err: any) {
      showToast('error', 'Deletion failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch delete
  const handleBatchDelete = async (productIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${productIds.length} selected products?`)) return;
    try {
      for (const id of productIds) {
        await deleteProduct(id);
      }
      showToast('warning', 'Batch Deleted', `Removed ${productIds.length} products`);
      loadData();
    } catch (err: any) {
      showToast('error', 'Batch delete error', err.message);
    }
  };

  // Batch restock (+10)
  const handleBatchRestock = async (productIds: string[]) => {
    try {
      for (const id of productIds) {
        await adjustStock(id, { delta: 10, reason: 'Batch Restock (+10 units)' });
      }
      showToast('success', 'Batch Restocked', `Added +10 units to ${productIds.length} products`);
      loadData();
    } catch (err: any) {
      showToast('error', 'Batch restock error', err.message);
    }
  };

  // Restock Planner Single Restock
  const handlePlannerRestock = async (sku: string, recommendedOrder: number) => {
    try {
      const updated = await adjustStock(sku, {
        delta: recommendedOrder,
        reason: 'Restock Planner Purchase Order Replenishment',
      });
      showToast('success', 'Restock Order Approved', `Added ${recommendedOrder} units to ${updated.sku}`);
      loadData();
    } catch (err: any) {
      showToast('error', 'Restock failed', err.message);
    }
  };

  // Restock Planner Batch Restock
  const handlePlannerBatchRestock = async (items: Array<{ sku: string; recommendedOrder: number }>) => {
    try {
      for (const item of items) {
        await adjustStock(item.sku, {
          delta: item.recommendedOrder,
          reason: 'Bulk Restock Planner Replenishment',
        });
      }
      showToast('success', 'Bulk Restock Completed', `Restocked ${items.length} critical items`);
      loadData();
    } catch (err: any) {
      showToast('error', 'Bulk restock failed', err.message);
    }
  };

  // Reset Demo Data
  const handleResetDemo = async () => {
    if (!confirm('Reset entire inventory back to standard enterprise demo seed data?')) return;
    setIsResetting(true);
    try {
      await resetDemoData();
      showToast('info', 'Catalog Restored', 'Database reset to default seed products');
      loadData();
    } catch (err: any) {
      showToast('error', 'Reset failed', err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // AI Agent inventory modified callback
  const handleAgentModified = () => {
    loadData();
    showToast('info', 'Live Database Sync', 'AI Agent executed inventory operations');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAddModal={() => {
          setEditingProduct(null);
          setIsProductModalOpen(true);
        }}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6">
        {currentTab === 'inventory' && (
          <div className="space-y-4">
            {/* Dashboard Stats */}
            <DashboardStats
              analytics={analytics}
              isLoading={isLoading}
              onFilterByStatus={s => setStatus(s)}
              activeStatusFilter={status}
              onOpenPlanning={() => setCurrentTab('planning')}
            />

            {/* Visual Health Distribution Bar */}
            <StockHealthBar analytics={analytics} />

            {/* Category Distribution Grid */}
            <CategoryBreakdown
              analytics={analytics}
              selectedCategory={category}
              onSelectCategory={cat => setCategory(cat)}
            />

            {/* Filter & Search Controls */}
            <FilterBar
              search={search}
              setSearch={setSearch}
              category={category}
              setCategory={setCategory}
              categories={categories}
              status={status}
              setStatus={setStatus}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              viewMode={viewMode}
              setViewMode={setViewMode}
              totalFiltered={products.length}
              totalCount={analytics?.totalProducts || products.length}
              onResetFilters={handleResetFilters}
            />

            {/* Inventory Table or Grid View */}
            {viewMode === 'table' ? (
              <InventoryTable
                products={products}
                isLoading={isLoading}
                onEditProduct={prod => {
                  setEditingProduct(prod);
                  setIsProductModalOpen(true);
                }}
                onDeleteProduct={prod => setDeleteProductTarget(prod)}
                onOpenStockModal={prod => setStockModalProduct(prod)}
                onQuickStockChange={handleQuickStockChange}
                onBatchDelete={handleBatchDelete}
                onBatchRestock={handleBatchRestock}
                onAddNewProduct={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
              />
            ) : (
              <ProductGrid
                products={products}
                onEditProduct={prod => {
                  setEditingProduct(prod);
                  setIsProductModalOpen(true);
                }}
                onDeleteProduct={prod => setDeleteProductTarget(prod)}
                onOpenStockModal={prod => setStockModalProduct(prod)}
                onQuickStockChange={handleQuickStockChange}
              />
            )}
          </div>
        )}

        {currentTab === 'planning' && (
          <RestockPlannerView
            recommendations={recommendations}
            isLoading={isLoading}
            onRefresh={loadData}
            onExecuteRestock={handlePlannerRestock}
            onBatchExecuteRestock={handlePlannerBatchRestock}
            onAskAgent={prompt => {
              setIsChatOpen(true);
            }}
          />
        )}

        {currentTab === 'mcp' && <MCPInspectorModal />}

        {currentTab === 'audit' && <AuditLogModal />}
      </main>

      {/* Floating AI Agent Trigger Button (bottom right) */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-2xl shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all"
        title="Open NexusStock AI Agent"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
        <span>Ask AI Agent</span>
      </button>

      {/* AI Agent Chat Drawer */}
      <AIChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onInventoryModified={handleAgentModified}
      />

      {/* Product Add / Edit Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleProductSubmit}
        productToEdit={editingProduct}
        categories={categories}
      />

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        isOpen={!!stockModalProduct}
        onClose={() => setStockModalProduct(null)}
        product={stockModalProduct}
        onAdjustStock={handleStockModalSubmit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteProductTarget}
        onClose={() => setDeleteProductTarget(null)}
        product={deleteProductTarget}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <InventoryApp />
    </ToastProvider>
  );
}
