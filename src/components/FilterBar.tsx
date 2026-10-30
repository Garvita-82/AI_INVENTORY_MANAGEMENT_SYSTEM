import React from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  RotateCcw,
  LayoutGrid,
  Table as TableIcon,
  X,
} from 'lucide-react';
import { StockStatus } from '../types/inventory';

interface FilterBarProps {
  search: string;
  setSearch: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  categories: string[];
  status: StockStatus | 'all';
  setStatus: (val: StockStatus | 'all') => void;
  sortBy: string;
  setSortBy: (val: any) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (val: 'asc' | 'desc') => void;
  viewMode: 'table' | 'grid';
  setViewMode: (val: 'table' | 'grid') => void;
  totalFiltered: number;
  totalCount: number;
  onResetFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  setSearch,
  category,
  setCategory,
  categories,
  status,
  setStatus,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode,
  totalFiltered,
  totalCount,
  onResetFilters,
}) => {
  const hasActiveFilters = search || category !== 'all' || status !== 'all';

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-4 space-y-3">
      {/* Top Row: Search & Actions */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product name, SKU, category, supplier, location..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white outline-none cursor-pointer appearance-none transition-all"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative w-full md:w-44">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white outline-none cursor-pointer appearance-none transition-all"
            >
              <option value="updatedAt">Sort: Last Updated</option>
              <option value="name">Sort: Product Name</option>
              <option value="sku">Sort: SKU Code</option>
              <option value="price">Sort: Price</option>
              <option value="stockQuantity">Sort: Stock Quantity</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            title={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Table view"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Status Filter Chips & Result Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Status:</span>

          <button
            onClick={() => setStatus('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              status === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Products
          </button>

          <button
            onClick={() => setStatus('in_stock')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              status === 'in_stock'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-950/60 text-emerald-400 hover:bg-emerald-950/30 border border-emerald-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            In Stock
          </button>

          <button
            onClick={() => setStatus('low_stock')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              status === 'low_stock'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-950/60 text-amber-400 hover:bg-amber-950/30 border border-amber-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Low Stock
          </button>

          <button
            onClick={() => setStatus('out_of_stock')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              status === 'out_of_stock'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-950/60 text-rose-400 hover:bg-rose-950/30 border border-rose-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Out of Stock
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{totalFiltered}</strong> of{' '}
            <strong className="text-white">{totalCount}</strong> products
          </span>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
