import React, { useState, useEffect } from 'react';
import { X, Package, Check, AlertCircle } from 'lucide-react';
import { Product, NewProductInput } from '../types/inventory';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewProductInput | Partial<Product>) => Promise<void>;
  productToEdit?: Product | null;
  categories: string[];
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  productToEdit,
  categories,
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [price, setPrice] = useState('0.00');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [minStockThreshold, setMinStockThreshold] = useState('10');
  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setSku(productToEdit.sku);
      setCategory(productToEdit.category);
      setPrice(productToEdit.price.toString());
      setStockQuantity(productToEdit.stockQuantity.toString());
      setMinStockThreshold(productToEdit.minStockThreshold.toString());
      setDescription(productToEdit.description || '');
      setSupplier(productToEdit.supplier || '');
      setLocation(productToEdit.location || '');
      setCustomCategory('');
    } else {
      setName('');
      setSku('');
      setCategory(categories[0] || 'Peripherals');
      setCustomCategory('');
      setPrice('49.99');
      setStockQuantity('20');
      setMinStockThreshold('10');
      setDescription('');
      setSupplier('');
      setLocation('Warehouse A - Bay 01');
    }
    setError(null);
  }, [productToEdit, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalCategory = category === 'CUSTOM' ? customCategory.trim() : category;

    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }

    if (!sku.trim()) {
      setError('Product SKU is required.');
      return;
    }

    if (!finalCategory) {
      setError('Please select or specify a category.');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Price must be a valid non-negative number.');
      return;
    }

    const numStock = parseInt(stockQuantity, 10);
    if (isNaN(numStock) || numStock < 0) {
      setError('Stock quantity must be a non-negative integer.');
      return;
    }

    const numThreshold = parseInt(minStockThreshold, 10);
    if (isNaN(numThreshold) || numThreshold < 0) {
      setError('Threshold must be a non-negative integer.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (productToEdit) {
        await onSubmit({
          name: name.trim(),
          category: finalCategory,
          price: numPrice,
          stockQuantity: numStock,
          minStockThreshold: numThreshold,
          description: description.trim(),
          supplier: supplier.trim(),
          location: location.trim(),
        });
      } else {
        await onSubmit({
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: finalCategory,
          price: numPrice,
          stockQuantity: numStock,
          minStockThreshold: numThreshold,
          description: description.trim(),
          supplier: supplier.trim() || 'Internal Supplier',
          location: location.trim() || 'Warehouse Floor',
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {productToEdit ? 'Edit Product Details' : 'Add New Inventory Product'}
              </h3>
              <p className="text-xs text-slate-400">
                {productToEdit ? `Updating ${productToEdit.sku}` : 'Register a new SKU into the catalog'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Ergonomic Sit-Stand Motorized Desk"
              required
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* SKU & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">SKU Code *</label>
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. TECH-DESK-01"
                disabled={!!productToEdit}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white font-mono placeholder-slate-500 outline-none transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white outline-none cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="CUSTOM">+ New Category...</option>
              </select>
            </div>
          </div>

          {category === 'CUSTOM' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Custom Category Name *</label>
              <input
                type="text"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="e.g. Smart Lighting"
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>
          )}

          {/* Price, Stock, Threshold */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Stock *</label>
              <input
                type="number"
                step="1"
                min="0"
                value={stockQuantity}
                onChange={e => setStockQuantity(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Min Threshold</label>
              <input
                type="number"
                step="1"
                min="0"
                value={minStockThreshold}
                onChange={e => setMinStockThreshold(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white font-mono outline-none"
              />
            </div>
          </div>

          {/* Location & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Warehouse Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Warehouse A - Bay 04"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier / Vendor</label>
              <input
                type="text"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder="e.g. Apex Global Supply"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description & Specs</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Product technical details and specifications..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
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
              {isSubmitting ? 'Saving...' : productToEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
