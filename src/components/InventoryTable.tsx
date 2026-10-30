import React, { useState } from 'react';
import {
  MoreVertical,
  Edit2,
  Trash2,
  Plus,
  Minus,
  SlidersHorizontal,
  Copy,
  Check,
  PackageX,
  MapPin,
  TrendingUp,
  Download,
} from 'lucide-react';
import { Product, StockStatus } from '../types/inventory';

interface InventoryTableProps {
  products: Product[];
  isLoading: boolean;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onOpenStockModal: (product: Product) => void;
  onQuickStockChange: (product: Product, delta: number) => void;
  onBatchDelete?: (productIds: string[]) => void;
  onBatchRestock?: (productIds: string[]) => void;
  onAddNewProduct: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  isLoading,
  onEditProduct,
  onDeleteProduct,
  onOpenStockModal,
  onQuickStockChange,
  onBatchDelete,
  onBatchRestock,
  onAddNewProduct,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleCopySku = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const exportSelectedToCSV = () => {
    const targetProducts = selectedIds.size > 0
      ? products.filter(p => selectedIds.has(p.id))
      : products;

    const headers = ['Product Name', 'SKU', 'Category', 'Price', 'Stock Quantity', 'Min Threshold', 'Status', 'Location', 'Supplier'];
    const rows = targetProducts.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.sku}"`,
      `"${p.category}"`,
      p.price.toFixed(2),
      p.stockQuantity,
      p.minStockThreshold,
      p.stockStatus,
      `"${p.location}"`,
      `"${p.supplier}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexusstock_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
          <div className="h-6 w-24 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-slate-800/60">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-4 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 bg-slate-800 rounded" />
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-slate-800 rounded" />
                  <div className="h-3 w-28 bg-slate-800 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="h-4 w-16 bg-slate-800 rounded" />
                <div className="h-4 w-20 bg-slate-800 rounded" />
                <div className="h-6 w-24 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
          <PackageX className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-white">No products found</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
          No inventory products match your current search and filter criteria. You can adjust filters or add a new item.
        </p>
        <button
          onClick={onAddNewProduct}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add First Product
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'in_stock':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            In Stock
          </span>
        );
      case 'low_stock':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Low Stock
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Out of Stock
          </span>
        );
    }
  };

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('periph')) return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
    if (cat.includes('elect')) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    if (cat.includes('audio')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (cat.includes('furn')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (cat.includes('access')) return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
    if (cat.includes('net')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    return 'text-slate-400 bg-slate-800 border-slate-700';
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Batch Actions Bar (when items selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-950/70 border-b border-indigo-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{selectedIds.size}</span> items selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportSelectedToCSV}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-white font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            {onBatchRestock && (
              <button
                onClick={() => onBatchRestock(Array.from(selectedIds))}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors shadow-sm"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Quick Restock (+10)
              </button>
            )}
            {onBatchDelete && (
              <button
                onClick={() => onBatchDelete(Array.from(selectedIds))}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-1 text-slate-400 hover:text-white"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === products.length && products.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                  aria-label="Select all products"
                />
              </th>
              <th className="py-3 px-4">Product Name & Location</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4 text-right">Price</th>
              <th className="py-3 px-4 text-center">Stock Quantity</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
            {products.map(product => {
              const isSelected = selectedIds.has(product.id);
              const isActionOpen = actionMenuOpenId === product.id;

              return (
                <tr
                  key={product.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isSelected ? 'bg-indigo-950/20' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <td className="py-3.5 px-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(product.id)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </td>

                  {/* Product Name & Location */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-medium text-white truncate" title={product.name}>
                      {product.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 truncate" title={product.location}>
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        {product.location || 'Warehouse'}
                      </span>
                      {product.supplier && (
                        <>
                          <span>•</span>
                          <span className="truncate text-slate-500" title={product.supplier}>
                            {product.supplier}
                          </span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${getCategoryColor(
                        product.category
                      )}`}
                    >
                      {product.category}
                    </span>
                  </td>

                  {/* SKU */}
                  <td className="py-3.5 px-4">
                    <button
                      onClick={e => handleCopySku(product.sku, e)}
                      className="group inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950/80 border border-slate-800 text-slate-300 hover:border-indigo-500/50 font-mono text-[11px] transition-colors"
                      title="Click to copy SKU"
                    >
                      <span>{product.sku}</span>
                      {copiedSku === product.sku ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-500 opacity-60 group-hover:opacity-100" />
                      )}
                    </button>
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-4 text-right font-semibold text-white">
                    ${product.price.toFixed(2)}
                  </td>

                  {/* Stock Quantity & Quick Adjustment Stepper */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onQuickStockChange(product, -1)}
                        disabled={product.stockQuantity <= 0}
                        className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors"
                        title="Reduce stock by 1"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => onOpenStockModal(product)}
                        className={`min-w-12 px-2 py-0.5 rounded-md font-bold text-center border transition-all ${
                          product.stockQuantity === 0
                            ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/40'
                            : product.stockQuantity <= product.minStockThreshold
                            ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
                            : 'bg-slate-950 border-slate-800 text-white hover:border-slate-700'
                        }`}
                        title={`Click to adjust stock (Threshold: ${product.minStockThreshold})`}
                      >
                        {product.stockQuantity}
                      </button>

                      <button
                        onClick={() => onQuickStockChange(product, 1)}
                        className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                        title="Add 1 to stock"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[10px] text-center text-slate-500 mt-1">
                      Min: {product.minStockThreshold}
                    </div>
                  </td>

                  {/* Stock Status */}
                  <td className="py-3.5 px-4">{getStatusBadge(product.stockStatus)}</td>

                  {/* Action Buttons */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 relative">
                      <button
                        onClick={() => onOpenStockModal(product)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Adjust Stock Level"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onEditProduct(product)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteProduct(product)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div>
          Total of <strong className="text-white">{products.length}</strong> items in view
        </div>
        <button
          onClick={exportSelectedToCSV}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export All Visible to CSV
        </button>
      </div>
    </div>
  );
};
