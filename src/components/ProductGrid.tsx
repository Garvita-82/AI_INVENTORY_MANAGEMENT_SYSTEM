import React from 'react';
import {
  Edit2,
  Trash2,
  SlidersHorizontal,
  MapPin,
  Plus,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { Product, StockStatus } from '../types/inventory';

interface ProductGridProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onOpenStockModal: (product: Product) => void;
  onQuickStockChange: (product: Product, delta: number) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onEditProduct,
  onDeleteProduct,
  onOpenStockModal,
  onQuickStockChange,
}) => {
  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'in_stock':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            In Stock
          </span>
        );
      case 'low_stock':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Low Stock
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            Out of Stock
          </span>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map(p => (
        <div
          key={p.id}
          className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                {p.category}
              </span>
              {getStatusBadge(p.stockStatus)}
            </div>

            <h4 className="font-semibold text-white text-sm line-clamp-1" title={p.name}>
              {p.name}
            </h4>

            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
              <span>{p.sku}</span>
            </div>

            <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
              {p.description || 'No description provided.'}
            </p>

            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{p.location || 'Warehouse Main Floor'}</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Price</span>
                <div className="text-base font-bold text-white">${p.price.toFixed(2)}</div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Stock / Min ({p.minStockThreshold})
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <button
                    onClick={() => onQuickStockChange(p, -1)}
                    disabled={p.stockQuantity <= 0}
                    className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 flex items-center justify-center text-xs"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span
                    className={`font-bold text-sm px-1.5 ${
                      p.stockQuantity === 0
                        ? 'text-rose-400'
                        : p.stockQuantity <= p.minStockThreshold
                        ? 'text-amber-400'
                        : 'text-white'
                    }`}
                  >
                    {p.stockQuantity}
                  </span>
                  <button
                    onClick={() => onQuickStockChange(p, 1)}
                    className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => onOpenStockModal(p)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                <SlidersHorizontal className="w-3 h-3" />
                Adjust Stock
              </button>
              <button
                onClick={() => onEditProduct(p)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Edit Product"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDeleteProduct(p)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                title="Delete Product"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
