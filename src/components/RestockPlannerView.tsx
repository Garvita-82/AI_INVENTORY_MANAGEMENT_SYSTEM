import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  PackageCheck,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { RestockRecommendation } from '../types/inventory';

interface RestockPlannerViewProps {
  recommendations: RestockRecommendation[];
  isLoading: boolean;
  onRefresh: () => void;
  onExecuteRestock: (sku: string, recommendedOrder: number) => Promise<void>;
  onBatchExecuteRestock: (items: Array<{ sku: string; recommendedOrder: number }>) => Promise<void>;
  onAskAgent: (prompt: string) => void;
}

export const RestockPlannerView: React.FC<RestockPlannerViewProps> = ({
  recommendations,
  isLoading,
  onRefresh,
  onExecuteRestock,
  onBatchExecuteRestock,
  onAskAgent,
}) => {
  const [executingSku, setExecutingSku] = useState<string | null>(null);
  const [isBatchExecuting, setIsBatchExecuting] = useState(false);

  const totalEstimatedCost = recommendations.reduce((acc, r) => acc + r.estimatedCost, 0);
  const criticalCount = recommendations.filter(r => r.urgency === 'CRITICAL').length;
  const warningCount = recommendations.filter(r => r.urgency === 'WARNING').length;

  const handleRestockSingle = async (r: RestockRecommendation) => {
    setExecutingSku(r.sku);
    try {
      await onExecuteRestock(r.sku, r.recommendedOrder);
    } finally {
      setExecutingSku(null);
    }
  };

  const handleRestockAll = async () => {
    if (recommendations.length === 0) return;
    setIsBatchExecuting(true);
    try {
      await onBatchExecuteRestock(
        recommendations.map(r => ({
          sku: r.sku,
          recommendedOrder: r.recommendedOrder,
        }))
      );
    } finally {
      setIsBatchExecuting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Automated Restock & Replenishment Planner
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Calculated dynamic purchase order recommendations balancing safety buffer thresholds against lead time stockouts.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            title="Refresh Recommendations"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {recommendations.length > 0 && (
            <button
              onClick={handleRestockAll}
              disabled={isBatchExecuting}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <PackageCheck className="w-4 h-4" />
              {isBatchExecuting ? 'Restocking All...' : `Approve All (${recommendations.length} Items)`}
            </button>
          )}

          <button
            onClick={() => onAskAgent('Generate a comprehensive purchase order breakdown for all low-stock and depleted products.')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
          >
            <Bot className="w-4 h-4 text-cyan-300" />
            Ask AI Agent
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Critical Stockouts</span>
            <div className="text-xl font-bold text-rose-300">{criticalCount} items</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Low Stock Buffers</span>
            <div className="text-xl font-bold text-amber-300">{warningCount} items</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Est. PO Cost</span>
            <div className="text-xl font-bold text-emerald-400">
              ${totalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">All Stock Levels Healthy</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Zero products currently fall below their safety thresholds. No purchase orders required at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map(r => {
            const isCritical = r.urgency === 'CRITICAL';
            const isBusy = executingSku === r.sku;

            return (
              <div
                key={r.productId}
                className={`bg-slate-900/70 border rounded-2xl p-4.5 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isCritical
                    ? 'border-rose-500/40 hover:border-rose-500/60'
                    : 'border-amber-500/40 hover:border-amber-500/60'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {r.urgency}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{r.sku}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">{r.category}</span>
                  </div>

                  <h4 className="font-bold text-white text-sm truncate">{r.name}</h4>

                  <p className="text-xs text-slate-400">{r.reason}</p>
                </div>

                {/* Metrics & Action */}
                <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Current / Min</span>
                    <span className="font-bold text-xs text-slate-300">
                      <strong className={isCritical ? 'text-rose-400' : 'text-amber-400'}>
                        {r.currentStock}
                      </strong>{' '}
                      / {r.minThreshold} units
                    </span>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Recommended Order</span>
                    <span className="font-extrabold text-sm text-indigo-400">+{r.recommendedOrder} units</span>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Est. Cost</span>
                    <span className="font-bold text-xs text-emerald-400">${r.estimatedCost.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={() => handleRestockSingle(r)}
                    disabled={isBusy || isBatchExecuting}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-md transition-all shrink-0"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    {isBusy ? 'Ordering...' : 'Order Restock'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
