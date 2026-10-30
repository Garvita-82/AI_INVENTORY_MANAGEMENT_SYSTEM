import React from 'react';
import { InventoryAnalytics } from '../types/inventory';

interface StockHealthBarProps {
  analytics: InventoryAnalytics | null;
}

export const StockHealthBar: React.FC<StockHealthBarProps> = ({ analytics }) => {
  if (!analytics || analytics.totalProducts === 0) return null;

  const total = analytics.totalProducts;
  const inStockPct = Math.round((analytics.inStockCount / total) * 100);
  const lowStockPct = Math.round((analytics.lowStockCount / total) * 100);
  const outStockPct = 100 - inStockPct - lowStockPct;

  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-semibold text-slate-300">Catalog Health Distribution</span>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Healthy ({inStockPct}%)
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Low Stock ({lowStockPct}%)
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Out of Stock ({outStockPct}%)
          </span>
        </div>
      </div>

      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
        <div
          style={{ width: `${inStockPct}%` }}
          className="bg-emerald-500 hover:bg-emerald-400 transition-all duration-500"
          title={`Healthy: ${analytics.inStockCount} items (${inStockPct}%)`}
        />
        <div
          style={{ width: `${lowStockPct}%` }}
          className="bg-amber-500 hover:bg-amber-400 transition-all duration-500"
          title={`Low Stock: ${analytics.lowStockCount} items (${lowStockPct}%)`}
        />
        <div
          style={{ width: `${outStockPct}%` }}
          className="bg-rose-500 hover:bg-rose-400 transition-all duration-500"
          title={`Out of Stock: ${analytics.outOfStockCount} items (${outStockPct}%)`}
        />
      </div>
    </div>
  );
};
