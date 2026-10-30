import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { Product, StockStatus } from '../types/inventory';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAdjustStock: (idOrSku: string, options: { delta?: number; newQuantity?: number; reason?: string }) => Promise<void>;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  product,
  onAdjustStock,
}) => {
  const [mode, setMode] = useState<'add' | 'deduct' | 'set'>('add');
  const [amount, setAmount] = useState('10');
  const [reason, setReason] = useState('Supplier Delivery (Restock)');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setMode('add');
      setAmount('10');
      setReason('Supplier Delivery (Restock)');
      setCustomReason('');
      setError(null);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const currentStock = product.stockQuantity;
  const numAmount = parseInt(amount, 10) || 0;

  let calculatedStock = currentStock;
  if (mode === 'add') calculatedStock = currentStock + numAmount;
  else if (mode === 'deduct') calculatedStock = currentStock - numAmount;
  else if (mode === 'set') calculatedStock = numAmount;

  const getCalculatedStatus = (qty: number): StockStatus => {
    if (qty <= 0) return 'out_of_stock';
    if (qty <= product.minStockThreshold) return 'low_stock';
    return 'in_stock';
  };

  const calculatedStatus = getCalculatedStatus(calculatedStock);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (calculatedStock < 0) {
      setError(`Cannot set stock to ${calculatedStock}. Stock cannot be negative.`);
      return;
    }

    const finalReason = reason === 'OTHER' ? customReason.trim() : reason;
    if (!finalReason) {
      setError('Please provide a reason for the stock adjustment audit trail.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'set') {
        await onAdjustStock(product.id, {
          newQuantity: calculatedStock,
          reason: finalReason,
        });
      } else {
        const delta = mode === 'add' ? numAmount : -numAmount;
        await onAdjustStock(product.id, {
          delta,
          reason: finalReason,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Adjust Stock Level</h3>
              <p className="text-xs text-slate-400 font-mono">{product.sku}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Overview Summary */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="truncate pr-3">
            <span className="font-semibold text-white truncate block">{product.name}</span>
            <span className="text-[11px] text-slate-400">Threshold: {product.minStockThreshold} units</span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Current</span>
            <span className="font-extrabold text-sm text-white">{currentStock}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Adjustment Action</label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mode === 'add'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                + Restock
              </button>
              <button
                type="button"
                onClick={() => setMode('deduct')}
                className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mode === 'deduct'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                - Deduct
              </button>
              <button
                type="button"
                onClick={() => setMode('set')}
                className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mode === 'set'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                = Set Exact
              </button>
            </div>
          </div>

          {/* Quantity Input & Preset Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {mode === 'set' ? 'Exact New Stock Count' : 'Units to ' + (mode === 'add' ? 'Add' : 'Deduct')}
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm text-white font-mono outline-none"
            />

            {mode !== 'set' && (
              <div className="flex gap-1.5 mt-2">
                {[5, 10, 25, 50, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className="flex-1 py-1 rounded-lg text-[11px] font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Audit Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason (Logged to Audit Trail)
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white outline-none cursor-pointer mb-2"
            >
              <option value="Supplier Delivery (Restock)">Supplier Delivery (Restock PO)</option>
              <option value="Customer Order Fulfillment">Customer Order Fulfillment</option>
              <option value="Physical Inventory Cycle Count">Physical Inventory Cycle Count</option>
              <option value="Damaged / Defective Stock Written Off">Damaged / Defective Stock Written Off</option>
              <option value="Customer Return Restocked">Customer Return Restocked</option>
              <option value="OTHER">Other reason...</option>
            </select>

            {reason === 'OTHER' && (
              <input
                type="text"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Enter specific audit reason..."
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none"
              />
            )}
          </div>

          {/* Preview Change Card */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Projected Stock</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-slate-400 font-medium">{currentStock}</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-extrabold text-base text-white">{calculatedStock}</span>
                <span className="text-[11px] text-slate-400">units</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Status</span>
              <span
                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                  calculatedStatus === 'in_stock'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : calculatedStatus === 'low_stock'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {calculatedStatus.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Adjusting...' : 'Confirm Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
