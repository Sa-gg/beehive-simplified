export interface InventoryItemDTO {
  id: string;
  name: string;
  category: 'INGREDIENTS' | 'BEVERAGES' | 'PACKAGING' | 'SUPPLIES';
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  lastRestocked: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemDTO {
  name: string;
  category: 'INGREDIENTS' | 'BEVERAGES' | 'PACKAGING' | 'SUPPLIES';
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPerUnit: number;
  supplier?: string;
}

export interface UpdateInventoryItemDTO {
  name?: string;
  category?: 'INGREDIENTS' | 'BEVERAGES' | 'PACKAGING' | 'SUPPLIES';
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  costPerUnit?: number;
  supplier?: string;
}

export interface InventoryFilters {
  category?: string;
  status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCREPANCY';
  search?: string;
}

export interface InventoryResponse {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  status: string;
  lastRestocked: Date;
  createdAt: Date;
  updatedAt: Date;
}
