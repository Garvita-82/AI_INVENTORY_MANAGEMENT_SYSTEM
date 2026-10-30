import React from 'react';
import { Package, AlertCircle, AlertTriangle, DollarSign, TrendingUp, ArrowRight, ShieldCheck } from 'lucide-react';
import { InventoryAnalytics, StockStatus } from '../types/inventory';

interface DashboardStatsProps {
  analytics: InventoryAnalytics | null;
  isLoading: boolean;
  onFilterByStatus: (status: StockStatus | 'all') => void;
  activeStatusFilter: StockStatus | 'all';
  onOpenPlanning: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  analytics,
  isLoading,
  onFilterByStatus,
  activeStatusFilter,
  onOpenPlanning,
}) => {
  if (isLoading || !analytics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800/80 animate-pulse p-5" />
        ))}
      </div>
    );
  }

  const {
    totalProducts,
    totalStockUnits,
    totalValuation,
    lowStockCount,
    outOfStockCount,
    inStockCount,
  } = analytics;

  const averageUnitValue = totalStockUnits > 0 ? (totalValuation / totalStockUnits).toFixed(2) : '0.00';

  return (
    <div className="space-y-4 mb-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div
          onClick={() => onFilterByStatus('all')}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-200 ${
            activeStatusFilter === 'all'
              ? 'bg-slate-900/90 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Products</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{totalProducts}</span>
            <span className="text-xs text-slate-400 font-medium">SKUs cataloged</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              {inStockCount} healthy
            </span>
            <span>•</span>
            <span>{totalStockUnits.toLocaleString()} total units</span>
          </div>
        </div>

        {/* Low-Stock Products */}
        <div
          onClick={() => onFilterByStatus('low_stock')}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-200 ${
            activeStatusFilter === 'low_stock'
              ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/40 hover:bg-slate-900/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider">Low Stock Alert</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-300 tracking-tight">{lowStockCount}</span>
            <span className="text-xs text-amber-400/80 font-medium">items below threshold</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-amber-400/80">
            <span>Reorder suggested</span>
            <span className="text-[11px] underline flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Filter list <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Out of Stock Products */}
        <div
          onClick={() => onFilterByStatus('out_of_stock')}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-200 ${
            activeStatusFilter === 'out_of_stock'
              ? 'bg-rose-950/25 border-rose-500/60 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-rose-500/40 hover:bg-slate-900/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Out of Stock</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-300 tracking-tight">{outOfStockCount}</span>
            <span className="text-xs text-rose-400/80 font-medium">zero inventory</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-rose-400/80">
            <span>Critical supply gap</span>
            <span className="text-[11px] underline flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Action required <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Total Valuation */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Inventory Value</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
            <span>Avg unit price: ${averageUnitValue}</span>
            <span className="flex items-center text-emerald-400 font-medium">
              <TrendingUp className="w-3 h-3 mr-1" /> Active assets
            </span>
          </div>
        </div>
      </div>

      {/* Stock Attention Alert Banner (if any low or out of stock) */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-rose-950/40 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Inventory Attention Needed: {outOfStockCount} out of stock, {lowStockCount} low stock
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                NexusStock AI has calculated recommended purchase quantities to protect sales fulfillment.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenPlanning}
            className="shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow"
          >
            Review Restock Plan
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
