import {
  Product,
  NewProductInput,
  InventoryAnalytics,
  RestockRecommendation,
  AuditLogEntry,
  ProductFilterOptions,
} from '../types/inventory';

const BASE_URL = '/api';

export async function fetchProducts(filters?: ProductFilterOptions): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.search) params.set('search', filters.search);
    if (filters.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  }

  const res = await fetch(`${BASE_URL}/products?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch products: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data;
}

export async function fetchProduct(idOrSku: string): Promise<Product> {
  const res = await fetch(`${BASE_URL}/products/${encodeURIComponent(idOrSku)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch product: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data;
}

export async function createProduct(input: NewProductInput): Promise<Product> {
  const res = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create product');
  }
  const json = await res.json();
  return json.data;
}

export async function updateProduct(idOrSku: string, updates: Partial<Product>): Promise<Product> {
  const res = await fetch(`${BASE_URL}/products/${encodeURIComponent(idOrSku)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update product');
  }
  const json = await res.json();
  return json.data;
}

export async function adjustStock(
  idOrSku: string,
  options: { delta?: number; newQuantity?: number; reason?: string }
): Promise<Product> {
  const res = await fetch(`${BASE_URL}/products/${encodeURIComponent(idOrSku)}/stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to adjust stock');
  }
  const json = await res.json();
  return json.data;
}

export async function deleteProduct(idOrSku: string): Promise<Product> {
  const res = await fetch(`${BASE_URL}/products/${encodeURIComponent(idOrSku)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete product');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchAnalytics(): Promise<InventoryAnalytics> {
  const res = await fetch(`${BASE_URL}/analytics`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch analytics');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchRecommendations(): Promise<RestockRecommendation[]> {
  const res = await fetch(`${BASE_URL}/recommendations`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch recommendations');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  const res = await fetch(`${BASE_URL}/audit-logs?limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch audit logs');
  }
  const json = await res.json();
  return json.data;
}

export async function resetDemoData(): Promise<InventoryAnalytics> {
  const res = await fetch(`${BASE_URL}/reset-demo`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reset demo data');
  }
  const json = await res.json();
  return json.data;
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{
  reply: string;
  toolCalls: any[];
  affectedProducts: string[];
  suggestedActions: string[];
}> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get AI agent response');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchMCPInfo(): Promise<any> {
  const res = await fetch(`${BASE_URL}/mcp/info`);
  if (!res.ok) {
    throw new Error('Failed to fetch MCP info');
  }
  return res.json();
}

export async function fetchMCPTools(): Promise<any> {
  const res = await fetch(`${BASE_URL}/mcp/tools`);
  if (!res.ok) {
    throw new Error('Failed to fetch MCP tools');
  }
  return res.json();
}

export async function callRawMCP(method: string, params: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });
  return res.json();
}
