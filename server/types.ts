export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stockQuantity: number;
  minStockThreshold: number;
  stockStatus: StockStatus;
  description: string;
  supplier: string;
  location: string;
  lastRestocked: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewProductInput {
  name: string;
  sku: string;
  category: string;
  price: number;
  stockQuantity: number;
  minStockThreshold?: number;
  description?: string;
  supplier?: string;
  location?: string;
  lastRestocked?: string;
}

export type AuditSource = 'AI_AGENT' | 'MANUAL' | 'MCP_TOOL';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'STOCK_ADJUST' | 'DELETE' | 'BATCH_UPDATE';
  productId?: string;
  sku?: string;
  productName?: string;
  details: string;
  source: AuditSource;
  previousValue?: any;
  newValue?: any;
}

export interface InventoryAnalytics {
  totalProducts: number;
  totalStockUnits: number;
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
  categories: string[];
  categoryBreakdown: Record<string, { count: number; totalStock: number; totalValuation: number }>;
  recentActivities: AuditLogEntry[];
}

export interface RestockRecommendation {
  productId: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  minThreshold: number;
  recommendedOrder: number;
  estimatedCost: number;
  urgency: 'CRITICAL' | 'WARNING' | 'OPTIMAL';
  reason: string;
}

export interface ProductFilterOptions {
  search?: string;
  category?: string;
  status?: StockStatus | 'all';
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'sku' | 'price' | 'stockQuantity' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
