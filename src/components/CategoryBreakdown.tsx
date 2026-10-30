import React from 'react';
import { Layers } from 'lucide-react';
import { InventoryAnalytics } from '../types/inventory';

interface CategoryBreakdownProps {
  analytics: InventoryAnalytics | null;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  analytics,
  selectedCategory,
  onSelectCategory,
}) => {
  if (!analytics || !analytics.categoryBreakdown) return null;

  const categories = Object.entries(analytics.categoryBreakdown);
  if (categories.length === 0) return null;

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-300">Category Valuation Breakdown</span>
        </div>
        {selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Clear category filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        {categories.map(([category, data]) => {
          const isSelected = selectedCategory.toLowerCase() === category.toLowerCase();
          return (
            <button
              key={category}
              onClick={() => onSelectCategory(isSelected ? 'all' : category)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-xs font-semibold truncate">{category}</div>
              <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>{data.count} items</span>
                <span>{data.totalStock} units</span>
              </div>
              <div className="text-[11px] font-medium text-emerald-400 mt-0.5">
                ${data.totalValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
